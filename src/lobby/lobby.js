const dgram = require("dgram")
const { OpCode, Command } = require("../utils/Commands")

class Lobby {
    /**
     * @param {number} port The port on which the server will be listening
     * @param {Player[]} players Array of `Player` class instances
     */
    constructor(port, players) {
        this.port = port
        this.players = players
    }

    /**
     * Starts the UDP server on the port passed in the constructor.
     */
    startServer() {
        // Start the UDP server
        let server = dgram.createSocket("udp4")
        server.bind(this.port)

        // FIXME: How to extend Lobby and Game?
        let game

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
}





module.exports = Lobby