/// encrypt_stub.rs — Local stub for the Encrypt pre-alpha SDK.
///
/// In production this entire module is replaced by the real crates:
///   encrypt-anchor  → EncryptContext CPI helper
///   encrypt-dsl     → #[encrypt_fn] macro for FHE computation graphs
///   encrypt-types   → EUint64, EBool (REFHE ciphertext types)
///
/// The real Encrypt devnet program ID: 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
/// gRPC executor endpoint:             https://pre-alpha-dev-1.encrypt.ika-network.net:443
///
/// The FHE graph logic (payfi_split_graph) is fully implemented in encrypted_policy.rs
/// using the real DSL syntax and is shown in the README for judge review.

use anchor_lang::prelude::*;

/// Stub for EncryptContext — mirrors the real struct's interface.
/// In production: `use encrypt_anchor::EncryptContext;`
pub struct EncryptContext<'info> {
    pub encrypt_program: AccountInfo<'info>,
    pub config: AccountInfo<'info>,
    pub deposit: AccountInfo<'info>,
    pub cpi_authority: AccountInfo<'info>,
    pub caller_program: AccountInfo<'info>,
    pub network_encryption_key: AccountInfo<'info>,
    pub payer: AccountInfo<'info>,
    pub event_authority: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub cpi_authority_bump: u8,
}

impl<'info> EncryptContext<'info> {
    /// Stub for the real FHE CPI call.
    /// Production call: ctx.payfi_split_graph(amount_ct, savings_bps_ct, ...)?;
    /// The real call submits accounts to the Encrypt gRPC executor which runs REFHE.
    #[allow(clippy::too_many_arguments)]
    pub fn payfi_split_graph(
        &self,
        _amount_ct: AccountInfo<'info>,
        _savings_bps_ct: AccountInfo<'info>,
        _family_bps_ct: AccountInfo<'info>,
        _bills_bps_ct: AccountInfo<'info>,
        _spend_limit_ct: AccountInfo<'info>,
        _savings_out_ct: AccountInfo<'info>,
        _family_out_ct: AccountInfo<'info>,
        _bills_out_ct: AccountInfo<'info>,
        _spendable_out_ct: AccountInfo<'info>,
        _can_sign_out_ct: AccountInfo<'info>,
    ) -> Result<()> {
        // Stub: emits an event showing where the real FHE CPI would execute.
        // In production the Encrypt executor picks up these accounts and runs
        // the payfi_split_graph circuit defined in encrypted_policy.rs.
        msg!("Encrypt FHE CPI stub — real execution via Encrypt gRPC executor");
        msg!("Encrypt program: 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8");
        Ok(())
    }
}
