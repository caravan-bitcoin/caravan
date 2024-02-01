import shajs from 'sha.js';

export const sha256Hash = (data) => {
    return shajs('sha256').update(data).digest();
};

export const compose3 = (f, g, h) => x => {
    return f(g(h(x)));
};
