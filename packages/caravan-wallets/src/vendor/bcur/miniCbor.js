/*
    this an simple cbor implementation which is just using
    on BCR-05
*/
export const composeHeader = (length) => {
    let header;
    if (length > 0 && length <= 23) {
        header = Buffer.from([0x40 + length]);
    } else if (length >= 24 && length <= 255) {
        const headerLength = Buffer.alloc(1);
        headerLength.writeUInt8(length, 0);
        header = Buffer.concat([Buffer.from([0x58]), headerLength]);
    } else if (length >= 256 && length <= 65535) {
        const headerLength = Buffer.alloc(2);
        headerLength.writeUInt16BE(length, 0);
        header = Buffer.concat([Buffer.from([0x59]), headerLength]);
    } else if (length >= 65536 && length <= 2 ** 32 - 1) {
        const headerLength = Buffer.alloc(4);
        headerLength.writeUInt32BE(length, 0);
        header = Buffer.concat([Buffer.from([0x60]), headerLength]);
    } else {
        throw new Error('length exceeded');
    }
    return header;
};

export const encodeSimpleCBOR = (data) => {
    const bufferData = Buffer.from(data, 'hex');
    if (bufferData.length <= 0 || bufferData.length >= 2 ** 32) {
        throw new Error('data is too large');
    }

    const header = composeHeader(bufferData.length);

    const endcoded = Buffer.concat([header, bufferData]);
    return endcoded.toString('hex');
};

export const decodeSimpleCBOR = (data) => {
    const dataBuffer = Buffer.from(data, 'hex');
    if (dataBuffer.length <= 0) {
        throw new Error('invalid input');
    }
    const header = dataBuffer[0];
    if (header < 0x58) {
        const dataLength = header - 0x40;
        return dataBuffer.slice(1, 1 + dataLength).toString('hex');
    } else if (header == 0x58) {
        const dataLength = dataBuffer.slice(1, 2).readUInt8(0);
        return dataBuffer.slice(2, 2 + dataLength).toString('hex');
    } else if (header == 0x59) {
        const dataLength = dataBuffer.slice(1, 3).readUInt16BE(0);
        return dataBuffer.slice(3, 3 + dataLength).toString('hex');
    } else if (header == 0x60) {
        const dataLength = dataBuffer.slice(1, 5).readUInt32BE(0);
        return dataBuffer.slice(5, 5 + dataLength).toString('hex');
    } else {
        throw new Error('invalid input');
    }
};
