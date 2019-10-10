const Player = require("./Player")
const {Command, OpCode} = require("../utils/Commands")
class Game {
    /**
     * @param {Socket} serverSocket The server socket of the lobby
     * @param {Player[]} players An array of Players
     * @param {number} interval Wait this time in seconds before checking for DCs
     */
    constructor(serverSocket, players, interval = 10 * 1000) {
        this.players = players
        this.interval = interval
    }

    /**
     * Set the period of the update in ms.
     * @param {numer} ms Milliseconds
     */
    setUpdateInterval(ms) {
        if (ms > 0)
            this.interval = ms
    }

    /**
     * Every `this.interval`, check if any player got disconnected.
     */
    checkTimeOuts() {
        // Check for timeouts
        setInterval(() => {
            let time = Date.now()
            this.players.forEach((player, index) => {
                if(time - player.lastseen >= this.interval) {
                    // FIXIT: Update the way to handle player.id
                    let dcCmd = new Command(OpCode.Disconnect, player.id)
                    this.Broadcast(dcCmd)
                    this.players.splice(index, 1)
                }
            })
        }, this.interval)
    }
}

module.exports = Game