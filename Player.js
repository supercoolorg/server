class Player {
    constructor(socket) {
        this.socket = socket;
        this.uid = socket.port;
        this.state = {};
        this.size = { x: 0.64, y: 1.024 };
        this.lastseen = Date.now();
    }

    // Return 0 if no, -1 if left, +1 if right
    isTouchingHorizontal(other){
        let myBottom = this.state.pos.y - this.size.y/2;
        let otherTop = other.state.pos.y + other.size.y/2;
        if(myBottom > otherTop - 0.05){
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
            return 0;
        }

        let myLeft = this.state.pos.x - this.size.x/2;
        let otherRight = other.state.pos.x + other.size.x/2;
        if(myLeft >= otherRight){
            return 0;
        }

        let myRight = this.state.pos.x + this.size.x/2;
        let otherLeft = other.state.pos.x - other.size.x/2;
        if(myRight <= otherLeft){
            return 0;
        }

        let myBottom = this.state.pos.y - this.size.y/2;
        let otherTop = other.state.pos.y + other.size.y/2;
        if(myBottom <= otherTop && myBottom > otherTop - 0.1){
            return 1;
        }
    }
}

module.exports = Player;