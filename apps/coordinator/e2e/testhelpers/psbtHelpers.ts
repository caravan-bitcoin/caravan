import fs from "fs"
import path from "path"
import { IndividualSignedPsbtsResult, IndividualPsbtResult } from "../utils/types"
import { testStateManager } from "../utils/testState"

/**
 * Creates individual partially signed PSBT files 
 * Each wallet signs separately, creating individual PSBTs with only their signature
 * @param walletNames - Array of wallet names to sign with 
 * @param client - Bitcoin Core service instance
 * @returns Object with individual signed PSBTs and extracted signatures
 */
export async function createIndividualSignedPsbts(walletNames: string[], client: any): Promise<IndividualSignedPsbtsResult> {
  try {

    const unsignedPsbtPath = testStateManager.getDownloadedUnsignedPsbtFile();
    if(!unsignedPsbtPath || !fs.existsSync(unsignedPsbtPath)) {
        throw new Error("Unsigned PSBT file not found.");
    }

    const unsignedPsbtBase64 = fs.readFileSync(unsignedPsbtPath, 'utf8').trim();

    const individualPsbts: IndividualPsbtResult[] = [];

    // Sign with each wallet individually
    for (const walletName of walletNames) {
        const signResult = await client.signPsbt(walletName, unsignedPsbtBase64);

        const hasSignature = signResult.psbt != unsignedPsbtBase64;
        if(!hasSignature){
            throw new Error(`Wallet ${walletName} didnt add any signature`);
        }

        const extractSignature = await client.extractSignaturesFromPsbt(signResult.psbt);

        if(!extractSignature || extractSignature.length === 0){
            throw new Error(`No signatures extracted from ${walletName} PSBT`);
        }

        const partialPsbtFileName = `partial-psbt-${walletName}.psbt`;
        const uploadDir = testStateManager.getState().uploadDir;

        const partialSignPsbtPath = path.join(uploadDir,partialPsbtFileName);

        fs.writeFileSync(partialSignPsbtPath, signResult.psbt);

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