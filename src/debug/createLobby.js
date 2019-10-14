const Lobby = require("../lobby/Lobby")

const ARGV = process.argv

let parsedArgv = Lobby.parseArgv(ARGV)
let lobby = new Lobby(parsedArgv.port, parsedArgv.players)

lobby.startServer()
