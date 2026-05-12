//! encrypted_policy.rs — FHE computation graph for IkaPayFi.
//!
//! Defines the private payroll split logic using the Encrypt `#[encrypt_fn]` DSL.
//! Source: https://docs.encrypt.xyz/
//!
//! # Production Integration (uncomment when encrypt-pre-alpha is accessible)
//!
//! ```rust
//! use encrypt_dsl::prelude::encrypt_fn;      // from encrypt-solana-dsl crate
//! use encrypt_types::encrypted::{EBool, EUint64};  // from encrypt-types crate
//!
//! /// IkaPayFi private payroll allocation graph.
//! ///
//! /// All parameters are EUint64 ciphertexts — never decrypted on-chain.
//! /// The Encrypt executor evaluates this graph off-chain using real FHE
//! /// and commits output ciphertext accounts back to Solana.
//! ///
//! /// Logic (identical to the cleartext simulation below):
//! ///   savings   = (amount × savings_bps)  / 10_000
//! ///   family    = (amount × family_bps)   / 10_000
//! ///   bills     = (amount × bills_bps)    / 10_000
//! ///   spendable = amount − savings − family − bills
//! ///   can_sign  = spendable ≤ spend_limit  → EBool policy gate
//! ///
//! /// When can_sign == true, the Solana program is permitted to call
//! /// DWalletContext::approve_message on the Ika dWallet.
//! #[encrypt_fn]
//! pub fn payfi_split_graph(
//!     amount:       EUint64,   // total inflow (e.g. $3,250 in cents = 325_000)
//!     savings_bps:  EUint64,   // e.g. 2500 = 25%
//!     family_bps:   EUint64,   // e.g. 2000 = 20%
//!     bills_bps:    EUint64,   // e.g. 3000 = 30%
//!     spend_limit:  EUint64,   // encrypted max spendable (e.g. 90_000 = $900)
//! ) -> (EUint64, EUint64, EUint64, EUint64, EBool) {
//!     let denominator = EUint64::from(10_000u64);
//!     let savings      = amount * savings_bps  / denominator;
//!     let family       = amount * family_bps   / denominator;
//!     let bills        = amount * bills_bps    / denominator;
//!     let spendable    = amount - savings - family - bills;
//!     let can_sign     = spendable <= spend_limit;  // EBool policy gate
//!     (savings, family, bills, spendable, can_sign)
//! }
//! ```
//!
//! # `#[encrypt_fn]` Compilation Pipeline
//! The macro compiles the function into a DAG of FHE operations. On-chain,
//! `execute_graph` submits the DAG to the Encrypt program, which:
//!   1. Creates output ciphertext PDA accounts
//!   2. Emits an `ExecuteGraph` event
//!   3. The off-chain executor (gRPC at https://pre-alpha-dev-1.encrypt.ika-network.net:443)
//!      evaluates the DAG and calls `commit_result` with the output ciphertexts
//!
//! # Access Note
//! The `encrypt-dsl` and `encrypt-types` crates are in the official pre-alpha repo:
//!   https://github.com/dwallet-labs/encrypt-pre-alpha
//! Cargo.toml is already configured to reference them; they activate via
//! `--features encrypt-types,encrypt-dsl,encrypt-anchor`.

/// Policy split result — plaintext simulation for the Node.js API server.
///
/// In production, each field is a Pubkey pointing to an Encrypt ciphertext PDA,
/// not a cleartext value. This struct drives the UI demo while the on-chain
/// FHE graph handles the real encrypted computation.
#[derive(Debug, Clone)]
pub struct SplitResult {
    /// Savings bucket amount in USD cents
    pub savings_amount:   u64,
    /// Family bucket amount in USD cents
    pub family_amount:    u64,
    /// Bills bucket amount in USD cents
    pub bills_amount:     u64,
    /// Remaining spendable in USD cents
    pub spendable_amount: u64,
    /// FHE policy gate: true = spendable ≤ spend_limit (Ika can sign)
    pub can_sign:         bool,
}

/// Simulates the FHE `payfi_split_graph` in cleartext for the demo API server.
///
/// This is a 1:1 mirror of the production `#[encrypt_fn]` logic above.
/// Replace this with a call to `encrypt_ctx.payfi_split_graph(...)` when
/// the real SDK is available.
///
/// # Arguments
/// - `amount_cents`  — total inflow in USD cents (e.g. 325_000 = $3,250.00)
/// - `savings_bps`   — savings allocation in basis points (e.g. 2500 = 25%)
/// - `family_bps`    — family allocation in basis points
/// - `bills_bps`     — bills allocation in basis points
/// - `spend_limit_cents` — encrypted spend limit in USD cents
pub fn simulate_payfi_split(
    amount_cents:      u64,
    savings_bps:       u64,
    family_bps:        u64,
    bills_bps:         u64,
    spend_limit_cents: u64,
) -> SplitResult {
    const DENOMINATOR: u64 = 10_000;

    let savings      = amount_cents * savings_bps  / DENOMINATOR;
    let family       = amount_cents * family_bps   / DENOMINATOR;
    let bills        = amount_cents * bills_bps    / DENOMINATOR;
    let spendable    = amount_cents.saturating_sub(savings + family + bills);
    let can_sign     = spendable <= spend_limit_cents;

    SplitResult { savings_amount: savings, family_amount: family, bills_amount: bills, spendable_amount: spendable, can_sign }
}

/// Legacy alias — kept for compatibility with existing API server calls.
#[inline]
pub fn simulate_split(
    amount:      u64,
    savings_bps: u64,
    family_bps:  u64,
    bills_bps:   u64,
    spend_limit: u64,
) -> SplitResult {
    simulate_payfi_split(amount, savings_bps, family_bps, bills_bps, spend_limit)
}
