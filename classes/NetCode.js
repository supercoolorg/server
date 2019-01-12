/**
 * NetCode.js
 */

// Import JSON declaration of commands + types
const commands = require("./../commands.json")


var OpCode = {}

for (let id in commands) {
    OpCode[id] = commands[id].opcode
}

// Freeze the reference object, thus making it a enum
Object.freeze(OpCode)

class NetCode {
    /**
     * Send a command to the client(s).
     * @param {string} opcode The name of the operation you want to perform.
     * @param {[any]} params Array of parameters.
     * @param {this.server} sender The sender object (usually the server socket)
     * @param {Player | [Player] | Socket} target The destination of the command
     * @param {Player} except An player present in target which should be excluded, when target is an array of players.
     */
    static Do(opcode, params, sender, target, except = null) {
        let command = commands[opcode]

        let buffer = new ArrayBuffer(1 + command.size * params.length / command.params.length)
        let view = new DataView(buffer)
        view.setUint8(0, command.opcode)

        let padding = 1

        for (let i = 0; i < params.length; i++) {
            let value = params[i]
            // op.params[typeIndex] = Type of Value
            let typeIndex = i % params.length

            // Set offset according to the type of the parameter
            switch (command.params[typeIndex]) {
                case "Int16":
                    view.setInt16(padding, value, true)
                    padding += 2
                    break
                case "UInt16":
                    view.setUint16(padding, value, true)
                    padding += 2
                    break
                case "Float32":
                default:
                    view.setFloat32(padding, value, true)
                    padding += 4
                    break
            }
        }

        if (Array.isArray(target)) {
            // If it's an array of players
            // Do a broadcast
            for (let player of target) {
                if (player.uid !== except) {
                    sender.send(buffer, player.socket.port, player.socket.address)
                }
            }
        } else {
            // If it's a single target
            if( typeof target.socket === "undefined") {
                // Probably the target is already a socket
                sender.send(buffer, target.port, target.address)
            } else {
                // or is it a player?
                sender.send(buffer, target.socket.port, target.socket.address)
            }
        }
    }

    /**
     * @param {Int} opcode The OpCode.X enum value
     * @returns {String} The OpCode as string (X)
     */
    static Resolve(opcode) {
        return Object.keys(OpCode)[opcode]
    }
}

module.exports = {
    OpCode,
    NetCode
}
