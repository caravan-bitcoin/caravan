//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;

use caravan_rs::utils::set_panic_hook;
use caravan_rs::{CaravanConfig, ExtendedDescriptor, Network};
use wasm_bindgen::__rt::IntoJsResult;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_export() {
    set_panic_hook();
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
    let config = CaravanConfig::from_str(config_json)
        .map_err(|e| e.into_js_result())
        .expect("config");
    let external_descriptor = config
        .external_descriptor()
        .map_err(|e| e.into_js_result())
        .expect("external descriptor");
    assert_eq!(external_descriptor.to_string(), "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/0/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/0/*))#uxj9xxul");
    let internal_descriptor = config
        .internal_descriptor()
        .map_err(|e| e.into_js_result())
        .expect("internal descriptor");
    assert_eq!(internal_descriptor.to_string(), "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/1/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/1/*))#3hxf9z66");
    let network = config.network();
    assert_eq!("bitcoin", network.to_string());
}

#[wasm_bindgen_test]
fn test_import_p2sh_m() {
    set_panic_hook();
    let external_descriptor = "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/0/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/0/*))#uxj9xxul";
    let external_descriptor = ExtendedDescriptor::from_str(external_descriptor)
        .map_err(|e| e.into_js_result())
        .expect("external descriptor");
    let internal_descriptor = "sh(sortedmulti(2,[f57ec65d/45'/0'/100']xpub6CCHViYn5VzPfSR7baop9FtGcbm3UnqHwa54Z2eNvJnRFCJCdo9HtCYoLJKZCoATMLUowDDA1BMGfQGauY3fDYU3HyMzX4NDkoLYCSkLpbH/1/*,[efa5d916/45'/0'/100']xpub6Ca5CwTgRASgkXbXE5TeddTP9mPCbYHreCpmGt9dhz9y6femstHGCoFESHHKKRcm414xMKnuLjP9LDS7TwaJC9n5gxua6XB1rwPcC6hqDub/1/*))#3hxf9z66";
    let internal_descriptor = ExtendedDescriptor::from_str(internal_descriptor)
        .map_err(|e| e.into_js_result())
        .expect("internal descriptor");

    let name = "P2SH-M".to_string();
    let client_type = "public".to_string();
    let network = Network::from_str("bitcoin")
        .map_err(|e| e.into_js_result())
        .expect("network");

    let config = CaravanConfig::new(
        network,
        external_descriptor,
        internal_descriptor,
        name,
        client_type,
    )
    .map_err(|e| e.into_js_result())
    .expect("external descriptor");

    let address_0 = config
        .external_address(1)
        .map_err(|e| e.into_js_result())
        .expect("external address 0");
    assert_eq!(address_0, "3EvHiVyDVoLjeZNMt3v1QTQfs2P4ohVwmg");
}
