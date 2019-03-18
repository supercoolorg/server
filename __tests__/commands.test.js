const { OpCode, Command } = require("../src/utils/Commands.js")

/**
 * Generate a random number of a certain type.
 */
class Random {
    /**
     * @returns A Uint16 number, between 0 and 2^16-1.
     */
    static Uint16(){
        return Math.floor(Math.random() * 65535)
    }
    /**
     * @returns A Float32 number.
     */
    static Float32(){
        return Math.fround(Math.random())
    }
    /**
     * @returns A random element from an array.
     */
    static FromArray(x){
        return x[Math.ceil(Math.random * x.length)]
    }
}

test("Testing command: FoundMatch", () => {
    let lobby = Random.Uint16()
    let cmd = new Command(OpCode.FoundMatch, lobby)
    expect(cmd.GetOpCode()).toBe(OpCode.FoundMatch)
    expect(cmd.GetAt(0)).toBe(lobby)
    // Test edge case
    cmd = new Command(OpCode.FoundMatch, 65536)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test("Testing command: Spawn", () => {
    let id = Random.Uint16()
    let x = Random.Float32()
    let y = Random.Float32()

    let cmd = new Command(OpCode.Spawn, id, x, y)
    expect(cmd.GetOpCode()).toBe(OpCode.Spawn)
    expect(cmd.GetAt(0)).toBe(id)
    expect(cmd.GetAt(1)).toBe(x)
    expect(cmd.GetAt(2)).toBe(y)
    // Test edge case
    cmd = new Command(OpCode.Spawn, 65536, 0, 0)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test("Testing command: Disconnect", () => {
    let id = Random.Uint16()
    let cmd = new Command(OpCode.Disconnect, id)
    expect(cmd.GetOpCode()).toBe(OpCode.Disconnect)
    expect(cmd.GetAt(0)).toBe(id)
    // Test edge case
    cmd = new Command(OpCode.Disconnect, 65536)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})

test("Testing command: Ping", () => {
    let cmd = new Command(OpCode.Ping)
    expect(cmd.GetOpCode()).toBe(OpCode.Ping)
})

test("Testing command: SetPos", () => {
    let id = Random.Uint16()
    let x = Random.Float32()
    let arr = [id, x, x, x, x]
    let cmd = new Command(OpCode.SetPos, ...arr)
    expect(cmd.GetOpCode()).toBe(OpCode.SetPos)
    for (let i = 0; i < arr.length; i++){
        expect(cmd.GetAt(i)).toBe(arr[i])
    }
    // Test with multiple players (2+)
    arr = arr.concat(arr)
    cmd = new Command(OpCode.SetPos, ...arr)
    for (let i = 0; i < arr.length; i++){
        expect(cmd.GetAt(i)).toBe(arr[i])
    }
    // Test edge case
    cmd = new Command(OpCode.SetPos, 65536, 0, 0, 0, 0)
    // Should OF as 0
    expect(cmd.GetAt(0)).toBe(0)
})
