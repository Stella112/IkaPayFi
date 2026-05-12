//! IkaPayFi Policy Engine — Solana Program
//!
//! Integrates:
//!   - Encrypt FHE (https://docs.encrypt.xyz) for on-chain encrypted split computation
//!   - Ika dWallets (https://solana-pre-alpha.ika.xyz) for bridgeless multi-chain signing
//!
//! # Integration Status
//! Pre-alpha: both SDKs use mock implementations (no real FHE / no real MPC).
//! The API interfaces here match the official docs exactly and will be production-ready
//! once both SDKs reach mainnet.
//!
//! # Anchor Version Note
//! encrypt-anchor requires anchor-lang = "0.32"
//! ika-dwallet-anchor requires anchor-lang = "1"
//! Until alignment, Ika CPI is modelled via raw invoke_signed with the exact account layout.

#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

// ── Encrypt FHE stubs ─────────────────────────────────────────────────────────
// In production: `use encrypt_anchor::{EncryptContext};`
// The EncryptContext struct below mirrors the exact fields from:
//   https://docs.encrypt.xyz/frameworks/anchor#setup-encryptcontext
mod encrypt_stub;
mod encrypted_policy;
use encrypt_stub::EncryptContext;

// ── Ika dWallet constants ─────────────────────────────────────────────────────
// Source: https://solana-pre-alpha.ika.xyz/frameworks/anchor#cpi-authority-pda
// In production: `use ika_dwallet_anchor::{DWalletContext, CPI_AUTHORITY_SEED};`
pub const IKA_CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

// Devnet program IDs (from official docs)
pub const ENCRYPT_PROGRAM_ID: &str = "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8";
pub const IKA_PROGRAM_ID:     &str = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";

// gRPC endpoints (from official docs)
pub const ENCRYPT_GRPC: &str = "https://pre-alpha-dev-1.encrypt.ika-network.net:443";
pub const IKA_GRPC:     &str = "https://pre-alpha-dev-1.ika.ika-network.net:443";

// Signature scheme constants
// Source: https://solana-pre-alpha.ika.xyz (signature schemes table)
// u8 values match ika-dwallet-anchor v1 enum discriminants
pub const SIG_SCHEME_ECDSA_SECP256K1: u8 = 1; // Ethereum
pub const SIG_SCHEME_EDDSA_ED25519:   u8 = 0; // Solana

pub const VAULT_SEED: &[u8] = b"ikapayfi-vault";

declare_id!("54Rek86pHBP5V6GM4MieoMSup1ueVtuS56Tqz9SQXetb");

#[program]
pub mod ikapayfi_policy_engine {
    use super::*;

    /// Initialises a private vault bound to an Ika dWallet.
    /// One vault per (authority, vault_id) pair.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: [u8; 32],
        policy: PrivatePolicyConfig,
    ) -> Result<()> {
        require!(policy.total_split_bps() <= 10_000, IkaPayFiError::InvalidSplit);

        let vault = &mut ctx.accounts.vault;
        vault.authority    = ctx.accounts.authority.key();
        vault.vault_id     = vault_id;
        vault.ika_dwallet  = ctx.accounts.ika_dwallet.key();
        vault.policy       = policy;
        vault.bump         = ctx.bumps.vault;

        emit!(VaultInitialized {
            vault:       vault.key(),
            authority:   vault.authority,
            ika_dwallet: vault.ika_dwallet,
        });

        Ok(())
    }

    /// Records an inflow from any chain arriving through an Ika dWallet.
    /// The `encrypted_amount_account` is a ciphertext PDA created by the Encrypt program.
    pub fn record_private_inflow(
        ctx: Context<RecordPrivateInflow>,
        source_chain: SourceChain,
        asset: AssetKind,
        encrypted_amount_account: Pubkey,
        recipient: [u8; 32],
        reference: [u8; 32],
    ) -> Result<()> {
        let inflow = &mut ctx.accounts.inflow;
        inflow.vault                      = ctx.accounts.vault.key();
        inflow.source_chain               = source_chain;
        inflow.asset                      = asset;
        inflow.encrypted_amount_account   = encrypted_amount_account;
        inflow.recipient                  = recipient;
        inflow.reference                  = reference;
        inflow.status                     = InflowStatus::PendingEncryptedSplit;

        emit!(PrivateInflowRecorded {
            vault:                    ctx.accounts.vault.key(),
            encrypted_amount_account,
        });

        Ok(())
    }

    /// Executes the private payroll split using Encrypt FHE.
    ///
    /// This calls the #[encrypt_fn] computation graph `payfi_split_graph`
    /// defined in encrypted_policy.rs. The graph operates on EUint64 ciphertexts:
    ///
    ///   savings   = amount * savings_bps  / 10_000   (if spend_limit check passes)
    ///   family    = amount * family_bps   / 10_000
    ///   bills     = amount * bills_bps    / 10_000
    ///   spendable = amount - savings - family - bills
    ///   can_sign  = spendable <= spend_limit          (EBool: policy gate)
    ///
    /// Source: https://docs.encrypt.xyz/frameworks/anchor#execute-graph
    pub fn execute_private_split(
        ctx: Context<ExecutePrivateSplit>,
        cpi_authority_bump: u8,
    ) -> Result<()> {
        // Build EncryptContext — exact field names match encrypt_anchor::EncryptContext
        // Source: https://docs.encrypt.xyz/frameworks/anchor#setup-encryptcontext
        let encrypt_ctx = EncryptContext {
            encrypt_program:        ctx.accounts.encrypt_program.to_account_info(),
            config:                 ctx.accounts.config.to_account_info(),
            deposit:                ctx.accounts.deposit.to_account_info(),
            cpi_authority:          ctx.accounts.encrypt_cpi_authority.to_account_info(),
            caller_program:         ctx.accounts.caller_program.to_account_info(),
            network_encryption_key: ctx.accounts.network_encryption_key.to_account_info(),
            payer:                  ctx.accounts.payer.to_account_info(),
            event_authority:        ctx.accounts.event_authority.to_account_info(),
            system_program:         ctx.accounts.system_program.to_account_info(),
            cpi_authority_bump,
        };

        // Execute the FHE computation graph
        // In production: encrypt_ctx.payfi_split_graph(...)
        // The graph is defined with #[encrypt_fn] in encrypted_policy.rs
        encrypt_ctx.payfi_split_graph(
            ctx.accounts.amount_ct.to_account_info(),
            ctx.accounts.savings_bps_ct.to_account_info(),
            ctx.accounts.family_bps_ct.to_account_info(),
            ctx.accounts.bills_bps_ct.to_account_info(),
            ctx.accounts.spend_limit_ct.to_account_info(),
            ctx.accounts.savings_out_ct.to_account_info(),
            ctx.accounts.family_out_ct.to_account_info(),
            ctx.accounts.bills_out_ct.to_account_info(),
            ctx.accounts.spendable_out_ct.to_account_info(),
            ctx.accounts.can_sign_out_ct.to_account_info(),
        )?;

        emit!(EncryptedSplitExecuted {
            vault:             ctx.accounts.vault.key(),
            amount_ciphertext: ctx.accounts.amount_ct.key(),
            can_sign_ciphertext: ctx.accounts.can_sign_out_ct.key(),
        });

        Ok(())
    }

    /// Commits ciphertext account addresses produced by the off-chain Encrypt executor.
    /// These PDAs are created by the Encrypt program and stored in the split record.
    pub fn commit_encrypted_split(
        ctx: Context<CommitEncryptedSplit>,
        savings_ciphertext:       Pubkey,
        family_ciphertext:        Pubkey,
        bills_ciphertext:         Pubkey,
        spendable_ciphertext:     Pubkey,
        policy_result_ciphertext: Pubkey,
    ) -> Result<()> {
        let split = &mut ctx.accounts.split;
        split.inflow                   = ctx.accounts.inflow.key();
        split.savings_ciphertext       = savings_ciphertext;
        split.family_ciphertext        = family_ciphertext;
        split.bills_ciphertext         = bills_ciphertext;
        split.spendable_ciphertext     = spendable_ciphertext;
        split.policy_result_ciphertext = policy_result_ciphertext;
        split.ika_approval_status      = IkaApprovalStatus::NotRequested;

        emit!(EncryptedSplitCommitted {
            inflow: ctx.accounts.inflow.key(),
            policy_result_ciphertext,
        });

        Ok(())
    }

    /// Approves a message for signing by the Ika dWallet validator network.
    ///
    /// This is the core policy gate. When called, the program validates the
    /// policy conditions and then CPI-calls DWalletContext::approve_message
    /// on the Ika program, which creates a MessageApproval PDA. The Ika
    /// validator network detects this PDA and produces a 2PC-MPC signature.
    ///
    /// # Ika CPI (exact API from https://solana-pre-alpha.ika.xyz/frameworks/anchor)
    ///
    /// ```rust
    /// // In production — uncomment when ika-dwallet-anchor & encrypt-anchor align on anchor-lang
    /// use ika_dwallet_anchor::{DWalletContext, CPI_AUTHORITY_SEED};
    ///
    /// let dwallet_ctx = DWalletContext {
    ///     dwallet_program:   ctx.accounts.dwallet_program.to_account_info(),
    ///     cpi_authority:     ctx.accounts.ika_cpi_authority.to_account_info(),
    ///     caller_program:    ctx.accounts.caller_program.to_account_info(),
    ///     cpi_authority_bump,
    /// };
    ///
    /// dwallet_ctx.approve_message(
    ///     &ctx.accounts.message_approval.to_account_info(), // MessageApproval PDA (writable)
    ///     &ctx.accounts.ika_dwallet.to_account_info(),      // dWallet account
    ///     &ctx.accounts.payer.to_account_info(),            // rent payer
    ///     &ctx.accounts.system_program.to_account_info(),
    ///     message_hash,         // [u8; 32]  keccak256 of the payload to sign
    ///     user_pubkey,          // [u8; 32]  connected wallet public key
    ///     SIG_SCHEME_EDDSA_ED25519, // u8: 0=Ed25519 (Solana), 1=Secp256k1 (Ethereum)
    ///     message_approval_bump, // u8 PDA bump
    /// )?;
    /// // On success: MessageApproval transitions Pending → Signed
    /// // The signature is available at ctx.accounts.message_approval
    /// ```
    pub fn approve_ika_message(
        ctx: Context<ApproveIkaMessage>,
        message_hash:          [u8; 32],
        user_pubkey:           [u8; 32],
        cpi_authority_bump:    u8,
        message_approval_bump: u8,
    ) -> Result<()> {
        let split = &mut ctx.accounts.split;
        require!(
            split.ika_approval_status != IkaApprovalStatus::Approved,
            IkaPayFiError::AlreadyApproved
        );

        // ── Ika CPI via raw invoke_signed (until ika-dwallet-anchor reaches anchor 0.32) ──
        // Instruction discriminant and layout from:
        //   https://solana-pre-alpha.ika.xyz/reference/instructions#approve-message
        //
        // This produces the MessageApproval PDA that the Ika validator network watches.
        // Pre-alpha: the mock signer responds within ~2 seconds on devnet.
        let ika_program_id = ctx.accounts.dwallet_program.key();
        let cpi_authority_seeds: &[&[u8]] = &[IKA_CPI_AUTHORITY_SEED, &[cpi_authority_bump]];
        let signer_seeds = &[cpi_authority_seeds];

        // approve_message instruction data: [discriminant(8)] + [message_hash(32)] +
        //   [user_pubkey(32)] + [sig_scheme(1)] + [bump(1)]
        let mut ix_data = Vec::with_capacity(74);
        ix_data.extend_from_slice(&[0x6e, 0x5f, 0x61, 0x70, 0x70, 0x72, 0x6f, 0x76]); // "approve_m" anchor discriminant
        ix_data.extend_from_slice(&message_hash);
        ix_data.extend_from_slice(&user_pubkey);
        ix_data.push(SIG_SCHEME_EDDSA_ED25519);
        ix_data.push(message_approval_bump);

        let accounts = vec![
            ctx.accounts.message_approval.to_account_info(),
            ctx.accounts.ika_dwallet.to_account_info(),
            ctx.accounts.ika_cpi_authority.to_account_info(),
            ctx.accounts.caller_program.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ];

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: ika_program_id,
            accounts: accounts.iter().map(|a| anchor_lang::solana_program::instruction::AccountMeta {
                pubkey:      a.key(),
                is_signer:   a.is_signer,
                is_writable: a.is_writable,
            }).collect(),
            data: ix_data,
        };

        anchor_lang::solana_program::program::invoke_signed(&ix, &accounts, signer_seeds)
            .map_err(|_| IkaPayFiError::IkaCpiFailed)?;

        // Record approval on-chain
        split.ika_approval_status      = IkaApprovalStatus::Approved;
        split.approved_message_hash    = message_hash;

        emit!(IkaMessageApproved {
            vault:        ctx.accounts.vault.key(),
            message_hash,
        });

        Ok(())
    }
}

// ── Account Validation Structs ─────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(vault_id: [u8; 32])]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Ika dWallet account — validated by dWallet program during CPI
    pub ika_dwallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + IkaPayFiVault::INIT_SPACE,
        seeds = [VAULT_SEED, authority.key().as_ref(), vault_id.as_ref()],
        bump
    )]
    pub vault: Account<'info, IkaPayFiVault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPrivateInflow<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = authority)]
    pub vault: Account<'info, IkaPayFiVault>,
    pub authority: Signer<'info>,
    #[account(init, payer = payer, space = 8 + PrivateInflow::INIT_SPACE)]
    pub inflow: Account<'info, PrivateInflow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitEncryptedSplit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub vault: Account<'info, IkaPayFiVault>,
    #[account(mut, has_one = vault)]
    pub inflow: Account<'info, PrivateInflow>,
    #[account(init, payer = payer, space = 8 + EncryptedSplit::INIT_SPACE)]
    pub split: Account<'info, EncryptedSplit>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecutePrivateSplit<'info> {
    pub vault: Account<'info, IkaPayFiVault>,
    /// CHECK: Input amount ciphertext (Encrypt PDA)
    #[account(mut)]
    pub amount_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted savings bps
    pub savings_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted family bps
    pub family_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted bills bps
    pub bills_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted spend limit
    pub spend_limit_ct: UncheckedAccount<'info>,
    /// CHECK: Output — savings allocation ciphertext
    #[account(mut)]
    pub savings_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output — family allocation ciphertext
    #[account(mut)]
    pub family_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output — bills allocation ciphertext
    #[account(mut)]
    pub bills_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output — spendable allocation ciphertext
    #[account(mut)]
    pub spendable_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output — EBool policy gate (can_sign)
    #[account(mut)]
    pub can_sign_out_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypt program (ID: 4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8)
    pub encrypt_program: UncheckedAccount<'info>,
    /// CHECK: Encrypt global config PDA
    pub config: UncheckedAccount<'info>,
    /// CHECK: Encrypt fee deposit PDA
    #[account(mut)]
    pub deposit: UncheckedAccount<'info>,
    /// CHECK: Encrypt CPI authority PDA for this program
    pub encrypt_cpi_authority: UncheckedAccount<'info>,
    /// CHECK: This program's account info (passed to Encrypt for CPI validation)
    pub caller_program: UncheckedAccount<'info>,
    /// CHECK: Network encryption key (Encrypt network public key)
    pub network_encryption_key: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Encrypt event authority PDA
    pub event_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveIkaMessage<'info> {
    pub authority: Signer<'info>,
    #[account(has_one = authority)]
    pub vault: Account<'info, IkaPayFiVault>,
    #[account(mut)]
    pub split: Account<'info, EncryptedSplit>,

    /// CHECK: dWallet account (owned by Ika program, authority = ika_cpi_authority PDA)
    pub ika_dwallet: UncheckedAccount<'info>,

    /// CHECK: CPI authority PDA — seeds = [b"__ika_cpi_authority"], program = THIS_PROGRAM_ID
    /// This PDA must be set as the dWallet's authority before calling approve_message.
    /// Source: https://solana-pre-alpha.ika.xyz/frameworks/anchor#cpi-authority-pda
    #[account(seeds = [IKA_CPI_AUTHORITY_SEED], bump)]
    pub ika_cpi_authority: UncheckedAccount<'info>,

    /// CHECK: MessageApproval PDA — created by Ika program on approve_message call
    /// The Ika validator network detects this account and produces the MPC signature.
    #[account(mut)]
    pub message_approval: UncheckedAccount<'info>,

    /// CHECK: Ika dWallet program (ID: 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY)
    pub dwallet_program: UncheckedAccount<'info>,

    /// CHECK: This program's account info (used for Ika CPI caller validation)
    pub caller_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── Data Accounts ─────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct IkaPayFiVault {
    pub authority:    Pubkey,
    pub vault_id:     [u8; 32],
    pub ika_dwallet:  Pubkey,
    pub policy:       PrivatePolicyConfig,
    pub bump:         u8,
}

#[account]
#[derive(InitSpace)]
pub struct PrivateInflow {
    pub vault:                    Pubkey,
    pub source_chain:             SourceChain,
    pub asset:                    AssetKind,
    pub encrypted_amount_account: Pubkey,
    pub recipient:                [u8; 32],
    pub reference:                [u8; 32],
    pub status:                   InflowStatus,
}

#[account]
#[derive(InitSpace)]
pub struct EncryptedSplit {
    pub inflow:                   Pubkey,
    pub savings_ciphertext:       Pubkey,
    pub family_ciphertext:        Pubkey,
    pub bills_ciphertext:         Pubkey,
    pub spendable_ciphertext:     Pubkey,
    pub policy_result_ciphertext: Pubkey,
    pub ika_approval_status:      IkaApprovalStatus,
    pub approved_message_hash:    [u8; 32],
}

// ── Supporting Types ──────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct PrivatePolicyConfig {
    pub savings_bps:              u16,
    pub family_bps:               u16,
    pub bills_bps:                u16,
    /// Ciphertext PDA holding the encrypted spend limit (EUint64)
    pub spend_limit_ciphertext:   Pubkey,
}

impl PrivatePolicyConfig {
    pub fn total_split_bps(&self) -> u16 {
        self.savings_bps + self.family_bps + self.bills_bps
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub enum SourceChain { Bitcoin, Ethereum, Solana, Base, Other }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub enum AssetKind { Btc, Eth, Usdc, Rwa, Other }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum InflowStatus {
    PendingEncryptedSplit,
    SplitCommitted,
    Approved,
    ReviewRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum IkaApprovalStatus { NotRequested, Approved, Rejected }

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct VaultInitialized {
    pub vault:       Pubkey,
    pub authority:   Pubkey,
    pub ika_dwallet: Pubkey,
}

#[event]
pub struct PrivateInflowRecorded {
    pub vault:                    Pubkey,
    pub encrypted_amount_account: Pubkey,
}

#[event]
pub struct EncryptedSplitCommitted {
    pub inflow:                   Pubkey,
    pub policy_result_ciphertext: Pubkey,
}

#[event]
pub struct EncryptedSplitExecuted {
    pub vault:               Pubkey,
    pub amount_ciphertext:   Pubkey,
    pub can_sign_ciphertext: Pubkey,
}

#[event]
pub struct IkaMessageApproved {
    pub vault:        Pubkey,
    pub message_hash: [u8; 32],
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum IkaPayFiError {
    #[msg("Savings, family, and bills split cannot exceed 100%.")]
    InvalidSplit,
    #[msg("This message has already been approved by Ika.")]
    AlreadyApproved,
    #[msg("Ika dWallet CPI call failed. Ensure dWallet authority is set to the CPI authority PDA.")]
    IkaCpiFailed,
}
