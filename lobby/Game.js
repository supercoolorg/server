const Player = require("./Player.js")
const NetCode = require("../utils/NetCode.js")
const Commands = require("../utils/Commands.js").Commands
const accurateInterval = require("accurate-interval")

const DELTATIME = 0.01 // Matches FixedUpdate on client side
const GRAVITY = -9.81 * 1.5
const GROUND = 0
const A_BIT = 0.05

class Game {
    constructor(serverSocket, process){
        this.players = []
        this.blocks = []
        this.server = serverSocket
        this.process = process

        accurateInterval(() => {
            this.PhysicsTick()
        }, DELTATIME * 1000, { aligned: true, immediate: true })

        // Check for timeouts
        let interval = 10 * 1000
        setInterval(() => {
            let time = Date.now()
            for(let i = 0; i < this.players.length; i++){
                if(time - this.players[i].lastseen >= interval){
                    let dcCmd = new Commands.Disconnect(this.players[i].uid)
                    this.Broadcast(dcCmd)
                    this.players.splice(i, 1)
                }
            }
        }, interval)
    }

    GetPlayer(uid){
        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].uid == uid){
                return this.players[i]
            }
        }
        throw `[Game]: [GetPlayer]: Player '${uid}' not found`
    }

    /**
     * Send command to all connected players
     * @param {Command} command
     * @param {uid} except
     */
    Broadcast(command, except){
        for(let player of this.players){
            if(player.uid != except)
                NetCode.Send(command, this.server, player.socket)
        }
    }

    Connect(socket){
        const player = new Player(socket)
        this.players.push(player)
        this.SendPlayerCount()
    }

    Disconnect(uid){
        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].uid == uid){
                let dcCmd = new Commands.Disconnect(this.players[i].uid)
                this.Broadcast(dcCmd)
                this.players.splice(i, 1)
                this.SendPlayerCount()
                break
            }
        }
        if(this.players.length == 0)
            process.exit()
    }

    Pong(uid){
        let player = this.GetPlayer(uid)
        let pongCmd = new Commands.Ping()
        NetCode.Send(pongCmd, this.server, player.socket)
    }

    SendPlayerCount(){
        process.send({ msg: "PlayerCount", args: [this.players.length] })
    }

    ConnectionStillAlive(uid){
        let player = this.GetPlayer(uid)
        player.lastseen = Date.now()
    }

    Spawn(uid){
        let player = this.GetPlayer(uid)

        player.state.pos = { x: Math.random() * 10 - 5, y: 1 }
        player.state.vel = { x: 0, y: 0 }

        // Spawn player
        let spawnCmd = new Commands.Spawn(player.uid, player.state.pos.y, player.state.pos.y)
        this.Broadcast(spawnCmd, this.server, this.players)

        // Spawn other players in the same lobby
        let spawnOthersCmd = new Commands.Spawn()
        for(let other of this.players){
            if(other.uid != player.uid){
                spawnOthersCmd.SetAt(0, other.uid)
                spawnOthersCmd.SetAt(1, other.state.pos.x)
                spawnOthersCmd.SetAt(2, other.state.pos.y)
                NetCode.Send(spawnOthersCmd, this.server, player.socket)
            }
        }
    }

    Jump(uid, jumpHeight){
        let player = this.GetPlayer(uid)
        if(player.state.isGrounded)
            player.input.nextJump = jumpHeight

    }

    Move(uid, moveSpeed){
        let player = this.GetPlayer(uid)
        player.input.x = moveSpeed
    }

    PhysicsTick(){
        let playerData = []

        for(let i = 0; i < this.players.length; i++){
            let player = this.players[i]

            player.state.vel.x = player.input.x
            this.computeIsGrounded(player)
            this.computeGravity(player)
            this.computeCollisions(player)
            this.computeMovement(player)

            // Populate the command buffer
            playerData.push(player.uid)
            playerData.push(player.state.pos.x)
            playerData.push(player.state.pos.y)
            playerData.push(player.state.vel.x)
            playerData.push(player.state.vel.y)
        }

        let posCmd = new Commands.SetPos(playerData)
        this.Broadcast(posCmd, this.server, this.players)
    }

    computeIsGrounded(player){
        player.state.isGrounded = false
        if(player.state.pos.y <= GROUND + A_BIT){
            player.state.pos.y = GROUND
            player.state.isGrounded = true
        } else {
            for(let j = 0; j < this.players.length && !player.state.isGrounded; j++){
                let other = this.players[j]
                if(other.uid != player.uid){
                    if(player.isGroundedOn(other)){
                        player.state.pos.y = other.state.pos.y + other.size.y / 2 + player.size.y / 2
                        player.state.isGrounded = true
                    }
                }
            }
        }
    }

    computeGravity(player){
        if(player.state.isGrounded){
            player.state.vel.y = 0
            // Setting velocity to 0 would stop jumping
            if(player.input.nextJump){
                player.state.vel.y += player.input.nextJump
                player.input.nextJump = null
            }
        } else {
            player.state.vel.y += GRAVITY * DELTATIME
        }
    }

    // Check for lateral collision
    computeCollisions(player){
        player.state.collided = false
        for(let j = 0; j < this.players.length && !player.state.collided; j++){
            let other = this.players[j]
            if(other.uid != player.uid){
                let touch = player.isTouchingHorizontal(other)
                if((touch > 0 && player.state.vel.x > 0) ||
                    (touch < 0 && player.state.vel.x < 0)){
                    player.state.vel.x = 0
                }
            }
        }
    }

    computeMovement(player){
        // Apply Velocity
        player.state.pos.x += player.state.vel.x * DELTATIME
        player.state.pos.y += player.state.vel.y * DELTATIME
    }
}

module.exports = Game
