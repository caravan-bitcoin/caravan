import { encodeSimpleCBOR } from './miniCbor';
import { encodeBc32Data } from '../bech32';
import { sha256Hash, compose3 } from './utils';

const composeUR = (payload, type = 'bytes') => {
    return `ur:${type}/${payload}`;
};

const composeDigest = (payload, digest) => {
    return `${digest}/${payload}`;
};

const composeSequencing = (payload, index, total) => {
    return `${index + 1}of${total}/${payload}`;
};

const composeHeadersToFragments = (fragments, digest, type = 'bytes') => {
    if (fragments.length === 1) {
        return [composeUR(fragments[0])];
    } else {
        return fragments.map((f, index) => {
            return compose3(
                (payload) => composeUR(payload, type),
                (payload) => composeSequencing(payload, index, fragments.length),
                (payload) => composeDigest(payload, digest),
            )(f);
        });
    }
};

export const encodeUR = (payload, fragmentCapacity = 200) => {
    const cborPayload = encodeSimpleCBOR(payload);
    const bc32Payload = encodeBc32Data(cborPayload);
    const digest = sha256Hash(Buffer.from(cborPayload, 'hex')).toString('hex');
    const bc32Digest = encodeBc32Data(digest);
    const fragments = bc32Payload.match(new RegExp('.{1,' + fragmentCapacity + '}', 'g'));
    if (!fragments) {
        throw new Error('Unexpected error when encoding');
    }
    return composeHeadersToFragments(fragments, bc32Digest, 'bytes').map((str) => str.toUpperCase());
};
