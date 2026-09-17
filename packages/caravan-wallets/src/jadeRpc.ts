/**
 * Jade RPC client that matches Blockstream's documented serial protocol.
 *
 * jadets 1.1.20 times out user-facing calls after 5s and mishandles
 * multipart `sign_psbt` replies. This interface is the default used by
 * Caravan Jade interactions.
 *
 * See https://github.com/Blockstream/Jade/blob/master/docs/index.rst
 */

import { IJadeInterface, JadeTransport, RPCRequest, RPCResponse } from "jadets";

/** jadepy default serial timeout, in milliseconds. */
export const DEFAULT_JADE_RPC_TIMEOUT_MS = 120000;

/**
 * RPCs that wait on device-button confirmation. jadets does not pass
 * `long_timeout` for `get_receive_address`; we do, so address review
 * cannot hit the default timeout.
 */
const USER_INTERACTIVE_METHODS = new Set(["get_receive_address"]);

function nextRequestId(): string {
  return Math.floor(Math.random() * 1000000).toString();
}

function concatenateByteChunks(chunks: RPCResponse[]): Uint8Array {
  const parts = chunks.map((chunk) => {
    const { result } = chunk;
    if (result instanceof Uint8Array) {
      return result;
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(result)) {
      return new Uint8Array(result);
    }
    throw new Error("Jade extended data chunk was not binary");
  });
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

export class JadeRpcInterface implements IJadeInterface {
  private transport: JadeTransport;

  constructor(transport: JadeTransport) {
    this.transport = transport;
  }

  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  buildRequest(id: string, method: string, params?: any): RPCRequest {
    return { id, method, params };
  }

  async makeRPCCall(
    request: RPCRequest,
    longTimeout = false,
  ): Promise<RPCResponse> {
    if (!request.id || request.id.length > 16) {
      throw new Error(
        "Request id must be non-empty and less than 16 characters",
      );
    }
    if (!request.method || request.method.length > 32) {
      throw new Error(
        "Request method must be non-empty and less than 32 characters",
      );
    }

    const waitWithoutTimeout =
      longTimeout || USER_INTERACTIVE_METHODS.has(request.method);

    await this.transport.sendMessage(request);
    const initialResponse = await this.waitForResponse(
      request.id,
      waitWithoutTimeout,
    );

    if (this.needsMoreFragments(initialResponse)) {
      return this.collectExtendedData(
        initialResponse,
        request,
        waitWithoutTimeout,
      );
    }

    return initialResponse;
  }

  private waitForResponse(
    requestId: string,
    waitWithoutTimeout: boolean,
  ): Promise<RPCResponse> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const onResponse = (msg: RPCResponse) => {
        if (!msg || msg.id !== requestId) {
          return;
        }
        this.transport.removeListener("message", onResponse);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        resolve(msg);
      };

      this.transport.onMessage(onResponse);

      if (!waitWithoutTimeout) {
        timeoutId = setTimeout(() => {
          this.transport.removeListener("message", onResponse);
          reject(new Error("RPC call timed out"));
        }, DEFAULT_JADE_RPC_TIMEOUT_MS);
      }
    });
  }

  /**
   * Jade seqnum is 1-based. More fragments exist while seqnum < seqlen.
   */
  private needsMoreFragments(response: RPCResponse): boolean {
    return (
      typeof response.seqnum === "number" &&
      typeof response.seqlen === "number" &&
      response.seqnum < response.seqlen
    );
  }

  /**
   * Fetch remaining `sign_psbt` fragments per Jade's get_extended_data
   * request: new id, origid, orig, seqnum, seqlen.
   */
  private async collectExtendedData(
    initialResponse: RPCResponse,
    originalRequest: RPCRequest,
    waitWithoutTimeout: boolean,
  ): Promise<RPCResponse> {
    const chunks = [initialResponse];
    let last = initialResponse;

    // Fragments must be requested in order; Jade will not pipeline them.
    /* eslint-disable no-await-in-loop */
    while (this.needsMoreFragments(last)) {
      const nextSeqnum = (last.seqnum as number) + 1;
      const extendedRequest = this.buildRequest(
        nextRequestId(),
        "get_extended_data",
        {
          origid: originalRequest.id,
          orig: originalRequest.method,
          seqnum: nextSeqnum,
          seqlen: last.seqlen,
        },
      );
      await this.transport.sendMessage(extendedRequest);
      const chunk = await this.waitForResponse(
        extendedRequest.id,
        waitWithoutTimeout,
      );

      if (chunk.error) {
        return chunk;
      }
      if (chunk.seqnum !== nextSeqnum) {
        throw new Error(
          `Expected Jade fragment ${nextSeqnum}, got ${String(chunk.seqnum)}`,
        );
      }
      if (chunk.seqlen !== last.seqlen) {
        throw new Error(
          `Inconsistent Jade seqlen: expected ${String(last.seqlen)}, got ${String(chunk.seqlen)}`,
        );
      }

      chunks.push(chunk);
      last = chunk;
    }
    /* eslint-enable no-await-in-loop */

    return {
      id: originalRequest.id,
      error: chunks[0].error,
      result: concatenateByteChunks(chunks),
    };
  }
}
