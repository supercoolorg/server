class Player {
    constructor(id, address, port) {
        this.id = id
        this.address = address
        this.port = port
        this.lastseen = 0
    }
}

module.exports = Player