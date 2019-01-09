/**
 * NetCode.js
 */

// Import JSON declaration of opcodes + types
const opcodes = require("./../opcodes.json")


var OpCode = {}

for (let id in opcodes) {
    OpCode[id] = opcodes[id].opcode
}

// Freeze the reference object, thus making it a enum
Object.freeze(OpCode)


console.log("Listing all defined opcodes:")
console.log(OpCode)


class NetCode {
    /**
     * Send a command to the client(s).
     * @param {string} opcode The name of the operation you want to perform.
     * @param {[any]} params Array of parameters.
     * @param {this.server} sender The sender object (usually the server socket)
     * @param {Player | Socket} target The destination of the command (can be a player of a group of players, or a socket)
     * @param {*} except An entity present in target which should be excluded
     */
    static Do(opcode, params, sender, target, except = null) {
        let op = opcodes[opcode]

        let buffer = new ArrayBuffer(1 + op.size * params.length / op.params.length)
        let view = new DataView(buffer)

        view.setUint8(0, op.opcode)

        let padding = 1

        for (let i = 0; i < params.length; i++) {
            let value = params[i]
            // op.params[typeIndex] = Type of Value
            let typeIndex = i % params.length

            // Set offset according to the type of the parameter
            switch (op.params[typeIndex]) {
                case "Int16":
                    view.setInt16(padding, value, true)
                    break
                case "UInt16":
                    view.setUint16(padding, value, true)
                    break
                case "Float32":
                default:
                    view.setFloat32(padding, value, true)
                    break
            }

            padding += op.size
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
            if( typeof target.socket.port === "undefined" &&
                typeof target.socket.address === "undefined") {
                // Probably the target is already a socket
                sender.send(buffer, target.port, target.address)
            } else {
                // or is it a player?
                sender.send(buffer, target.socket.port, target.socket.address)
            }
        }
    }

    /**
     * 
     * @param {Int} opcode The OpCode.X enum value
     * @returns {String} The OpCode as string (X)
     */
    static ResolveOpCode(opcode) {
        return Object.keys(OpCode)[opcode]
    }

    /**
     * Write the port of the lobby in the buffer,
     * after finding an online lobby.
     * @param {*} socket The server socket
     * @param {*} lobby The port of the lobby that gets online
     */
    WriteBufferOnSocket(socket, lobby) {
        let buffer = new ArrayBuffer(4)
        let view = new DataView(buffer)
        view.setUint8(0, OpCode.FoundMatch)
        view.setUint16(1, lobby, true)

        socket.write(buffer)
    }
}

module.exports = {
    OpCode,
    NetCode
}
