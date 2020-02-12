/**
 * Class that contains methods to communicate with other parties
 */
class NetCode {

    /**
     * Send command to a Client (e.g.: Player)
     * @param {Command} command
     * @param {Socket} from
     * @param {Socket} to
     */
    static Send(command, from, to) {
        from.send(command.Buffer, to.port, to.address)
    }
}

module.exports = NetCode
