import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  analyzeMultisigTransactionSignatures,
  bitcoinsToSatoshis,
  MultisigInputSignatureAnalysis,
} from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Buffer } from "buffer";

import { useGetClient } from "hooks/client";
import { getWalletSlices } from "selectors/wallet";
import Copyable from "../../Copyable";

interface SignerDetails {
  name: string;
  rootFingerprint: string;
  path: string;
}

const transactionIdPattern = /^[0-9a-fA-F]{64}$/;

const SignatureAnalyzer: React.FC = () => {
  const blockchainClient = useGetClient();
  const walletSlices = useSelector(getWalletSlices);
  const keyImporters = useSelector(
    (state: any) => state.quorum.extendedPublicKeyImporters,
  );
  const [transactionInput, setTransactionInput] = useState("");
  const [analyses, setAnalyses] = useState<
    MultisigInputSignatureAnalysis[] | null
  >(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signerByPublicKey = useMemo(() => {
    const importers = Object.values(keyImporters) as Array<{
      name?: string;
      rootXfp?: string;
    }>;
    const result = new Map<string, SignerDetails>();

    walletSlices.forEach((slice) => {
      (slice.multisig?.bip32Derivation || []).forEach((derivation) => {
        const publicKey = Buffer.from(derivation.pubkey).toString("hex");
        const rootFingerprint = Buffer.from(
          derivation.masterFingerprint,
        ).toString("hex");
        const importer = importers.find(
          ({ rootXfp }) => rootXfp?.toLowerCase() === rootFingerprint,
        );
        result.set(publicKey, {
          name: importer?.name || "Unknown quorum key",
          rootFingerprint,
          path: derivation.path,
        });
      });
    });

    return result;
  }, [keyImporters, walletSlices]);

  const analyze = async () => {
    const value = transactionInput.replace(/\s/g, "");
    setError("");
    setAnalyses(null);
    if (!value) {
      setError("Enter a transaction ID or raw transaction hex.");
      return;
    }

    setLoading(true);
    try {
      const transactionHex = transactionIdPattern.test(value)
        ? await blockchainClient.getTransactionHex(value)
        : value;
      const transaction = Transaction.fromHex(transactionHex);

      const amounts = await Promise.all(
        transaction.ins.map(async (input) => {
          if (input.witness.length === 0) return null;
          const previousTxId = Buffer.from(input.hash)
            .reverse()
            .toString("hex");
          const previousTransaction =
            await blockchainClient.getTransaction(previousTxId);
          const previousOutput = previousTransaction.vout[input.index];
          if (!previousOutput) {
            throw new Error(
              `Could not find output ${input.index} of ${previousTxId}.`,
            );
          }
          return Number(bitcoinsToSatoshis(previousOutput.value).toString());
        }),
      );

      setAnalyses(
        analyzeMultisigTransactionSignatures(transactionHex, amounts),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not analyze this transaction.",
      );
    } finally {
      setLoading(false);
    }
  };

  const matchesWallet = (analysis: MultisigInputSignatureAnalysis) =>
    analysis.matches.some(({ publicKey }) => signerByPublicKey.has(publicKey));

  return (
    <Card>
      <CardHeader title="Transaction signature audit" />
      <CardContent>
        <Typography paragraph>
          Enter a transaction ID or raw finalized transaction hex. Caravan will
          verify each multisig signature and match its derived public key to a
          signer in this wallet configuration.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Transaction ID or transaction hex"
          value={transactionInput}
          onChange={(event) => setTransactionInput(event.target.value)}
          disabled={loading}
        />
        <Box mt={2}>
          <Button
            variant="contained"
            onClick={analyze}
            disabled={loading || !blockchainClient}
            startIcon={loading ? <CircularProgress size={18} /> : undefined}
          >
            Analyze signatures
          </Button>
        </Box>

        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {analyses && analyses.length === 0 && (
          <Box mt={2}>
            <Alert severity="info">
              No finalized multisig inputs were found in this transaction.
            </Alert>
          </Box>
        )}

        {analyses?.map((analysis) => (
          <Box mt={3} key={analysis.inputIndex}>
            <Typography variant="h6">
              Input {analysis.inputIndex} ({analysis.addressType})
            </Typography>
            {!matchesWallet(analysis) && (
              <Alert severity="warning">
                This input is multisig, but its public keys do not match the
                currently loaded wallet addresses.
              </Alert>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Signer</TableCell>
                  <TableCell>Fingerprint / path</TableCell>
                  <TableCell>Public key</TableCell>
                  <TableCell>Signature</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analysis.matches.map((match) => {
                  const signer = signerByPublicKey.get(match.publicKey);
                  return (
                    <TableRow
                      key={`${analysis.inputIndex}-${match.signatureIndex}`}
                    >
                      <TableCell>{signer?.name || "Not in wallet"}</TableCell>
                      <TableCell>
                        {signer
                          ? `${signer.rootFingerprint} / ${signer.path}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Copyable text={match.publicKey} code showIcon />
                      </TableCell>
                      <TableCell>
                        <Copyable text={match.signature} code showIcon />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {analysis.unmatchedSignatures.length > 0 && (
              <Alert severity="warning">
                {analysis.unmatchedSignatures.length} signature(s) could not be
                matched to a public key in this input’s multisig script.
              </Alert>
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default SignatureAnalyzer;
