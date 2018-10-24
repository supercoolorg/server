const Player = require('./Player.js');
const OpCode = require('./NetCode.js').OpCode;
const NetCode = require('./NetCode.js').NetCode;

const DELTATIME = 0.01; // Matches FixedUpdate on client side
const GRAVITY = -9.81 * 1.5;
const GROUND = 0;

class Game {
    constructor(serverSocket) {
        this.players = [];
        this.blocks = [];
        this.server = serverSocket;

        setInterval(() => {
            this.PhysicsTick();
        }, DELTATIME * 1000);

        // Check for timeouts
        let interval = 10 * 1000;
        setInterval(() => {
            let time = Date.now();
            for(let i=0; i<this.players.length; i++){
                if(time - this.players[i].lastseen >= interval){
                    this.players.splice(i, 1);
                }
            }
        }, interval)
    }

    Connect(socket){
        const player = new Player(socket);
        this.players.push(player);
    }

    Disconnect(uid){
        for(let i=0; i<this.players.length; i++){
            if(this.players[i].uid == uid){
                this.players.splice(i, 1);
                break;
            }
        }
    }

    ConnectionStillAlive(uid){
        for(let i=0; i<this.players.length; i++){
            if(this.players[i].uid == uid){
                this.players[i].lastseen = Date.now();
            }
        }
    }

    Spawn(uid){
        let player;
        for(let i=0; i<this.players.length; i++){
            if(this.players[i].uid == uid){
                player = this.players[i];
                break;
            }
        }

        player.state.pos = { x: Math.random()*10 - 5, y: 1 };
        player.state.vel = { x: 0, y: 0 };

        // Spawn player
        let spawnCmd = NetCode.BufferOp(OpCode.Spawn, 11);
        spawnCmd.setUint16(1, player.uid, true);
        spawnCmd.setFloat32(3, player.state.pos.x, true);
        spawnCmd.setFloat32(7, player.state.pos.y, true);
        NetCode.Broadcast(spawnCmd.buffer, this.server, this.players);

        // Spawn other players in the same lobby
        var spawnOthersCmd = NetCode.BufferOp(OpCode.Spawn, 11);
        for(let other of this.players){
            if(other.uid == player.uid) continue;
            spawnOthersCmd.setUint16(1, other.uid, true);
            spawnOthersCmd.setFloat32(3, other.state.pos.x, true);
            spawnOthersCmd.setFloat32(7, other.state.pos.y, true);
            NetCode.Send(spawnOthersCmd.buffer, this.server, player);
        }
    }

    Jump(uid, jumpHeight){
        for(let player of this.players){
            if(player.uid == uid){
                if(player.state.isGrounded)
                    player.state.nextJump = jumpHeight;
            }
        }
        
    }

    Move(uid, moveSpeed){
        for(let player of this.players){
            if(player.uid == uid){
                player.state.vel.x = moveSpeed;
            }
        }
    }

    PhysicsTick(){
        let posCmd = NetCode.BufferOp(OpCode.SetPos, 1+10*this.players.length);

        for(let i=0; i<this.players.length; i++){
            let player = this.players[i];

            this.computeIsGrounded(player);
            this.computeGravity(player);
            this.computeCollisions(player);
            this.computeMovement(player);

            // Predict that the packet is going to arrive 1 physics update later
            let predictionX = player.state.pos.x + player.state.vel.x * DELTATIME;
            let predictionY = player.state.pos.y + player.state.vel.y * DELTATIME;

            // Populate the command buffer
            posCmd.setInt16(1+i*10, player.uid, true);
            posCmd.setFloat32(3+i*10, predictionX, true);
            posCmd.setFloat32(7+i*10, predictionY, true);
        }

        NetCode.Broadcast(posCmd.buffer, this.server, this.players);
    }

    computeIsGrounded(player){
        player.state.isGrounded = false;
        if(player.state.pos.y <= GROUND){
            player.state.pos.y = GROUND;
            player.state.isGrounded = true;
        } else {
            for(let j=0; j<this.players.length && !player.state.isGrounded; j++){
                let other = this.players[j];
                if(other.uid != player.uid){
                    if(player.isGroundedOn(other)){
                        player.state.pos.y = other.state.pos.y + other.size.y/2 + player.size.y/2;
                        player.state.isGrounded = true;
                    }
                }
            }
        }
    }

    computeGravity(player){
        if(player.state.isGrounded){
            player.state.vel.y = 0;
            // Setting velocity to 0 would stop jumping
            if(player.state.nextJump){
                player.state.vel.y += player.state.nextJump;
                player.state.nextJump = null;
            }
        } else {
            player.state.vel.y += GRAVITY * DELTATIME;
        }
    }

    // Check for lateral collision
    computeCollisions(player){
        player.state.collided = false;
        for(let j=0; j<this.players.length && !player.state.collided; j++){
            let other = this.players[j];
            if(other.uid != player.uid){
                let touch = player.isTouchingHorizontal(other);
                if((touch > 0 && player.state.vel.x > 0) ||
                    (touch < 0 && player.state.vel.x < 0)){
                        player.state.collided = true;
                }
            }
        }
    }

    computeMovement(player){
        // Apply Velocity
        if(!player.state.collided){
            player.state.pos.x += player.state.vel.x * DELTATIME;
        }
        player.state.pos.y += player.state.vel.y * DELTATIME;
    }
}

module.exports = Game;
