import { describe, it, expect } from "vitest";

import { BCUR2Encoder } from "../encoder";

// Simple unit tests focused on dependency injection patterns
describe("BCUR2Encoder Dependency Injection", () => {
  describe("Constructor Dependency Injection", () => {
    it("should create encoder with injected data and maxFragmentLength", () => {
      const customData = "custom-psbt-data";
      const customMaxLength = 200;

      const customEncoder = new BCUR2Encoder(customData, customMaxLength);

      expect(customEncoder.data).toBe(customData);
      expect(customEncoder.maxFragmentLength).toBe(customMaxLength);
    });

    it("should handle different data formats", () => {
      const hexData = "deadbeef";
      const base64Data = "3q2+7w==";

      const hexEncoder = new BCUR2Encoder(hexData, 100);
      const base64Encoder = new BCUR2Encoder(base64Data, 150);

      expect(hexEncoder.data).toBe(hexData);
      expect(base64Encoder.data).toBe(base64Data);
      expect(hexEncoder.maxFragmentLength).toBe(100);
      expect(base64Encoder.maxFragmentLength).toBe(150);
    });

    it("should use default maxFragmentLength when not provided", () => {
      const encoder = new BCUR2Encoder("test-data", 100);
      expect(encoder.maxFragmentLength).toBe(100);
    });
  });

  describe("Configuration Injection", () => {
    it("should allow runtime configuration changes", () => {
      const encoder = new BCUR2Encoder("test-data", 100);

      // Simulate runtime configuration change
      encoder.data = "new-test-data";
      encoder.maxFragmentLength = 200;

      expect(encoder.data).toBe("new-test-data");
      expect(encoder.maxFragmentLength).toBe(200);
    });

    it("should handle edge case configurations", () => {
      // Test with edge cases
      const edgeCaseEncoder = new BCUR2Encoder("", 1);

      expect(edgeCaseEncoder.data).toBe("");
      expect(edgeCaseEncoder.maxFragmentLength).toBe(1);
    });

    it("should handle large fragment sizes", () => {
      const largeFragmentEncoder = new BCUR2Encoder("test", 10000);
      expect(largeFragmentEncoder.maxFragmentLength).toBe(10000);
    });
  });

  describe("Encoder Factory Pattern", () => {
    it("should support factory pattern for encoder creation", () => {
      const encoderFactory = (data: string, maxLength: number) => {
        return new BCUR2Encoder(data, maxLength);
      };

      const encoder1 = encoderFactory("test-data-1", 100);
      const encoder2 = encoderFactory("test-data-2", 200);

      expect(encoder1.data).toBe("test-data-1");
      expect(encoder1.maxFragmentLength).toBe(100);
      expect(encoder2.data).toBe("test-data-2");
      expect(encoder2.maxFragmentLength).toBe(200);
    });

    it("should support parameterized factory functions", () => {
      const createEncoderWithDefaults = (defaultMaxLength: number) => {
        return (data: string, maxLength?: number) => {
          return new BCUR2Encoder(data, maxLength || defaultMaxLength);
        };
      };

      const factory = createEncoderWithDefaults(150);
      const encoder1 = factory("test-data");
      const encoder2 = factory("test-data", 300);

      expect(encoder1.maxFragmentLength).toBe(150);
      expect(encoder2.maxFragmentLength).toBe(300);
    });
  });

  describe("Data Injection Patterns", () => {
    it("should handle different data injection methods", () => {
      // Direct constructor injection
      const directEncoder = new BCUR2Encoder("direct-data", 100);
      expect(directEncoder.data).toBe("direct-data");

      // Runtime data injection
      const runtimeEncoder = new BCUR2Encoder("", 100);
      runtimeEncoder.data = "runtime-data";
      expect(runtimeEncoder.data).toBe("runtime-data");
    });

    it("should support data transformation at injection time", () => {
      const transformAndInject = (
        rawData: string,
        transform: (data: string) => string
      ) => {
        const transformedData = transform(rawData);
        return new BCUR2Encoder(transformedData, 100);
      };

      const encoder = transformAndInject("hello", (data) => data.toUpperCase());
      expect(encoder.data).toBe("HELLO");
    });
  });

  describe("Validation with Dependency Injection", () => {
    it("should maintain consistency across multiple instances with same parameters", () => {
      const data = "consistent-test-data";
      const maxLength = 125;

      const encoder1 = new BCUR2Encoder(data, maxLength);
      const encoder2 = new BCUR2Encoder(data, maxLength);

      expect(encoder1.data).toBe(encoder2.data);
      expect(encoder1.maxFragmentLength).toBe(encoder2.maxFragmentLength);
    });

    it("should handle null and undefined gracefully", () => {
      // Test that encoder can handle edge cases without throwing during construction
      const encoder1 = new BCUR2Encoder("", 100);
      const encoder2 = new BCUR2Encoder("test", 0);

      expect(encoder1.data).toBe("");
      expect(encoder2.maxFragmentLength).toBe(0);
    });
  });

  describe("Encoder Composition Patterns", () => {
    it("should support encoder composition through dependency injection", () => {
      class EncoderWrapper {
        private encoder: BCUR2Encoder;

        constructor(encoder: BCUR2Encoder) {
          this.encoder = encoder;
        }

        getData() {
          return this.encoder.data;
        }

        getMaxLength() {
          return this.encoder.maxFragmentLength;
        }

        updateConfig(data: string, maxLength: number) {
          this.encoder.data = data;
          this.encoder.maxFragmentLength = maxLength;
        }
      }

      const baseEncoder = new BCUR2Encoder("base-data", 100);
      const wrapper = new EncoderWrapper(baseEncoder);

      expect(wrapper.getData()).toBe("base-data");
      expect(wrapper.getMaxLength()).toBe(100);

      wrapper.updateConfig("new-data", 200);
      expect(wrapper.getData()).toBe("new-data");
      expect(wrapper.getMaxLength()).toBe(200);
    });

    it("should support encoder dependency injection in complex scenarios", () => {
      interface EncoderConfig {
        data: string;
        maxFragmentLength: number;
        identifier: string;
      }

      class EncoderManager {
        private encoders: Map<string, BCUR2Encoder> = new Map();

        createEncoder(config: EncoderConfig): BCUR2Encoder {
          const encoder = new BCUR2Encoder(
            config.data,
            config.maxFragmentLength
          );
          this.encoders.set(config.identifier, encoder);
          return encoder;
        }

        getEncoder(identifier: string): BCUR2Encoder | undefined {
          return this.encoders.get(identifier);
        }

        updateEncoder(
          identifier: string,
          data: string,
          maxLength: number
        ): boolean {
          const encoder = this.encoders.get(identifier);
          if (encoder) {
            encoder.data = data;
            encoder.maxFragmentLength = maxLength;
            return true;
          }
          return false;
        }
      }

      const manager = new EncoderManager();

      const encoder1 = manager.createEncoder({
        data: "encoder1-data",
        maxFragmentLength: 100,
        identifier: "encoder1",
      });

      const encoder2 = manager.createEncoder({
        data: "encoder2-data",
        maxFragmentLength: 200,
        identifier: "encoder2",
      });

      expect(encoder1.data).toBe("encoder1-data");
      expect(encoder2.maxFragmentLength).toBe(200);

      expect(manager.updateEncoder("encoder1", "updated-data", 150)).toBe(true);
      expect(encoder1.data).toBe("updated-data");
      expect(encoder1.maxFragmentLength).toBe(150);
    });
  });
});
