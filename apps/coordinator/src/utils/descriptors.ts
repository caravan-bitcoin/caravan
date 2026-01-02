/**
 * Utility functions for parsing and handling descriptor formats
 */

import { getChecksum } from "@caravan/descriptors";

// Checksum regex pattern: 8 alphanumeric characters at the end after #
const CHECKSUM_REGEX = /#[a-z0-9]{8}$/i;

/**
 * Check if a descriptor already has a checksum
 */
export function hasChecksum(descriptor: string): boolean {
  return CHECKSUM_REGEX.test(descriptor);
}

/**
 * Extract the checksum from a descriptor, if present
 */
export function extractChecksum(descriptor: string): string | null {
  const match = descriptor.match(/#([a-z0-9]{8})$/i);
  return match ? match[1] : null;
}

/**
 * Ensure a descriptor has a checksum, adding one if missing
 */
export async function ensureChecksum(descriptor: string): Promise<string> {
  if (hasChecksum(descriptor)) {
    return descriptor;
  }
  const checksum = await getChecksum(descriptor);
  return `${descriptor}#${checksum}`;
}

/**
 * Strip the checksum from a descriptor
 */
export function stripChecksum(descriptor: string): string {
  return descriptor.replace(CHECKSUM_REGEX, "");
}

export interface ParsedSparrowFormat {
  multipath?: string;
  receive?: string;
  change?: string;
}

/**
 * Parses a Sparrow-format text file with comments
 * Format example:
 * # Receive and change descriptor (BIP389):
 * wsh(...)#checksum
 *
 * # Receive descriptor (Bitcoin Core):
 * wsh(...)#checksum
 *
 * # Change descriptor (Bitcoin Core):
 * wsh(...)#checksum
 */
export function parseSparrowFormat(text: string): ParsedSparrowFormat {
  const lines = text.split("\n").map((line) => line.trim());
  const result: ParsedSparrowFormat = {};

  let currentSection: "multipath" | "receive" | "change" | null = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line) continue;

    // Check for section headers
    // NOTE: This could be brittle to changes in how sparrow formats its descriptor .txt
    // file. If it changes in the future we can react accordingly to come up with something more robust.
    if (
      line.includes("Receive and change descriptor") ||
      line.includes("BIP389")
    ) {
      currentSection = "multipath";
      continue;
    }

    if (line.includes("Receive descriptor") && line.includes("Bitcoin Core")) {
      currentSection = "receive";
      continue;
    }

    if (line.includes("Change descriptor") && line.includes("Bitcoin Core")) {
      currentSection = "change";
      continue;
    }

    // If we have a descriptor line (starts with a descriptor type or contains descriptor-like patterns)
    // Match common descriptor patterns: sh(...), wsh(...), pkh(...), wpkh(...), tr(...), etc.
    if (
      line.match(/^(sh|wsh|pkh|wpkh|tr|addr|raw)\(/) ||
      (line.includes("[") &&
        line.includes("]") &&
        (line.includes("tpub") ||
          line.includes("xpub") ||
          line.includes("zpub") ||
          line.includes("ypub") ||
          line.includes("upub") ||
          line.includes("vpub")))
    ) {
      // Extract descriptor (preserve checksum if present - getWalletFromDescriptor validates it)
      // Checksum format: descriptor#checksum (checksum is 8 alphanumeric chars after #)
      // Preserve exact format to maintain checksum validity
      const descriptor = line.trim();

      if (currentSection === "multipath") {
        result.multipath = descriptor;
      } else if (currentSection === "receive") {
        result.receive = descriptor;
      } else if (currentSection === "change") {
        result.change = descriptor;
      } else {
        // If no section header, assume it's multipath if it contains <0;1>
        if (descriptor.includes("<0;1>")) {
          result.multipath = descriptor;
        } else {
          // Try to infer from path (0/* is receive, 1/* is change)
          if (descriptor.includes("/0/*")) {
            result.receive = descriptor;
          } else if (descriptor.includes("/1/*")) {
            result.change = descriptor;
          } else {
            // Default to multipath if we can't determine
            result.multipath = descriptor;
          }
        }
      }
      currentSection = null; // Reset after processing
    }
  }

  return result;
}

/**
 * Parses a JSON descriptor format
 * Format: { change: "...", receive: "...", multipath: "..." }
 */
export function parseJsonFormat(text: string): ParsedSparrowFormat {
  try {
    const parsed = JSON.parse(text);
    return {
      multipath: parsed.multipath || parsed.multipathDescriptor,
      receive: parsed.receive || parsed.receiveDescriptor,
      change: parsed.change || parsed.changeDescriptor,
    };
  } catch (e) {
    throw new Error("Invalid JSON format");
  }
}

/**
 * Parses a plain descriptor string (could be multipath or single descriptor)
 */
export function parsePlainDescriptor(text: string): string {
  const trimmed = text.trim();
  // Remove comments if present
  const withoutComments = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .join(" ")
    .trim();

  // Extract descriptor (preserve checksum if present - getWalletFromDescriptor validates it)
  // Checksum format: descriptor#checksum (checksum is 8 alphanumeric chars after #)
  // If checksum is present, preserve exact format; otherwise normalize whitespace
  if (hasChecksum(withoutComments)) {
    // Preserve exact format when checksum is present to maintain checksum validity
    return withoutComments.trim();
  }
  // Normalize whitespace only if no checksum (descriptor will be validated/computed by getWalletFromDescriptor)
  return withoutComments.split(/\s+/).join(" ").trim();
}

/**
 * Determines the format of descriptor input and parses it
 */
export function parseDescriptorInput(input: string): {
  multipath?: string;
  receive?: string;
  change?: string;
} {
  const trimmed = input.trim();

  // Try JSON first
  if (trimmed.startsWith("{")) {
    return parseJsonFormat(trimmed);
  }

  // Check if it looks like Sparrow format (has comment lines starting with "# ")
  if (
    trimmed.includes("# ") &&
    (trimmed.includes("Receive") ||
      trimmed.includes("Change") ||
      trimmed.includes("BIP389"))
  ) {
    return parseSparrowFormat(trimmed);
  }

  // Otherwise, treat as plain descriptor (could be multipath or single)
  const descriptor = parsePlainDescriptor(trimmed);

  // If it contains multipath notation, return as multipath
  if (descriptor.includes("<0;1>")) {
    return { multipath: descriptor };
  }

  // Otherwise, try to infer receive/change from path
  if (descriptor.includes("/0/*")) {
    return { receive: descriptor };
  } else if (descriptor.includes("/1/*")) {
    return { change: descriptor };
  }

  // Default: return as-is (will be handled by getWalletFromDescriptor)
  return { multipath: descriptor };
}

/**
 * Select the best descriptor from a parsed set
 * Priority: multipath > receive > change
 */
export function selectDescriptor(
  parsed: ParsedSparrowFormat,
): string | undefined {
  return parsed.multipath || parsed.receive || parsed.change;
}

export interface DescriptorSet {
  receive?: string;
  change?: string;
  multipath?: string;
}

/**
 * Format descriptors into Sparrow-compatible export format
 */
export async function formatSparrowExport(
  descriptors: DescriptorSet,
): Promise<string> {
  const lines: string[] = [];

  // Multipath descriptor (BIP389)
  if (descriptors.multipath) {
    lines.push("# Receive and change descriptor (BIP389):");
    lines.push(await ensureChecksum(descriptors.multipath));
    lines.push("");
  }

  // Receive descriptor (Bitcoin Core)
  if (descriptors.receive) {
    lines.push("# Receive descriptor (Bitcoin Core):");
    lines.push(await ensureChecksum(descriptors.receive));
    lines.push("");
  }

  // Change descriptor (Bitcoin Core)
  if (descriptors.change) {
    lines.push("# Change descriptor (Bitcoin Core):");
    lines.push(await ensureChecksum(descriptors.change));
  }

  return lines.join("\n");
}

/**
 * Format descriptors as JSON with checksums
 */
export async function formatJsonExport(
  descriptors: DescriptorSet,
): Promise<string> {
  const result: Record<string, string> = {};

  if (descriptors.receive) {
    result.receive = await ensureChecksum(descriptors.receive);
  }
  if (descriptors.change) {
    result.change = await ensureChecksum(descriptors.change);
  }
  if (descriptors.multipath) {
    result.multipath = await ensureChecksum(descriptors.multipath);
  }

  return JSON.stringify(result, null, 2);
}
