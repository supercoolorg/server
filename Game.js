const Player = require('./Player.js');
const OpCode = require('./NetCode.js').OpCode;
const NetCode = require('./NetCode.js').NetCode;
const accurateInterval = require('accurate-interval');

const DELTATIME = 0.01; // Matches FixedUpdate on client side
const GRAVITY = -9.81 * 1.5;
const GROUND = 0;
const A_BIT = 0.05;

class Game {
    constructor(serverSocket, process) {
        this.players = [];
        this.blocks = [];
        this.server = serverSocket;
        this.process = process;

        accurateInterval(() => {
            this.PhysicsTick();
        }, DELTATIME * 1000, { aligned: true, immediate: true });

        // Check for timeouts
        let interval = 10 * 1000;
        setInterval(() => {
            let time = Date.now();
            for(let i=0; i<this.players.length; i++){
                if(time - this.players[i].lastseen >= interval){
                    let dccmd = NetCode.BufferOp(OpCode.Disconnect, 3);
                    dccmd.setInt16(1, this.players[i].uid, true);
                    NetCode.Broadcast(dccmd.buffer, this.server, this.players);
                    this.players.splice(i, 1);
                }
            }
        }, interval)
    }

    Connect(socket){
        const player = new Player(socket);
        this.players.push(player);
        this.SendPlayerCount();
    }

    Disconnect(uid){
        for(let i=0; i<this.players.length; i++){
            if(this.players[i].uid == uid){
                let dccmd = NetCode.BufferOp(OpCode.Disconnect, 3);
                dccmd.setInt16(1, this.players[i].uid, true);
                NetCode.Broadcast(dccmd.buffer, this.server, this.players);
                this.players.splice(i, 1);
                this.SendPlayerCount();
                break;
            }
        }
        if(this.players.length == 0)
            process.exit();
    }

    SendPlayerCount(){
        process.send({ msg: "PlayerCount", args: [this.players.length] });
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
            if(other.uid != player.uid){
                spawnOthersCmd.setUint16(1, other.uid, true);
                spawnOthersCmd.setFloat32(3, other.state.pos.x, true);
                spawnOthersCmd.setFloat32(7, other.state.pos.y, true);
                NetCode.Send(spawnOthersCmd.buffer, this.server, player);
            }
        }
    }

    Jump(uid, jumpHeight){
        for(let player of this.players){
            if(player.uid == uid){
                if(player.state.isGrounded)
                    player.input.nextJump = jumpHeight;
            }
        }
        
    }

    Move(uid, moveSpeed){
        for(let player of this.players){
            if(player.uid == uid){
                player.input.x = moveSpeed;
            }
        }
    }

    PhysicsTick(){
        const message_size_per_player = 2+4+4+4+4; // Int16 + 4*Float32
        let posCmd = NetCode.BufferOp(OpCode.SetPos, 1+message_size_per_player*this.players.length);

        for(let i=0; i<this.players.length; i++){
            let player = this.players[i];

            player.state.vel.x = player.input.x;
            this.computeIsGrounded(player);
            this.computeGravity(player);
            this.computeCollisions(player);
            this.computeMovement(player);

            // Populate the command buffer
            posCmd.setInt16(1+i*message_size_per_player, player.uid, true);
            posCmd.setFloat32(3+i*message_size_per_player, player.state.pos.x, true);
            posCmd.setFloat32(7+i*message_size_per_player, player.state.pos.y, true);
            posCmd.setFloat32(11+i*message_size_per_player, player.state.vel.x, true);
            posCmd.setFloat32(15+i*message_size_per_player, player.state.vel.y, true);
        }

        NetCode.Broadcast(posCmd.buffer, this.server, this.players);
    }

    computeIsGrounded(player){
        player.state.isGrounded = false;
        if(player.state.pos.y <= GROUND + A_BIT){
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
            if(player.input.nextJump){
                player.state.vel.y += player.input.nextJump;
                player.input.nextJump = null;
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
                        player.state.vel.x = 0;
                }
            }
        }
    }

    computeMovement(player){
        // Apply Velocity
        player.state.pos.x += player.state.vel.x * DELTATIME;
        player.state.pos.y += player.state.vel.y * DELTATIME;
    }
}

module.exports = Game;
