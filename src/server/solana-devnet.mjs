import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey
} from "@solana/web3.js";
import { getIntegrationMode } from "./integration-mode.mjs";

const COMMITMENT = "confirmed";

export function createConnection() {
  return new Connection(getIntegrationMode().solanaRpc, COMMITMENT);
}

export function keypairToRecord(keypair) {
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
    createdAt: new Date().toISOString()
  };
}

export function keypairFromRecord(record) {
  return Keypair.fromSecretKey(Uint8Array.from(record.secretKey));
}

export function createWalletRecord() {
  return keypairToRecord(Keypair.generate());
}

export function deriveEncryptAccounts(payerPublicKeyText) {
  const payer = new PublicKey(payerPublicKeyText);
  const encryptProgram = new PublicKey(getIntegrationMode().encryptProgramId);
  const networkKey = Buffer.alloc(32, 0x55);

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("encrypt_config")],
    encryptProgram
  );
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    encryptProgram
  );
  const [depositPda, depositBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("encrypt_deposit"), payer.toBuffer()],
    encryptProgram
  );
  const [networkKeyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("network_encryption_key"), networkKey],
    encryptProgram
  );

  return {
    encryptProgram: encryptProgram.toBase58(),
    configPda: configPda.toBase58(),
    eventAuthority: eventAuthority.toBase58(),
    depositPda: depositPda.toBase58(),
    depositBump,
    networkKeyPda: networkKeyPda.toBase58(),
    networkKeyHex: networkKey.toString("hex")
  };
}

export async function getDevnetStatus(walletRecord) {
  const connection = createConnection();
  if (!walletRecord) {
    return {
      connected: true,
      wallet: null,
      balanceSol: 0
    };
  }

  const publicKey = new PublicKey(walletRecord.publicKey);
  const balanceLamports = await connection.getBalance(publicKey, COMMITMENT);
  const encryptAccounts = deriveEncryptAccounts(walletRecord.publicKey);
  const configAccount = await connection.getAccountInfo(
    new PublicKey(encryptAccounts.configPda),
    COMMITMENT
  );

  return {
    connected: true,
    wallet: {
      publicKey: walletRecord.publicKey,
      explorer: `https://explorer.solana.com/address/${walletRecord.publicKey}?cluster=devnet`
    },
    balanceSol: balanceLamports / LAMPORTS_PER_SOL,
    encryptAccounts,
    encryptConfigFound: Boolean(configAccount),
    checkedAt: new Date().toISOString()
  };
}

export async function requestDevnetAirdrop(walletRecord, sol = 1) {
  const connection = createConnection();
  const publicKey = new PublicKey(walletRecord.publicKey);
  const signature = await connection.requestAirdrop(publicKey, sol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash(COMMITMENT);
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight
    },
    COMMITMENT
  );

  return {
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  };
}
