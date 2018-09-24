class Player {
    constructor(socket) {
        this.socket = socket;
        this.uid = socket.port;
        this.state = {};
    }
}

module.exports = Player;