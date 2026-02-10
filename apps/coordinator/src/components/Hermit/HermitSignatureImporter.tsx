import React from "react";
import { connect } from "react-redux";

import {
  Network,
  networkData,
  parseSignatureArrayFromPSBT,
} from "@caravan/bitcoin";
import {
  PENDING,
  UNSUPPORTED,
  HermitSignMultisigTransaction,
} from "@caravan/wallets";
import { Grid, Box, TextField, Button, FormHelperText } from "@mui/material";
import { Psbt } from "bitcoinjs-lib";
import HermitReader from "./HermitReader";
import HermitDisplayer from "./HermitDisplayer";
import InteractionMessages from "../InteractionMessages";
import { setUnsignedPSBT as setUnsignedPSBTAction } from "../../actions/transactionActions";
import { LegacyInput, LegacyOutput } from "@caravan/multisig";
import {
  convertLegacyInput,
  convertLegacyOutput,
  getUnsignedMultisigPsbtV0,
} from "@caravan/psbt";

interface HermitSignatureImporterProps {
  signatureImporter: {
    bip32Path: string;
  };
  resetBIP32Path: () => void;
  setUnsignedPSBT: (psbt: string) => void;
  defaultBIP32Path: string;
  validateAndSetBIP32Path: (val: string, fn: () => void, rest: any) => void;
  validateAndSetSignature: (
    val: string[][] | string[] | null,
    fn: (signatureError: any) => void,
    rest: any,
  ) => void;
  enableChangeMethod: () => void;
  disableChangeMethod: () => void;
  unsignedPsbt?: string;
  unsignedPsbtFromState: string;
  network: Network;
  inputs: LegacyInput[];
  outputs: LegacyOutput[];
  enableRBF: boolean;
}

interface HermitSignatureImporterState {
  bip32PathError: string;
  signatureError: string;
  status: typeof PENDING | typeof UNSUPPORTED;
  displaySignatureRequest: boolean;
}

class HermitSignatureImporter extends React.Component<
  HermitSignatureImporterProps,
  HermitSignatureImporterState
> {
  static defaultProps: {
    unsignedPsbt: string;
    network: string;
    inputs: never[];
    outputs: never[];
    enableRBF: boolean;
  };

  constructor(props: HermitSignatureImporterProps) {
    super(props);
    this.state = {
      bip32PathError: "",
      signatureError: "",
      status: this.interaction().isSupported() ? PENDING : UNSUPPORTED,
      displaySignatureRequest: false,
    };
  }

  // from gh buidl-bitcoin/buidl-python/blob/d79e9808e8ca60975d315be41293cb40d968626d/buidl/helper.py#L350-L379
  childToPath = (child: number) => {
    let hardenedPath = child;
    let toReturn = `/${child}`;
    if (hardenedPath >= 0x80000000) {
      hardenedPath -= 0x80000000;
      toReturn = `/${hardenedPath}'`;
    }
    return toReturn;
  };

  parseBinaryPath = (binPath: ArrayBuffer) => {
    let path = "m";
    let pathData = Buffer.from(binPath as any);
    while (pathData.length > 0) {
      const childNum = Buffer.from(pathData.slice(0, 4) as any).readUIntLE(
        0,
        4,
      );
      path += this.childToPath(childNum);

      pathData = pathData.subarray(4) as any;
    }
    return path;
  };

  interaction = () => {
    const {
      unsignedPsbt,
      network,
      inputs,
      outputs,
      setUnsignedPSBT,
      unsignedPsbtFromState,
    } = this.props;
    let psbtToSign;

    // We need to be flexible here because this signature importer is used in multiple places
    // And the user *could* have uploaded their own PSBT, and that uploaded PSBT *could* also
    // be a scaffolded PSBT without any inputs.

    if (unsignedPsbtFromState === "" && inputs.length > 0) {
      psbtToSign = getUnsignedMultisigPsbtV0({
        network,
        inputs: inputs.map((input) => {
          const convertedInput = convertLegacyInput(input);
          return {
            ...convertedInput,
            sequence: input.sequence,
          };
        }),
        outputs: outputs.map(convertLegacyOutput),
        includeGlobalXpubs: true,
      }).toBase64();

      setUnsignedPSBT(psbtToSign);

      return new HermitSignMultisigTransaction({
        psbt: psbtToSign,
      });
    }

    const psbt = Psbt.fromBase64(
      unsignedPsbt ? unsignedPsbt : unsignedPsbtFromState,
      {
        network: networkData(network),
      },
    );

    // if the unsignedPsbt doesn't have any inputs/outputs, that means we're in the ppk recovery case
    // so we need to add in the inputs and outputs from the redux store and then use *that* as the unsigned psbt
    if (psbt.data.inputs.length === 0) {
      psbt.setVersion(1);

      const b32d =
        psbt.data.globalMap.unknownKeyVals &&
        psbt.data.globalMap.unknownKeyVals[1];

      if (!b32d) throw new Error("missing value from psbt");

      const derivation = b32d.value
        .slice(1)
        .toString("hex")
        .split("de")
        .map((p) => [
          Buffer.from(p.slice(0, 8) as any, "hex"),
          this.parseBinaryPath(Buffer.from(p.slice(8) as any, "hex") as any),
        ]);

      // TODO: these need to be fixed with our new types for PSBT inputs and outputs
      psbt.addInputs(
        Object.values(inputs).map((i) => ({
          hash: i.txid,
          index: i.index,
          nonWitnessUtxo: Buffer.from(i.transactionHex, "hex"),
          redeemScript: (i as { multisig?: { output?: any } })?.multisig
            ?.output,
          bip32Derivation: (
            i as { multisig?: { pubkeys?: any } }
          ).multisig?.pubkeys.map((pk: any, idx: number) => {
            return {
              masterFingerprint: derivation[idx][0],
              path: derivation[idx][1],
              pubkey: pk,
            };
          }),
        })),
      );
      psbt.addOutputs(
        Object.values(outputs).map((o) => ({
          address: o.address,
          value: Number(o.amountSats),
        })),
      );

      psbtToSign = psbt.toBase64();
      setUnsignedPSBT(psbtToSign);
    } else {
      psbtToSign = !unsignedPsbt ? unsignedPsbtFromState : unsignedPsbt;
    }

    return new HermitSignMultisigTransaction({
      psbt: psbtToSign,
    });
  };

  handleShowSignatureRequest = () => {
    this.setState({ displaySignatureRequest: true });
  };

  handleHideSignatureRequest = () => {
    this.setState({ displaySignatureRequest: false });
  };

  render = () => {
    const { signatureImporter, disableChangeMethod, resetBIP32Path } =
      this.props;
    const { bip32PathError, signatureError, status, displaySignatureRequest } =
      this.state;
    const interaction = this.interaction();
    if (status === UNSUPPORTED) {
      return (
        <InteractionMessages
          messages={interaction.messagesFor({ state: status })}
          excludeCodes={["hermit.signature_request", "hermit.command"]}
        />
      );
    }
    return (
      <Box mt={2}>
        <Grid container>
          <Grid item md={10}>
            <TextField
              name="bip32Path"
              value={signatureImporter.bip32Path}
              variant="standard"
              onChange={this.handleBIP32PathChange}
              disabled={status !== PENDING}
              error={this.hasBIP32PathError()}
              helperText={bip32PathError}
            />
          </Grid>

          <Grid item md={2}>
            {!this.bip32PathIsDefault() && (
              <Button
                type="button"
                variant="contained"
                size="small"
                onClick={resetBIP32Path}
                disabled={status !== PENDING}
              >
                Default
              </Button>
            )}
          </Grid>
        </Grid>

        <FormHelperText>
          Use the default value if you don&rsquo;t understand BIP32 paths.
        </FormHelperText>
        <Box mt={2}>
          {displaySignatureRequest ? (
            <Grid container justifyContent="center">
              <Grid item>
                <HermitDisplayer
                  width={400}
                  parts={interaction.request()}
                  onCancel={this.handleHideSignatureRequest}
                />
              </Grid>
            </Grid>
          ) : (
            <Button
              variant="contained"
              color="primary"
              className="m-2"
              size="large"
              onClick={this.handleShowSignatureRequest}
            >
              Show Signature Request
            </Button>
          )}

          <HermitReader
            startText="Scan Signature QR Code"
            interaction={interaction}
            onStart={disableChangeMethod}
            onSuccess={this.import}
            onClear={this.clear}
            width="640px"
          />
          <InteractionMessages
            messages={interaction.messagesFor({ state: status })}
            excludeCodes={["hermit.signature_request", "hermit.command"]}
          />
          <FormHelperText error>{signatureError}</FormHelperText>
        </Box>
      </Box>
    );
  };

  import = (signature: any) => {
    const {
      validateAndSetSignature,
      enableChangeMethod,
      unsignedPsbtFromState,
      network,
    } = this.props;
    this.setState({ signatureError: "" });
    enableChangeMethod();
    const signedPsbt = this.interaction().parse(signature);
    // Signed PSBT from Hermit may be an extremely stripped down version
    const unsignedPsbtStateObject = Psbt.fromBase64(unsignedPsbtFromState, {
      network: networkData(network),
    });
    const reconstitutedPsbt = unsignedPsbtStateObject.combine(
      Psbt.fromBase64(signedPsbt as string, { network: networkData(network) }),
    );

    const signatureArray = parseSignatureArrayFromPSBT(
      reconstitutedPsbt.toBase64(),
    );
    validateAndSetSignature(
      signatureArray,
      (signatureError: any) => {
        this.setState({ signatureError });
      },
      reconstitutedPsbt.toBase64(),
    );
  };

  clear = () => {
    const { enableChangeMethod } = this.props;
    this.setState({ signatureError: "" });
    enableChangeMethod();
  };

  hasBIP32PathError = () => {
    const { bip32PathError } = this.state;
    return bip32PathError !== "";
  };

  handleBIP32PathChange = (event: { target: { value: any } }) => {
    const { validateAndSetBIP32Path } = this.props;
    const bip32Path = event.target.value;
    validateAndSetBIP32Path(
      bip32Path,
      () => {},
      (bip32PathError: any) => {
        this.setState({ bip32PathError });
      },
    );
  };

  bip32PathIsDefault = () => {
    const { signatureImporter, defaultBIP32Path } = this.props;
    return signatureImporter.bip32Path === defaultBIP32Path;
  };
}

function mapStateToProps(state: {
  spend: { transaction: { unsignedPSBT: any; enableRBF: boolean } };
}) {
  return {
    ...state.spend.transaction,
    unsignedPsbtFromState: state.spend.transaction.unsignedPSBT,
    enableRBF: state.spend.transaction.enableRBF,
  };
}

const mapDispatchToProps = {
  setUnsignedPSBT: setUnsignedPSBTAction,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HermitSignatureImporter);
