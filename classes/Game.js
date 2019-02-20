const Player = require('./Player.js')
const NetCode = require('./NetCode.js').NetCode
const accurateInterval = require('accurate-interval')

const DELTATIME = 0.01 // Matches FixedUpdate on client side
const GRAVITY = -9.81 * 1.5
const GROUND = 0
const A_BIT = 0.05

class Game {
    constructor(serverSocket, process) {
        // Pools of game entities
        this.players = []
        this.blocks = []

        // Set server details
        this.server = serverSocket;
        this.process = process;

        // Setup physics loop
        accurateInterval(() => {
            this.PhysicsTick()
        }, DELTATIME * 1000, {
            aligned: true,
            immediate: true
        })

        // Check for players who disconnects
        let interval = 10 * 1000
        setInterval(() => {
            let time = Date.now()
            for (let i = 0; i < this.players.length; i++) {
                if (time - this.players[i].lastseen >= interval) {
                    NetCode.Send("Disconnect", [this.players[i].uid], this.server, this.players)

                    this.players.splice(i, 1)
                }
            }
        }, interval)
    }

    /**
     * Create a player instance linked to its socket and add it to the pool
     * of players in that instance.
     * @param {*} socket The server socket you want to connect to.
     */
    Connect(socket) {
        const player = new Player(socket)
        this.players.push(player)
        this.SendPlayerCount()
    }

    /**
     * Disconnects a player from the server, removing it from the pool
     * of players in that instance.
     * @param {Int} uid The UID of the player you want to disconnect.
     */
    Disconnect(uid) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].uid == uid) {
                NetCode.Send("Disconnect", [this.players[i].uid], this.server, this.players)

                this.players.splice(i, 1)
                this.SendPlayerCount()
                break;
            }
        }
        if (this.players.length == 0)
            process.exit()
    }

    /**
     * Send the "PlayerCount" message with the size of the players array.
     */
    SendPlayerCount() {
        process.send({
            msg: "PlayerCount",
            args: [this.players.length]
        })
    }

    /**
     * Refresh the .lastseen property of the player Object, which tracks the
     * last time the player was seen online.
     * @param {Int} uid The UID of the player you want to update.
     */
    ConnectionStillAlive(uid) {
        for (let player of this.players) {
            if (player.uid == uid) {
                player.lastseen = Date.now()
            }
        }
    }

    /**
     * Tells the clients to spawn the new selected player, and
     * then to spawn in the new player's client all the other
     * players.
     * @param {Int} uid The UID of the player you want to spawn-
     */
    Spawn(uid) {
        let player;
        for (let _player of this.players) {
            if (_player.uid == uid) {
                player = _player
                break
            }
        }

        player.state.pos = {
            x: Math.random() * 10 - 5,
            y: 1
        }
        player.state.vel = {
            x: 0,
            y: 0
        }

        // Spawn the new player
        NetCode.Send("Spawn", [
                player.uid,
                player.state.pos.x,
                player.state.pos.y
            ], this.server, this.players)

        // Tell the new spawned player's client to spawn all the others players
        for (let other of this.players) {
            if (other.uid != player.uid) {
                NetCode.Send("Spawn", [
                        other.uid,
                        other.state.pos.x,
                        other.state.pos.y
                    ], this.server, player)
            }
        }
    }

    /**
     * Make the selected player jump a certain height.
     * @param {Int} uid The UID of the player you want to make jump
     * @param {float} jumpHeight The height of the jump
     */
    Jump(uid, jumpHeight) {
        for (let player of this.players) {
            if (player.uid == uid) {
                if (player.state.isGrounded)
                    player.input.nextJump = jumpHeight
            }
        }
    }

    /**
     * Make the selected player move at a certain speed.
     * @param {Int} uid The UID of the player you want to move
     * @param {float} moveSpeed The speed the player should move at
     */
    Move(uid, moveSpeed) {
        for (let player of this.players) {
            if (player.uid == uid) {
                player.input.x = moveSpeed
            }
        }
    }

    /**
     * Update all physics related stuff
     */
    PhysicsTick() {
        // Create array of data to send to the players
        let payload = []

        for (let player of this.players) {
            // Process the position of player
            player.state.vel.x = player.input.x
            this.computeIsGrounded(player)
            this.computeGravity(player)
            this.computeCollisions(player)
            this.computeMovement(player)

            payload.push([
                player.uid,
                player.state.pos.x,
                player.state.pos.y,
                player.state.vel.x,
                player.state.vel.y
            ])
        }

        NetCode.Send("SetPos", payload, this.server, this.players)
    }

    /**
     * Set a player isGrounded [Bool] state based on its position.
     * @param {Player} player The selected player
     */
    computeIsGrounded(player) {
        player.state.isGrounded = false
        if (player.state.pos.y <= GROUND + A_BIT) {
            player.state.pos.y = GROUND
            player.state.isGrounded = true
        } else {
            for (let j = 0; j < this.players.length && !player.state.isGrounded; j++) {
                let other = this.players[j]
                if (other.uid != player.uid) {
                    if (player.isGroundedOn(other)) {
                        player.state.pos.y = other.state.pos.y + other.size.y / 2 + player.size.y / 2
                        player.state.isGrounded = true
                    }
                }
            }
        }
    }

    /**
     * Set a player vertical velocity (gravity) based on its position.
     * @param {Player} player The selected player
     */
    computeGravity(player) {
        if (player.state.isGrounded) {
            player.state.vel.y = 0
            // Setting velocity to 0 would stop jumping
            if (player.input.nextJump) {
                player.state.vel.y += player.input.nextJump
                player.input.nextJump = null
            }
        } else {
            player.state.vel.y += GRAVITY * DELTATIME
        }
    }

    /**
     * Check is colliding on any of its sides (left and right)
     * @param {Player} player The selected player
     */
    computeCollisions(player) {
        player.state.collided = false;
        for (let j = 0; j < this.players.length && !player.state.collided; j++) {
            let other = this.players[j]
            if (other.uid != player.uid) {
                let touch = player.isTouchingHorizontal(other)
                if ((touch > 0 && player.state.vel.x > 0) ||
                    (touch < 0 && player.state.vel.x < 0)) {
                    player.state.vel.x = 0
                }
            }
        }
    }

    /**
     * Set a player position based on its velocity.
     * @param {Player} player The selected player
     */
    computeMovement(player) {
        // Apply Velocity
        player.state.pos.x += player.state.vel.x * DELTATIME
        player.state.pos.y += player.state.vel.y * DELTATIME
    }
}

module.exports = Game
