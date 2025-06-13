#!/usr/bin/env node

const { execSync } = require("child_process");
const { engines } = require("../package.json");

const nodeRange = engines.node;
const npmRange = engines.npm;

// Get current versions
const currentNode = process.version; // e.g., "v20.18.0"
const currentNpm = execSync("npm --version", { encoding: "utf8" }).trim(); // e.g., "10.5.0"

// Parse version string into comparable numbers
function parseVersion(version) {
  return version.replace(/^v/, "").split(".").map(Number);
}

// Check if version satisfies a range like ">=20.18.0 <21.0.0"
function satisfiesRange(version, range) {
  const [major, minor, patch] = parseVersion(version);

  // Handle ranges like ">=20.18.0 <21.0.0"
  if (range.includes(">=") && range.includes("<")) {
    const parts = range.split(" ");
    const minVersion = parts[0].replace(">=", "");
    const maxVersion = parts[1].replace("<", "");

    const [minMaj, minMin, minPatch] = parseVersion(minVersion);
    const [maxMaj] = parseVersion(maxVersion);

    // Check if version >= minimum
    const aboveMin =
      major > minMaj ||
      (major === minMaj && minor > minMin) ||
      (major === minMaj && minor === minMin && patch >= minPatch);

    // Check if version < maximum
    const belowMax = major < maxMaj;

    return aboveMin && belowMax;
  }

  // Handle other range formats if needed
  if (range.startsWith(">=")) {
    const minVersion = range.replace(">=", "");
    const [minMaj, minMin, minPatch] = parseVersion(minVersion);
    return (
      major > minMaj ||
      (major === minMaj && minor > minMin) ||
      (major === minMaj && minor === minMin && patch >= minPatch)
    );
  }

  return false;
}

// Validate Node.js version
const nodeValid = satisfiesRange(currentNode, nodeRange);
const npmValid = satisfiesRange(currentNpm, npmRange);

if (!nodeValid || !npmValid) {
  console.error("\n⚠️  Node/npm version mismatch!");
  console.error(`   Required: Node ${nodeRange}, npm ${npmRange}`);
  console.error(`   Current:  Node ${currentNode}, npm v${currentNpm}`);
  console.error("");

  if (!nodeValid) {
    // Extract a reasonable Node version to suggest
    const nodeVer = nodeRange.split(" ")[0].replace(/[^0-9.]/g, "");
    console.error(
      `   • Install Node: nvm install ${nodeVer} && nvm use ${nodeVer}`,
    );
  }

  if (!npmValid) {
    // Extract a reasonable npm version to suggest
    const npmVer = npmRange.split(" ")[0].replace(/[^0-9.]/g, "");
    const npmMajorMinor = npmVer.split(".").slice(0, 2).join(".");
    console.error(`   • Update npm: npm install -g npm@${npmMajorMinor}`);
  }

  console.error("   • Then run: npm install");
  console.error("");
  process.exit(1);
}

console.log("✅ Node.js and npm versions are compatible");
