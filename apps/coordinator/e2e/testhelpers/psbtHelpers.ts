import fs from "fs"
import path from "path"
import { PsbtData, PsbtInputData, PsbtOutputData, SignedPsbtResult, IndividualSignedPsbtsResult, IndividualPsbtResult } from "../utils/types"
import { testStateManager } from "../utils/testState"


//! have to import client as well as methods from bitcoinservices



//!test method
/**
 * Analyzes a PSBT and extracts signature information for debugging
 * 
 * @param psbtBase64 - Base64 encoded PSBT
 * @param client - Bitcoin Core service instance
 * @returns Analysis of signatures found in the PSBT
 */
export async function analyzePsbtSignatures(psbtBase64: string, client: any): Promise<PsbtData> {
    try {
        // Decode PSBT using Bitcoin Core
        const decodedPsbt = await client.decodePsbt(psbtBase64);
        
        // console.log("decoded PSBT structure:", JSON.stringify(decodedPsbt, null, 2));
        
        const inputs: PsbtInputData[] = [];
        let totalSignatures = 0;
        
        // Process each input to extract signature data
        for (let i = 0; i < decodedPsbt.inputs.length; i++) {
            const input = decodedPsbt.inputs[i];
            const signatures: { [pubkey: string]: string } = {};
            
            // fix: Use 'partial_signatures' instead of 'partialSig' to match Bitcoin Core output
            if (input.partial_signatures) {
                Object.keys(input.partial_signatures).forEach(pubkey => {
                    signatures[pubkey] = input.partial_signatures[pubkey];
                    totalSignatures++;
                });
            }
            
            inputs.push({
                txid: input.previous_txid || "unknown",
                vout: input.previous_vout || 0,
                sequence: input.sequence,
                signatures,
                signatureCount: Object.keys(signatures).length,
                redeemScript: input.redeem_script,
                witnessScript: input.witness_script
            });
        }
        
        const outputs: PsbtOutputData[] = decodedPsbt.outputs.map((output: any) => ({
            address: output.address,
            value: output.value_sat || output.value || 0,
            scriptPubKey: output.script_pubkey || output.scriptPubKey || ""
        }));
        
        const hasSignatures = totalSignatures > 0;
        
        console.log(`psbt aanalysis Results:`);
        console.log(`total signatures found: ${totalSignatures}`);
        console.log(`has signatures: ${hasSignatures}`);
        console.log(`input count: ${inputs.length}`);
        console.log(`output count: ${outputs.length}`);
        
        // Log signature details for each input
        inputs.forEach((input, index) => {
            console.log(`input ${index}: ${input.signatureCount} signatures`);
            if (input.signatureCount > 0) {
                Object.keys(input.signatures).forEach(pubkey => {
                    console.log(`pubkey: ${pubkey.substring(0, 16)}...`);
                });
            }
        });
        
        return {
            version: decodedPsbt.version || 0,
            inputCount: inputs.length,
            outputCount: outputs.length,
            inputs,
            outputs,
            hasSignatures,
            isComplete: totalSignatures >= inputs.length * 2, // Assuming 2-of-3 multisig
            base64: psbtBase64
        };
        
    } catch (error) {
        console.error("failed to analyze PSBT signatures:", error);
        throw error;
    }
}

/**
 * Creates individual partially signed PSBT files 
 * Each wallet signs separately, creating individual PSBTs with only their signature
 * @param walletNames - Array of wallet names to sign with 
 * @param client - Bitcoin Core service instance
 * @returns Object with individual signed PSBTs and extracted signatures
 */
export async function createIndividualSignedPsbts(walletNames: string[], client: any): Promise<IndividualSignedPsbtsResult> {
  try {
    console.log(`Creating individual signed PSBTs with wallets: ${walletNames.join(', ')}`);

    const unsignedPsbtPath = testStateManager.getDownloadedUnsignedPsbtFile();
    if(!unsignedPsbtPath || !fs.existsSync(unsignedPsbtPath)) {
        throw new Error("Unsigned PSBT file not found.");
    }

    // const unsignedPsbtBase64 = fs.readFileSync(unsignedPsbtPath, 'utf8').trim();
    // console.log("Creating individual signatures from unsigned PSBT");

    // const individualPsbts: IndividualPsbtResult[] = [];

    //! read from the test file && parse it from both end 
    const unsignedPsbtBase64 = fs.readFileSync(unsignedPsbtPath, 'utf8').trim();

    console.log("unsignedpsbtbase64",unsignedPsbtBase64);

    const individualPsbts: IndividualPsbtResult[] = [];


    //! Sign with each wallet individually

    for (const walletName of walletNames) {
        console.log(`Creating partially signed psbt with wallet ${walletName}`);

        const signResult = await client.signPsbt(walletName, unsignedPsbtBase64);

        const hasSignature = signResult.psbt != unsignedPsbtBase64;
        if(!hasSignature){
            throw new Error(`Wallet ${walletName} didnt add any signature`);
        }

        const extractSignature = await client.extractSignaturesFromPsbt(signResult.psbt);

        if(!extractSignature || extractSignature.length === 0){
            throw new Error(`No signatures extracted from ${walletName} PSBT`);
        }
        
        //! create partially signed PSBT file
        const partialPsbtFileName = `partial-psbt-${walletName}.psbt`;
        const uploadDir = testStateManager.getState().uploadDir;

        const partialSignPsbtPath = path.join(uploadDir,partialPsbtFileName);


        //! check here for both the case 
        //! 1. only the base64partialsign psbt or the complete file need to send
        fs.writeFileSync(partialSignPsbtPath, signResult.psbt);




        //! we will have always on sig per wallet ??
        individualPsbts.push({
            walletName,
            partialSignPsbtPath,
            signedPsbt: signResult.psbt,
            signatures: extractSignature
        })
    }
    return {
      individualPsbts,
      unsignedPsbtPath
    };

  } catch (error) {
    throw new Error(`Failed to create individual signed PSBTs: ${error}`);
  }
}