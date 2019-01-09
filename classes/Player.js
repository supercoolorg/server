const A_BIT = 0.05;

class Player {
    constructor(socket) {
        this.socket = socket;
        this.uid = socket.port;
        this.state = {};
        this.input = { x: 0, nextJump: null };
        this.size = { x: 0.64, y: 1.024 };
        this.lastseen = Date.now();
    }

    // Return 0 if no, -1 if left, +1 if right
    isTouchingHorizontal(other){
        let myBottom = this.state.pos.y - this.size.y/2;
        let otherTop = other.state.pos.y + other.size.y/2;
        if(myBottom > otherTop - A_BIT){
            return 0;
        }

        let myLeft = this.state.pos.x - this.size.x/2;
        let otherRight = other.state.pos.x + other.size.x/2;
        if(myLeft <= otherRight && myLeft > other.state.pos.x){
            return -1;
        }

        let myRight = this.state.pos.x + this.size.x/2;
        let otherLeft = other.state.pos.x - other.size.x/2;
        if(myRight >= otherLeft && myRight < other.state.pos.x){
            return 1;
        }

        return 0;
    }

    isGroundedOn(other){
        if(this.state.vel.y > 0){
            return false;
        }

        let myLeft = this.state.pos.x - this.size.x/2;
        let otherRight = other.state.pos.x + other.size.x/2;
        if(myLeft >= otherRight){
            return false;
        }

        let myRight = this.state.pos.x + this.size.x/2;
        let otherLeft = other.state.pos.x - other.size.x/2;
        if(myRight <= otherLeft){
            return false;
        }

        let myBottom = this.state.pos.y - this.size.y/2;
        let otherTop = other.state.pos.y + other.size.y/2;
        if(myBottom <= otherTop + A_BIT && myBottom > otherTop - A_BIT){
            return true;
        }

        return false;
    }
}

module.exports = Player;