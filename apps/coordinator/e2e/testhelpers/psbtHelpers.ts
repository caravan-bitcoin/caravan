import fs from "fs"
import path from "path"
import { PsbtData, PsbtInputData, PsbtOutputData, SignedPsbtResult } from "../utils/types"
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
        
        console.log("decoded PSBT structure:", JSON.stringify(decodedPsbt, null, 2));
        
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

//! we have to first signed the PSBT right, with both the private keys 
//! one more things so we need this parsePsbt file as we have extract sigs method

/**
 * Creates a fully signed PSBT file from the unsigned PSBT stored in test state
 * @param walletNames - Array of wallet names to sign with 
 * @param client - Bitcoin Core service instance
 * @param outputDir - Directory to save the signed PSBT (def: e2e/downloads)
 * @returns Object with paths to both unsigned and signed PSBT files
 */

//! check its type 
export async function createFullySignedPsbtFile(walletNames: string[], client: any ): Promise<SignedPsbtResult> {
    try {
        // const outputDir = testStateManager.getState().downloadDir;

        console.log(`Creating fully signed psbtt with wallets: ${walletNames.join(', ')}`);

        const unsignedPsbtPath = testStateManager.getDownloadedUnsignedPsbtFile();
        if(!unsignedPsbtPath || !fs.existsSync(unsignedPsbtPath)){
            throw new Error("Unsigned PSBT file not found. Make sure previous test created it.")
        }

        const unsignedPsbtBase64 = fs.readFileSync(unsignedPsbtPath, 'utf8').trim()
        console.log("unsigned base64 psbt",unsignedPsbtBase64)

        // Analyze the unsigned PSBT first
        console.log("=== ANALYZING UNSIGNED PSBT ===");
        const unsignedAnalysis = await analyzePsbtSignatures(unsignedPsbtBase64, client);
        console.log(`Unsigned PSBT has ${unsignedAnalysis.hasSignatures ? 'signatures' : 'no signatures'}`);

        const individualSignedPsbts: string[]= [];

        for (const walletName of walletNames) {
            console.log(`signing psbt with wallet: ${walletName}`)

            const signResult = await client.signPsbt(walletName, unsignedPsbtBase64);
            console.log("signResult: ",signResult)

            
            const hasSignatures =  signResult.psbt !== unsignedPsbtBase64;
            if(!hasSignatures){
                throw new Error(`Wallet ${walletName} did not add any signature`)
            }

            individualSignedPsbts.push(signResult.psbt)

        }

        // Combine all the individually signed PSBTs
        console.log("combining individually signed PSBT")

        const combinedSignedPbst = await client.combinePsbt(individualSignedPsbts);

        // Analyze the final signed PSBT
        console.log("=== ANALYZING SIGNED PSBT ===");
        const signedAnalysis = await analyzePsbtSignatures(combinedSignedPbst, client);
        console.log(`Signed PSBT has ${signedAnalysis.hasSignatures ? 'signatures' : 'no signatures'}`);
        console.log(`Signed PSBT is ${signedAnalysis.isComplete ? 'complete' : 'incomplete'}`);

        //! add a validation check for psbt if its can be finalized


        //Create a signed PSBT file
        const timeStamp = Date.now();
        const signedPsbtFileName = `signed-psbt-${timeStamp}.psbt`;
        const uploadDir = testStateManager.getState().uploadDir

        //! check if we need to update this as well in global state(for now idont think so)
        const signedPsbtPath = path.join(uploadDir, signedPsbtFileName);

        fs.writeFileSync(signedPsbtPath, combinedSignedPbst)
        
        //! think of a planned str of storing it in global(if needed)
        // testStateManager.updateState({uploadedDirFiles: {}})

        const result: SignedPsbtResult= {
            unsignedPsbtPath,
            signedPsbtPath,
            signedPsbtBase64: combinedSignedPbst,
            isComplete: signedAnalysis.isComplete,
            walletsSigned: walletNames
        }

        console.log("fully signed psbt creation done")
        return result;

    } catch (error) {
        throw new Error(`Failed to create fully signed PSBT: ${error}`)
    }
}