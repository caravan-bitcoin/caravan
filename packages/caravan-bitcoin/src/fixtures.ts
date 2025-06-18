/**
 * This module provides useful test fixtures.
 *
 * Most test fixtures are derived from the same BIP39 seed phrase
 * (which is also included as a fixture).
 *
 * Test transactions are multisig which allows them to have one of the
 * keys be the open source (private) key above and another be private
 * (private key).  This doubly-private key is held by Unchained
 * Capital.
 *
 * Multisig addresses built from both keys have the advantage that
 * they are open enough to test most aspects of transaction authoring
 * & signing while remaining impossible to spend from without having
 * the private (private) key.  This enables robust public tests of
 * multisig addresses in testnet and mainnet.
 *
 * All the fixtures in this module are accessible through the
 * `TEST_FIXTURES` constant.
 *
 * @module fixtures
 */

import { BigNumber } from "bignumber.js";

import { braidConfig } from "./braid";
import { sortInputs } from "./inputs";
import {
  generateMultisigFromPublicKeys,
  multisigRedeemScript,
  multisigWitnessScript,
} from "./multisig";
import { Network } from "./networks";
import { P2SH } from "./p2sh";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";

// Without this, BigNumber will report strings as exponentials. 16 places covers
// all possible values in satoshis.
BigNumber.config({ EXPONENTIAL_AT: 16 });

const RECEIVING_ADDRESSES = {
  [Network.TESTNET]: {
    [P2SH]: "2NE1LH35XT4YrdnEebk5oKMmRpGiYcUvpNR",
    [P2SH_P2WSH]: "2NE1LH35XT4YrdnEebk5oKMmRpGiYcUvpNR",
    [P2WSH]: "tb1q9hj5j7mh9f7t6cwdvz34nj6pyzva5ftj2ecarcdqph5wc3n49hyqchh3cg",
  },
  [Network.MAINNET]: {
    [P2SH]: "3DRVz9YUhoXSMgBngvv2JkNReBHvkeJwLs",
    [P2SH_P2WSH]: "3DRVz9YUhoXSMgBngvv2JkNReBHvkeJwLs",
    [P2WSH]: "bc1qxkl8fcuas3fv6mk79tk7d0nsug0909qcgvpjuj2asgltnafp46nsn4jnrh",
  },
};
const CHANGE_ADDRESSES = {
  [Network.TESTNET]: {
    [P2SH]: "2NB3tTnpcUanDenNhWbXxymTJhheWtj5Mu1",
    [P2SH_P2WSH]: "2MyCBSwFWSXpagqKtrnckNtNQBnKdUZRhKc",
    [P2WSH]: "tb1qhjtyry0qwm5l6v5v7y27hc6m60vm0d8exlr3cswdrxsgaygqvd2q5zsl0n",
  },
  [Network.MAINNET]: {
    [P2SH]: "36NMegVbRPbMv9RC4Ge2aKLUQHYXKbyooZ",
    [P2SH_P2WSH]: "32M6VKsKw1X2EXFawpcHosMEhSxswLHRwX",
    [P2WSH]: "bc1qnzky4hcwcutvktfstp0u3kmtgxkjvscl25snvg45xu3ausv2lapqrvmkeh",
  },
};

const BIP39_PHRASE = [
  "merge",
  "alley",
  "lucky",
  "axis",
  "penalty",
  "manage",
  "latin",
  "gasp",
  "virus",
  "captain",
  "wheel",
  "deal",
  "chase",
  "fragile",
  "chapter",
  "boss",
  "zero",
  "dirt",
  "stadium",
  "tooth",
  "physical",
  "valve",
  "kid",
  "plunge",
];

export const ROOT_FINGERPRINT = "f57ec65d";

const NODES = {
  "m/45'/0'/0'": {
    pub: "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03",
    xpub: "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv",
    tpub: "tpubDCZv1xNTnmwmXe3BBMyXekiVreY853jFeC8k9AaEAqCDYi1ZTSTLH3uQonwCTRk9jL1SFu1cLNbDY76YtcDR8n2inSMwBEAdZs37EpYS9px",
    zpub: "zpub6qrp73tcNs5GxSEZPtZgs1a8sTjMxuDBvnatMQJrawC5ucyJtXwNNjYrcAmavk6kkhi99GgribUGcVq4w9CCqowdTX1UfX9NXMZzG2XWQdj",
    ypub: "ypub6X2YoPDhEBXo793SZXn4evUdhVav2HDh1g4fa1QyCvpCrXA5dsmokftiaxozvqSqM4bLPo6JFw7ijDDWDSnC3aG2bBK45cKtFdWLsUKgtyo",
    Ypub: "Ypub6hvdvcx8o96AXiCpWCF3UzpSRHdBEduHKwiLVGgWahecUhizQHA5qnkePfmUVGfjaXfKGP6R99WDrNqGWfw9C4NhReRTV1nt9MnDTNALmuh",
    Zpub: "Zpub72kuEHd3wpdeP1PwLZ2fh5uwbFmdBFtnF4EZGfaPxi2VXoYDewKeTrQnQsj4VBKezAn81rgybormjfSqENM9zJ4JHz7t4vcNR5qrqv8qja7",
    upub: "upub5DhVaiY2dTMshxGyE6dZpa6d1d18FoFhMDynSRqRguJge7uAdF7ZGRGAW8yewCq9iW87Pti4RHhXC4mFLf88rdXd7pXMjy3wAjFmK6jyHiX",
    vpub: "vpub5YXktPCwn8uMZFU64TRC2fC8Bb9aCRFCGLW1DpjK4ugZhDiPsuH7tUvJXLwEw7V589Ev9NJcsx455MNp4MY9esDDzADnKssRSTKQhgCrtoZ",
    Upub: "Upub5QbahxGUCQvF8XSMAm6YeeSRjR3PU9wHfVdTMh6y4g96GJU5PeVqMY86Jqw8Ve43wyC6GUiBJW62KEP1dtH617eHxHdm9NWw4TXdu1aWzdx",
    Vpub: "Vpub5jRr1cwPM6TiypdU17tArjXvuPBqQmvnac9g95zrSgWyKQHJeJfPybnEL3tiVYhyMcJu1xJjmASaCWzaMah6oMKtpdLBjHLRLBbHHcy3jDH",
    chaincode:
      "470bb034dbc8e7b5f5c0b19f747e3e768f0cc9ff298361b2741e1b7fd70d376d",
    parentFingerprint: 1240308660,
    rootFingerprint: ROOT_FINGERPRINT,
    index: 2147483648,
    depth: 3,
  },
  "m/45'/0'/0'/0": {
    pub: "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee",
    xpub: "xpub6EW9kGJQLjEGWpuKjViLuEw3pkNX5k2DzXhM3ctfHawh12aLXnrzYuRcvwTfv2VD2a8uzFCDJfLnrrD9Z46NbLyPHUQbbb4QyxKjf6c1gh4",
    tpub: "tpubDEsnGW8641Bind6BBghS7AGR9sUB58XHYAHeQAwodVhakKF3c1i5hM6TAyYTSXSSpUfpbpi5qmAqZ2hkwuwcUnRgM59uH7ieZuv9RAEJ5Rp",
    chaincode:
      "4522d0dc37c97548c43adc8fbbe285eea27921e8437562574d13c013e85c0fd3",
    parentFingerprint: 2213579839,
    rootFingerprint: ROOT_FINGERPRINT,
  },
  "m/45'/0'/0'/0/0": {
    pub: "03102f0df5e34ffa1178a5310952221b8e26b3e761a9e328832c750a2de252f21a",
    xpub: "xpub6FjSpitFpSJB9BpSVwp3eJzhpaQFLbLefD1f3qaGRmok2Z2FDeSNsy5CL9TLwM3HpcV2kAyTNf2W1uUXs1jbeXGWjdWnsaqnUQ9PyWAYVhQ",
    tpub: "tpubDG75LxhwXiFdQz1Hx8o8rEL59hVuKyqiCqbxQPdQmgZdmqgxHsHU2Qk2aBY8TqzXcX1wMkVKukrYi5y9FsaqXxiooEG6Z7W24MjojRNcVtA",
    chaincode:
      "4522d0dc37c97548c43adc8fbbe285eea27921e8437562574d13c013e85c0fd3",
    parentFingerprint: 724365675,
    rootFingerprint: ROOT_FINGERPRINT,
  },
  "m/45'/1/0/0": {
    xpub: "tpubDE5K7wy1Mf254iUPx3CgMfzhx6EcaFCvYDiJb5DZxeod2tTgKsgNX89YVQ6uD9TkMgP6KbAHueWqgcCYUTdZXqTXuF9Vnha45Y26gCfno2G",
    extendedPublicKey: {
      base58String:
        "tpubDE5K7wy1Mf254iUPx3CgMfzhx6EcaFCvYDiJb5DZxeod2tTgKsgNX89YVQ6uD9TkMgP6KbAHueWqgcCYUTdZXqTXuF9Vnha45Y26gCfno2G",
      chaincode:
        "da92ac213968ea1a2c26dde7d83e556939519e5195c84120f3b803630c45194a",
      depth: 4,
      index: 0,
      parentFingerprint: 384854823,
      path: "m/45'/1/0/0",
      pubkey:
        "0226a8fce14d91bd85b2b61bdc994e75975c9b443d02a0428a7c9755228f35cba9",
      rootFingerprint: ROOT_FINGERPRINT,
      version: "043587cf",
    },
  },
  "m/45'/1/1/0": {
    xpub: "tpubDF1iV6MkK9BUvumPzq1MHxVGPNy2fFo1pEpcgnkriBdiE9EVrkndpmsg8QQ12T9cwn82Kg8wRburB8Avnvo1AyBijcWrDS9SHHkyRXfxcSQ",
    extendedPublicKey: {
      base58String:
        "tpubDF1iV6MkK9BUvumPzq1MHxVGPNy2fFo1pEpcgnkriBdiE9EVrkndpmsg8QQ12T9cwn82Kg8wRburB8Avnvo1AyBijcWrDS9SHHkyRXfxcSQ",
      chaincode:
        "ff6e55a2ae1b0b14824a08130fc3029d3d193ee0c1eb922696d3658f641a0e2b",
      depth: 4,
      index: 0,
      parentFingerprint: 2525848640,
      path: "m/45'/1/1/0",
      pubkey:
        "02ca80ff7fdc10be77b65da0b82cada1646f0c113e6cc10a5feb0dfb5d0487793e",
      rootFingerprint: ROOT_FINGERPRINT,
      version: "043587cf",
    },
  },
  "m/45'": {
    pub: "03c060f4c111a276807fc3a88966cc1d3a683eef9226a034ee2cd6982b478fa8e2",
    xpub: "xpub69h9wvon4GzP2S3cLmiBsNdznt29YXBk2TSyQueZsacKZyzMqMR1Fj5JwSiKu8agDRiLWPfw9gSChLW2Yfgpe4tzuhLUD2vFfGsfbtTA3r7",
    tpub: "tpubDA4nUAdTmYwqJEETnxhH5HyN817oXugoa63GmThiDVNDKGf4uaG6QAk9BUo7RdXv1LFF7yBognGFPWzdwXY4XWMHyJ5mtZaVFEU5MtMfj7H",
    rootFingerprint: "f57ec65d",
  },
  "m/45'/0": {
    pub: "02b04ac39b566b7353b5bf8e164be83bf90b090e7516170e88a8cb6c88a860f0a3",
    tpub: "tpubDBAj15fFkLimiBmDqapikSS4qkmvAS8LijMey9S9fAyjq65ERgjuzaa6GonVQXugcrBzfpEoH6SPBzevfowZgYJ3apWcHbMPaNJnBRkbsRY",
    xpub: "xpub6Ao6Uqqa34mKSPaNPPqdYX6hWdgGB3dHB6mMcbP1KGDr5oQXMTtpr8uG2mhht2xSpwf64EivjzcLVpAKGx6Ko6qkXDmJc4h9zQiNRS5g9Cu",
    rootFingerprint: ROOT_FINGERPRINT,
  },
  "m/45'/0/0": {
    xpub: "xpub6CsGPeBifUqr2szHmpFuNZ7Yd2ZnJtr95kPKu13LT96ZvTUthRsZbunhdyRp4HkQ93Gqr78mC9KEMVmGxcG6bFR4xT3GKpkdtgpr8T85JXP",
    rootFingerprint: ROOT_FINGERPRINT,
  },
  "m/45'/1/0": {
    pub: "036b5cfe4b7f29cb36e5261ad74f8a4f8602f77628e8d9d120f5580d3ccafaef74",
    tpub: "tpubDDhFRuipvJKBgPBDFooShZNtnkLwMkGDZXA1KBUd8xruQ8AA4QdZaiQYWj1hDpDW8r7va9D7GHeEp5ZzMsj5uDRX4s3hk4eQgJm8jMAqkLC",
    rootFingerprint: ROOT_FINGERPRINT,
  },
  "m/45'/0'/4'/99'/2147483647/3/1": {
    pub: "0211aa5c03e290dc0110103c3d3f817500e76061d35ea89072286cb6f7962eda81",
    xpub: "xpub6LCRwXBN9moqsJKhToW6K5qfBfTguMXuZw67q1BUuaWRyYD56P1zhqbyXsHqoo4WPsjUfeiJPu4JXnhtUz6cHbYgX6AFfDhUnPfCvbZD3JZ",
    tpub: "tpubDLa4Tm13s3mJ96WYuzVBX1B2WnZLtk2y7ZgRBZEdFVGKipsnAbs5rHGomuNdLJ1kBnGPHEEAvztMDyCVsqwrB2zyaguZLkMiNMFcgX4e2rG",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/45'/1'/0'/0/0": {
    pub: "037226e92491b2cf9691152fc2e9a0a7cff8f9ab7ad1b24b6f6506d7c8bf18911b",
    tpub: "tpubDFqzhdm1iDvKkHNwVMxFnWZjBX4m1QQK4qNELiux6RXteZdPidpymFeWFKm5koNvjTiwPZb4i456pW5JBymaCcKumuhN7DYLwX9wwGAJ71H",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/48'/0'/0'/1'/0/0": {
    pub: "02c63c7ae511c9902e885da3e2fbb4a8f227eefc7f53eda3cad4d8f9389331b5be",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/48'/1'/0'/1'/0/0": {
    pub: "03ff8a79f5016243a3959e2216e51cf90034cf510b379a34e6fdf565b19852baa2",
    rootFingerprint: ROOT_FINGERPRINT,
    Upub: "Upub5T4XUooQzDXL58NCHk8ZCw9BsRSLCtnyHeZEExAq1XdnBFXiXVrHFuvvmh3TnCR7XmKHxkwqdACv68z7QKT1vwru9L1SZSsw8B2fuBvtSa6",
    tpub: "tpubDKSvECbEtm6ZgXE7kmn2Sbr81JzJhDGVzz2Arnn86R5a3i42w2mxNoPHcA9MRPtS36zy5d4m7FWWiCrVY1fXJ9YvSjNMB4DJ2tRDifqJQmp",
  },

  "m/48'/0'/0'/2'/0/0": {
    pub: "032817ba5e2b76f6e2fab1d985224516f2b77a9c181e210def81ec2be8e17007c9",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/48'/1'/0'/2'/0/0": {
    pub: "03ecf349ecf63fcd0ece9de7eb1abfb8f8b243fecc443bd62ef47744f0f6b7eef6",
    tpub: "tpubDKVKJjFQrticLSSf77TWYmvFq6XTALifW1shoo4snhfh7YGhMHcsCB2WwvfAbQGQDJy8EwuD6kjfvYPqSxJptSKqZDvzxQFcpYy88iS85kd",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/45'/1'/0'": {
    xpub: "tpubDDQubdBx9cbs16zUhpiM135EpvjSbVz7SGJyGg4rvRVEYdncZy3Kzjg6NjuFWcShiCyNqviWTBiZPb25p4WcaLppVmAuiPMrkR1kahNoioL",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  "m/45'/1'/4'/99'/2147483647/3/1": {
    tpub: "tpubDLaKPLMBXicb8HnBkcwxCxYNqnypFd4PFhRaF1DMQu3t1qh9zscD4F7rPhkGqWJkaB4zG1gVZ4pFP14qRiEajwUPjnRg873gaPvvZYnnTnt",
    rootFingerprint: ROOT_FINGERPRINT,
  },

  // P2SH-TESTNET
  "m/45'/1'/100'": {
    xpub: "tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1",
      chaincode:
        "eabe09a77940dd3e125be81bc25fcf04c611544f431967531bea80b12f2e72d2",
      depth: 3,
      index: 2147483748,
      parentFingerprint: 3168392141,
      path: "m/45'/1'/100'",
      pubkey:
        "02d419c2e37078468af97e07e240343a7e8691ef5dcca9fe59a7c774db9e6c4e62",
      rootFingerprint: ROOT_FINGERPRINT,
      version: "043587cf",
    },
    unchained: {
      base58String:
        "tpubDDinbKDXyddTUKcX6mv936Ux5utCJteq5S6EEKhfpM8CqN2rMAcccv6GecsB3cPt8eGL4e4K2eaZ9Jis9TGf7mbwBsRTN7ngnFR7yJZxBKC",
      chaincode:
        "1ade7f9d6099898d9851af05b488b94ad3ad4fcabab3970b8ee975fb0e33c517",
      depth: 3,
      index: 2147483748,
      parentFingerprint: 3872018966,
      path: "m/45'/1'/100'",
      pubkey:
        "03b30cf103f4775c366cdc9394dc42b9cfa9d05eb02fd07a2f98a8b1b22d867fec",
      rootFingerprint: "00000001",
      version: "043587cf",
    },
  },

  // P2SH_P2WSH-TESTNET
  "m/48'/1'/100'/1'": {
    xpub: "tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am",
      chaincode:
        "8f60b5470713d119000eb9f20716eaa21e4c7c96b1d8a605790e2a9621874b7b",
      depth: 4,
      index: 2147483649,
      parentFingerprint: 3880777331,
      path: "m/48'/1'/100'/1'",
      pubkey:
        "0374d98c47224e55e6244cfb407638d77ff1127f02c895983b5fe2d9174f37cd0c",
      rootFingerprint: "f57ec65d",
      version: "043587cf",
    },
    unchained: {
      base58String:
        "tpubDErWN5qfdLwY9ZJo9HWpxjcuEFuEBVHSbQbPqF35LQr3etWNGirKcgAa93DZ4DmtHm36p2gTf4aj6KybLqHaS3UePM5LtPqtb3d3dYVDs2F",
      chaincode:
        "0683fed20bd4e656ef5d6cb91dac510a80f1e425976dcc8b92060cca5a8fe0a9",
      depth: 4,
      index: 2147483649,
      parentFingerprint: 2163434281,
      path: "m/48'/1'/100'/1'",
      pubkey:
        "02fe3c640406f273d9acdd63ce45282cb9017c91e07b4b0118451823df95fd7821",
      rootFingerprint: "00000002",
      version: "043587cf",
    },
  },

  // P2WSH-TESTNET
  "m/48'/1'/100'/2'": {
    xpub: "tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM",
      chaincode:
        "b0d7d9283b766e79259dc38263ce06b474eeaefb3fab5f53946aaec6cd525f13",
      depth: 4,
      index: 2147483650,
      parentFingerprint: 3880777331,
      path: "m/48'/1'/100'/2'",
      pubkey:
        "0277d88e9d1395e980debe59476a17f202ba27c866d3637877e84958f2c65458ff",
      rootFingerprint: "f57ec65d",
      version: "043587cf",
    },
    unchained: {
      base58String:
        "tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj",
      chaincode:
        "d2be31d3de92e6183d5a4bb918048fdf960ba9438d391afb5f7ac69a1c24caf1",
      depth: 4,
      index: 2147483650,
      parentFingerprint: 2163434281,
      path: "m/48'/1'/100'/2'",
      pubkey:
        "03a602ec9955461233f89560337ff7af353b838471d7f1625768b4e290544a154f",
      rootFingerprint: "00000003",
      version: "043587cf",
    },
  },

  // P2SH-MAINNET
  "m/45'/0'/100'": {
    xpub: "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
      chaincode:
        "8f8521ebe6ac7fd6d6c468aa25cad78e34e9a4c02211a00bf2c6069ffdb11722",
      depth: 3,
      index: 2147483748,
      parentFingerprint: 1240308660,
      path: "m/45'/0'/100'",
      pubkey:
        "028257b519520e4a611b0fbf062bef41e815145b85e621887d267c695f2c508259",
      rootFingerprint: "f57ec65d",
      version: "0488b21e",
    },
    unchained: {
      base58String:
        "xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub",
      chaincode:
        "17f7729ba7f11cc95c201d023c0a7f8315101ef1ee5bd6fc8193f440eef4483f",
      depth: 3,
      index: 2147483748,
      parentFingerprint: 2097768017,
      path: "m/45'/0'/100'",
      pubkey:
        "03540225fdc5f92c686f3ffa3fe7a912c66e94f7988bd6db92d466d7917ff7447c",
      rootFingerprint: "00000004",
      version: "0488b21e",
    },
  },

  // P2SH_P2WSH-MAINNET
  "m/48'/0'/100'/1'": {
    xpub: "xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH",
      chaincode:
        "cd1a105c93ed7c2bc01e99445f81e8674bcea6042405cb4244af2c598ab995b4",
      depth: 4,
      index: 2147483649,
      parentFingerprint: 194150729,
      path: "m/48'/0'/100'/1'",
      pubkey:
        "030d7b4de2784978a3352adaacf3182c737de75f1c07778019aad15b0b99b640a4",
      rootFingerprint: "f57ec65d",
      version: "0488b21e",
    },
    unchained: {
      base58String:
        "xpub6EwJjKaiocGvo9f7XSGXGwzo1GLB1URxSZ5Ccp1wqdxNkhrSoqNQkC2CeMsU675urdmFJLHSX62xz56HGcnn6u21wRy6uipovmzaE65PfBp",
      chaincode:
        "a4b98329bb145e79fa7485653f2b9dc4d8ca9519ee0f00093809dc1d3d8b3cd2",
      depth: 4,
      index: 2147483649,
      parentFingerprint: 3203536812,
      path: "m/48'/0'/100'/1'",
      pubkey:
        "0366e35ecc712f790e698e502ba2b3ed00645c6994b59c8884aded1eb29af87ef2",
      rootFingerprint: "00000005",
      version: "0488b21e",
    },
  },

  // P2WSH-MAINNET
  "m/48'/0'/100'/2'": {
    xpub: "xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc",
    rootFingerprint: ROOT_FINGERPRINT,
    open_source: {
      base58String:
        "xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc",
      chaincode:
        "6b2c97052334fd0333464fd7d7b6ed9b7bae25f9bcabfa54f15e041ac22971fc",
      depth: 4,
      index: 2147483650,
      parentFingerprint: 194150729,
      path: "m/48'/0'/100'/2'",
      pubkey:
        "038fce535133ea87f989ca0908f7e8de0fa965d0a6649b71bf5c74244ece64d490",
      rootFingerprint: "f57ec65d",
      version: "0488b21e",
    },
    unchained: {
      base58String:
        "xpub6EwJjKaiocGvqSuM2jRZSuQ9HEddiFUFu9RdjE47zG7kXVNDQpJ3GyvskwYiLmvU4SBTNZyv8UH53QcmFEE23YwozE61V3dwzZJEFQr6H2b",
      chaincode:
        "8b7900c703cdd0f752b13b7a95ee9cb0d5a0df7fb9bfe4678b074edd3dc59a11",
      depth: 4,
      index: 2147483650,
      parentFingerprint: 3203536812,
      path: "m/48'/0'/100'/2'",
      pubkey:
        "030a3dd68cd8d3a896209c9eee0a6b8ec28783458882ce1a7362d8b60b34de3097",
      rootFingerprint: "00000006",
      version: "0488b21e",
    },
  },
};

const BRAIDS = [
  {
    network: Network.TESTNET,
    addressType: P2SH,
    extendedPublicKeys: [
      NODES["m/45'/1'/100'"].open_source,
      NODES["m/45'/1'/100'"].unchained,
    ],
    stringExtendedPublicKeys: [
      NODES["m/45'/1'/100'"].open_source.base58String,
      NODES["m/45'/1'/100'"].unchained.base58String,
    ],
    requiredSigners: 2,
    index: "0",
    pubKeySets: {
      index: {
        0: [
          "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
          "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
        ],
        1: [
          "0221ee4400a394e44b78592463eb07c9bae0cc9c2b11081be97df15cd561124e19",
          "03f31364b009d8019be56fa2569f336362e3e2b6a809623d87ffbef634ca6e1f27",
        ],
        48349: [
          "0308e27264d2b28b2e56104b36e562f69414027574998a53674b5db28a649f0f38",
          "037a911b48783ca769ae273ebe71d3a14d7af2301063c25564155e8764fa77c981",
        ],
      },
      path: {
        "0/0": [
          "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
          "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
        ],
      },
    },
    bip32Derivations: {
      index: {
        0: [
          {
            masterFingerprint: Buffer.from("f57ec65d", "hex"),
            path: "m/45'/1'/100'/0/0",
            pubkey: Buffer.from(
              "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
              "hex",
            ),
          },
          {
            masterFingerprint: Buffer.from("00000001", "hex"),
            path: "m/45'/1'/100'/0/0",
            pubkey: Buffer.from(
              "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
              "hex",
            ),
          },
        ],
        1: [
          {
            masterFingerprint: Buffer.from("f57ec65d", "hex"),
            path: "m/45'/1'/100'/0/1",
            pubkey: Buffer.from(
              "0221ee4400a394e44b78592463eb07c9bae0cc9c2b11081be97df15cd561124e19",
              "hex",
            ),
          },
          {
            masterFingerprint: Buffer.from("00000001", "hex"),
            path: "m/45'/1'/100'/0/1",
            pubkey: Buffer.from(
              "03f31364b009d8019be56fa2569f336362e3e2b6a809623d87ffbef634ca6e1f27",
              "hex",
            ),
          },
        ],
        48349: [
          {
            masterFingerprint: Buffer.from("f57ec65d", "hex"),
            path: "m/45'/1'/100'/0/48349",
            pubkey: Buffer.from(
              "0308e27264d2b28b2e56104b36e562f69414027574998a53674b5db28a649f0f38",
              "hex",
            ),
          },
          {
            masterFingerprint: Buffer.from("00000001", "hex"),
            path: "m/45'/1'/100'/0/48349",
            pubkey: Buffer.from(
              "037a911b48783ca769ae273ebe71d3a14d7af2301063c25564155e8764fa77c981",
              "hex",
            ),
          },
        ],
      },
      path: {
        "0/0": [
          {
            masterFingerprint: Buffer.from("f57ec65d", "hex"),
            path: "m/45'/1'/100'/0/0",
            pubkey: Buffer.from(
              "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
              "hex",
            ),
          },
          {
            masterFingerprint: Buffer.from("00000001", "hex"),
            path: "m/45'/1'/100'/0/0",
            pubkey: Buffer.from(
              "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
              "hex",
            ),
          },
        ],
      },
    },
  },
];

const MULTISIGS_BASE = [
  {
    network: Network.TESTNET,
    type: P2SH,
    bip32Path: "m/45'/1'/100'/0/0",
    policyHmac:
      "fb633e6a50ff05a1a090e07f2586d11f04b4ee8052cd0ce9ed816f8c4446cdc3",
    publicKey:
      "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
    publicKeys: [
      "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
      "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
    ],
    changePublicKeys: [
      "021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd51585",
      "03a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad0",
    ],
    redeemScriptOps:
      "OP_2 02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4 03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba OP_2 OP_CHECKMULTISIG",
    redeemScriptHex:
      "522102a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d42103938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba52ae",
    scriptOps: "OP_HASH160 8479072d5a550ee0900b5af7e70af575527a879d OP_EQUAL",
    scriptHex: "a9148479072d5a550ee0900b5af7e70af575527a879d87",
    address: "2N5KgAnFFpmk5TRMiCicRZDQS8FFNCKqKf1",
    utxos: [
      {
        txid: "65e7ef764030dabfb46e3ae1c357b0666d0dda722c9809fb73245d6d68665284",
        index: 1,
        amountSats: "100000", // 0.001 BTC
        value: 100000,
        transactionHex:
          "0200000000010149c912d0e5e46f6ef933038c7fb7e1d665db9ae56b67fa57fe4c3476a95cf954000000001716001400e2f78f987a5a4493cf062994dbde49d040a922feffffff02631418000000000017a914c7ab6d103180a48181847d35732e93e0ce9ab07387a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d870247304402202f538752e408b4817e7751ef243eee67d2242ca2061e8e6c9f22873247f10a8d02205b4622314efd733f12fc6557bc2f323ff2cbc1604ad97a351807e1be80875bc8012102e92335f6ecb1862f0eea0b99297f21bdb9beb9a1e8f41113788f5add306ca9fcee9b1800",
      },
      {
        txid: "ae9e1aa8312e102e806fa11d8e65965a624f88459e6bb5bcf48156a0c53e022a",
        index: 1,
        amountSats: "100000", // 0.001 BTC
        value: 100000,
        transactionHex:
          "0200000000010101745e1daa28c1705dbf73edd183e5ef91ad0918d97ad3e2ec2c69b548086f4d00000000171600142b0b522ba87db1646898118860449fcb2c69dae3feffffff02329642000000000017a9140f894f7e3b70b8741f830e066b6ef508a9f7479d87a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d870247304402202dc887e5d623bd974968285e9c8165cfa9facd943caf0f8472e7acef632fb94302205c60434061e6a4e45360d3b3c901a9c1dd148b38dd6c9623cd8fa2677587e632012102366538692ffb9622e75a05dc2004d85efa0ebc27b99961e694d88f9ede2b57cae49b1800",
      },
      {
        txid: "f243c1fbb85dd49da91477b89c76636202721be9c7df5ee6eee0c6a10861ae44",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        value: 100000,
        transactionHex:
          "02000000000101e5d6a0ffc5f8387a90c463bf614ae53609b72988c44afc6a577f22666bc971a7000000001716001428386489d15b1cddfd245b506b8ff2d909b18d36feffffff02a08601000000000017a9148479072d5a550ee0900b5af7e70af575527a879d8786ce18050000000017a914d2fb0a8958e55d4c6c3ff58f970fdbba3006ec078702473044022007a7186e6afb93de749b3a905d1c7437f470f97095ea410538b6ac33d15a947802205a66118c7dc2e14d7325a122eb0021f54e1dbd5dfb8fd56b253fa3782716af3d012103f5951ccccf00964d54eefa78280ae083e0f0f0cc6382fd27b3fbfdfeda8dd2c7b29b1800",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.TESTNET][P2SH],
          amountSats: "291590",
          value: 291590,
        },
        {
          address: CHANGE_ADDRESSES[Network.TESTNET][P2SH],
          amountSats: "7535",
          value: 7535,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/45'/1'/100'/1/0",
              pubkey: Buffer.from(
                "03a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad0",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000001", "hex"),
              path: "m/45'/1'/100'/1/0",
              pubkey: Buffer.from(
                "021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd51585",
                "hex",
              ),
            },
          ],
          redeemScript: Buffer.from(
            "5221021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd515852103a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad052ae",
            "hex",
          ),
        },
      ],
      hex: "0100000003845266686d5d2473fb09982c72da0d6d66b057c3e13a6eb4bfda304076efe7650100000000ffffffff2a023ec5a05681f4bcb56b9e45884f625a96658e1da16f802e102e31a81a9eae0100000000ffffffff44ae6108a1c6e0eee65edfc7e91b72026263769cb87714a99dd45db8fbc143f20000000000ffffffff02067304000000000017a914e3ba1151b75effbf7adc4673c83c8feec3ddc367876f1d00000000000017a914c34d63a6720866070490a8cb244c6bdc7ce2fa138700000000",
      signature: [
        "3045022100c82920c7d99e0a4055a8459c53362d15f5f8ce275322be8fd2045b43a5ae7f8d0220478b3856327a4b7809a1f858159bd437e4d93ca480e35bbe21c5cd914b6d722a01",
        "304402200464b13a701b9ac16eea29d1604a73d82ba5b3aed1435a8c2c3d4f940a2499ce02206be000a5cc605b284ab6c40039d56d49b7af304fea53079ec9ac838732b8765d01",
        "30450221008af4884f2bfbd4565e58c1e7d0f4cb36f8ebc210466d165c48311ddc40df7dc8022017196f4355f66621de0fed97002cfbd6ef7163c882a709f04e5dd0bbe960bcbd01",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      byteCeilingSignature: [
        "3044022004e0fcf5a1df39db158d754361f933fa07ceceb6a230e51658f3daa5d55013780220274f6257aa8b6a10f2f901340fdc083926b7c3b2acd3ba5304c8d3d41383131901",
        "304402200464b13a701b9ac16eea29d1604a73d82ba5b3aed1435a8c2c3d4f940a2499ce02206be000a5cc605b284ab6c40039d56d49b7af304fea53079ec9ac838732b8765d01",
        "3044022030a64cec8dc9affe3380264f81292b2bc41036a815d157f2cadeff4ef360e043022042d385ff128b7ed6a3f4197182de1b7d7960420a9183756b600b2f6fa2d4a7cc01",
      ],
    },
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from("f57ec65d", "hex"),
        path: "m/45'/1'/100'/0/0",
        pubkey: Buffer.from(
          "02a8513d9931896d5d3afc8063148db75d8851fd1fc41b1098ba2a6a766db563d4",
          "hex",
        ),
      },
      {
        masterFingerprint: Buffer.from("00000001", "hex"),
        path: "m/45'/1'/100'/0/0",
        pubkey: Buffer.from(
          "03938dd09bf3dd29ddf41f264858accfa40b330c98e0ed27caf77734fac00139ba",
          "hex",
        ),
      },
    ],
    changeBip32Derivation: [
      {
        masterFingerprint: Buffer.from("f57ec65d", "hex"),
        path: "m/45'/1'/100'/1/0",
        pubkey: Buffer.from(
          "03a00095df48367ed21e5c6edd50af4352311bf060eb100425cb7af4331aa1aad0",
          "hex",
        ),
      },
      {
        masterFingerprint: Buffer.from("00000001", "hex"),
        path: "m/45'/1'/100'/1/0",
        pubkey: Buffer.from(
          "021a049747120345fa9017fb42d8ff3d4fb1d2ef4c80546872c5da513babd51585",
          "hex",
        ),
      },
    ],
    braidDetails: {
      network: Network.TESTNET,
      addressType: P2SH,
      extendedPublicKeys: [
        NODES["m/45'/1'/100'"].open_source,
        NODES["m/45'/1'/100'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    changeBraidDetails: {
      network: Network.TESTNET,
      addressType: P2SH,
      extendedPublicKeys: [
        NODES["m/45'/1'/100'"].open_source,
        NODES["m/45'/1'/100'"].unchained,
      ],
      requiredSigners: 2,
      index: "1",
    },
    psbtNoChange:
      "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",
    psbt: "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",
    psbtWithGlobalXpub:
      "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",
    psbtPartiallySigned:
      "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",
    // FIXME: it appears ^that^ isn't ordering the pubkeys lexicographically... Doesn't seem to matter, it's still valid.
    psbtOrderedPartiallySigned:
      "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",
  },

  {
    network: Network.TESTNET,
    type: P2SH_P2WSH,
    bip32Path: "m/48'/1'/100'/1'/0/0",
    policyHmac:
      "209c71790a3745bc398a86dc20bc058101f44e3c05fb4430907464555fca61d7",
    publicKey:
      "026aaa7c4697ff439bfd6c7a70abf66253b4e329654b41ee2ad21d68b854e4a422",
    publicKeys: [
      "025566585b3a8066b7d0bba4d2b24c3c59a5f527d62c100bbb7073a7cb2565418c",
      "026aaa7c4697ff439bfd6c7a70abf66253b4e329654b41ee2ad21d68b854e4a422",
    ],
    witnessScriptOps:
      "OP_2 025566585b3a8066b7d0bba4d2b24c3c59a5f527d62c100bbb7073a7cb2565418c 026aaa7c4697ff439bfd6c7a70abf66253b4e329654b41ee2ad21d68b854e4a422 OP_2 OP_CHECKMULTISIG",
    witnessScriptHex:
      "5221025566585b3a8066b7d0bba4d2b24c3c59a5f527d62c100bbb7073a7cb2565418c21026aaa7c4697ff439bfd6c7a70abf66253b4e329654b41ee2ad21d68b854e4a42252ae",
    redeemScriptOps:
      "OP_0 deeb888c0a0a1871a3da4c2e75ffab5eb17e9d27fccd41bc3d683a2674f93aa1",
    redeemScriptHex:
      "0020deeb888c0a0a1871a3da4c2e75ffab5eb17e9d27fccd41bc3d683a2674f93aa1",
    scriptOps: "OP_HASH160 dac0270cbf87a65c0cf4fd2295eb44c756b288ec OP_EQUAL",
    scriptHex: "a914dac0270cbf87a65c0cf4fd2295eb44c756b288ec87",
    address: "2NDBsV6VBe4d2Ukp2XB644dg2xZ2SuWGkyG",
    utxos: [
      {
        txid: "429da41d05db69d7c006e91b15031e6d47faab15adba3c97059eeea093c36a23",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "02000000000101845266686d5d2473fb09982c72da0d6d66b057c3e13a6eb4bfda304076efe7650000000017160014a89baf1e6b16698bf34927d4a1f71270a57972d6feffffff02a08601000000000017a914dac0270cbf87a65c0cf4fd2295eb44c756b288ec871d8d16000000000017a91471e39bcec3aead7b1d45ad04aea8ad231be756768702473044022067dbe8b2623bd3948bfca811f934c1b512d7add1a09ff70a5b0e083edccbee780220325924a596ce2b567797b53eaa7eec3f6a989427829479ea5619ed72aaeffea40121023251e686167dbea8774b3510a78caa67550d566bd078c1285aa69ec0c561f767ee9b1800",
      },
      {
        txid: "d8edcd3ef4293a2554a147f048442d735fb54b901c1e39ffdb59448c1abae812",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "02000000000101236ac393a0ee9e05973cbaad15abfa476d1e03151be906c0d769db051da49d4201000000171600149df8fa8c17c034dd0e4f96c1eb0110113037ff71feffffff02a08601000000000017a914dac0270cbf87a65c0cf4fd2295eb44c756b288ec87d70515000000000017a9144b1d195a2cf70e3233aaf8e229d9d2a2da1b7845870247304402205c2e3d2cb7c8aa461aabb5c74210f795ec018db703910c9556f8b222012bb3ad02200f8c63fd859b575a6a762df0019f18ad917cf9de1e128e33bc540c4e5356b9ea012103280eb7fdde76317c63664c46bfe7602f6ff64a0dc22695c7e7093f34b40c5536ee9b1800",
      },
      {
        txid: "ff43f4cc8473341ce9effb91d715a4deb4e8a8cb669dd1d119a3a30552a829d1",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "02000000000101eef67cc41c10722be710952296866ea13ed1608acdf15e453e8d874e6a15c6d50000000017160014a989c1c6a3dbbf44d508d5f36df2d08c97e9fca4feffffff02a08601000000000017a914dac0270cbf87a65c0cf4fd2295eb44c756b288ec87a5b90d000000000017a914d0324b98895786d859ae3ee3df0c384249f1a4ab870247304402200621a08b242b807a0c39b6e0bf302e503b9a2596acdd218b176cb62afba31824022027bb2cc91b5ae57500a2e3c440d4d45cc42617f4db665a1b25974122b3789ddd01210209bb437e2e4658c6eb92c20a1ef459a2d1da50757dfba0c49a19dd3dbd621d87e09b1800",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.TESTNET][P2SH_P2WSH],
          amountSats: "291590",
        },
        {
          address: CHANGE_ADDRESSES[Network.TESTNET][P2SH_P2WSH],
          amountSats: "7922",
          value: 7922,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/48'/1'/100'/1'/1/0",
              pubkey: Buffer.from(
                "02ade44fc6568a4a334b1797140534707a5dd60c247a59523c577ad9eb59d798ba",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000002", "hex"),
              path: "m/48'/1'/100'/1'/1/0",
              pubkey: Buffer.from(
                "02489bfaa3dc33e5d2325295d9d1367f35a45fce09c96db6456fc712938dc2c0c7",
                "hex",
              ),
            },
          ],
          redeemScript: Buffer.from(
            "0020d6a0f404c62823b51ca0468c3d58e8a210d8afb377372060a58e0ad1471466e0",
            "hex",
          ),
          witnessScript: Buffer.from(
            "522102489bfaa3dc33e5d2325295d9d1367f35a45fce09c96db6456fc712938dc2c0c72102ade44fc6568a4a334b1797140534707a5dd60c247a59523c577ad9eb59d798ba52ae",
            "hex",
          ),
        },
      ],
      hex: "0100000003236ac393a0ee9e05973cbaad15abfa476d1e03151be906c0d769db051da49d420000000000ffffffff12e8ba1a8c4459dbff391e1c904bb55f732d4448f047a154253a29f43ecdedd80000000000ffffffffd129a85205a3a319d1d19d66cba8e8b4dea415d791fbefe91c347384ccf443ff0000000000ffffffff02067304000000000017a914e3ba1151b75effbf7adc4673c83c8feec3ddc36787f21e00000000000017a914413d62d98e2bbbf3f8f35f1d00cff58ee25eea178700000000",
      signature: [
        "3044022014672c552254e724b1677849ed4e973f9b60d2d5ae343772b6f2b2220ce1187002206f54a595bc1bc0c430936d27a5ccbd72c8d96aa5fe1fb9ef51778caabeb820dc01",
        "3045022100d23276b4de50e1fa41140e03d295551e868fb51bdf6cca303087be2bb2bf15b30220399b2f7678879eda4e59124cd7f3137b8ef9c2c1770119a2b5124503decc4b0501",
        "3045022100af3b112d039fb101483a87639b96439fa32d654a971d060afafa7a2ee08f3abc0220513fd7823d06d89c3cb58107ea9e94042cffe57ae5e6a7fe9c965cc3e961677401",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      byteCeilingSignature: [
        "3044022014672c552254e724b1677849ed4e973f9b60d2d5ae343772b6f2b2220ce1187002206f54a595bc1bc0c430936d27a5ccbd72c8d96aa5fe1fb9ef51778caabeb820dc01",
        "304402200d890939820ede1525454bf673e1b3682cb21e80f52304e57cc8e5d6882fe3bb022030f44d9c4213d38dc649feebcd48a3bd24de896da137e86618881a85915cdc0501",
        "3044022065bbb9e3ab14a82680bb845de2e55b84d224f773722807f78c7be69aa1ede2bb02206bbcd5bf52039bc3049e683a441efdcde011435625b8709c59cf9680c2837f2501",
      ],
    },
    braidDetails: {
      network: Network.TESTNET,
      addressType: P2SH_P2WSH,
      extendedPublicKeys: [
        NODES["m/48'/1'/100'/1'"].open_source,
        NODES["m/48'/1'/100'/1'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    psbtNoChange:
      "cHNidP8BAKUBAAAAAyNqw5Og7p4Flzy6rRWr+kdtHgMVG+kGwNdp2wUdpJ1CAAAAAAD/////Eui6GoxEWdv/OR4ckEu1X3MtREjwR6FUJTop9D7N7dgAAAAAAP/////RKahSBaOjGdHRnWbLqOi03qQV15H77+kcNHOEzPRD/wAAAAAA/////wEGcwQAAAAAABepFOO6EVG3Xv+/etxGc8g8j+7D3cNnhwAAAAAAAQEgoIYBAAAAAAAXqRTawCcMv4emXAz0/SKV60THVrKI7IcBBCIAIN7riIwKChhxo9pMLnX/q16xfp0n/M1BvD1oOiZ0+TqhAQVHUiECVWZYWzqAZrfQu6TSskw8WaX1J9YsEAu7cHOnyyVlQYwhAmqqfEaX/0Ob/Wx6cKv2YlO04yllS0HuKtIdaLhU5KQiUq4iBgJVZlhbOoBmt9C7pNKyTDxZpfUn1iwQC7twc6fLJWVBjBzvpdkWMAAAgAEAAIBkAACAAQAAgAAAAAAAAAAAIgYCaqp8Rpf/Q5v9bHpwq/ZiU7TjKWVLQe4q0h1ouFTkpCIc9X7GXTAAAIABAACAZAAAgAEAAIAAAAAAAAAAAAABASCghgEAAAAAABepFNrAJwy/h6ZcDPT9IpXrRMdWsojshwEEIgAg3uuIjAoKGHGj2kwudf+rXrF+nSf8zUG8PWg6JnT5OqEBBUdSIQJVZlhbOoBmt9C7pNKyTDxZpfUn1iwQC7twc6fLJWVBjCECaqp8Rpf/Q5v9bHpwq/ZiU7TjKWVLQe4q0h1ouFTkpCJSriIGAlVmWFs6gGa30Luk0rJMPFml9SfWLBALu3Bzp8slZUGMHO+l2RYwAACAAQAAgGQAAIABAACAAAAAAAAAAAAiBgJqqnxGl/9Dm/1senCr9mJTtOMpZUtB7irSHWi4VOSkIhz1fsZdMAAAgAEAAIBkAACAAQAAgAAAAAAAAAAAAAEBIKCGAQAAAAAAF6kU2sAnDL+HplwM9P0iletEx1ayiOyHAQQiACDe64iMCgoYcaPaTC51/6tesX6dJ/zNQbw9aDomdPk6oQEFR1IhAlVmWFs6gGa30Luk0rJMPFml9SfWLBALu3Bzp8slZUGMIQJqqnxGl/9Dm/1senCr9mJTtOMpZUtB7irSHWi4VOSkIlKuIgYCVWZYWzqAZrfQu6TSskw8WaX1J9YsEAu7cHOnyyVlQYwc76XZFjAAAIABAACAZAAAgAEAAIAAAAAAAAAAACIGAmqqfEaX/0Ob/Wx6cKv2YlO04yllS0HuKtIdaLhU5KQiHPV+xl0wAACAAQAAgGQAAIABAACAAAAAAAAAAAAAAA==",
    psbt: "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",
    psbtWithGlobalXpub:
      "cHNidP8BAMUBAAAAAyNqw5Og7p4Flzy6rRWr+kdtHgMVG+kGwNdp2wUdpJ1CAAAAAAD/////Eui6GoxEWdv/OR4ckEu1X3MtREjwR6FUJTop9D7N7dgAAAAAAP/////RKahSBaOjGdHRnWbLqOi03qQV15H77+kcNHOEzPRD/wAAAAAA/////wIGcwQAAAAAABepFOO6EVG3Xv+/etxGc8g8j+7D3cNnh/IeAAAAAAAAF6kUQT1i2Y4ru/P4818dAM/1juJe6heHAAAAAE8BBDWHzwSA82MpgAAAAQaD/tIL1OZW711suR2sUQqA8eQll23Mi5IGDMpaj+CpAv48ZAQG8nPZrN1jzkUoLLkBfJHge0sBGEUYI9+V/XghFAAAAAIwAACAAQAAgGQAAIABAACATwEENYfPBOdP9nOAAAABj2C1RwcT0RkADrnyBxbqoh5MfJax2KYFeQ4qliGHS3sDdNmMRyJOVeYkTPtAdjjXf/ESfwLIlZg7X+LZF083zQwU9X7GXTAAAIABAACAZAAAgAEAAIAAAQD3AgAAAAABAYRSZmhtXSRz+wmYLHLaDW1msFfD4TputL/aMEB27+dlAAAAABcWABSom68eaxZpi/NJJ9Sh9xJwpXly1v7///8CoIYBAAAAAAAXqRTawCcMv4emXAz0/SKV60THVrKI7IcdjRYAAAAAABepFHHjm87Drq17HUWtBK6orSMb51Z2hwJHMEQCIGfb6LJiO9OUi/yoEfk0wbUS163RoJ/3ClsOCD7cy+54AiAyWSSlls4rVneXtT6qfuw/apiUJ4KUeepWGe1yqu/+pAEhAjJR5oYWfb6od0s1EKeMqmdVDVZr0HjBKFqmnsDFYfdn7psYAAEBIKCGAQAAAAAAF6kU2sAnDL+HplwM9P0iletEx1ayiOyHAQQiACDe64iMCgoYcaPaTC51/6tesX6dJ/zNQbw9aDomdPk6oQEFR1IhAlVmWFs6gGa30Luk0rJMPFml9SfWLBALu3Bzp8slZUGMIQJqqnxGl/9Dm/1senCr9mJTtOMpZUtB7irSHWi4VOSkIlKuIgYCVWZYWzqAZrfQu6TSskw8WaX1J9YsEAu7cHOnyyVlQYwcAAAAAjAAAIABAACAZAAAgAEAAIAAAAAAAAAAACIGAmqqfEaX/0Ob/Wx6cKv2YlO04yllS0HuKtIdaLhU5KQiHPV+xl0wAACAAQAAgGQAAIABAACAAAAAAAAAAAAAAQD3AgAAAAABASNqw5Og7p4Flzy6rRWr+kdtHgMVG+kGwNdp2wUdpJ1CAQAAABcWABSd+PqMF8A03Q5PlsHrARARMDf/cf7///8CoIYBAAAAAAAXqRTawCcMv4emXAz0/SKV60THVrKI7IfXBRUAAAAAABepFEsdGVos9w4yM6r44inZ0qLaG3hFhwJHMEQCIFwuPSy3yKpGGqu1x0IQ95XsAY23A5EMlVb4siIBK7OtAiAPjGP9hZtXWmp2LfABnxitkXz53h4SjjO8VAxOU1a56gEhAygOt/3edjF8Y2ZMRr/nYC9v9koNwiaVx+cJPzS0DFU27psYAAEBIKCGAQAAAAAAF6kU2sAnDL+HplwM9P0iletEx1ayiOyHAQQiACDe64iMCgoYcaPaTC51/6tesX6dJ/zNQbw9aDomdPk6oQEFR1IhAlVmWFs6gGa30Luk0rJMPFml9SfWLBALu3Bzp8slZUGMIQJqqnxGl/9Dm/1senCr9mJTtOMpZUtB7irSHWi4VOSkIlKuIgYCVWZYWzqAZrfQu6TSskw8WaX1J9YsEAu7cHOnyyVlQYwcAAAAAjAAAIABAACAZAAAgAEAAIAAAAAAAAAAACIGAmqqfEaX/0Ob/Wx6cKv2YlO04yllS0HuKtIdaLhU5KQiHPV+xl0wAACAAQAAgGQAAIABAACAAAAAAAAAAAAAAQD3AgAAAAABAe72fMQcEHIr5xCVIpaGbqE+0WCKzfFeRT6Nh05qFcbVAAAAABcWABSpicHGo9u/RNUI1fNt8tCMl+n8pP7///8CoIYBAAAAAAAXqRTawCcMv4emXAz0/SKV60THVrKI7IeluQ0AAAAAABepFNAyS5iJV4bYWa4+498MOEJJ8aSrhwJHMEQCIAYhoIskK4B6DDm24L8wLlA7miWWrN0hixdstir7oxgkAiAnuyzJG1rldQCi48RA1NRcxCYX9NtmWhsll0Eis3id3QEhAgm7Q34uRljG65LCCh70WaLR2lB1ffugxJoZ3T29Yh2H4JsYAAEBIKCGAQAAAAAAF6kU2sAnDL+HplwM9P0iletEx1ayiOyHAQQiACDe64iMCgoYcaPaTC51/6tesX6dJ/zNQbw9aDomdPk6oQEFR1IhAlVmWFs6gGa30Luk0rJMPFml9SfWLBALu3Bzp8slZUGMIQJqqnxGl/9Dm/1senCr9mJTtOMpZUtB7irSHWi4VOSkIlKuIgYCVWZYWzqAZrfQu6TSskw8WaX1J9YsEAu7cHOnyyVlQYwcAAAAAjAAAIABAACAZAAAgAEAAIAAAAAAAAAAACIGAmqqfEaX/0Ob/Wx6cKv2YlO04yllS0HuKtIdaLhU5KQiHPV+xl0wAACAAQAAgGQAAIABAACAAAAAAAAAAAAAAAEAIgAg1qD0BMYoI7UcoEaMPVjoohDYr7N3NyBgpY4K0UcUZuABAUdSIQJIm/qj3DPl0jJSldnRNn81pF/OCclttkVvxxKTjcLAxyECreRPxlaKSjNLF5cUBTRwel3WDCR6WVI8V3rZ61nXmLpSriICAkib+qPcM+XSMlKV2dE2fzWkX84JyW22RW/HEpONwsDHHAAAAAIwAACAAQAAgGQAAIABAACAAQAAAAAAAAAiAgKt5E/GVopKM0sXlxQFNHB6XdYMJHpZUjxXetnrWdeYuhz1fsZdMAAAgAEAAIBkAACAAQAAgAEAAAAAAAAAAA==",
    psbtPartiallySigned:
      "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",
  },

  {
    network: Network.TESTNET,
    type: P2WSH,
    bip32Path: "m/48'/1'/100'/2'/0/0",
    policyHmac:
      "ff8e053e3417029696f0222355adb2b386a825c85a40fa4bb125501d59fef416",
    publicKey:
      "03bc34c50cf768f802290269c2ddabd086c73514c880cecb6db3f67676a4b72469",
    publicKeys: [
      "035a763e0480f858ef626b649fa0efe9eb647abbf77db54f3af904d2de50c4342d",
      "03bc34c50cf768f802290269c2ddabd086c73514c880cecb6db3f67676a4b72469",
    ],
    witnessScriptOps:
      "OP_2 035a763e0480f858ef626b649fa0efe9eb647abbf77db54f3af904d2de50c4342d 03bc34c50cf768f802290269c2ddabd086c73514c880cecb6db3f67676a4b72469 OP_2 OP_CHECKMULTISIG",
    witnessScriptHex:
      "5221035a763e0480f858ef626b649fa0efe9eb647abbf77db54f3af904d2de50c4342d2103bc34c50cf768f802290269c2ddabd086c73514c880cecb6db3f67676a4b7246952ae",
    scriptOps:
      "OP_0 ba2514cdd3a3c202eb4394e550a0fc116cb834f34662a019be8a52c62351d068",
    scriptHex:
      "0020ba2514cdd3a3c202eb4394e550a0fc116cb834f34662a019be8a52c62351d068",
    address: "tb1qhgj3fnwn50pq966rjnj4pg8uz9ktsd8nge32qxd73ffvvg636p5q54g7m0",
    utxos: [
      {
        txid: "84df8dcc9b86e8c7bb39ce0ba9f577ec750f0b64df97a5c9559cf39243a1f501",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "020000000001018342873aa48ba6b2e5a796f34b7431bb56f9c569a6bd8f7e539cb3147a86b3f80000000000feffffff02a086010000000000220020ba2514cdd3a3c202eb4394e550a0fc116cb834f34662a019be8a52c62351d068a9873f0000000000160014208e4178e48f2d270a06475ad8caeb2e01f55ae80247304402205369dedb14963e0bfa22748a546e03e47fcf994c85944ae0d6b507d15ebba57d022073cdd6c8af057aabac652ec438de7fc7e201d6a3b8619e54a2db5c1b509865e9012103ba504ae1099d8f38163c90540fa10e09cac4fa2df95b8b91bc2aba01571c27d9ee9b1800",
      },
      {
        txid: "f010998e033355636c2ba34af753cd6d5f198889a379bc30625bb38f646f3d72",
        index: 0,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "0200000000010144ae6108a1c6e0eee65edfc7e91b72026263769cb87714a99dd45db8fbc143f201000000171600142ff3a6303add9138957b880c73a331cf718a418ffeffffff02a086010000000000220020ba2514cdd3a3c202eb4394e550a0fc116cb834f34662a019be8a52c62351d068364717050000000016001403f4d726aec3c06aa8a31b230e9997288faea72a02473044022032368bd2b2441840850b62f86bfa4434854b5e83da1e5cac43cd613a88f91839022042b2f9f7ea20c97d889a89b0f7cb649b8bb3acc20c4207b5665e235b340766a101210216bb0c99eb498379d5c7b7ad0f3afb9ff3eec9be622fffe821c5456003f22c02ee9b1800",
      },
      {
        txid: "f8b3867a14b39c537e8fbda669c5f956bb31744bf396a7e5b2a68ba43a874283",
        index: 1,
        amountSats: "100000", // 0.001 BTC
        transactionHex:
          "020000000001012a023ec5a05681f4bcb56b9e45884f625a96658e1da16f802e102e31a81a9eae0000000017160014c4733d80022a7a3dde9a7e3112b39e390500713cfeffffff02e20e410000000000160014060213b00b3d902d2bd7e90c4b7e9e34830d2f9da086010000000000220020ba2514cdd3a3c202eb4394e550a0fc116cb834f34662a019be8a52c62351d0680247304402201504b1dbf14cf216c7de1fa78dd649a319b2274361034aaa9bc82473632650d1022013da0cb0bb740a95010821e451e7fc699bb2489e71c20093d8d3cd3f4e8c2efc012102db49c46b1a64061d15d0faa234e8da59defe0f4164009e73be9be540265cf0caee9b1800",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.TESTNET][P2WSH],
          amountSats: "291590",
        },
        {
          address: CHANGE_ADDRESSES[Network.TESTNET][P2WSH],
          amountSats: "8023",
          value: 8023,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/48'/1'/100'/2'/1/0",
              pubkey: Buffer.from(
                "02f45fa86e1ac4e69c0f183c769db9157740586c78b24c495be0404c1e6ae029e5",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000003", "hex"),
              path: "m/48'/1'/100'/2'/1/0",
              pubkey: Buffer.from(
                "03610bec03e459c7fa28c9a36c4c9db6e2c4bc2ae4e2764aa3d035599c7052e33f",
                "hex",
              ),
            },
          ],
          witnessScript: Buffer.from(
            "522102f45fa86e1ac4e69c0f183c769db9157740586c78b24c495be0404c1e6ae029e52103610bec03e459c7fa28c9a36c4c9db6e2c4bc2ae4e2764aa3d035599c7052e33f52ae",
            "hex",
          ),
        },
      ],
      hex: "010000000301f5a14392f39c55c9a597df640b0f75ec77f5a90bce39bbc7e8869bcc8ddf840000000000ffffffff723d6f648fb35b6230bc79a38988195f6dcd53f74aa32b6c635533038e9910f00000000000ffffffff8342873aa48ba6b2e5a796f34b7431bb56f9c569a6bd8f7e539cb3147a86b3f80100000000ffffffff0206730400000000002200202de5497b772a7cbd61cd60a359cb412099da25725671d1e1a00de8ec46752dc8571f000000000000220020bc964191e076e9fd328cf115ebe35bd3d9b7b4f937c71c41cd19a08e9100635400000000",
      signature: [
        "304402202269a8c0bd3baa357cb0bad6dc8c1808bdf1b9f4ded6ad321f25dfb3b9f8fe1002206cad4a70c21531032c586f6e2016c657dbd8c69a01c806e3382465269876b5db01",
        "304402205a414f8c1c55ee8d3d05cc6e3b5accc413297baa3d061c570c44af3ccbd01b7902205d99aad28720be4c4f80afc64870c3edbb9f28e8ddf5ac6a0d1ab149699c61b501",
        "30440220019a8b7a875af9429305a89b63d919aeae3bf87354e4043958b51fa1f5525df902200723f42838800a698a5c97bdffc53a80e6901346cc8e6000e52a92180f41462f01",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      // Here all signatures were already <= 71 bytes in length, so duplicate
      byteCeilingSignature: [
        "304402202269a8c0bd3baa357cb0bad6dc8c1808bdf1b9f4ded6ad321f25dfb3b9f8fe1002206cad4a70c21531032c586f6e2016c657dbd8c69a01c806e3382465269876b5db01",
        "304402205a414f8c1c55ee8d3d05cc6e3b5accc413297baa3d061c570c44af3ccbd01b7902205d99aad28720be4c4f80afc64870c3edbb9f28e8ddf5ac6a0d1ab149699c61b501",
        "30440220019a8b7a875af9429305a89b63d919aeae3bf87354e4043958b51fa1f5525df902200723f42838800a698a5c97bdffc53a80e6901346cc8e6000e52a92180f41462f01",
      ],
    },
    braidDetails: {
      network: Network.TESTNET,
      addressType: P2WSH,
      extendedPublicKeys: [
        NODES["m/48'/1'/100'/2'"].open_source,
        NODES["m/48'/1'/100'/2'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    psbtNoChange:
      "cHNidP8BALABAAAAAwH1oUOS85xVyaWX32QLD3Xsd/WpC845u8fohpvMjd+EAAAAAAD/////cj1vZI+zW2IwvHmjiYgZX23NU/dKoytsY1UzA46ZEPAAAAAAAP////+DQoc6pIumsuWnlvNLdDG7VvnFaaa9j35TnLMUeoaz+AEAAAAA/////wEGcwQAAAAAACIAIC3lSXt3Kny9Yc1go1nLQSCZ2iVyVnHR4aAN6OxGdS3IAAAAAAABASughgEAAAAAACIAILolFM3To8IC60OU5VCg/BFsuDTzRmKgGb6KUsYjUdBoAQVHUiEDWnY+BID4WO9ia2SfoO/p62R6u/d9tU86+QTS3lDENC0hA7w0xQz3aPgCKQJpwt2r0IbHNRTIgM7LbbP2dnaktyRpUq4iBgNadj4EgPhY72JrZJ+g7+nrZHq79321Tzr5BNLeUMQ0LRzvpdkWMAAAgAEAAIBkAACAAgAAgAAAAAAAAAAAIgYDvDTFDPdo+AIpAmnC3avQhsc1FMiAzstts/Z2dqS3JGkc9X7GXTAAAIABAACAZAAAgAIAAIAAAAAAAAAAAAABASughgEAAAAAACIAILolFM3To8IC60OU5VCg/BFsuDTzRmKgGb6KUsYjUdBoAQVHUiEDWnY+BID4WO9ia2SfoO/p62R6u/d9tU86+QTS3lDENC0hA7w0xQz3aPgCKQJpwt2r0IbHNRTIgM7LbbP2dnaktyRpUq4iBgNadj4EgPhY72JrZJ+g7+nrZHq79321Tzr5BNLeUMQ0LRzvpdkWMAAAgAEAAIBkAACAAgAAgAAAAAAAAAAAIgYDvDTFDPdo+AIpAmnC3avQhsc1FMiAzstts/Z2dqS3JGkc9X7GXTAAAIABAACAZAAAgAIAAIAAAAAAAAAAAAABASughgEAAAAAACIAILolFM3To8IC60OU5VCg/BFsuDTzRmKgGb6KUsYjUdBoAQVHUiEDWnY+BID4WO9ia2SfoO/p62R6u/d9tU86+QTS3lDENC0hA7w0xQz3aPgCKQJpwt2r0IbHNRTIgM7LbbP2dnaktyRpUq4iBgNadj4EgPhY72JrZJ+g7+nrZHq79321Tzr5BNLeUMQ0LRzvpdkWMAAAgAEAAIBkAACAAgAAgAAAAAAAAAAAIgYDvDTFDPdo+AIpAmnC3avQhsc1FMiAzstts/Z2dqS3JGkc9X7GXTAAAIABAACAZAAAgAIAAIAAAAAAAAAAAAAA",
    psbt: "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",
    psbtWithGlobalXpub:
      "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",
    psbtPartiallySigned:
      "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",
  },

  {
    network: Network.MAINNET,
    type: P2SH,
    bip32Path: "m/45'/0'/100'/0/0",
    policyHmac:
      "c9f3e4cb4ca50a9a7042e72d0099e2848431b7008773cd96f40bc406a71ceb33",
    publicKey:
      "02583c4776b51691f4e036c8e0eb160f3464a2de9ae4c6818b7945c78fc6bace79",
    publicKeys: [
      "02583c4776b51691f4e036c8e0eb160f3464a2de9ae4c6818b7945c78fc6bace79",
      "02b024e76d6c2d8c22d9550467e97ced251ead5592529f9c813c1d818f7e89a35a",
    ],
    redeemScriptOps:
      "OP_2 02583c4776b51691f4e036c8e0eb160f3464a2de9ae4c6818b7945c78fc6bace79 02b024e76d6c2d8c22d9550467e97ced251ead5592529f9c813c1d818f7e89a35a OP_2 OP_CHECKMULTISIG",
    redeemScriptHex:
      "522102583c4776b51691f4e036c8e0eb160f3464a2de9ae4c6818b7945c78fc6bace792102b024e76d6c2d8c22d9550467e97ced251ead5592529f9c813c1d818f7e89a35a52ae",
    scriptOps: "OP_HASH160 f18bcbf45f7805fe663339d838d5c8a086d79e53 OP_EQUAL",
    scriptHex: "a914f18bcbf45f7805fe663339d838d5c8a086d79e5387",
    address: "3PiCF26aq57Wo5DJEbFNTVwD1bLCUEpAYZ",
    utxos: [
      {
        txid: "456813be8389d17e945c0b91b5112938a7268bb7c6721147bce6521eeabde7b0",
        index: 0,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "0200000000010216ac0943cd43bb8168c591016a0a5439b3124427bf5df0582f68f2ae52fc86560000000017160014f827ea2db54a62d5027b411ff9d2d6e9234796a8feffffffd9bde17e907b90631edc22f83a4f849d9527e4a3d3b3096fdfc8131eeb8c4c8201000000171600141aabdcba4979e2772ad5da60e757f6d992c09d41feffffff02102700000000000017a914f18bcbf45f7805fe663339d838d5c8a086d79e5387ac0700000000000017a914df0aa2a92361822c637c0e44fb1cae2f1a22f0df870247304402204f91360c63c8ce6c98ebec06a6710e5f016cac8d8733c3855401f821f437c5650220611c87d76c2e72accb892cff110f0837d6d60942fdaea2edf86098af355016570121033c5f5b6c028649dedbe089033d6736788199041567b510d88448d0d1bcd5675d024730440220296ce4c551c6945176d8f057c9d05d7a21aa7ccb4c1d8d692c8937b00e3a9be4022024a514a72e4c52ee9c7bcf5c60dd7fb8ee4e83059d0869d85a6659e4d6737535012103c86c2e648f8e34be880b5f12d33bfd712c552ebf68fe01a1daebf2a24a44cbfa99490900",
      },
      {
        txid: "5bbf64e036e46bf93dadc770f0415f6566453b9ae2d932df00fd5b5e49bdbbd5",
        index: 1,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "0200000000010133f0ca4e94d7ad6673a3777ed56fbcf0d2ebc5f6578578746c989ba2ec20cfaa0300000017160014c530831acb421c9ac89d1a83113acf4b46b3a2affeffffff02f00602000000000017a914939b4923002a1f44854a671be64cf55846d4f5f887102700000000000017a914f18bcbf45f7805fe663339d838d5c8a086d79e5387024730440220044dac81ef05b655fb6e72a21423f2db9fd4fc938243ba8293f7f0f24c7e56e202201fa946e11c0be1eeae81fe2418a8d30bf39048fc110e6aaf253149ef47dc8d28012103fb20014d5c613fc2d5a588cf6ea9292afa843a8e5f14dfe9d4e18e5cb158ecee99490900",
      },
      {
        txid: "74c11de1a3f1a5daa06441d78d7fb45609b3415721466c6256bffd881451cda5",
        index: 0,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000101d748779bd254dce3523c691a9ce1bf8836d524ba97d26cc24127e3367a2027f600000000171600141aabdcba4979e2772ad5da60e757f6d992c09d41feffffff02102700000000000017a914f18bcbf45f7805fe663339d838d5c8a086d79e5387025b00000000000017a9145d0e078b76ff5e990bf628bf28f593d217caaeb9870247304402206b99e2475b2424db1e47fdb9689036fa44d5c9dea3e5419f26759eed86920c91022011c38e5e69280e62353088d5bf28ecf15a3ff348edcad8c31e441f9f57da172a012103c86c2e648f8e34be880b5f12d33bfd712c552ebf68fe01a1daebf2a24a44cbfa99490900",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.MAINNET][P2SH],
          amountSats: "21590",
        },
        {
          address: CHANGE_ADDRESSES[Network.MAINNET][P2SH],
          amountSats: "7535",
          value: 7535,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/45'/0'/100'/1/0",
              pubkey: Buffer.from(
                "0360fc2c3410b3700822c31d4901640cf763714f30ff45f887e86bee8733509ebe",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000004", "hex"),
              path: "m/45'/0'/100'/1/0",
              pubkey: Buffer.from(
                "039c064999a7c238c31ee018b1b7983fb657edfdf23f4d46bde919817a39cbcbb3",
                "hex",
              ),
            },
          ],
          redeemScript: Buffer.from(
            "52210360fc2c3410b3700822c31d4901640cf763714f30ff45f887e86bee8733509ebe21039c064999a7c238c31ee018b1b7983fb657edfdf23f4d46bde919817a39cbcbb352ae",
            "hex",
          ),
        },
      ],
      hex: "0100000003b0e7bdea1e52e6bc471172c6b78b26a7382911b5910b5c947ed18983be1368450000000000ffffffffd5bbbd495e5bfd00df32d9e29a3b4566655f41f070c7ad3df96be436e064bf5b0100000000ffffffffa5cd511488fdbf56626c46215741b30956b47f8dd74164a0daa5f1a3e11dc1740000000000ffffffff02565400000000000017a91480b2477411a78b2a939d7da08bfa1939a871a4b9876f1d00000000000017a914335131487569e42724cb7fe4818a348aa6bc7afa8700000000",
      signature: [
        "30440220518d201f915aa1379e4dfd986b6f6bf083e07f9d132ecf1e29d79e292f4c610402207df5c8ff1b0e5958d60b45b5475f3a88065ab64d5f3e6f56162d4f32c423b52c01",
        "3045022100f401617786808a938b0ae8a954ea32a0466eb6f49ae0b196fc0ae50ff43036f002200f72df0f6bb0710eeb61999a96d005f9853183ecbdad7bc5fb65f1169796f49d01",
        "3044022077baef2ae7425a978d67356ea033274909bbd787076f9b5567268e1c1548db76022022367961eea5cb177ccf974e6df1091aa4ee7ea9451afb157541a71078ecd97d01",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      byteCeilingSignature: [
        "30440220518d201f915aa1379e4dfd986b6f6bf083e07f9d132ecf1e29d79e292f4c610402207df5c8ff1b0e5958d60b45b5475f3a88065ab64d5f3e6f56162d4f32c423b52c01",
        "3044022000cd3b6d7c190049e051421d50310da4ca0f46471b517f41b18e2a26897454f8022026fd1a3e0874a9ca7f8c359a9044b38c2f5be3004b1fe10d6da51c3cbab546af01",
        "3044022077baef2ae7425a978d67356ea033274909bbd787076f9b5567268e1c1548db76022022367961eea5cb177ccf974e6df1091aa4ee7ea9451afb157541a71078ecd97d01",
      ],
    },
    braidDetails: {
      network: Network.MAINNET,
      addressType: P2SH,
      extendedPublicKeys: [
        NODES["m/45'/0'/100'"].open_source,
        NODES["m/45'/0'/100'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    psbtNoChange:
      "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",
    psbt: "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",
    psbtWithGlobalXpub:
      "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",
    psbtPartiallySigned:
      "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",
  },

  {
    network: Network.MAINNET,
    type: P2SH_P2WSH,
    bip32Path: "m/48'/0'/100'/1'/0/0",
    policyHmac:
      "d7461610bc48a84f199e1c9a081227d8f36a0c32e8adb141f4bc410aa999375f",
    publicKey:
      "0342997f6fcd7fa4a3c7e290c8867148992e6194742120985c664d9e214461af7c",
    publicKeys: [
      "0328b57c2f65c98ed7cde4bca54cc3a13afa4d47117fd9dae06663a4169e05ef86",
      "0342997f6fcd7fa4a3c7e290c8867148992e6194742120985c664d9e214461af7c",
    ],
    witnessScriptOps:
      "OP_2 0328b57c2f65c98ed7cde4bca54cc3a13afa4d47117fd9dae06663a4169e05ef86 0342997f6fcd7fa4a3c7e290c8867148992e6194742120985c664d9e214461af7c OP_2 OP_CHECKMULTISIG",
    witnessScriptHex:
      "52210328b57c2f65c98ed7cde4bca54cc3a13afa4d47117fd9dae06663a4169e05ef86210342997f6fcd7fa4a3c7e290c8867148992e6194742120985c664d9e214461af7c52ae",
    redeemScriptOps:
      "OP_0 049d6e945074525b03e0487759368ff663f10bb88976017bdd9d3cce849085e5",
    redeemScriptHex:
      "0020049d6e945074525b03e0487759368ff663f10bb88976017bdd9d3cce849085e5",
    scriptOps: "OP_HASH160 1abcf8cea321ca874de4beb4f975077fe864a54a OP_EQUAL",
    scriptHex: "a9141abcf8cea321ca874de4beb4f975077fe864a54a87",
    address: "348PsXezZAHcW7RjmCoMJ8PHWx1QBTXJvm",
    utxos: [
      {
        txid: "2062282a8c6644740d4a5c85a74ad21c6a0fda8d753e8a4bdfba09a26d20eb40",
        index: 1,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000104e7f99e90ef69f7bf577cc34c695469d1ef2e021320f4f5d312a439fa5119214c010000001716001458ff1cdc218f9baaf9a5ac278206e8f8cc2d55a2feffffffb0e7bdea1e52e6bc471172c6b78b26a7382911b5910b5c947ed18983be13684501000000171600144245d8387278181e8f5d61e35427fa055f891ccefeffffffb68f87f28f11710b7005426340c4c4d9795c331f027549bd383b6f179d709a280000000000feffffff79d037447d0706083212ec168a5b3e24f97bd7a9e0099b105b042781853780810000000017160014ec62a1ca200abdc755c8b34faae78202b6dd3fc3feffffff02920500000000000017a91449e9133aaffa9192d802655f2db8fa1db9eec00887102700000000000017a9141abcf8cea321ca874de4beb4f975077fe864a54a8702473044022069c0985164d17c746fb818179f969740e39d6569ec5a144a83c72de2473b6b8002204f62217bbb2b34efedda454c85dfa960788d4c7f538c7fdf22c5074f5a2c78bb012103e74f757ceb0288ac7c051b7db87fb059a19eac05a480c65c913068a6f80d23b80247304402200f827b64e5feb6071f5d4278e4fa3643e164316ab897f53df0482658e753110202201143f4348812122322876aa29a7285cc8ea51a3e32fb0392fd2e6422d63793f501210350de53693c9da7f849cab9479304ee2b2af317f28ee00ed1e112cd95bc200bd2024730440220025e0eff09b09817e8d595c01bfd2fdba6082e2c4f8f286545f9a2a2e9f148ba02205725704e14c2969a1afcf0084dd29bdbc5136b75438158ecf76992e3c24b561f012102e24e7df260cb56ffbcdb52bea6f8c8bc267d849f5799cf919e32574568ed85d602473044022011bbd9ec6338f174fa0a386acb1fb4dfe348343b2eed5017b11e96151ad214ca02207e7bb5443f34d33147f28fafb4cd661dccc7c6993ad7c58ed47197c85b48c849012102587990c5f71d9e4c894069589845c5f2649b83006160b9d1b8f31bab54133a9399490900",
      },
      {
        txid: "4c211951fa39a412d3f5f42013022eefd16954694cc37c57bff769ef909ef9e7",
        index: 0,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000101a5cd511488fdbf56626c46215741b30956b47f8dd74164a0daa5f1a3e11dc1740100000017160014eeeff0e10da2973449331a9e48f246b18488e965feffffff02102700000000000017a9141abcf8cea321ca874de4beb4f975077fe864a54a87bd2a00000000000017a91445a77947cf42db7fec41cec25c28af0b73becf2e8702473044022044858a87117fd8af2fa92db123935019d76ee9157fb9a48a9cd97ee085b128f90220572b799eae6f3f8cf6aa287450ff46b21588840dabeeb63e57c6f3f320f49eea0121025abd982f0c9ebbb7238900326af437c393eb2c5e875f5bd63152ddd756e5049a99490900",
      },
      {
        txid: "c5d0e548e2332450057ce5bd2a6fb720b2c8bd6f595ed11fdba71488b1bf7b31",
        index: 1,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000101d5bbbd495e5bfd00df32d9e29a3b4566655f41f070c7ad3df96be436e064bf5b00000000171600140e021c1c3313ef991acd0c5d9f63ca12ce110005feffffff02abd601000000000017a9145d27db58f13d4851260174d9dc9eacdf62074a4e87102700000000000017a9141abcf8cea321ca874de4beb4f975077fe864a54a8702473044022077b4f0f2d1480443f8b29ed68a29b606b83a3ebbda4349bf813c33330b7f4aa902202061823fd25330b6c0adb68afce4546ada193eb63982f28a7562bc605ea6b0e5012102930a7b8a6fd51a8ce36039bacf160239cfb7dbc72dc1a051aaac333bc7f8e7924e490900",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.MAINNET][P2SH_P2WSH],
          amountSats: "21590",
        },
        {
          address: CHANGE_ADDRESSES[Network.MAINNET][P2SH_P2WSH],
          amountSats: "7922",
          value: 7922,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/48'/0'/100'/1'/1/0",
              pubkey: Buffer.from(
                "029997f9c7094881d241b13b14d8567cdedcaccd411844c55fe09b0b8ca1b254b1",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000005", "hex"),
              path: "m/48'/0'/100'/1'/1/0",
              pubkey: Buffer.from(
                "0272834f652444910e1cc157b99f52fd6052826a11f9099879a55490f6b8190be7",
                "hex",
              ),
            },
          ],
          redeemScript: Buffer.from(
            "0020581e9806610ac1c8249dc3446e01f8365ecfc506462379d6948baa0d128c519a",
            "hex",
          ),
          witnessScript: Buffer.from(
            "52210272834f652444910e1cc157b99f52fd6052826a11f9099879a55490f6b8190be721029997f9c7094881d241b13b14d8567cdedcaccd411844c55fe09b0b8ca1b254b152ae",
            "hex",
          ),
        },
      ],
      hex: "010000000340eb206da209badf4b8a3e758dda0f6a1cd24aa7855c4a0d7444668c2a2862200100000000ffffffffe7f99e90ef69f7bf577cc34c695469d1ef2e021320f4f5d312a439fa5119214c0000000000ffffffff317bbfb18814a7db1fd15e596fbdc8b220b76f2abde57c05502433e248e5d0c50100000000ffffffff02565400000000000017a91480b2477411a78b2a939d7da08bfa1939a871a4b987f21e00000000000017a91407339e0dab9b912f9972f96e7d6c6d09e38b7c828700000000",
      signature: [
        "3045022100e218d80acbbf41b2ad630d7c4b7eb345934466cf205ac119bd41ce2bd3ab0daa022048a1238dc01d06ed57cf5715d5e74397fcb433001b1e39a6821d653ea0ac683601",
        "3045022100bdfd743229bafc6ff66524413528ac920d8bc5ba002f5112d24a6c19f2035247022073b55186e98329c3d0790d701107491d8a06ccc593f87b00df511bf41fe4d5c101",
        "30440220342d08c89ee1fa13f855eddb253855f94b17ca80390893c832615d35cccdac1102205b9381e2021ed174aff66adcd83a6baa9af0ad98de5f8c66aad1c75f030e275b01",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      byteCeilingSignature: [
        "3044022043898cd12541009f4612dc263af1542c785f76d0d17d174d9a6f70d86aa8a5b50220332b539f6afec6de56e399205ef83c9feb4568dff3ca1795ce56081a45978dd401",
        "3044022002953c3d45efc91aab969abfdbe603458a5738a00f8faa5415df6dba0e305a8002200cae08ed7df228c4fdc7725429090dabbad6e5abee729f78519df21ee7fd75f101",
        "30440220342d08c89ee1fa13f855eddb253855f94b17ca80390893c832615d35cccdac1102205b9381e2021ed174aff66adcd83a6baa9af0ad98de5f8c66aad1c75f030e275b01",
      ],
    },
    braidDetails: {
      network: Network.MAINNET,
      addressType: P2SH_P2WSH,
      extendedPublicKeys: [
        NODES["m/48'/0'/100'/1'"].open_source,
        NODES["m/48'/0'/100'/1'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    psbtNoChange:
      "cHNidP8BAKUBAAAAA0DrIG2iCbrfS4o+dY3aD2oc0kqnhVxKDXREZowqKGIgAQAAAAD/////5/mekO9p979XfMNMaVRp0e8uAhMg9PXTEqQ5+lEZIUwAAAAAAP////8xe7+xiBSn2x/RXllvvciyILdvKr3lfAVQJDPiSOXQxQEAAAAA/////wFWVAAAAAAAABepFICyR3QRp4sqk519oIv6GTmocaS5hwAAAAAAAQEgECcAAAAAAAAXqRQavPjOoyHKh03kvrT5dQd/6GSlSocBBCIAIASdbpRQdFJbA+BId1k2j/Zj8Qu4iXYBe92dPM6EkIXlAQVHUiEDKLV8L2XJjtfN5LylTMOhOvpNRxF/2drgZmOkFp4F74YhA0KZf2/Nf6Sjx+KQyIZxSJkuYZR0ISCYXGZNniFEYa98Uq4iBgMotXwvZcmO183kvKVMw6E6+k1HEX/Z2uBmY6QWngXvhhzvpdkWMAAAgAAAAIBkAACAAQAAgAAAAAAAAAAAIgYDQpl/b81/pKPH4pDIhnFImS5hlHQhIJhcZk2eIURhr3wc9X7GXTAAAIAAAACAZAAAgAEAAIAAAAAAAAAAAAABASAQJwAAAAAAABepFBq8+M6jIcqHTeS+tPl1B3/oZKVKhwEEIgAgBJ1ulFB0UlsD4Eh3WTaP9mPxC7iJdgF73Z08zoSQheUBBUdSIQMotXwvZcmO183kvKVMw6E6+k1HEX/Z2uBmY6QWngXvhiEDQpl/b81/pKPH4pDIhnFImS5hlHQhIJhcZk2eIURhr3xSriIGAyi1fC9lyY7XzeS8pUzDoTr6TUcRf9na4GZjpBaeBe+GHO+l2RYwAACAAAAAgGQAAIABAACAAAAAAAAAAAAiBgNCmX9vzX+ko8fikMiGcUiZLmGUdCEgmFxmTZ4hRGGvfBz1fsZdMAAAgAAAAIBkAACAAQAAgAAAAAAAAAAAAAEBIBAnAAAAAAAAF6kUGrz4zqMhyodN5L60+XUHf+hkpUqHAQQiACAEnW6UUHRSWwPgSHdZNo/2Y/ELuIl2AXvdnTzOhJCF5QEFR1IhAyi1fC9lyY7XzeS8pUzDoTr6TUcRf9na4GZjpBaeBe+GIQNCmX9vzX+ko8fikMiGcUiZLmGUdCEgmFxmTZ4hRGGvfFKuIgYDKLV8L2XJjtfN5LylTMOhOvpNRxF/2drgZmOkFp4F74Yc76XZFjAAAIAAAACAZAAAgAEAAIAAAAAAAAAAACIGA0KZf2/Nf6Sjx+KQyIZxSJkuYZR0ISCYXGZNniFEYa98HPV+xl0wAACAAAAAgGQAAIABAACAAAAAAAAAAAAAAA==",
    psbt: "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",
    psbtWithGlobalXpub:
      "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",
    psbtPartiallySigned:
      "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",
  },

  {
    network: Network.MAINNET,
    type: P2WSH,
    bip32Path: "m/48'/0'/100'/2'/0/0",
    policyHmac:
      "c18feb515eb8a44070450c38f93aeab036a86192fa6133dcbe55645f89de278a",
    publicKey:
      "0369e74fc954355b6f7acf9bbec5b861c186852b759a85f92558e420a0202047f4",
    publicKeys: [
      "02e21b7318cfbd482bdbb66441420b9018e5b440bf9b0cdedd427626d81f32605b",
      "0369e74fc954355b6f7acf9bbec5b861c186852b759a85f92558e420a0202047f4",
    ],
    witnessScriptOps:
      "OP_2 02e21b7318cfbd482bdbb66441420b9018e5b440bf9b0cdedd427626d81f32605b 0369e74fc954355b6f7acf9bbec5b861c186852b759a85f92558e420a0202047f4 OP_2 OP_CHECKMULTISIG",
    witnessScriptHex:
      "522102e21b7318cfbd482bdbb66441420b9018e5b440bf9b0cdedd427626d81f32605b210369e74fc954355b6f7acf9bbec5b861c186852b759a85f92558e420a0202047f452ae",
    scriptOps:
      "OP_0 497b026c3d3547a30e6d8006e385e0366af5eca2b5b455d8783875941e5c7fa9",
    scriptHex:
      "0020497b026c3d3547a30e6d8006e385e0366af5eca2b5b455d8783875941e5c7fa9",
    address: "bc1qf9asympax4r6xrndsqrw8p0qxe40tm9zkk69tkrc8p6eg8ju075sjeekkt",
    utxos: [
      {
        txid: "4ab356fef8b8205a3b96b4924e8e94f18c4b8ecdefa0bb1ee28ce19f091c3f58",
        index: 0,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "020000000001011aa35769284e2822b65a98ac46472bb5c455831927da993dbe9ad1959c296eaf0100000000feffffff021027000000000000220020497b026c3d3547a30e6d8006e385e0366af5eca2b5b455d8783875941e5c7fa94c76010000000000160014553e9be0af92386ae6b4065262dc97fdee9979170247304402206407b5c1fa2fd49b92e6f1802a0eed9e75f55c3db1ea179f077072d0c6e9031602205823ba8d01a6b96db9334affcb9b1e7dfb434cfdc1389287016d6b68c5c2cf0c0121029de99c2fec6fad0a90fb5a7792775477b8d82fa4f213903a2f67d3e2c1d802eb99490900",
      },
      {
        txid: "a21b384dc72b9ef2559339cecd5ad2652171589b1e479497817b617734859d90",
        index: 1,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000101583f1c099fe18ce21ebba0efcd8e4b8cf1948e4e92b4963b5a20b8f8fe56b34a0100000000feffffff02c04601000000000016001416d8412d77ae6d6280c60091a7197a3f98546c911027000000000000220020497b026c3d3547a30e6d8006e385e0366af5eca2b5b455d8783875941e5c7fa90247304402204fada6ffa61f578f647ace8c8d02b678ff95ed0feca83b3a4750a97c5aa3ddca02203dc438b53e7aef6bd4f9152e37d6cbce4e64306932cc27f7e2072d764990cb530121020b500126d56d6f17b28e90f254b4b38c260ecd8e941b65c557b8af6c767027dd99490900",
      },
      {
        txid: "af6e299c95d19abe3d99da27198355c4b52b4746ac985ab622284e286957a31a",
        index: 0,
        amountSats: "10000", // 0.0001 BTC
        transactionHex:
          "02000000000101317bbfb18814a7db1fd15e596fbdc8b220b76f2abde57c05502433e248e5d0c500000000171600147e88fb2bc740d5efffef8b6f53d5eb68b83317b6feffffff021027000000000000220020497b026c3d3547a30e6d8006e385e0366af5eca2b5b455d8783875941e5c7fa9d8a50100000000001600144ddfedfd823ee5dc953f4792a855b262a85ed77c0247304402202fc8347a8801fbbd13db5bd2694cdabb2c3428b6cfa6edda02ff16bc6cacb6b8022054604d07510ede500197deefe9d39abe277fb97a837ae40ea815b6aa38f0329701210247348c03f596b52730429ea89df4b3d75b219fd3c30cbcb66dae04779e0de6d236490900",
      },
    ],
    transaction: {
      outputs: [
        {
          address: RECEIVING_ADDRESSES[Network.MAINNET][P2WSH],
          amountSats: "21590",
        },
        {
          address: CHANGE_ADDRESSES[Network.MAINNET][P2WSH],
          amountSats: "8023",
          value: 8023,
          bip32Derivation: [
            {
              masterFingerprint: Buffer.from("f57ec65d", "hex"),
              path: "m/48'/0'/100'/2'/1/0",
              pubkey: Buffer.from(
                "038b5e295f14f6a848f55b7d62efddef4679dc361ecda5f6cd074cc24ae2174510",
                "hex",
              ),
            },
            {
              masterFingerprint: Buffer.from("00000006", "hex"),
              path: "m/48'/0'/100'/2'/1/0",
              pubkey: Buffer.from(
                "0318a60afc9aa7e3191f9e49051c70764f7688d9a567b327c095e5a3f75f8847e7",
                "hex",
              ),
            },
          ],
          witnessScript: Buffer.from(
            "52210318a60afc9aa7e3191f9e49051c70764f7688d9a567b327c095e5a3f75f8847e721038b5e295f14f6a848f55b7d62efddef4679dc361ecda5f6cd074cc24ae217451052ae",
            "hex",
          ),
        },
      ],
      hex: "0100000003583f1c099fe18ce21ebba0efcd8e4b8cf1948e4e92b4963b5a20b8f8fe56b34a0000000000ffffffff909d853477617b819794471e9b58712165d25acdce399355f29e2bc74d381ba20100000000ffffffff1aa35769284e2822b65a98ac46472bb5c455831927da993dbe9ad1959c296eaf0000000000ffffffff02565400000000000022002035be74e39d8452cd6ede2aede6be70e21e57941843032e495d823eb9f521aea7571f00000000000022002098ac4adf0ec716cb2d30585fc8db6b41ad26431f55213622b43723de418aff4200000000",
      signature: [
        "304402207eddd9d5b7335468c5166e9d76f88d5538bf0ff531680765f813e95edf8a13a502205a6b33c0cd780b4e036e2e35777e888ec33658777cece1b494b7aadb421c35cb01",
        "304402207d2809f871f60d5c6d44e41decdfc856f08c69bb4471ec4652ee295c21becd6d022033ac79f8baa9c663e3aa8ffa2aab5cae27524537dd762d2f6cb1f5879375cae201",
        "3045022100ce3fea96bde970eab9aab5a3d8a00e1be5515cdd534db0d7c8a1755408c2c9c402204842d008cbacd7ce5df38035d55682ee03036751563d7b20253966bdb131a44801",
      ],
      // Coldcard is now grinding nonces on signatures to produce low s-value (71 bytes or fewer ... e.g. starts with 0x3044 ...)
      byteCeilingSignature: [
        "304402207eddd9d5b7335468c5166e9d76f88d5538bf0ff531680765f813e95edf8a13a502205a6b33c0cd780b4e036e2e35777e888ec33658777cece1b494b7aadb421c35cb01",
        "304402207d2809f871f60d5c6d44e41decdfc856f08c69bb4471ec4652ee295c21becd6d022033ac79f8baa9c663e3aa8ffa2aab5cae27524537dd762d2f6cb1f5879375cae201",
        "304402202dd767bfc22fe0c68703d32359e2d649d499426df47e76cdf298d62a8094631e0220133c0516991eb18885e5b2171d5bdbbab58e635c2412ec14b7f3db9f5fa2ef1a01",
      ],
    },
    braidDetails: {
      network: Network.MAINNET,
      addressType: P2WSH,
      extendedPublicKeys: [
        NODES["m/48'/0'/100'/2'"].open_source,
        NODES["m/48'/0'/100'/2'"].unchained,
      ],
      requiredSigners: 2,
      index: "0",
    },
    psbtNoChange:
      "cHNidP8BAKUBAAAAA1g/HAmf4YziHrug782OS4zxlI5OkrSWO1oguPj+VrNKAAAAAAD/////kJ2FNHdhe4GXlEcem1hxIWXSWs3OOZNV8p4rx004G6IBAAAAAP////8ao1dpKE4oIrZamKxGRyu1xFWDGSfamT2+mtGVnClurwAAAAAA/////wFWVAAAAAAAABepFICyR3QRp4sqk519oIv6GTmocaS5hwAAAAAAAQErECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQEFR1IhAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbIQNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9FKuIgYC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFsc76XZFjAAAIAAAACAZAAAgAIAAIAAAAAAAAAAACIGA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0HPV+xl0wAACAAAAAgGQAAIACAACAAAAAAAAAAAAAAQErECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQEFR1IhAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbIQNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9FKuIgYC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFsc76XZFjAAAIAAAACAZAAAgAIAAIAAAAAAAAAAACIGA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0HPV+xl0wAACAAAAAgGQAAIACAACAAAAAAAAAAAAAAQErECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQEFR1IhAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbIQNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9FKuIgYC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFsc76XZFjAAAIAAAACAZAAAgAIAAIAAAAAAAAAAACIGA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0HPV+xl0wAACAAAAAgGQAAIACAACAAAAAAAAAAAAAAA==",
    psbt: "cHNidP8BANsBAAAAA1g/HAmf4YziHrug782OS4zxlI5OkrSWO1oguPj+VrNKAAAAAAD/////kJ2FNHdhe4GXlEcem1hxIWXSWs3OOZNV8p4rx004G6IBAAAAAP////8ao1dpKE4oIrZamKxGRyu1xFWDGSfamT2+mtGVnClurwAAAAAA/////wJWVAAAAAAAACIAIDW+dOOdhFLNbt4q7ea+cOIeV5QYQwMuSV2CPrn1Ia6nVx8AAAAAAAAiACCYrErfDscWyy0wWF/I22tBrSZDH1UhNiK0NyPeQYr/QgAAAAAAAQDqAgAAAAABARqjV2koTigitlqYrEZHK7XEVYMZJ9qZPb6a0ZWcKW6vAQAAAAD+////AhAnAAAAAAAAIgAgSXsCbD01R6MObYAG44XgNmr17KK1tFXYeDh1lB5cf6lMdgEAAAAAABYAFFU+m+Cvkjhq5rQGUmLcl/3umXkXAkcwRAIgZAe1wfov1JuS5vGAKg7tnnX1XD2x6hefB3By0MbpAxYCIFgjuo0BprltuTNK/8ubHn37Q0z9wTiShwFta2jFws8MASECnemcL+xvrQqQ+1p3kndUd7jYL6TyE5A6L2fT4sHYAuuZSQkAAQErECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQEFR1IhAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbIQNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9FKuIgYC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFscAAAABjAAAIAAAACAZAAAgAIAAIAAAAAAAAAAACIGA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0HPV+xl0wAACAAAAAgGQAAIACAACAAAAAAAAAAAAAAQDqAgAAAAABAVg/HAmf4YziHrug782OS4zxlI5OkrSWO1oguPj+VrNKAQAAAAD+////AsBGAQAAAAAAFgAUFthBLXeubWKAxgCRpxl6P5hUbJEQJwAAAAAAACIAIEl7Amw9NUejDm2ABuOF4DZq9eyitbRV2Hg4dZQeXH+pAkcwRAIgT62m/6YfV49kes6MjQK2eP+V7Q/sqDs6R1CpfFqj3coCID3EOLU+eu9r1PkVLjfWy85OZDBpMswn9+IHLXZJkMtTASECC1ABJtVtbxeyjpDyVLSzjCYOzY6UG2XFV7ivbHZwJ92ZSQkAAQErECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQEFR1IhAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbIQNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9FKuIgYC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFscAAAABjAAAIAAAACAZAAAgAIAAIAAAAAAAAAAACIGA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0HPV+xl0wAACAAAAAgGQAAIACAACAAAAAAAAAAAAAAQD9AQECAAAAAAEBMXu/sYgUp9sf0V5Zb73IsiC3byq95XwFUCQz4kjl0MUAAAAAFxYAFH6I+yvHQNXv/++Lb1PV62i4Mxe2/v///wIQJwAAAAAAACIAIEl7Amw9NUejDm2ABuOF4DZq9eyitbRV2Hg4dZQeXH+p2KUBAAAAAAAWABRN3+39gj7l3JU/R5KoVbJiqF7XfAJHMEQCIC/INHqIAfu9E9tb0mlM2rssNCi2z6bt2gL/FrxsrLa4AiBUYE0HUQ7eUAGX3u/p05q+J3+5eoN65A6oFbaqOPAylwEhAkc0jAP1lrUnMEKeqJ30s9dbIZ/Twwy8tm2uBHeeDebSNkkJAAEBKxAnAAAAAAAAIgAgSXsCbD01R6MObYAG44XgNmr17KK1tFXYeDh1lB5cf6kBBUdSIQLiG3MYz71IK9u2ZEFCC5AY5bRAv5sM3t1CdibYHzJgWyEDaedPyVQ1W296z5u+xbhhwYaFK3WahfklWOQgoCAgR/RSriIGAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbHAAAAAYwAACAAAAAgGQAAIACAACAAAAAAAAAAAAiBgNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9Bz1fsZdMAAAgAAAAIBkAACAAgAAgAAAAAAAAAAAAAABAUdSIQMYpgr8mqfjGR+eSQUccHZPdojZpWezJ8CV5aP3X4hH5yEDi14pXxT2qEj1W31i793vRnncNh7NpfbNB0zCSuIXRRBSriICAximCvyap+MZH55JBRxwdk92iNmlZ7MnwJXlo/dfiEfnHAAAAAYwAACAAAAAgGQAAIACAACAAQAAAAAAAAAiAgOLXilfFPaoSPVbfWLv3e9Gedw2Hs2l9s0HTMJK4hdFEBz1fsZdMAAAgAAAAIBkAACAAgAAgAEAAAAAAAAAAA==",
    psbtWithGlobalXpub:
      "cHNidP8BANsBAAAAA1g/HAmf4YziHrug782OS4zxlI5OkrSWO1oguPj+VrNKAAAAAAD/////kJ2FNHdhe4GXlEcem1hxIWXSWs3OOZNV8p4rx004G6IBAAAAAP////8ao1dpKE4oIrZamKxGRyu1xFWDGSfamT2+mtGVnClurwAAAAAA/////wJWVAAAAAAAACIAIDW+dOOdhFLNbt4q7ea+cOIeV5QYQwMuSV2CPrn1Ia6nVx8AAAAAAAAiACCYrErfDscWyy0wWF/I22tBrSZDH1UhNiK0NyPeQYr/QgAAAABPAQSIsh4EC5KBSYAAAAJrLJcFIzT9AzNGT9fXtu2be64l+byr+lTxXgQawilx/AOPzlNRM+qH+YnKCQj36N4PqWXQpmSbcb9cdCROzmTUkBT1fsZdMAAAgAAAAIBkAACAAgAAgE8BBIiyHgS+8hesgAAAAot5AMcDzdD3UrE7epXunLDVoN9/ub/kZ4sHTt09xZoRAwo91ozY06iWIJye7gprjsKHg0WIgs4ac2LYtgs03jCXFAAAAAYwAACAAAAAgGQAAIACAACAAAEA6gIAAAAAAQEao1dpKE4oIrZamKxGRyu1xFWDGSfamT2+mtGVnClurwEAAAAA/v///wIQJwAAAAAAACIAIEl7Amw9NUejDm2ABuOF4DZq9eyitbRV2Hg4dZQeXH+pTHYBAAAAAAAWABRVPpvgr5I4aua0BlJi3Jf97pl5FwJHMEQCIGQHtcH6L9SbkubxgCoO7Z519Vw9seoXnwdwctDG6QMWAiBYI7qNAaa5bbkzSv/Lmx59+0NM/cE4kocBbWtoxcLPDAEhAp3pnC/sb60KkPtad5J3VHe42C+k8hOQOi9n0+LB2ALrmUkJAAEBKxAnAAAAAAAAIgAgSXsCbD01R6MObYAG44XgNmr17KK1tFXYeDh1lB5cf6kBBUdSIQLiG3MYz71IK9u2ZEFCC5AY5bRAv5sM3t1CdibYHzJgWyEDaedPyVQ1W296z5u+xbhhwYaFK3WahfklWOQgoCAgR/RSriIGAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbHAAAAAYwAACAAAAAgGQAAIACAACAAAAAAAAAAAAiBgNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9Bz1fsZdMAAAgAAAAIBkAACAAgAAgAAAAAAAAAAAAAEA6gIAAAAAAQFYPxwJn+GM4h67oO/NjkuM8ZSOTpK0ljtaILj4/lazSgEAAAAA/v///wLARgEAAAAAABYAFBbYQS13rm1igMYAkacZej+YVGyRECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qQJHMEQCIE+tpv+mH1ePZHrOjI0Ctnj/le0P7Kg7OkdQqXxao93KAiA9xDi1Pnrva9T5FS431svOTmQwaTLMJ/fiBy12SZDLUwEhAgtQASbVbW8Xso6Q8lS0s4wmDs2OlBtlxVe4r2x2cCfdmUkJAAEBKxAnAAAAAAAAIgAgSXsCbD01R6MObYAG44XgNmr17KK1tFXYeDh1lB5cf6kBBUdSIQLiG3MYz71IK9u2ZEFCC5AY5bRAv5sM3t1CdibYHzJgWyEDaedPyVQ1W296z5u+xbhhwYaFK3WahfklWOQgoCAgR/RSriIGAuIbcxjPvUgr27ZkQUILkBjltEC/mwze3UJ2JtgfMmBbHAAAAAYwAACAAAAAgGQAAIACAACAAAAAAAAAAAAiBgNp50/JVDVbb3rPm77FuGHBhoUrdZqF+SVY5CCgICBH9Bz1fsZdMAAAgAAAAIBkAACAAgAAgAAAAAAAAAAAAAEA/QEBAgAAAAABATF7v7GIFKfbH9FeWW+9yLIgt28qveV8BVAkM+JI5dDFAAAAABcWABR+iPsrx0DV7//vi29T1etouDMXtv7///8CECcAAAAAAAAiACBJewJsPTVHow5tgAbjheA2avXsorW0Vdh4OHWUHlx/qdilAQAAAAAAFgAUTd/t/YI+5dyVP0eSqFWyYqhe13wCRzBEAiAvyDR6iAH7vRPbW9JpTNq7LDQots+m7doC/xa8bKy2uAIgVGBNB1EO3lABl97v6dOavid/uXqDeuQOqBW2qjjwMpcBIQJHNIwD9Za1JzBCnqid9LPXWyGf08MMvLZtrgR3ng3m0jZJCQABASsQJwAAAAAAACIAIEl7Amw9NUejDm2ABuOF4DZq9eyitbRV2Hg4dZQeXH+pAQVHUiEC4htzGM+9SCvbtmRBQguQGOW0QL+bDN7dQnYm2B8yYFshA2nnT8lUNVtves+bvsW4YcGGhSt1moX5JVjkIKAgIEf0Uq4iBgLiG3MYz71IK9u2ZEFCC5AY5bRAv5sM3t1CdibYHzJgWxwAAAAGMAAAgAAAAIBkAACAAgAAgAAAAAAAAAAAIgYDaedPyVQ1W296z5u+xbhhwYaFK3WahfklWOQgoCAgR/Qc9X7GXTAAAIAAAACAZAAAgAIAAIAAAAAAAAAAAAAAAQFHUiEDGKYK/Jqn4xkfnkkFHHB2T3aI2aVnsyfAleWj91+IR+chA4teKV8U9qhI9Vt9Yu/d70Z53DYezaX2zQdMwkriF0UQUq4iAgMYpgr8mqfjGR+eSQUccHZPdojZpWezJ8CV5aP3X4hH5xwAAAAGMAAAgAAAAIBkAACAAgAAgAEAAAAAAAAAIgIDi14pXxT2qEj1W31i793vRnncNh7NpfbNB0zCSuIXRRAc9X7GXTAAAIAAAACAZAAAgAIAAIABAAAAAAAAAAA=",
    psbtPartiallySigned:
      "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",
  },
];

const MULTISIGS = MULTISIGS_BASE.map((test) => {
  let braidAwareMultisig = {};
  const multisig = generateMultisigFromPublicKeys(
    test.network,
    test.type,
    2,
    ...test.publicKeys,
  );
  braidAwareMultisig = {
    ...multisig,
    braidDetails: braidConfig(test.braidDetails),
    bip32Derivation: test.bip32Derivation,
  };
  return {
    ...test,
    ...{
      description: `${test.network} ${test.type} 2-of-2 multisig address`,
      utxos: test.utxos.map((utxo) => ({
        ...utxo,
        ...{
          amountSats: new BigNumber(utxo.amountSats).toString(),
          multisig: braidAwareMultisig,
          braidAwareMultisig,
        },
        bip32Path: test.bip32Path, // this only works because all of these fixtures are single address.
      })),
      transaction: {
        ...test.transaction,
        ...{
          outputs: test.transaction.outputs.map((output) => ({
            ...output,
            ...{ amountSats: new BigNumber(output.amountSats).toString() },
            ...{
              multisig: (output.redeemScript || output.witnessScript) && {
                address: output.address,
                bip32Derivation: output.bip32Derivation,
                redeem: {
                  output: [P2SH, P2SH_P2WSH].includes(test.type)
                    ? output.redeemScript
                    : output.witnessScript,
                  redeem: [P2SH_P2WSH].includes(test.type) && {
                    output: output.witnessScript,
                  },
                },
              },
            },
          })),
        },
      },
      multisig: braidAwareMultisig,
      braidAwareMultisig,
      multisigScript:
        test.type === P2SH
          ? multisigRedeemScript(braidAwareMultisig)
          : multisigWitnessScript(braidAwareMultisig),
      multisigScriptOps:
        test.type === P2SH ? test.redeemScriptOps : test.witnessScriptOps,
      multisigScriptHex:
        test.type === P2SH ? test.redeemScriptHex : test.witnessScriptHex,
    },
  };
});

// function selectFirstUTXOFromEach(tests) {
//   let unsortedUTXOs = [];
//   let unsortedBIP32Paths = [];
//   let unsortedPublicKeys = [];
//   tests.forEach((test) => {
//     unsortedUTXOs.push(test.utxos[0]);
//     unsortedBIP32Paths.push(test.bip32Path);
//     unsortedPublicKeys.push(test.publicKey);
//   });
//   const sortedUTXOs = sortInputs(unsortedUTXOs);
//   const sortedBIP32Paths = [];
//   const sortedPublicKeys = [];
//   sortedUTXOs.forEach((utxo) => {
//     const unsortedIndex = unsortedUTXOs.findIndex((otherUTXO) => (otherUTXO.txid === utxo.txid && otherUTXO.index === utxo.index));
//     sortedBIP32Paths.push(unsortedBIP32Paths[unsortedIndex]);
//     sortedPublicKeys.push(unsortedPublicKeys[unsortedIndex]);
//   });
//   return {
//     inputs: sortedUTXOs,
//     bip32Paths: sortedBIP32Paths,
//     publicKeys: sortedPublicKeys,
//   };
// }

function singleMultisigTransaction(test) {
  return {
    ...{
      name: `Sign ${test.description}`,
      description: `spends multiple UTXOs from a single ${test.description}`,
      network: test.network,
      inputs: sortInputs(test.utxos),
      bip32Paths: test.utxos.map(() => test.bip32Path),
      publicKeys: test.utxos.map(() => test.publicKey),
      segwit: test.type !== P2SH,
      psbt: test.psbt,
      psbtWithGlobalXpub: test.psbtWithGlobalXpub,
      format: test.type,
      derivation: test.bip32Path.slice(0, -4),
      extendedPublicKeys: test.braidDetails.extendedPublicKeys,
      braidDetails: test.braidDetails,
      walletName: test.walletName,
      policyHmac: test.policyHmac,
    },
    ...test.transaction,
  };
}

const TRANSACTIONS = MULTISIGS.map((test) =>
  singleMultisigTransaction(test),
).concat([
  // {
  //   ...selectFirstUTXOFromEach(MULTISIGS.filter((test) => test.network === TESTNET)),
  //   ...{
  //     name: `Sign across ${TESTNET} 2-of-2 multisig address types`,
  //     description: `spends a UTXO from each ${TESTNET} 2-of-2 address type`,
  //     network: Network.TESTNET,
  //     segwit: true,
  //     outputs: [
  //       {
  //         address: RECEIVING_ADDRESSES[Network.TESTNET],
  //         amountSats: BigNumber('291590'),
  //       }
  //     ],
  //   },
  //   hex: "0100000003236ac393a0ee9e05973cbaad15abfa476d1e03151be906c0d769db051da49d420000000000ffffffff845266686d5d2473fb09982c72da0d6d66b057c3e13a6eb4bfda304076efe7650100000000ffffffff01f5a14392f39c55c9a597df640b0f75ec77f5a90bce39bbc7e8869bcc8ddf840000000000ffffffff01067304000000000017a914e3ba1151b75effbf7adc4673c83c8feec3ddc3678700000000",
  //   signature: ["30440220583a0f9f0dec594d16cee927dc10d10e99b075c2cbdaad75daf1adf1a9f34900022058311ae12f952a4707f8c4966a50ed96b21e049ef35afc91e77c9a1b991f93b801","304502210084f12880a76b33e4bbf7bc896e76ccd726f59e24876261d1f9c999a2203d10c70220327e7daf28cf6dca83ff24c2b1dbded308e71f11941c14fa2b3bb1623d240b7201","3045022100aeeaa8c07be892ff1dcbbcf76ab6f202fa3f6b3f41e0476294f8df2d0afb457f02206d7eecc49e1ff32f1f25b7649a127e4334c0f9272aa92051364f5094b3d796ad01"],
  // },
  // {
  //   ...selectFirstUTXOFromEach(MULTISIGS.filter((test) => test.network === MAINNET)),
  //   ...{
  //     name: `Sign across ${MAINNET} 2-of-2 multisig address types`,
  //     description: `spends a UTXO from each ${MAINNET} 2-of-2 address type`,
  //     network: Network.MAINNET,
  //     segwit: true,
  //     outputs: [
  //       {
  //         address: RECEIVING_ADDRESSES[Network.MAINNET],
  //         amountSats: BigNumber('21590'),
  //       }
  //     ],
  //     hex: "010000000340eb206da209badf4b8a3e758dda0f6a1cd24aa7855c4a0d7444668c2a2862200100000000ffffffffb0e7bdea1e52e6bc471172c6b78b26a7382911b5910b5c947ed18983be1368450000000000ffffffff583f1c099fe18ce21ebba0efcd8e4b8cf1948e4e92b4963b5a20b8f8fe56b34a0000000000ffffffff01565400000000000017a91480b2477411a78b2a939d7da08bfa1939a871a4b98700000000",
  //     signature: ["304502210088188fe088e22872e06ddad13c2586f6abb5d8040b2bb919bf00f6a855e3788902202517f77ae39ac37c0522864dfb996dc86272f328ee4d7b614cad17899f5bbc3a01","3044022078e151ce21dab691a35f8aa2a080478cd15369653bc8ecd250019e62f2d1557102204349f260f9233558b8a71c9e2dc9888b6666451de97ea12b890ee7526f9f404001","3044022005e44b81d321ce6cc27e7d64cf482844e0dd30220a776c62199d2fac33c6a41502201beacca9c4d4f00d31c797b9441222e67ada8d4e0706d1cd29805af363de615c01"],
  //   }
  // },
]);

/**
 * A set of test fixtures mostly built from the same [BIP39 seed phrase]{@link https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki}.
 *
 * Initializing your keystore with this seed phrase will allow you to replicate many of the unit (and integration)
 * tests in this library on your hardware/software.  This is also useful for functional testing.
 *
 * Includes the following properties:
 * - `keys` - given the multisig nature of these fixtures, they involve keys from multiple sources
 * -   `open_source` - open source fixtures
 * -     `bip39Phrase` -- the BIP39 seed phrase used for all other fixtures
 * -     `nodes` -- an object mapping BIP32 paths to the corresponding [HD node]{@link module:fixtures.HDNode} derived from the BIP39 seed phrase above.
 * -   `unchained` - unchained fixtures
 * -     `nodes` -- an object mapping BIP32 paths to the corresponding [HD node]{@link module:fixtures.HDNode} derived from unchained seed phrase (not shared).
 * - `multisigs` -- an array of [multisig addresses]{@link module:fixtures.MultisigAddress} derived from the HD nodes above.
 * - `braids` -- an array of [braids]{@link module.braid.Braid} derived from the open_source + unchained HD nodes above.
 * - `transactions` -- an array of [transactions]{@link module:fixtures.MultisigTransaction} from the multisig address above.
 *
 * @example
 * import {TEST_FIXTURES} from "@caravan/bitcoin";
 * console.log(TEST_FIXTURES.keys.open_source.bip39Phrase);
 * // merge alley lucky axis penalty manage latin gasp virus captain wheel deal chase fragile chapter boss zero dirt stadium tooth physical valve kid plunge
 *
 */
export const TEST_FIXTURES = {
  keys: {
    open_source: {
      bip39Phrase: BIP39_PHRASE,
      nodes: Object.keys(NODES).reduce((openSourceNodes, node) => {
        const { unchained, ...rest } = NODES[node];
        if (!unchained) {
          openSourceNodes[node] = NODES[node];
        } else {
          // keep the node but drop the unchained part
          openSourceNodes[node] = rest;
        }
        return openSourceNodes;
      }, {}),
    },
    unchained: {
      nodes: Object.keys(NODES).reduce((unchainedNodes, node) => {
        const { unchained } = NODES[node];
        if (unchained) unchainedNodes[node] = unchained;
        return unchainedNodes;
      }, {}),
    },
  },
  braids: BRAIDS,
  multisigs: MULTISIGS,
  transactions: TRANSACTIONS,
};

/**
 * An HD node fixture derived from the BIP39 seed phrase fixture.
 *
 * Not all HD node fixtures have all properties below.
 *
 * @typedef HDNode
 * @type {Object}
 * @property {string} pub - the (compressed) public key in hex
 * @property {string} xpub - the extended public key formatted for mainnet
 * @property {string} tpub - the extended public key formatted for testnet
 */

/**
 * A multisig address fixture.  At least one of the public
 * keys in the redeem/witness script for each address is derived from
 * the BIP39 seed phrase fixture.
 *
 * @typedef MultisigAddress
 * @type {Object}
 * @property {module:networks.NETWORKS} network - bitcoin network
 * @property {module:multisig.MULTISIG_ADDRESS_TYPES} type - multisig address type
 * @property {string} description - describes the multisig address
 * @property {string} bip32Path - BIP32 derivation path to the public key used in this address from the BIP39 seed phrase fixture
 * @property {string} publicKey - (compressed) public key (in hex) corresponding to BIP32 path
 * @property {string[]} publicKeys - (compressed) public keys (in hex) (order matters)
 * @property {string} multisigScriptHex - multisig script in hex (redeem/witneess script as appropriate)
 * @property {string} multisigScriptOps - multisig script in opcodes (redeem/witneess script as appropriate)
 * @property {string} redeemScriptHex - redeem script in hex (missing for P2WSH)
 * @property {string} redeemScriptOps - redeem script in opcodes (missing for P2WSH)
 * @property {string} witnessScriptHex - witness script in hex (missing for P2SH)
 * @property {string} witnessScriptOps - witness script in opcodes (missing for P2SH)
 * @property {string} address - bitcoin address
 * @property {string} scriptHex - script in hex
 * @property {string} scriptOps - script in opcodes
 * @property {module:multisig.Multisig} multisig - `Multisig` object for address
 * @property {module:transactions.UTXO[]} utxos - UTXOs at this address
 * @property {module.braid.Braid} braidDetails - details to construct the braid where this Multisig address resides
 * @property {module.braid.Braid} changeBraidDetails - details to construct the change braid where the Change Multisig address resides (if needed)
 * @property {string} psbt - unsigned psbt of the Transaction
 * @property {string} psbtPartiallySigned - psbt that has a single set of signatures inside for the open source words
 *
 */

/**
 * A transaction fixture with inputs from one or more multisig
 * addresses.
 *
 * Each address contains at least one public key derived from the
 * BIP39 seed phrase fixture.
 *
 * The signatures in these transaction fixtures can therefore be
 * created by any keystore which loads this seed phrase.
 *
 * The inputs to these transactions should survive as the other
 * signature(s) required to spend them cannot be produced publicly
 * (their private keys are held by Unchained Capital).
 *
 * @typedef MultisigTransaction
 * @type {Object}
 * @property {string} description - describes the transaction
 * @property {module:networks.NETWORKS} network - bitcoin network
 * @property {boolean} segwit - does the transaction have segwit inputs?
 * @property {string[]} bip32Paths - BIP32 paths to the public key derived from the BIP39 seed phrase fixture, one per input
 * @property {string[]} publicKeys - (compressed) public keys  (in hex) corresponding to each BIP32 path, one per input
 * @property {module:transactions.UTXO[]} inputs - transaction inputs
 * @property {module:transactions.TransactionOutput[]} outputs - transaction outputs
 * @property {string} hex - unsigned transaction in hex
 * @property {string[]} signature - one signature for the transaction (consisting of one signature per input)
 *
 */
