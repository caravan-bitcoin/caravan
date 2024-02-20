//! Caravan config
//!
//! This modules implements the config format used by Unchained Capital's
//! [Caravan](https://github.com/unchained-capital/caravan) bitcoin multisig coordinator software.
//!
//! ## Examples
//!
//! ### Export descriptors from a caravan config
//!
//! ```rust
//! # use std::str::FromStr;
//! # use bdk::bitcoin::Network;
//! # use bdk::Error::Descriptor;
//! # use bdk::KeychainKind;
//! # use crate::caravan_rs::config::{CaravanConfig, Error};
//!
//! let config_json = r#"{
//!   "name": "P2WSH-T",
//!   "addressType": "P2WSH",
//!   "network": "testnet",
//!   "client":  {
//!     "type": "public"
//!   },
//!   "quorum": {
//!     "requiredSigners": 2,
//!     "totalSigners": 2
//!   },
//!   "extendedPublicKeys": [
//!     {
//!         "name": "osw",
//!         "bip32Path": "m/48'/1'/100'/2'",
//!         "xpub": "tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM",
//!         "xfp" : "f57ec65d"
//!       },
//!     {
//!         "name": "d",
//!         "bip32Path": "m/48'/1'/100'/2'",
//!         "xpub": "tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj",
//!         "xfp" : "efa5d916"
//!       }
//!   ],
//!   "startingAddressIndex": 0
//! }"#;
//!
//! let config = CaravanConfig::from_str(config_json)?;
//!
//! let external_descriptor = config.descriptor(KeychainKind::External)?;
//! let internal_descriptor = config.descriptor(KeychainKind::Internal)?;
//! let network = config.network();
//!
//! # Ok::<_, Error>(())
//! ```
//!
//! ### Import external and internal descriptors into a caravan config
//! ```rust
//! # use std::str::FromStr;
//! # use bdk::bitcoin::Network;
//! # use bdk::descriptor::ExtendedDescriptor;
//! # use caravan_rs::config::{CaravanConfig, Error};
//!
//! let external_descriptor = "wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/2']tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM/0/*,[efa5d916/48'/1'/100'/2']tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj/0/*))#nv5k65uf";
//! let external_descriptor = ExtendedDescriptor::from_str(external_descriptor).expect("external descriptor");
//!
//! let internal_descriptor = "wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/2']tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM/1/*,[efa5d916/48'/1'/100'/2']tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj/1/*))";
//! let internal_descriptor = ExtendedDescriptor::from_str(internal_descriptor).expect("internal descriptor");
//!
//! let name = "P2WSH-T".to_string();
//! let client = "public".to_string();
//! let network = Network::Testnet;
//!
//!
//! let import = CaravanConfig::new(network, external_descriptor, internal_descriptor, name, client)?;
//!
//! println!("Imported: {}", import.to_string());
//! # Ok::<_, Error>(())
//! ```

use core::fmt;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;

use bdk::bitcoin::util::bip32::{ChildNumber, DerivationPath, ExtendedPubKey, Fingerprint};
use bdk::bitcoin::Network;
use bdk::miniscript::ScriptContext;

use bdk::descriptor::{DescriptorError, DescriptorPublicKey, ExtendedDescriptor, Legacy, Segwitv0};
use bdk::keys::{DerivableKey, DescriptorKey, SortedMultiVec};
use bdk::miniscript::descriptor::{ShInner, WshInner};
use bdk::miniscript::MiniscriptKey;
use bdk::{descriptor, KeychainKind};

/// Structure that contains a Caravan wallet configuration.
///
/// For a usage example see [this module](crate::config)'s documentation.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaravanConfig {
    /// Vault name
    pub name: String,
    /// Caravan address type,
    pub address_type: CaravanAddressType,
    /// Caravan network
    network: CaravanNetwork,
    /// Caravan client
    pub client: CaravanClient,
    /// Signing quorum
    pub quorum: Quorum,
    /// Extended public keys
    pub extended_public_keys: Vec<CaravanExtendedPublicKey>,
    /// Starting address index, always 0 when exporting
    pub starting_address_index: u32,
}

#[derive(Debug)]
pub enum Error {
    Descriptor(DescriptorError),
    InvalidNetwork { requested: Network, found: Network },
    Generic(String),
    Json(serde_json::Error),
}

impl std::error::Error for Error {}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Descriptor(e) => write!(f, "Descriptor error. {}", e),
            Error::InvalidNetwork { requested, found } => write!(
                f,
                "Invalid network error. requested: {}, found: {}",
                requested, found
            ),
            Error::Generic(e) => write!(f, "Generic error. {}", e),
            Error::Json(e) => write!(f, "Json error. {}", e),
        }
    }
}

impl From<DescriptorError> for Error {
    fn from(e: DescriptorError) -> Self {
        Error::Descriptor(e)
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        Error::Json(e)
    }
}

impl CaravanConfig {
    /// Get the bitcoin network value
    pub fn network(&self) -> Network {
        match self.network {
            CaravanNetwork::Mainnet => Network::Bitcoin,
            CaravanNetwork::Testnet => Network::Testnet,
        }
    }
    /// Get the descriptor value
    pub fn descriptor(&self, keychain: KeychainKind) -> Result<ExtendedDescriptor, Error> {
        let required = self.quorum.required_signers;
        let network: Network = self.network();

        let result = match self.address_type {
            CaravanAddressType::P2sh => {
                let keys: Vec<DescriptorKey<Legacy>> = self.descriptor_keys(keychain)?;
                descriptor! { sh ( sortedmulti_vec(required, keys) ) }
            }
            CaravanAddressType::P2shP2wsh => {
                let keys: Vec<DescriptorKey<Segwitv0>> = self.descriptor_keys(keychain)?;
                descriptor! { sh ( wsh ( sortedmulti_vec(required, keys) ) ) }
            }
            CaravanAddressType::P2wsh => {
                let keys: Vec<DescriptorKey<Segwitv0>> = self.descriptor_keys(keychain)?;
                descriptor! { wsh ( sortedmulti_vec(required, keys) ) }
            }
        }
        .map_err(Error::Descriptor);

        match result {
            Ok((d, _, n)) => {
                if n.contains(&network) {
                    Ok(d)
                } else {
                    Err(Error::InvalidNetwork {
                        requested: network,
                        found: *n.iter().last().expect("network"),
                    })
                }
            }
            Err(e) => Err(e),
        }
    }

    fn descriptor_keys<Ctx: ScriptContext>(
        &self,
        keychain: KeychainKind,
    ) -> Result<Vec<DescriptorKey<Ctx>>, DescriptorError> {
        let result = self
            .extended_public_keys
            .iter()
            .map(|k| {
                let fingerprint = k.xfp;
                let key_path = k.bip32_path.clone();
                let key_source = fingerprint.zip(key_path);
                let keychain_index = keychain as u32;
                let derivation_path = DerivationPath::master().child(ChildNumber::Normal {
                    index: keychain_index,
                });
                k.xpub
                    .into_descriptor_key(key_source, derivation_path)
                    .map_err(DescriptorError::Key)
            })
            .collect();
        result
    }

    /// Create a Caravan config from network, descriptors, name and client type.
    pub fn new(
        network: Network,
        external_descriptor: ExtendedDescriptor,
        internal_descriptor: ExtendedDescriptor,
        name: String,
        client_type: String,
    ) -> Result<Self, Error> {
        let (external_address_type, external_quorum, external_public_keys) =
            parse_descriptor(&external_descriptor)?;
        let (internal_address_type, internal_quorum, internal_public_keys) =
            parse_descriptor(&internal_descriptor)?;

        // verify external and internal address types match
        if external_address_type != internal_address_type {
            return Err(Error::Generic(
                "External and internal descriptor address type configs don't match.".to_string(),
            ));
        }

        // verify external and internal descriptor configs match
        if external_quorum != internal_quorum {
            return Err(Error::Generic(
                "External and internal descriptor quorum configs don't match.".to_string(),
            ));
        }

        // verify internal and external descriptor keys match except ends with m/(0|1)/*
        for (external_key, internal_key) in
            external_public_keys.iter().zip(internal_public_keys.iter())
        {
            let ex_caravan_key = parse_key(external_key)?;
            let in_caravan_key = parse_key(internal_key)?;
            if ex_caravan_key.bip32_path != in_caravan_key.bip32_path {
                return Err(Error::Generic(
                    "External and internal keys have different bip32_path".to_string(),
                ));
            }
            if ex_caravan_key.xfp != in_caravan_key.xfp {
                return Err(Error::Generic(
                    "External and internal keys have different xfp".to_string(),
                ));
            }
            if ex_caravan_key.xpub_last_index != 0 {
                return Err(Error::Generic(
                    "External keys last normal index must be 0".to_string(),
                ));
            }
            if in_caravan_key.xpub_last_index != 1 {
                return Err(Error::Generic(
                    "Internal keys last normal index must be 0".to_string(),
                ));
            }
        }

        let network = match network {
            Network::Bitcoin => CaravanNetwork::Mainnet,
            _ => CaravanNetwork::Testnet,
        };

        let client = CaravanClient { value: client_type };
        let extended_public_keys = external_public_keys.iter().flat_map(parse_key).collect();

        Ok(Self {
            name,
            address_type: external_address_type,
            network,
            client,
            quorum: external_quorum,
            extended_public_keys,
            starting_address_index: 0,
        })
    }

    pub fn to_string_pretty(&self) -> String {
        serde_json::to_string_pretty(self).unwrap()
    }
}

fn parse_sorted_multi<Pk: MiniscriptKey, Ctx: ScriptContext>(
    sorted_multi: &SortedMultiVec<Pk, Ctx>,
) -> (Quorum, &[Pk]) {
    let quorum = Quorum {
        required_signers: sorted_multi.k,
        total_signers: sorted_multi.pks.len(),
    };
    let extended_public_keys = sorted_multi.pks.as_slice();
    (quorum, extended_public_keys)
}

fn parse_descriptor(
    descriptor: &ExtendedDescriptor,
) -> Result<(CaravanAddressType, Quorum, &[DescriptorPublicKey]), Error> {
    match descriptor {
        ExtendedDescriptor::Sh(sh) => match sh.as_inner() {
            ShInner::SortedMulti(sorted_multi) => {
                let (quorum, extended_public_keys) = parse_sorted_multi(sorted_multi);
                Ok((CaravanAddressType::P2sh, quorum, extended_public_keys))
            }
            ShInner::Wsh(wsh) => match wsh.as_inner() {
                WshInner::SortedMulti(sorted_multi) => {
                    let (quorum, extended_public_keys) = parse_sorted_multi(sorted_multi);
                    Ok((CaravanAddressType::P2shP2wsh, quorum, extended_public_keys))
                }
                _ => Err(Error::Generic(
                    "Unsupported sh(wsh()) inner descriptor.".to_string(),
                )),
            },
            _ => Err(Error::Generic(
                "Unsupported sh() inner descriptor.".to_string(),
            )),
        },
        ExtendedDescriptor::Wsh(sh) => match sh.as_inner() {
            WshInner::SortedMulti(smv) => {
                let (quorum, extended_public_keys) = parse_sorted_multi(smv);
                Ok((CaravanAddressType::P2wsh, quorum, extended_public_keys))
            }
            _ => Err(Error::Generic(
                "Unsupported wsh() inner descriptor.".to_string(),
            )),
        },
        _ => Err(Error::Generic(
            "Unsupported top level descriptor.".to_string(),
        )),
    }
}

fn parse_key(pubkey: &DescriptorPublicKey) -> Result<CaravanExtendedPublicKey, Error> {
    match pubkey {
        DescriptorPublicKey::Single(_) => {
            Err(Error::Generic("Unsupported single pub key.".to_string()))
        }
        DescriptorPublicKey::XPub(xpub) => {
            let mut xfp = None;
            let mut bip32_path = None;
            if let Some((s_xfp, s_bip32_path)) = xpub.origin.clone() {
                xfp = Some(s_xfp);
                bip32_path = Some(s_bip32_path);
            }
            let xpub_index = xpub.derivation_path.len() - 1;
            let xpub_last_child = xpub.derivation_path[xpub_index];
            let xpub_last_index = match xpub_last_child {
                ChildNumber::Normal { index } => index,
                ChildNumber::Hardened { .. } => {
                    return Err(Error::Generic("Last key index must be normal.".to_string()))
                }
            };
            Ok(CaravanExtendedPublicKey {
                name: xpub.xkey.fingerprint().to_string(),
                bip32_path,
                xpub: xpub.xkey,
                xfp,
                xpub_last_index,
            })
        }
    }
}

/// The address types supported by Caravan
#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
pub enum CaravanAddressType {
    /// P2SH
    #[serde(rename = "P2SH")]
    P2sh,
    /// P2SH-P2WSH
    #[serde(rename = "P2SH-P2WSH")]
    P2shP2wsh,
    /// P2WSH
    #[serde(rename = "P2WSH")]
    P2wsh,
}

impl Display for CaravanAddressType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            CaravanAddressType::P2sh => write!(f, "P2SH"),
            CaravanAddressType::P2shP2wsh => write!(f, "P2SH-P2WSH"),
            CaravanAddressType::P2wsh => write!(f, "P2WSH"),
        }
    }
}

/// The networks supported by Caravan
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum CaravanNetwork {
    Mainnet,
    Testnet,
}

impl From<CaravanNetwork> for Network {
    fn from(n: CaravanNetwork) -> Self {
        match n {
            CaravanNetwork::Mainnet => Network::Bitcoin,
            CaravanNetwork::Testnet => Network::Testnet,
        }
    }
}

/// A caravan client
#[derive(Debug, Serialize, Deserialize)]
pub struct CaravanClient {
    /// The client type value
    #[serde(rename = "type")]
    value: String,
}

/// The quorum of signers required and total signers
#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
pub struct Quorum {
    #[serde(rename = "requiredSigners")]
    required_signers: usize,
    #[serde(rename = "totalSigners")]
    total_signers: usize,
}

/// The Caravan extended public key information
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CaravanExtendedPublicKey {
    name: String,
    #[serde(rename = "bip32Path")]
    bip32_path: Option<DerivationPath>,
    xpub: ExtendedPubKey,
    xfp: Option<Fingerprint>,
    #[serde(skip, default)]
    xpub_last_index: u32,
}

impl ToString for CaravanConfig {
    fn to_string(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

impl FromStr for CaravanConfig {
    type Err = serde_json::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        serde_json::from_str(s)
    }
}

/// Begin MultisigWalletConfig

/// Structure that contains a deserialized config for a multisig wallet.
///
/// For a usage example see [this module](crate::config)'s documentation.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultisigWalletConfig {
    /// Address type,
    pub address_type: CaravanAddressType,
    /// required number of signers
    #[serde(rename = "requiredSigners")]
    pub required_signers: usize,
    /// Extended public keys
    pub key_origins: Vec<KeyOrigin>,
    /// Caravan network
    network: CaravanNetwork,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KeyOrigin {
    #[serde(rename = "bip32Path")]
    bip32_path: Option<DerivationPath>,
    xpub: ExtendedPubKey,
    xfp: Option<Fingerprint>,
}

impl ToString for MultisigWalletConfig {
    fn to_string(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

impl FromStr for MultisigWalletConfig {
    type Err = serde_json::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        serde_json::from_str(s)
    }
}

impl MultisigWalletConfig {
    /// Get the bitcoin network value
    pub fn network(&self) -> Network {
        match self.network {
            CaravanNetwork::Mainnet => Network::Bitcoin,
            CaravanNetwork::Testnet => Network::Testnet,
        }
    }

    /// Get the descriptor value
    pub fn descriptor(&self, keychain: KeychainKind) -> Result<ExtendedDescriptor, Error> {
        let required = self.required_signers;
        let network: Network = self.network();

        let result = match self.address_type {
            CaravanAddressType::P2sh => {
                let keys: Vec<DescriptorKey<Legacy>> = self.descriptor_keys(keychain)?;
                descriptor! { sh ( sortedmulti_vec(required, keys) ) }
            }
            CaravanAddressType::P2shP2wsh => {
                let keys: Vec<DescriptorKey<Segwitv0>> = self.descriptor_keys(keychain)?;
                descriptor! { sh ( wsh ( sortedmulti_vec(required, keys) ) ) }
            }
            CaravanAddressType::P2wsh => {
                let keys: Vec<DescriptorKey<Segwitv0>> = self.descriptor_keys(keychain)?;
                descriptor! { wsh ( sortedmulti_vec(required, keys) ) }
            }
        }
        .map_err(Error::Descriptor);

        match result {
            Ok((d, _, n)) => {
                if n.contains(&network) {
                    Ok(d)
                } else {
                    Err(Error::InvalidNetwork {
                        requested: network,
                        found: *n.iter().last().expect("network"),
                    })
                }
            }
            Err(e) => Err(e),
      }
    }

    fn descriptor_keys<Ctx: ScriptContext>(
        &self,
        keychain: KeychainKind,
    ) -> Result<Vec<DescriptorKey<Ctx>>, DescriptorError> {
        let result = self
            .key_origins
            .iter()
            .map(|k| {
                let fingerprint = k.xfp;
                let key_path = k.bip32_path.clone();
                let key_source = fingerprint.zip(key_path);
                let keychain_index = keychain as u32;
                let derivation_path = DerivationPath::master().child(ChildNumber::Normal {
                    index: keychain_index,
                });
                k.xpub
                    .into_descriptor_key(key_source, derivation_path)
                    .map_err(DescriptorError::Key)
            })
            .collect();
        result
    }

    pub fn to_string_pretty(&self) -> String {
        serde_json::to_string_pretty(self).unwrap()
    }
}

/// END MultisigWalletConfig

#[cfg(test)]
mod test {
    use std::convert::TryFrom;
    use std::str::FromStr;

    use bdk::bitcoin::Address;

    use super::*;
    use assert_json_diff::assert_json_include;
    use serde_json::Value;

    fn test_export(config_json: &str, expected_addresses: Vec<&str>) {
        let config = CaravanConfig::from_str(config_json).expect("import");
        let external_descriptor = config
            .descriptor(KeychainKind::External)
            .expect("external descriptor");
        println!("Exported external descriptor: {}", external_descriptor);
        let internal_descriptor = config
            .descriptor(KeychainKind::Internal)
            .expect("internal descriptor");
        println!("Exported internal descriptor: {}", internal_descriptor);

        for (index, expected_address) in expected_addresses.iter().enumerate() {
            let expected_address = Address::from_str(expected_address).expect("expected address");
            let derived_address = external_descriptor
                .at_derivation_index(u32::try_from(index).expect("u32 index"))
                .address(config.network.into())
                .expect("derived address");
            assert_eq!(derived_address, expected_address);
        }
    }

    fn test_import(
        network: &str,
        external_descriptor: &str,
        internal_descriptor: &str,
        name: &str,
        expected_config_json: &str,
    ) {
        let network = Network::from_str(network).expect("network");
        let external_descriptor =
            ExtendedDescriptor::from_str(external_descriptor).expect("external descriptor");
        let internal_descriptor =
            ExtendedDescriptor::from_str(internal_descriptor).expect("internal descriptor");

        let config = CaravanConfig::new(
            network,
            external_descriptor,
            internal_descriptor,
            name.to_string(),
            "public".to_string(),
        )
        .expect("config");

        println!("Imported config: {}", config.to_string());

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_export: Value =
            serde_json::from_str(expected_config_json).expect("expected export");
        assert_json_include!(actual: config, expected: expected_export);
    }

    fn test_wallet_config(config_json: &str, expected_descriptors: Vec<&str>) {
        let config = MultisigWalletConfig::from_str(config_json).expect("import from json failed");
        let external_descriptor = config
            .descriptor(KeychainKind::External)
            .expect("external descriptor");
        println!("Exported external descriptor: {}", external_descriptor);
        let internal_descriptor = config
            .descriptor(KeychainKind::Internal)
            .expect("internal descriptor");
        println!("Exported internal descriptor: {}", internal_descriptor);
        let expected_external = ExtendedDescriptor::from_str(expected_descriptors[0]).expect("external descriptor");
        assert_eq!(external_descriptor, expected_external);
        let expected_internal = ExtendedDescriptor::from_str(expected_descriptors[1]).expect("internal descriptor");
        assert_eq!(internal_descriptor, expected_internal);
    }

    #[test]
    fn test_wallet_config_p2sh_m() {
        let config_json = r#"{
          "addressType": "P2SH",
          "network": "mainnet",
          "requiredSigners": 2,
          "keyOrigins": [
            {
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
                "xfp" : "f57ec65d"
              },
            {
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub",
                "xfp" : "efa5d916"
              }
          ]
        }"#;

        test_wallet_config(
            config_json,
            vec![
                "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/0/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/0/*))#uxj9xxul",
                "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/1/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/1/*))#3hxf9z66",
            ],
        );
    }

    #[test]
    fn test_export_p2sh_m() {
        let config_json = r#"{
          "name": "P2SH-M",
          "addressType": "P2SH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "osw",
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
                "xfp" : "f57ec65d"
              },
            {
                "name": "d",
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "3PiCF26aq57Wo5DJEbFNTVwD1bLCUEpAYZ",
                "3EvHiVyDVoLjeZNMt3v1QTQfs2P4ohVwmg",
                "3PSAx42y6hzWvx2QxQon7CymauWs2SZXuA",
            ],
        );
    }

    #[test]
    fn test_import_p2sh_m() {
        let external_descriptor = "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/0/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/0/*))#uxj9xxul";
        let internal_descriptor = "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/1/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/1/*))#3hxf9z66";

        let name = "P2SH-M";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2SH-M",
          "addressType": "P2SH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH",
                "xfp" : "f57ec65d"
              },
            {
                "bip32Path": "m/45'/0'/100'",
                "xpub": "xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "bitcoin",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }

    #[test]
    fn test_export_p2sh_t() {
        let config_json = r#"{
          "name": "P2SH-T",
          "addressType": "P2SH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "dev",
                "bip32Path": "m/45'/1'/100'",
                "xpub": "tpubDDinbKDXyddTUKcX6mv936Ux5utCJteq5S6EEKhfpM8CqN2rMAcccv6GecsB3cPt8eGL4e4K2eaZ9Jis9TGf7mbwBsRTN7ngnFR7yJZxBKC",
                "xfp" : "efa5d916"
              },
            {
                "name": "osw",
                "bip32Path": "m/45'/1'/100'",
                "xpub": "tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "2N5KgAnFFpmk5TRMiCicRZDQS8FFNCKqKf1",
                "2N5hHeNeqk72xkQiHWTHvmpVTpyuKynGrcH",
                "2NC1zVgtFLBfc3UZvnhhjNAF15NmksNCZXe",
            ],
        );
    }

    #[test]
    fn test_import_p2sh_t() {
        let external_descriptor = "sh(sortedmulti(2,[efa5d916/45'/1'/100']tpubDDinbKDXyddTUKcX6mv936Ux5utCJteq5S6EEKhfpM8CqN2rMAcccv6GecsB3cPt8eGL4e4K2eaZ9Jis9TGf7mbwBsRTN7ngnFR7yJZxBKC/0/*,[f57ec65d/45'/1'/100']tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1/0/*))#e4qrgzdy";
        let internal_descriptor = "sh(sortedmulti(2,[efa5d916/45'/1'/100']tpubDDinbKDXyddTUKcX6mv936Ux5utCJteq5S6EEKhfpM8CqN2rMAcccv6GecsB3cPt8eGL4e4K2eaZ9Jis9TGf7mbwBsRTN7ngnFR7yJZxBKC/1/*,[f57ec65d/45'/1'/100']tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1/1/*))#5y50txtp";
        let name = "P2SH-T";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2SH-T",
          "addressType": "P2SH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/45'/1'/100'",
                "xpub": "tpubDDinbKDXyddTUKcX6mv936Ux5utCJteq5S6EEKhfpM8CqN2rMAcccv6GecsB3cPt8eGL4e4K2eaZ9Jis9TGf7mbwBsRTN7ngnFR7yJZxBKC",
                "xfp" : "efa5d916"
              },
            {
                "bip32Path": "m/45'/1'/100'",
                "xpub": "tpubDDQubdBx9cbwQtdcRTisKF7wVCwHgHewhU7wh77VzCi62Q9q81qyQeLoZjKWZ62FnQbWU8k7CuKo2A21pAWaFtPGDHP9WuhtAx4smcCxqn1",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "testnet",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }

    #[test]
    fn test_export_p2sh_p2wsh_m() {
        let config_json = r#"{
          "name": "P2SH-P2WSH-M",
          "addressType": "P2SH-P2WSH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "d",
                "bip32Path": "m/48'/0'/100'/1'",
                "xpub": "xpub6EwJjKaiocGvo9f7XSGXGwzo1GLB1URxSZ5Ccp1wqdxNkhrSoqNQkC2CeMsU675urdmFJLHSX62xz56HGcnn6u21wRy6uipovmzaE65PfBp",
                "xfp" : "efa5d916"
              },
            {
                "name": "osw",
                "bip32Path": "m/48'/0'/100'/1'",
                "xpub": "xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "348PsXezZAHcW7RjmCoMJ8PHWx1QBTXJvm",
                "3GFHyS5GGzTLJaJz6qeSjMrtQGLsbFG4Z8",
                "34Gam7P9rrWwZTeF74WceJ2PGH9XCZTEi6",
            ],
        );
    }

    #[test]
    fn test_import_p2sh_p2wsh_m() {
        let external_descriptor = "sh(wsh(sortedmulti(2,[efa5d916/48'/0'/100'/1']xpub6EwJjKaiocGvo9f7XSGXGwzo1GLB1URxSZ5Ccp1wqdxNkhrSoqNQkC2CeMsU675urdmFJLHSX62xz56HGcnn6u21wRy6uipovmzaE65PfBp/0/*,[f57ec65d/48'/0'/100'/1']xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH/0/*)))#jeqfd8lr";
        let internal_descriptor = "sh(wsh(sortedmulti(2,[efa5d916/48'/0'/100'/1']xpub6EwJjKaiocGvo9f7XSGXGwzo1GLB1URxSZ5Ccp1wqdxNkhrSoqNQkC2CeMsU675urdmFJLHSX62xz56HGcnn6u21wRy6uipovmzaE65PfBp/1/*,[f57ec65d/48'/0'/100'/1']xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH/1/*)))#j58fg4ec";
        let name = "P2SH-P2WSH-M";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2SH-P2WSH-M",
          "addressType": "P2SH-P2WSH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/48'/0'/100'/1'",
                "xpub": "xpub6EwJjKaiocGvo9f7XSGXGwzo1GLB1URxSZ5Ccp1wqdxNkhrSoqNQkC2CeMsU675urdmFJLHSX62xz56HGcnn6u21wRy6uipovmzaE65PfBp",
                "xfp" : "efa5d916"
              },
            {
                "bip32Path": "m/48'/0'/100'/1'",
                "xpub": "xpub6DcqYQxnbefzEBJF6osEuT5yXoHVZu1YCCsS5YkATvqD2h7tdMBgdBrUXk26FrJwawDGX6fHKPvhhZxKc5b8dPAPb8uANDhsjAPMJqTFDjH",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "bitcoin",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }

    #[test]
    fn test_export_p2sh_p2wsh_t() {
        let config_json = r#"{
          "name": "P2SH-P2WSH-T",
          "addressType": "P2SH-P2WSH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "osw",
                "bip32Path": "m/48'/1'/100'/1'",
                "xpub": "tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am",
                "xfp" : "f57ec65d"
              },
            {
                "name": "d",
                "bip32Path": "m/48'/1'/100'/1'",
                "xpub": "tpubDErWN5qfdLwY9ZJo9HWpxjcuEFuEBVHSbQbPqF35LQr3etWNGirKcgAa93DZ4DmtHm36p2gTf4aj6KybLqHaS3UePM5LtPqtb3d3dYVDs2F",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "2NDBsV6VBe4d2Ukp2XB644dg2xZ2SuWGkyG",
                "2N2HfmoavC1zjYKxU71Lp1YwCECHXPVKb2Y",
                "2N9g9FZRJ1KUbEvdQ6Mpm5cMGxR3fpM8h5h",
            ],
        );
    }

    #[test]
    fn test_import_p2sh_p2wsh_t() {
        let external_descriptor = "sh(wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/1']tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am/0/*,[efa5d916/48'/1'/100'/1']tpubDErWN5qfdLwY9ZJo9HWpxjcuEFuEBVHSbQbPqF35LQr3etWNGirKcgAa93DZ4DmtHm36p2gTf4aj6KybLqHaS3UePM5LtPqtb3d3dYVDs2F/0/*)))#j7jzgtur";
        let internal_descriptor = "sh(wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/1']tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am/1/*,[efa5d916/48'/1'/100'/1']tpubDErWN5qfdLwY9ZJo9HWpxjcuEFuEBVHSbQbPqF35LQr3etWNGirKcgAa93DZ4DmtHm36p2gTf4aj6KybLqHaS3UePM5LtPqtb3d3dYVDs2F/1/*)))#jn4zde6c";
        let name = "P2SH-P2WSH-T";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2SH-P2WSH-T",
          "addressType": "P2SH-P2WSH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/48'/1'/100'/1'",
                "xpub": "tpubDFc9Mm4tw6EkdXuk24MnQYRrDsdKEFh498vFffqa2KJmxytpcHbWrcFYwTKAdLxkSWpadzb5M5VVZ7PDAUjDjymvUmQ7pBbRecz2FM952Am",
                "xfp" : "f57ec65d"
              },
            {
                "bip32Path": "m/48'/1'/100'/1'",
                "xpub": "tpubDErWN5qfdLwY9ZJo9HWpxjcuEFuEBVHSbQbPqF35LQr3etWNGirKcgAa93DZ4DmtHm36p2gTf4aj6KybLqHaS3UePM5LtPqtb3d3dYVDs2F",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "testnet",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }

    #[test]
    fn test_export_p2wsh_m() {
        let config_json = r#"{
          "name": "P2WSH-M",
          "addressType": "P2WSH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "d",
                "bip32Path": "m/48'/0'/100'/2'",
                "xpub": "xpub6EwJjKaiocGvqSuM2jRZSuQ9HEddiFUFu9RdjE47zG7kXVNDQpJ3GyvskwYiLmvU4SBTNZyv8UH53QcmFEE23YwozE61V3dwzZJEFQr6H2b",
                "xfp" : "efa5d916"
              },
            {
                "name": "osw",
                "bip32Path": "m/48'/0'/100'/2'",
                "xpub": "xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "bc1qf9asympax4r6xrndsqrw8p0qxe40tm9zkk69tkrc8p6eg8ju075sjeekkt",
                "bc1q2dexslsgvj4w2adf2lltthglkchmh3d2qvyrtdrece6lfr5tl4cq382unz",
                "bc1q3kwd3zfaa90r20nvm2u3zxtw9c8cf5x4a4ecgw2y7pf59pnpmxns9keq9w",
            ],
        );
    }

    #[test]
    fn test_import_p2wsh_m() {
        let external_descriptor = "wsh(sortedmulti(2,[efa5d916/48'/0'/100'/2']xpub6EwJjKaiocGvqSuM2jRZSuQ9HEddiFUFu9RdjE47zG7kXVNDQpJ3GyvskwYiLmvU4SBTNZyv8UH53QcmFEE23YwozE61V3dwzZJEFQr6H2b/0/*,[f57ec65d/48'/0'/100'/2']xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc/0/*))#decr929e";
        let internal_descriptor = "wsh(sortedmulti(2,[efa5d916/48'/0'/100'/2']xpub6EwJjKaiocGvqSuM2jRZSuQ9HEddiFUFu9RdjE47zG7kXVNDQpJ3GyvskwYiLmvU4SBTNZyv8UH53QcmFEE23YwozE61V3dwzZJEFQr6H2b/1/*,[f57ec65d/48'/0'/100'/2']xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc/1/*))#wj94h3at";
        let name = "P2WSH-M";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2WSH-M",
          "addressType": "P2WSH",
          "network": "mainnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/48'/0'/100'/2'",
                "xpub": "xpub6EwJjKaiocGvqSuM2jRZSuQ9HEddiFUFu9RdjE47zG7kXVNDQpJ3GyvskwYiLmvU4SBTNZyv8UH53QcmFEE23YwozE61V3dwzZJEFQr6H2b",
                "xfp" : "efa5d916"
              },
            {
                "bip32Path": "m/48'/0'/100'/2'",
                "xpub": "xpub6DcqYQxnbefzFkaRBK63FSE2GzNuNnNhFGw1xV9RioVG7av6r3JDf1aELqBSq5gt5487CtNxvVtaiJjQU2HQWzgG5NzLyTPbYav6otW8qEc",
                "xfp" : "f57ec65d"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "bitcoin",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }

    #[test]
    fn test_export_p2wsh_t() {
        let config_json = r#"{
          "name": "P2WSH-T",
          "addressType": "P2WSH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "name": "osw",
                "bip32Path": "m/48'/1'/100'/2'",
                "xpub": "tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM",
                "xfp" : "f57ec65d"
              },
            {
                "name": "d",
                "bip32Path": "m/48'/1'/100'/2'",
                "xpub": "tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_export(
            config_json,
            vec![
                "tb1qhgj3fnwn50pq966rjnj4pg8uz9ktsd8nge32qxd73ffvvg636p5q54g7m0",
                "tb1q4ka64s7fcdv8ms7xs6j2w35dz8t7n0zd450lgsny73jvg8lpyqfqr9n037",
                "tb1q8fglyvwtlr5t427cqn898jc9vrqxkc43522tpxjaupmn8ewu9sushz86gf",
            ],
        );
    }

    #[test]
    fn test_import_p2wsh_t() {
        let external_descriptor = "wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/2']tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM/0/*,[efa5d916/48'/1'/100'/2']tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj/0/*))#nv5k65uf";
        let internal_descriptor = "wsh(sortedmulti(2,[f57ec65d/48'/1'/100'/2']tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM/1/*,[efa5d916/48'/1'/100'/2']tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj/1/*))#s8fqg0ym";
        let name = "P2WSH-T";

        // NOTE: .extendedPublicKeys[].name fields are set to key hash and are not expected
        let expected_config_json = r#"{
          "name": "P2WSH-T",
          "addressType": "P2WSH",
          "network": "testnet",
          "client":  {
            "type": "public"
          },
          "quorum": {
            "requiredSigners": 2,
            "totalSigners": 2
          },
          "extendedPublicKeys": [
            {
                "bip32Path": "m/48'/1'/100'/2'",
                "xpub": "tpubDFc9Mm4tw6EkgR4YTC1GrU6CGEd9yw7KSBnSssL4LXAXh89D4uMZigRyv3csdXbeU3BhLQc4vWKTLewboA1Pt8Fu6fbHKu81MZ6VGdc32eM",
                "xfp" : "f57ec65d"
              },
            {
                "bip32Path": "m/48'/1'/100'/2'",
                "xpub": "tpubDErWN5qfdLwYE94mh12oWr4uURDDNKCjKVhCEcAgZ7jKnnAwq5tcTF2iEk3VuznkJuk2G8SCHft9gS6aKbBd18ptYWPqKLRSTRQY7e2rrDj",
                "xfp" : "efa5d916"
              }
          ],
          "startingAddressIndex": 0
        }"#;

        test_import(
            "testnet",
            external_descriptor,
            internal_descriptor,
            name,
            expected_config_json,
        );
    }
}
