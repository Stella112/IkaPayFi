/**
 * integration-mode.mjs
 * Returns the current integration environment configuration.
 * All program IDs and endpoints are sourced from the official pre-alpha docs:
 *   Encrypt: https://docs.encrypt.xyz
 *   Ika:     https://solana-pre-alpha.ika.xyz
 */
export function getIntegrationMode() {
  return {
    mode: process.env.IKAPAYFI_INTEGRATION_MODE ?? "local-prealpha",
    solanaRpc: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",

    // Encrypt FHE pre-alpha (https://docs.encrypt.xyz)
    encryptGrpc:
      process.env.ENCRYPT_GRPC_URL ?? "https://pre-alpha-dev-1.encrypt.ika-network.net:443",
    encryptProgramId:
      process.env.ENCRYPT_PROGRAM_ID ?? "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8",

    // Ika dWallet pre-alpha (https://solana-pre-alpha.ika.xyz)
    ikaGrpc:
      process.env.IKA_GRPC_URL ?? "https://pre-alpha-dev-1.ika.ika-network.net:443",
    ikaProgramId:
      process.env.IKA_PROGRAM_ID ?? "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",

    // IkaPayFi policy engine program (deploy with: anchor deploy)
    deployedPolicyProgramId: process.env.IKAPAYFI_PROGRAM_ID ?? null,

    // CPI authority seed per Ika docs: [b"__ika_cpi_authority"], program = YOUR_PROGRAM_ID
    ikaCpiAuthoritySeed: "__ika_cpi_authority",

    // Signature scheme values (Ika DWalletSignatureScheme u16)
    signatureSchemes: {
      EcdsaKeccak256: 0,  // Secp256k1 + Keccak256 (Ethereum)
      EcdsaSha256: 1,     // Secp256k1 + SHA256 (Bitcoin)
      EcdsaDoubleSha256: 2,
      TaprootSha256: 3,
      EcdsaBlake2b256: 4,
      EddsaSha512: 5,     // Ed25519 (Solana)
      SchnorrkelMerlin: 6
    },

    limitations: [
      "Encrypt pre-alpha: no real FHE — data stored as plaintext on devnet (per docs.encrypt.xyz disclaimer).",
      "Ika pre-alpha: single mock signer, not real 2PC-MPC (per solana-pre-alpha.ika.xyz disclaimer).",
      "Set IKAPAYFI_INTEGRATION_MODE=devnet and provide sponsor SDK keys to enable real devnet flow."
    ]
  };
}
