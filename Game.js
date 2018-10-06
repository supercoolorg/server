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
    }

    SpawnPlayer(socket){
        const player = new Player(socket);
        player.state.pos = { x: Math.random()*10 - 5, y: 1 };
        player.state.vel = { x: 0, y: 0 };
        this.players.push(player);

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
        for(let player of this.players){
            // Check for collisions
            // TODO: test for other player's hitboxes
            if(player.state.pos.y <= GROUND){
                player.state.pos.y = GROUND;
                player.state.isGrounded = true;
            } else {
                player.state.isGrounded = false;
            }

            // Apply gravity
            if(player.state.isGrounded){
                player.state.vel.y = 0;
                // Setting velocity to 0 would stop jumping
                if(player.state.nextJump){
                    player.state.vel.y += player.state.nextJump;
                    player.state.nextJump = null;
                }
            }
            else if(!player.state.isGrounded)
                player.state.vel.y += GRAVITY * DELTATIME;
            
            // Apply Velocity
            player.state.pos.x += player.state.vel.x * DELTATIME;
            player.state.pos.y += player.state.vel.y * DELTATIME;

            /* TODO !important queue up info for all players in 1 big packet of 11*n bytes
             * | OpCode | uid | posX | posY |
             * | empty  | uid | posX | posY |
             * | empty  | uid | posX | posY |
             * 
             * or maybe 11 + 10*(n-1) bytes
             * | OpCode || uid | posX | posY |
             * | uid | posX | posY |
             * | uid | posX | posY |
             */
            let posCmd = NetCode.BufferOp(OpCode.SetPos, 11);
            posCmd.setInt16(1, player.uid, true);
            posCmd.setFloat32(3, player.state.pos.x, true);
            posCmd.setFloat32(7, player.state.pos.y, true);
            NetCode.Broadcast(posCmd.buffer, this.server, this.players);
        }
    }
}

module.exports = Game;