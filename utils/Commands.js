const ByteCode = require('./ByteCode.js');

const OpCode = {
    Error: 0,
    Queue: 1,
    FoundMatch: 2,
    Register : 3,
    Spawn: 4,
    Move: 5,
    Jump: 6,
    SetPos: 7,
    Disconnect : 8,
    Ping: 9,
    ToString(op){
        return Object.keys(this)[op];
    }
}
Object.freeze(OpCode);

class Command {
    constructor(opcode, model, args){
        model.unshift('Uint8');
        this.model = model;
        this.view = new DataView(new ArrayBuffer(ByteCode.GetByteCount(this.model)));
        this.view.setUint8(0, opcode);
        
        for(let i=0; i<args.length; i++){
            this.SetAt(i, args[i]);
        }
    }

    GetOpCode(){
        return this.view.getUint8(0);
    }

    GetAt(index){
        index++; // Offset it by the opcode slot
        let type = this.model[index];
        let offset = this._getByteOffset(index);
        return this.view['get'+type](offset);
    }

    SetAt(index, data){
        index++; // Offset it by the opcode slot
        let type = this.model[index];
        let offset = this._getByteOffset(index);
        this.view['set'+type](offset, data, true);
    }

    get Buffer(){
        return Buffer.from(this.view.buffer);
    }

    _getByteOffset(index){
        if(index > this.model.length)
            throw `[Command]: [_getByteOffset]: Index ${index} is out of bounds`;

        let offset = 0;
        for(let i=0; i<index; i++){
            offset += ByteCode.GetByteCount(this.model[i]);
        }
        return offset;
    }
}

class FoundMatch extends Command {
    constructor(...args){
        const opcode = OpCode.FoundMatch;
        const model = ['Uint16'];
        super(opcode, model, args);
    }
}

class Spawn extends Command {
    constructor(...args){
        const opcode = OpCode.Spawn;
        const model = ['Uint16', 'Float32', 'Float32'];
        super(opcode, model, args);
    }
}

class Disconnect extends Command {
    constructor(...args){
        const opcode = OpCode.Disconnect;
        const model = ['Uint16'];
        super(opcode, model, args);
    }
}

class Ping extends Command {
    constructor(...args){
        const opcode = OpCode.Ping;
        const model = ['Int16'];
        super(opcode, model, args);
    }
}

class SetPos extends Command {
    constructor(args){
        const opcode = OpCode.SetPos;
        let model = ['Uint16', 'Float32', 'Float32', 'Float32', 'Float32'];

        // Extend model
        let mult = args.length / model.length;
        for(let i=0; i<mult-1; i++){
            model = model.concat(model);
        }

        super(opcode, model, args);
    }
}

module.exports = {};
module.exports.OpCode = OpCode;
module.exports.Commands = { Spawn, SetPos, Disconnect, FoundMatch, Ping } 
