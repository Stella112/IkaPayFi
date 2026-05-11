/// encrypted_policy.rs — FHE computation graph for IkaPayFi.
///
/// This file defines the core private split logic using the Encrypt REFHE DSL.
///
/// ─── PRODUCTION CODE (uses real encrypt-dsl + encrypt-types) ───
/// ```rust
/// use encrypt_dsl::prelude::encrypt_fn;
/// use encrypt_types::encrypted::{EBool, EUint64};
///
/// #[encrypt_fn]
/// pub fn payfi_split_graph(
///     amount: EUint64,
///     savings_bps: EUint64,
///     family_bps: EUint64,
///     bills_bps: EUint64,
///     spend_limit: EUint64,
/// ) -> (EUint64, EUint64, EUint64, EUint64, EBool) {
///     let denominator = EUint64::from(10_000u64);
///     let savings   = amount * savings_bps  / denominator;
///     let family    = amount * family_bps   / denominator;
///     let bills     = amount * bills_bps    / denominator;
///     let spendable = amount - savings - family - bills;
///     let can_sign  = spendable <= spend_limit;  // EBool — true = Ika approves the tx
///     (savings, family, bills, spendable, can_sign)
/// }
/// ```
///
/// The `#[encrypt_fn]` macro compiles this into an FHE circuit submitted to the
/// Encrypt gRPC executor (https://pre-alpha-dev-1.encrypt.ika-network.net:443).
/// All operands are REFHE ciphertexts — computation runs on encrypted data, never plaintext.
///
/// ─── WHY WE USE A STUB ───
/// The real `encrypt-dsl` and `encrypt-types` crates are in a private/access-gated
/// pre-alpha repo (https://github.com/dwallet-labs/encrypt-pre-alpha).
/// This stub keeps the Anchor program buildable while the integration logic is
/// fully documented above and in docs/DEVNET_RUNBOOK.md.

/// Policy split result (cleartext simulation for the demo server).
/// In production these are ciphertext pubkeys from the Encrypt executor.
pub struct SplitResult {
    pub savings_bps: u64,
    pub family_bps: u64,
    pub bills_bps: u64,
    pub spendable_bps: u64,
    pub can_sign: bool,
}

/// Simulates the FHE split graph in cleartext for the Node.js demo server.
/// This mirrors the exact logic of the production `payfi_split_graph` above.
pub fn simulate_split(
    amount: u64,
    savings_bps: u64,
    family_bps: u64,
    bills_bps: u64,
    spend_limit: u64,
) -> SplitResult {
    let denominator = 10_000u64;
    let savings = amount * savings_bps / denominator;
    let family = amount * family_bps / denominator;
    let bills = amount * bills_bps / denominator;
    let spendable = amount.saturating_sub(savings + family + bills);
    let can_sign = spendable <= spend_limit;

    SplitResult {
        savings_bps,
        family_bps,
        bills_bps,
        spendable_bps: denominator - savings_bps - family_bps - bills_bps,
        can_sign,
    }
}
