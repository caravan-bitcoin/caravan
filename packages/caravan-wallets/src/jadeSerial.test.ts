import { beforeEach, describe, expect, it, vi } from "vitest";

const { setSignals } = vi.hoisted(() => ({
  setSignals: vi.fn().mockResolvedValue(),
}));

vi.mock("jadets", () => {
  class SerialTransport {
    port: { setSignals: typeof setSignals } | null = null;

    async connect() {
      this.port = { setSignals };
    }
  }

  return { SerialTransport };
});

import { JadeSerialTransport } from "./jadeSerial";

describe("JadeSerialTransport", () => {
  beforeEach(() => {
    setSignals.mockClear();
  });

  it("clears DTR and RTS after the serial port opens", async () => {
    const transport = new JadeSerialTransport({});
    await transport.connect();
    expect(setSignals).toHaveBeenCalledWith({
      dataTerminalReady: false,
      requestToSend: false,
    });
  });
});
