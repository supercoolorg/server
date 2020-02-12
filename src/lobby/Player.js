class Player {
    constructor(id, address, port) {
        this.id = id
        this.address = address
        this.port = port
        this.lastseen = Date.now()
    }
}

module.exports = Player