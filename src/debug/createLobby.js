const Lobby = require("../lobby/Lobby")
const Player = require("../lobby/Player")

const ARGV = process.argv

/**
 * @param {string[]} argv
 * @returns {{port: number, players: Player[]}}
 */
function parseArgv(argv) {
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

let parsedArgv = parseArgv(ARGV)
let lobby = new Lobby(parseArgv.port, parsedArgv.players)

lobby.startServer()

module.exports.parseArgv = parseArgv