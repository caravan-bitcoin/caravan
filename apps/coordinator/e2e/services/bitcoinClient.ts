/**
 * Bitcoin Core RPC client factory.
 *
 * This is the only place that reads RPC credentials from env.
 * Everything else receives the client via Playwright fixtures.
 */
import { BitcoinCoreService } from "./bitcoinServices";
import dotenv from "dotenv";
import path from "path";
import { rpcConfig } from "../state/types";

dotenv.config({ path: path.join(process.cwd(), "e2e", ".env") });

export const clientConfig: rpcConfig = {
  username: process.env.BITCOIN_RPC_USER!,
  password: process.env.BITCOIN_RPC_PASSWORD!,
  port: parseInt(process.env.BITCOIN_RPC_PORT!),
  host: `http://localhost:${process.env.BITCOIN_RPC_PORT}`,
};

export default function bitcoinClient(): BitcoinCoreService {
  try {
    return new BitcoinCoreService(clientConfig);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const err = new Error(`Failed to initialize BitcoinCoreService: ${msg}`);
    (err as any).cause = error;
    throw err;
  }
}
