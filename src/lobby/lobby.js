const dgram = require("dgram")
const { OpCode, Command } = require("../utils/Commands")
const Game = require("./Game")
const Player = require("./Player")

/**
 * Represents a game lobby, which is comprised of an array of player, an UDP server
 * and a Game instance. You should extend Lobby, Game and Player
 */
class Lobby {
    /**
     * @constructor
     * @param {number} port The port on which the server will be listening
     * @param {Player[]} players Array of `Player` class instances
     */
    constructor(port, players, gameClass = undefined, playerClass = undefined) {
        this.port = port
        this.players = players
        // FIXME: Any better way to do this?
        if (gameClass)
            this.gameClass = gameClass
        else
            this.gameClass = this.overrideGame()
        if (playerClass)
            this.playerClass = playerClass
        else
            this.playerClass = this.overridePlayer()
    }

    /**
     * Starts the UDP server on the port passed in the constructor.
     */
    Start() {
        // Start the UDP server
        let server = dgram.createSocket("udp4")
        server.bind(this.port)

        // Game constructor can accept the interval as third parameter
        let game = new this.gameClass(server, this.players)

        // Handle errors
        server.on("error", (err) => {
            console.log(`error:\n${err.stack}`)
            server.close()
            process.exit()
        })

        // TODO: This has to be extensible!
        server.on("message", (data, client) => {
            if(data.buffer.length <= 0) return

            let cmd = Command.From(data.buffer)
            let op = cmd.GetOpCode()
            console.log(`got ${OpCode.ToString(op)} from ${client.address}:${client.port}`)

            switch(op) {
                case OpCode.Register:
                    game.Connect(client)
                    game.Spawn(client.port)
                    break
                case OpCode.Jump: {
                    let jumpHeight = cmd.GetAt(0)
                    game.Jump(client.port, jumpHeight)
                    break
                }
                case OpCode.Move: {
                    let moveSpeed = cmd.GetAt(0)
                    game.Move(client.port, moveSpeed)
                    break
                }
                case OpCode.Disconnect: {
                    game.Disconnect(client.port)
                    break
                }
                case OpCode.Ping: {
                    game.Pong(client.port)
                    break
                }
            }

            if(op != OpCode.Disconnect)
                game.ConnectionStillAlive(client.port)
        })

        server.on("listening", () => {
            console.log(`[Lobby] Listening on port ${server.address().port}`)
            process.send({ msg: "Online", args: [] })
        })

    }

    /**
     * @param {Player} player
     */
    AddPlayer(player) {
        this.players.push(player)
    }

    /**
     * You should override this method to return *your own*
     * subclass of Game.
     * @override
     * @return {Game} A subclass of Game
     */
    OverrideGame() {
        return Game
    }

    /**
     * You should override this method to return *your own*
     * subclass of Player.
     * @override
     * @return {Game} A subclass of Game
     */
    OverridePlayer() {
        return Player
    }

    /**
     * @param {string[]} argv
     * @returns {{port: number, players: Player[]}}
     */
    static ParseArgv(argv) {
        let ret = {
            port: 0,
            players: []
        }
        if (argv[2])
            ret.port = argv[2]
        if ((argv.length - 2) % 3 === 0) {
            for (let i = 3; i < argv.length; i++) {
                let player = new Player(
                    argv[i],
                    argv[i + 1],
                    argv[i + 2]
                )
                ret.players.push(player)
            }
        } else {
            throw new Error("Player array is in the wrong format.")
        }
    }
}

module.exports = Lobby
