import { EventEmitter } from "events";

import { JadeTransport, RPCRequest } from "jadets";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_JADE_RPC_TIMEOUT_MS, JadeRpcInterface } from "./jadeRpc";

class MockTransport extends EventEmitter implements JadeTransport {
  sent: RPCRequest[] = [];

  connect(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(msg: any): Promise<void> {
    this.sent.push(msg);
    return Promise.resolve();
  }

  onMessage(callback: (msg: any) => void): void {
    this.on("message", callback);
  }
}

describe("JadeRpcInterface", () => {
  let transport: MockTransport;
  let rpc: JadeRpcInterface;

  beforeEach(() => {
    transport = new MockTransport();
    rpc = new JadeRpcInterface(transport);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a single-fragment reply", async () => {
    const pending = rpc.makeRPCCall({ id: "1", method: "ping" });
    await vi.waitFor(() => expect(transport.sent).toHaveLength(1));
    transport.emit("message", { id: "1", result: 0 });
    await expect(pending).resolves.toEqual({ id: "1", result: 0 });
  });

  it("does not time out at 5 seconds", async () => {
    vi.useFakeTimers();
    const pending = rpc.makeRPCCall({ id: "1", method: "ping" });
    let settled = false;
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(DEFAULT_JADE_RPC_TIMEOUT_MS - 5000);
    await expect(pending).rejects.toThrow("RPC call timed out");
  });

  it("does not time out get_receive_address while the user reviews the device", async () => {
    vi.useFakeTimers();
    const pending = rpc.makeRPCCall({
      id: "addr",
      method: "get_receive_address",
      params: { network: "mainnet" },
    });
    let settled = false;
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.advanceTimersByTimeAsync(DEFAULT_JADE_RPC_TIMEOUT_MS + 1000);
    expect(settled).toBe(false);

    transport.emit("message", { id: "addr", result: "bc1qtest" });
    await expect(pending).resolves.toEqual({
      id: "addr",
      result: "bc1qtest",
    });
  });

  it("collects every sign_psbt fragment including the last", async () => {
    const pending = rpc.makeRPCCall(
      { id: "orig", method: "sign_psbt", params: { network: "mainnet" } },
      true,
    );
    await vi.waitFor(() => expect(transport.sent).toHaveLength(1));

    transport.emit("message", {
      id: "orig",
      seqnum: 1,
      seqlen: 3,
      result: new Uint8Array([1]),
    });

    await vi.waitFor(() => expect(transport.sent).toHaveLength(2));
    const firstExtended = transport.sent[1];
    expect(firstExtended.method).toBe("get_extended_data");
    expect(firstExtended.id).not.toBe("orig");
    expect(firstExtended.params).toEqual({
      origid: "orig",
      orig: "sign_psbt",
      seqnum: 2,
      seqlen: 3,
    });

    transport.emit("message", {
      id: firstExtended.id,
      seqnum: 2,
      seqlen: 3,
      result: new Uint8Array([2]),
    });

    await vi.waitFor(() => expect(transport.sent).toHaveLength(3));
    const secondExtended = transport.sent[2];
    expect(secondExtended.params).toEqual({
      origid: "orig",
      orig: "sign_psbt",
      seqnum: 3,
      seqlen: 3,
    });

    transport.emit("message", {
      id: secondExtended.id,
      seqnum: 3,
      seqlen: 3,
      result: new Uint8Array([3]),
    });

    const reply = await pending;
    expect(reply.id).toBe("orig");
    expect(Array.from(reply.result as Uint8Array)).toEqual([1, 2, 3]);
  });

  it("does not request extra fragments when seqnum equals seqlen", async () => {
    const pending = rpc.makeRPCCall({ id: "orig", method: "sign_psbt" }, true);
    await vi.waitFor(() => expect(transport.sent).toHaveLength(1));
    transport.emit("message", {
      id: "orig",
      seqnum: 1,
      seqlen: 1,
      result: new Uint8Array([9]),
    });
    const reply = await pending;
    expect(transport.sent).toHaveLength(1);
    expect(Array.from(reply.result as Uint8Array)).toEqual([9]);
  });
});
