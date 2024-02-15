import bech32 from './bech32';

export const Bech32Version  = {
  Origin: 1,
  bis: 2,
};

const convertBits = (data, fromBits, toBits, pad) => {
    let acc = 0;
    let bits = 0;
    const ret = [];
    const maxv = (1 << toBits) - 1;
    for (let p = 0; p < data.length; ++p) {
        const value = data[p];
        if (value < 0 || value >> fromBits !== 0) {
            return null;
        }
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            ret.push((acc << (toBits - bits)) & maxv);
        }
    } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
        return null;
    }
    return ret;
};

export const decodeSegwitAddress = (hrp, addr) => {
    const dec = bech32.decode(addr);
    if (dec === null || dec.hrp !== hrp || dec.data.length < 1 || dec.data[0] > 16) {
        return null;
    }
    const res = convertBits(Uint8Array.from(dec.data.slice(1)), 5, 8, false);
    if (res === null || res.length < 2 || res.length > 40) {
        return null;
    }
    if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
        return null;
    }
    return { version: dec.data[0], program: res };
};

export const encodeSegwitAddress = (hrp, version, program) => {
    const u82u5 = convertBits(program, 8, 5, true);
    if (!u82u5) {
        return null;
    }
    const ret = bech32.encode(hrp, [version].concat(u82u5), Bech32Version.Origin);
    if (decodeSegwitAddress(hrp, ret) === null) {
        return null;
    }
    return ret;
};

export const encodeBc32Data = (hex) => {
    const data = Buffer.from(hex, 'hex');
    const u82u5 = convertBits(data, 8, 5, true);
    if (!u82u5) {
        throw new Error('invalid input');
    } else {
        return bech32.encode(undefined, u82u5, Bech32Version.bis);
    }
};

export const decodeBc32Data = (data) => {
    const result = bech32.decode(data);
    if (result) {
        const res = convertBits(Buffer.from(result.data), 5, 8, false);
        if (res) return Buffer.from(res).toString('hex');
        return null;
    } else {
        return null;
    }
};
