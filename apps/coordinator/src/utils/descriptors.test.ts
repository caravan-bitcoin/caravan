import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  hasChecksum,
  extractChecksum,
  stripChecksum,
  ensureChecksum,
  parseSparrowFormat,
  parseJsonFormat,
  parsePlainDescriptor,
  parseDescriptorInput,
  selectDescriptor,
  formatSparrowExport,
  formatJsonExport,
} from "./descriptors";

// Mock the @caravan/descriptors module
vi.mock("@caravan/descriptors", () => ({
  getChecksum: vi.fn().mockResolvedValue("abc12345"),
}));

describe("descriptors utilities", () => {
  describe("hasChecksum", () => {
    it("should return true for descriptors with valid checksums", () => {
      expect(hasChecksum("wsh(sortedmulti(...))#abc12345")).toBe(true);
      expect(hasChecksum("wpkh([fingerprint/path]xpub...)#ABCD1234")).toBe(
        true,
      );
      expect(hasChecksum("sh(wpkh(...))#a1b2c3d4")).toBe(true);
    });

    it("should return false for descriptors without checksums", () => {
      expect(hasChecksum("wsh(sortedmulti(...))")).toBe(false);
      expect(hasChecksum("wpkh([fingerprint/path]xpub...)")).toBe(false);
    });

    it("should return false for invalid checksum formats", () => {
      // Too short
      expect(hasChecksum("wsh(sortedmulti(...))#abc123")).toBe(false);
      // Too long
      expect(hasChecksum("wsh(sortedmulti(...))#abc123456")).toBe(false);
      // Invalid characters
      expect(hasChecksum("wsh(sortedmulti(...))#abc-1234")).toBe(false);
    });
  });

  describe("extractChecksum", () => {
    it("should extract valid checksums", () => {
      expect(extractChecksum("wsh(sortedmulti(...))#abc12345")).toBe(
        "abc12345",
      );
      expect(extractChecksum("wpkh(...)#ABCD1234")).toBe("ABCD1234");
    });

    it("should return null for descriptors without checksums", () => {
      expect(extractChecksum("wsh(sortedmulti(...))")).toBeNull();
      expect(extractChecksum("wpkh([fingerprint/path]xpub...)")).toBeNull();
    });

    it("should return null for invalid checksum formats", () => {
      expect(extractChecksum("wsh(sortedmulti(...))#abc123")).toBeNull();
    });
  });

  describe("stripChecksum", () => {
    it("should remove checksums from descriptors", () => {
      expect(stripChecksum("wsh(sortedmulti(...))#abc12345")).toBe(
        "wsh(sortedmulti(...))",
      );
      expect(stripChecksum("wpkh(...)#ABCD1234")).toBe("wpkh(...)");
    });

    it("should return descriptor unchanged if no checksum", () => {
      expect(stripChecksum("wsh(sortedmulti(...))")).toBe(
        "wsh(sortedmulti(...))",
      );
    });
  });

  describe("ensureChecksum", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return descriptor unchanged if checksum already present", async () => {
      const descriptor = "wsh(sortedmulti(...))#exist123";
      const result = await ensureChecksum(descriptor);
      expect(result).toBe(descriptor);
    });

    it("should add checksum if missing", async () => {
      const descriptor = "wsh(sortedmulti(...))";
      const result = await ensureChecksum(descriptor);
      expect(result).toBe("wsh(sortedmulti(...))#abc12345");
    });
  });

  describe("parseSparrowFormat", () => {
    const sparrowText = `# Receive and change descriptor (BIP389):
wsh(sortedmulti(2,[96cf6667/45h/1h/12h/2]tpub1/<0;1>/*,[611d202e/45h/1h/11h/2]tpub2/<0;1>/*))#9elkxhm0

# Receive descriptor (Bitcoin Core):
wsh(sortedmulti(2,[96cf6667/45h/1h/12h/2]tpub1/0/*,[611d202e/45h/1h/11h/2]tpub2/0/*))#jakhj6fe

# Change descriptor (Bitcoin Core):
wsh(sortedmulti(2,[96cf6667/45h/1h/12h/2]tpub1/1/*,[611d202e/45h/1h/11h/2]tpub2/1/*))#0586qrtr`;

    it("should parse multipath descriptor", () => {
      const result = parseSparrowFormat(sparrowText);
      expect(result.multipath).toContain("<0;1>");
      expect(result.multipath).toContain("#9elkxhm0");
    });

    it("should parse receive descriptor", () => {
      const result = parseSparrowFormat(sparrowText);
      expect(result.receive).toContain("/0/*");
      expect(result.receive).toContain("#jakhj6fe");
    });

    it("should parse change descriptor", () => {
      const result = parseSparrowFormat(sparrowText);
      expect(result.change).toContain("/1/*");
      expect(result.change).toContain("#0586qrtr");
    });

    it("should handle text with only multipath descriptor", () => {
      const text = `# Receive and change descriptor (BIP389):
wsh(sortedmulti(2,[xfp]tpub/<0;1>/*))#checksum`;
      const result = parseSparrowFormat(text);
      expect(result.multipath).toBeDefined();
      expect(result.receive).toBeUndefined();
      expect(result.change).toBeUndefined();
    });

    it("should infer multipath from <0;1> pattern without header", () => {
      const text = "wsh(sortedmulti(2,[xfp/path]tpub/<0;1>/*))#checksum";
      const result = parseSparrowFormat(text);
      expect(result.multipath).toBeDefined();
    });

    it("should infer receive from /0/* pattern without header", () => {
      const text = "wsh(sortedmulti(2,[xfp/path]tpub/0/*))#checksum";
      const result = parseSparrowFormat(text);
      expect(result.receive).toBeDefined();
    });

    it("should infer change from /1/* pattern without header", () => {
      const text = "wsh(sortedmulti(2,[xfp/path]tpub/1/*))#checksum";
      const result = parseSparrowFormat(text);
      expect(result.change).toBeDefined();
    });
  });

  describe("parseJsonFormat", () => {
    it("should parse standard JSON format", () => {
      const json = JSON.stringify({
        receive: "wsh(...)#recv1234",
        change: "wsh(...)#chng1234",
        multipath: "wsh(...)#mult1234",
      });
      const result = parseJsonFormat(json);
      expect(result.receive).toBe("wsh(...)#recv1234");
      expect(result.change).toBe("wsh(...)#chng1234");
      expect(result.multipath).toBe("wsh(...)#mult1234");
    });

    it("should handle alternative key names", () => {
      const json = JSON.stringify({
        receiveDescriptor: "wsh(...)#recv1234",
        changeDescriptor: "wsh(...)#chng1234",
        multipathDescriptor: "wsh(...)#mult1234",
      });
      const result = parseJsonFormat(json);
      expect(result.receive).toBe("wsh(...)#recv1234");
      expect(result.change).toBe("wsh(...)#chng1234");
      expect(result.multipath).toBe("wsh(...)#mult1234");
    });

    it("should handle partial JSON with only some descriptors", () => {
      const json = JSON.stringify({
        multipath: "wsh(...)#mult1234",
      });
      const result = parseJsonFormat(json);
      expect(result.multipath).toBe("wsh(...)#mult1234");
      expect(result.receive).toBeUndefined();
      expect(result.change).toBeUndefined();
    });

    it("should throw for invalid JSON", () => {
      expect(() => parseJsonFormat("not json")).toThrow("Invalid JSON format");
      expect(() => parseJsonFormat("{invalid}")).toThrow("Invalid JSON format");
    });
  });

  describe("parsePlainDescriptor", () => {
    it("should parse a simple descriptor", () => {
      const result = parsePlainDescriptor("wsh(sortedmulti(...))#abc12345");
      expect(result).toBe("wsh(sortedmulti(...))#abc12345");
    });

    it("should remove comment lines", () => {
      const input = `# This is a comment
wsh(sortedmulti(...))#abc12345`;
      const result = parsePlainDescriptor(input);
      expect(result).toBe("wsh(sortedmulti(...))#abc12345");
    });

    it("should handle whitespace", () => {
      const input = "  wsh(sortedmulti(...))#abc12345  ";
      const result = parsePlainDescriptor(input);
      expect(result).toBe("wsh(sortedmulti(...))#abc12345");
    });

    it("should preserve checksum when present", () => {
      const input = "wsh(sortedmulti(...))#abc12345";
      const result = parsePlainDescriptor(input);
      expect(result).toContain("#abc12345");
    });
  });

  describe("parseDescriptorInput", () => {
    it("should detect and parse JSON format", () => {
      const json = JSON.stringify({
        multipath: "wsh(...)#mult1234",
      });
      const result = parseDescriptorInput(json);
      expect(result.multipath).toBe("wsh(...)#mult1234");
    });

    it("should detect and parse Sparrow format", () => {
      const sparrow = `# Receive and change descriptor (BIP389):
wsh(sortedmulti(2,[xfp]tpub/<0;1>/*))#checksum`;
      const result = parseDescriptorInput(sparrow);
      expect(result.multipath).toBeDefined();
    });

    it("should detect multipath descriptor from <0;1> notation", () => {
      const input = "wsh(sortedmulti(2,[xfp/path]tpub/<0;1>/*))";
      const result = parseDescriptorInput(input);
      expect(result.multipath).toBeDefined();
    });

    it("should detect receive descriptor from /0/* pattern", () => {
      const input = "wsh(sortedmulti(2,[xfp/path]tpub/0/*))";
      const result = parseDescriptorInput(input);
      expect(result.receive).toBeDefined();
    });

    it("should detect change descriptor from /1/* pattern", () => {
      const input = "wsh(sortedmulti(2,[xfp/path]tpub/1/*))";
      const result = parseDescriptorInput(input);
      expect(result.change).toBeDefined();
    });

    it("should default to multipath for ambiguous descriptors", () => {
      const input = "wsh(sortedmulti(2,[xfp/path]tpub/*))";
      const result = parseDescriptorInput(input);
      expect(result.multipath).toBeDefined();
    });
  });

  describe("selectDescriptor", () => {
    it("should prioritize multipath over receive and change", () => {
      const parsed = {
        multipath: "wsh(...)#mult1234",
        receive: "wsh(...)#recv1234",
        change: "wsh(...)#chng1234",
      };
      expect(selectDescriptor(parsed)).toBe("wsh(...)#mult1234");
    });

    it("should fall back to receive if no multipath", () => {
      const parsed = {
        receive: "wsh(...)#recv1234",
        change: "wsh(...)#chng1234",
      };
      expect(selectDescriptor(parsed)).toBe("wsh(...)#recv1234");
    });

    it("should fall back to change if no multipath or receive", () => {
      const parsed = {
        change: "wsh(...)#chng1234",
      };
      expect(selectDescriptor(parsed)).toBe("wsh(...)#chng1234");
    });

    it("should return undefined if no descriptors", () => {
      expect(selectDescriptor({})).toBeUndefined();
    });
  });

  describe("formatSparrowExport", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should format all three descriptor types", async () => {
      const descriptors = {
        multipath: "wsh(sortedmulti(.../<0;1>/*))#mult1234",
        receive: "wsh(sortedmulti(.../0/*))#recv1234",
        change: "wsh(sortedmulti(.../1/*))#chng1234",
      };
      const result = await formatSparrowExport(descriptors);

      expect(result).toContain("# Receive and change descriptor (BIP389):");
      expect(result).toContain("wsh(sortedmulti(.../<0;1>/*))#mult1234");
      expect(result).toContain("# Receive descriptor (Bitcoin Core):");
      expect(result).toContain("wsh(sortedmulti(.../0/*))#recv1234");
      expect(result).toContain("# Change descriptor (Bitcoin Core):");
      expect(result).toContain("wsh(sortedmulti(.../1/*))#chng1234");
    });

    it("should handle only multipath descriptor", async () => {
      const descriptors = {
        multipath: "wsh(sortedmulti(.../<0;1>/*))#mult1234",
      };
      const result = await formatSparrowExport(descriptors);

      expect(result).toContain("# Receive and change descriptor (BIP389):");
      expect(result).toContain("wsh(sortedmulti(.../<0;1>/*))#mult1234");
      expect(result).not.toContain("# Receive descriptor (Bitcoin Core):");
      expect(result).not.toContain("# Change descriptor (Bitcoin Core):");
    });

    it("should add checksum if missing", async () => {
      const descriptors = {
        multipath: "wsh(sortedmulti(.../<0;1>/*))",
      };
      const result = await formatSparrowExport(descriptors);

      // Mock returns "abc12345" for checksum
      expect(result).toContain("#abc12345");
    });

    it("should return empty string for empty descriptors", async () => {
      const result = await formatSparrowExport({});
      expect(result).toBe("");
    });
  });

  describe("formatJsonExport", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should format all three descriptor types as JSON", async () => {
      const descriptors = {
        multipath: "wsh(sortedmulti(.../<0;1>/*))#mult1234",
        receive: "wsh(sortedmulti(.../0/*))#recv1234",
        change: "wsh(sortedmulti(.../1/*))#chng1234",
      };
      const result = await formatJsonExport(descriptors);
      const parsed = JSON.parse(result);

      expect(parsed.multipath).toBe("wsh(sortedmulti(.../<0;1>/*))#mult1234");
      expect(parsed.receive).toBe("wsh(sortedmulti(.../0/*))#recv1234");
      expect(parsed.change).toBe("wsh(sortedmulti(.../1/*))#chng1234");
    });

    it("should handle partial descriptors", async () => {
      const descriptors = {
        multipath: "wsh(sortedmulti(.../<0;1>/*))#mult1234",
      };
      const result = await formatJsonExport(descriptors);
      const parsed = JSON.parse(result);

      expect(parsed.multipath).toBe("wsh(sortedmulti(.../<0;1>/*))#mult1234");
      expect(parsed.receive).toBeUndefined();
      expect(parsed.change).toBeUndefined();
    });

    it("should add checksum if missing", async () => {
      const descriptors = {
        receive: "wsh(sortedmulti(.../0/*))",
      };
      const result = await formatJsonExport(descriptors);
      const parsed = JSON.parse(result);

      // Mock returns "abc12345" for checksum
      expect(parsed.receive).toContain("#abc12345");
    });

    it("should return valid JSON for empty descriptors", async () => {
      const result = await formatJsonExport({});
      expect(JSON.parse(result)).toEqual({});
    });
  });
});
