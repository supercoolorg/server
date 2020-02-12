const Player = require("./Player")
const NetCode = require("../utils/NetCode")
const {Command, OpCode} = require("../utils/Commands")
class Game {
    /**
     * @param {Socket} serverSocket The server socket of the lobby
     * @param {Player[]} players An array of Players
     * @param {number} interval Wait this time in seconds before checking for DCs
     */
    constructor(serverSocket, players, interval = 10 * 1000) {
        this.socket = serverSocket
        this.players = players
        this.interval = interval
    }

    /**
     * Set the period of the update in ms.
     * @param {numer} ms Milliseconds
     */
    SetUpdateInterval(ms) {
        if (ms > 0)
            this.interval = ms
    }

    /**
     * Every `this.interval`, check if any player got disconnected.
     */
    CheckTimeOuts() {
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

    /**
     * @param {number} uid
     * @returns {Player}
     */
    GetPlayer(uid) {
        for(let player of this.players) {
            if(player.uid == uid) {
                return player
            }
        }
        throw new Error(`[Game]: [GetPlayer]: Player '${uid}' not found`)
    }

    /**
     * Send command to all connected players
     * @param {Command} command
     * @param {uid} except
     */
    Broadcast(command, except) {
        for(let player of this.players) {
            if(player.uid != except)
                NetCode.Send(command, this.server, player.socket)
        }
    }

    Connect(socket) {
        const player = new Player(socket)
        this.players.push(player)
        this.SendPlayerCount()
    }

    Disconnect(uid) {
        this.players.forEach((player, index)=> {
            if(player.uid == uid) {
                let dcCmd = new Command(OpCode.Disconnect, player.uid)
                this.Broadcast(dcCmd)
                this.players.splice(index, 1)
                this.SendPlayerCount()
                return // or break?
            }
        })
        if(this.players.length == 0) {
            // FIXME: Still relevant?
            process.exit()
        }
    }
}

module.exports = Game