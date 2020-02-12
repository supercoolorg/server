class ByteCode {
    /**
     * Return the size in bytes of representation of the type
     * @param {string} type
     */
    static GetByteCount(type) {
        if(Array.isArray(type)) {
            let count = 0
            for(let i = 0; i < type.length; i++) {
                count += this.GetByteCount(type[i])
            }

            return count
        }

        // With some potential performance implications, this *could* be done via a regex
        // This way at least we get to handle unknown types though.
        switch(type) {
            case "Int8":
            case "Uint8":
                return 1
            case "Int16":
            case "Uint16":
                return 2
            case "Int32":
            case "Uint32":
            case "Float32":
                return 4
            case "Float64":
                return 8
            default:
                throw new Error(`[ByteCode]: [GetByteCount]: Unsupported data type '${type}'`)
        }
    }
}

module.exports = ByteCode
