const ByteCode = require("./ByteCode.js")

const OpCode = {
    Error: 0,
    Queue: 1,
    FoundMatch: 2,
    Register: 3,
    Spawn: 4,
    Move: 5,
    Jump: 6,
    SetPos: 7,
    Disconnect: 8,
    Ping: 9,
    ToString(op){
        return Object.keys(this)[op]
    }
}
Object.freeze(OpCode)

const Models = new Map([
    [OpCode.Error, []],
    [OpCode.Queue, []],
    [OpCode.FoundMatch, ["Uint16"]],
    [OpCode.Register, []],
    [OpCode.Spawn, ["Uint16", "Float32", "Float32"]],
    [OpCode.Move, ["Float32"]],
    [OpCode.Jump, ["Float32"]],
    [OpCode.SetPos, ["Uint16", "Float32", "Float32", "Float32", "Float32"]],
    [OpCode.Disconnect, ["Uint16"]],
    [OpCode.Ping, []]
])

class Command {
    constructor(opcode, ...args){
        this.model = Models.get(opcode)
        this.modelByteCount = ByteCode.GetByteCount(this.model)

        // Repetitions of the model
        let n = 1
        if (this.model.length != 0){
            // If args are not enough to fill the model, we can assume it's 1 repetition
            // and the buffer going to be filled in later with SetAt.
            n = Math.max(1, Math.floor(args.length / this.model.length))
        }
        this.view = new DataView(new ArrayBuffer(1 +  this.modelByteCount * n))
        this.view.setUint8(0, opcode)

        for(let i = 0; i < args.length; i++){
            this.SetAt(i, args[i])
        }
    }

    GetOpCode(){
        return this.view.getUint8(0)
    }

    GetAt(index){
        let type = this.model[index % this.model.length]
        let offset = this._getByteOffset(index)
        return this.view["get" + type](offset, true)
    }

    SetAt(index, data){
        let type = this.model[index % this.model.length]
        let offset = this._getByteOffset(index)
        this.view["set" + type](offset, data, true)
    }

    get Buffer(){
        return Buffer.from(this.view.buffer)
    }

    /**
     * Create Command from an existing Buffer
     * The buffer must contain a known OpCode in the first byte
     * @param {ArrayBuffer} buffer
     * @returns {Command}
     */
    static From(buffer){
        let view = new DataView(buffer)
        let op = view.getUint8(0)
        let cmd = new Command(op)
        cmd.view = view
        return cmd
    }

    _getByteOffset(index){
        if(this.model.length == 0) return 0

        let n = Math.floor(index / this.model.length)
        let offset = 1 + n * this.modelByteCount
        for(let i = 0; i < index % this.model.length; i++){
            offset += ByteCode.GetByteCount(this.model[i])
        }

        return offset
    }
}

module.exports = {OpCode, Command}
