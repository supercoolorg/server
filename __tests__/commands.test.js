const Commands = require('../utils/Commands').Commands
const OpCode = require('../utils/Commands').OpCode

const random = {}
random.Uint16 = () => {
    return Math.floor(Math.random() * 65535)
}
random.Float32 = () => {
    return (Math.random() * 4294967295) - 2147483648
}
random.fromArray = (x) => {
    return x[Math.ceil(Math.random * x.length)]
}

test('Testing command: FoundMatch', () => {
    let lobby = random.Uint16()
    let cmd = new Commands.FoundMatch(lobby)
    expect(cmd.GetOpCode()).toBe(OpCode.FoundMatch)
    expect(cmd.GetAt(0)).toBe(lobby)
    // Test edge case
    cmd = new Commands.FoundMatch(65536)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test('Testing command: Spawn', () => {
    let id = random.Uint16()
    let x = random.Float32()
    let y = random.Float32()

    let cmd = new Commands.Spawn(id, x, y)
    expect(cmd.GetOpCode()).toBe(OpCode.Spawn)
    expect(cmd.GetAt(0)).toBe(id)
    expect(cmd.GetAt(1)).toBe(Math.fround(x))
    expect(cmd.GetAt(2)).toBe(Math.fround(y))
    // Test edge case
    cmd = new Commands.Spawn(65536, 0, 0)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test('Testing command: Disconnect', () => {
    let id = random.Uint16()
    let cmd = new Commands.Disconnect(id)
    expect(cmd.GetOpCode()).toBe(OpCode.Disconnect)
    expect(cmd.GetAt(0)).toBe(id)
    // Test edge case
    cmd = new Commands.Spawn(65536, 0, 0)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test('Testing command: Ping', () => {
    let cmd = new Commands.Ping()
    expect(cmd.GetOpCode()).toBe(OpCode.Ping)
})

test('Testing command: SetPos', () => {
    let id = random.Uint16()
    let x = random.Float32()
    let cmd = new Commands.SetPos([id, x, x, x, x])
    expect(cmd.GetOpCode()).toBe(OpCode.SetPos)
    expect(cmd.GetAt(0)).toBe(id)
    for (let i = 1; i < 4; i++) {
        expect(cmd.GetAt(i)).toBe(Math.fround(x))
    }
    // Test edge case
    cmd = new Commands.Spawn([65536, 0, 0, 0, 0])
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})
