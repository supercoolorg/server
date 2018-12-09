const dgram = require('dgram');
const OpCode = require('./NetCode.js').OpCode;
const NetCode = require('./NetCode.js').NetCode;
const Game = require('./Game.js');

const PORT = process.argv[2]; // 'node lobby.js port'

const server = dgram.createSocket('udp4');

const game = new Game(server, process);

server.on('error', (err) => {
    console.log(`error:\n${err.stack}`);
    server.close();
    process.exit();
});

server.on('message', (data, client) => {
    let receivedCmd = new DataView(data.buffer);
    if(receivedCmd.byteLength <= 0) return;

    let op = receivedCmd.getInt8(0);
    console.log(`got ${NetCode.OpCodeToString(op)} from ${client.address}:${client.port}`);

    switch(op){
        case OpCode.Register:
            game.Connect(client);
            game.Spawn(client.port);
            break;
        case OpCode.Jump:
            let jumpHeight = receivedCmd.getFloat32(3, true);
            game.Jump(client.port, jumpHeight);
            break;
        case OpCode.Move:
            let moveSpeed = receivedCmd.getFloat32(3, true);
            game.Move(client.port, moveSpeed);
            break;
        case OpCode.Disconnect:
            game.Disconnect(client.port);
    }

    game.ConnectionStillAlive(client.port);
});

server.on('listening', () => {
    console.log(`listening on port ${server.address().port}`);
    process.send({ msg: "Online", args: [] });
});

server.bind(PORT);
