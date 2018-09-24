const OpCode = {
    Error: 0,
    Queue: 1,
    FoundMatch: 2,
    Register : 3,
    Spawn: 4,
    Move: 5,
    Jump: 6,
    SetPos: 7
}
Object.freeze(OpCode);

class NetCode {
    static OpCodeToString(op){
        return Object.keys(OpCode)[op];
    }

    static BufferOp(op, size){
        let buffer = new ArrayBuffer(size);
        let view = new DataView(buffer);
        view.setUint8(0, op);
        return view;
    }

    static Send(buffer, from, to){
        from.send(Buffer.from(buffer), to.socket.port, to.socket.address);
    }

    static Broadcast(buffer, from, to, except){
        for(let player of to){
            if(player.uid != except)
                from.send(Buffer.from(buffer), player.socket.port, player.socket.address);
        }
    }
}

module.exports = { OpCode, NetCode }
