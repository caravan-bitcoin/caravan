/**
 * Web Serial transport for Jade.
 *
 * Jade Classic reboots if DTR/RTS stay asserted after the port opens.
 * jadepy clears both lines; jadets SerialTransport does not.
 */

import { SerialTransport } from "jadets";

type SerialPortSignals = {
  setSignals?: (signals: {
    dataTerminalReady: boolean;
    requestToSend: boolean;
  }) => Promise<void>;
};

export class JadeSerialTransport extends SerialTransport {
  async connect(): Promise<void> {
    await super.connect();
    await this.clearHardwareFlowControl();
  }

  private async clearHardwareFlowControl(): Promise<void> {
    const port = (this as unknown as { port?: SerialPortSignals }).port;
    if (!port || typeof port.setSignals !== "function") {
      return;
    }
    try {
      await port.setSignals({
        dataTerminalReady: false,
        requestToSend: false,
      });
    } catch (error) {
      console.warn("Jade serial setSignals failed:", error);
    }
  }
}
