const net = require('net');
const fork = require('child_process').fork;
const OpCode = require('./NetCode.js').OpCode;
const NetCode = require('./NetCode.js').NetCode;

const MM_PORT = 50999;
const BASE_PORT = 51000;
const forkOpts = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
};

const lobbies = []; // Array of lobbies, which ports are lobby+BASE_PORT

const server = net.createServer(socket => {
    console.log("New client connected");
    socket.on("error", err => console.log(err));
    socket.on('data', data => {
        let view = new DataView(data.buffer);
        const op = view.getUint8(0);
        switch(op){
            case OpCode.Queue:
                // TODO: actual matchmaking
                let lobby = Math.floor(Math.random() * lobbies.length); // For now let's go fortnite way OMEGALUL

                if(!lobbies[lobby]){
                    // Spawn a server for the lobby
                    const lobbyServer = fork('lobby.js', [lobby+BASE_PORT], forkOpts);
                    lobbyServer.stdout.on('data', data => console.log(`[${lobby}]: ${data}`)); // Log its console here as '[lobby]: output'
                    lobbyServer.stderr.on('data', data => console.log(`[${lobby}]: ${data}`));
                    lobbyServer.on('message', msg => {
                        if(msg == 'online')
                            lobbies[lobby].online = true;
                    })
                    lobbyServer.on('close', code => {
                        // Remove it from the array
                        lobbies.splice(lobby, 1);
                        console.log(`Killed server ${lobby}`);
                    })
                    lobbies.push(lobbyServer);
                }

                let watch = setInterval(()=>{
                    if(!lobbies[lobby].online) return;
                    let bufferView = NetCode.BufferOp(OpCode.FoundMatch, 4);
                    bufferView.setUint16(1, lobby+BASE_PORT, true);
                    socket.write(Buffer.from(bufferView.buffer));

                    clearInterval(watch);
                }, 20);

                break;
        }
    });
})
.listen(MM_PORT, () => console.log(`master server listening on port ${server.address().port}`));
