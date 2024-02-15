// Compiles images in this directory into base64 encoded data in a .js
// file, suitable for import in a browser context.
//
// FIXME there is probably a smart babel-based way to do this.


const fs = require('fs');
const path = require('path');
const imagesDir = path.dirname(__filename);

function base64Data(imagePath) {
  const bytes = fs.readFileSync(path.join(imagesDir, imagePath));
  return Buffer.from(bytes).toString('base64');
}

function mimeType(imagePath) {
  if (imagePath.endsWith(".png")) {
    return "image/png";
  }
  if (imagePath.endsWith(".jpg")) {
    return "image/jpeg";
  }
  return null;
}

function imageData(imagePath, label) {
  return {
    label,
    data: base64Data(imagePath),
    mimeType: mimeType(imagePath),
  };
}

const IMAGES = {
  ledger: {
    warning: imageData("ledger/warning.png", "Ledger screen displaying a `WARNING!` message."),
    derivationPathIsUnusualV1: imageData("ledger/derivationPathIsUnusualV1.png" ,"Ledger screen displaying a message about an 'unusual path'."),
    derivationPathV1: imageData("ledger/derivationPathV1.png",  "Ledger screen displaying a derivation path."),
    rejectIfNotSureV1: imageData("ledger/rejectIfNotSureV1.png", "Ledger screen displaying a prompt about being sure."),
    addressScrollV1: imageData("ledger/addressScrollV1.png", "Ledger screen displaying a bitcoin address."),
    unusualDerivationBeta: imageData("ledger/unusualDerivationBeta.png", "The derivation path is unusual."),
    fullDerivationPathBeta: imageData("ledger/fullDerivationPathBeta.png", "Ledger screen displaying a derivation path."),
    rejectIfNotSureBeta: imageData("ledger/rejectIfNotSureBeta.png", "Reject if you're not sure."),
    approveDerivationBeta: imageData("ledger/approveDerivationBeta.png", "Approve the derivation path if you are sure."),
    derivationPathBeta: imageData("ledger/derivationPathBeta.png", "Ledger screen displaying a derivation path."),
    addressClickThroughBeta: imageData("ledger/addressClickThroughBeta.png", "Ledger screen will display your corresponding public key."),
    approveAddressBeta: imageData("ledger/approveAddressBeta.png", "Ledger screen asks for your approval."),
    exportPublicKeyBeta: imageData("ledger/exportPublicKeyBeta.png", "Ledger screen asking to export public key"),
    exportPublicKeyV1: imageData("ledger/exportPublicKeyV1.png", "Ledger screen asking to export public key"),
  }
};

fs.writeFileSync(path.join(imagesDir, '../lib/images.js'), "export default " + JSON.stringify(IMAGES) + ";");
