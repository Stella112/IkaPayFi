export function getIntegrationMode() {
  return {
    mode: process.env.IKAPAYFI_INTEGRATION_MODE ?? "local-prealpha",
    solanaRpc: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    encryptGrpc:
      process.env.ENCRYPT_GRPC_URL ?? "https://pre-alpha-dev-1.encrypt.ika-network.net:443",
    encryptProgramId:
      process.env.ENCRYPT_PROGRAM_ID ?? "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8",
    ikaProgramId: process.env.IKA_PROGRAM_ID ?? null,
    deployedPolicyProgramId: process.env.IKAPAYFI_PROGRAM_ID ?? null,
    limitations: [
      "Encrypt public docs state the current pre-alpha has no real encryption.",
      "Ika public docs state Solana pre-alpha signing uses a single mock signer.",
      "Set sponsor-provided SDK credentials and program IDs to move from local-prealpha to devnet."
    ]
  };
}
