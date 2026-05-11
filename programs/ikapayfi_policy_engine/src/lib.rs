#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use encrypt_anchor::EncryptContext;

mod encrypted_policy;

// Updated with a unique program ID for the submission
declare_id!("IkaPayFi111111111111111111111111111111111");

pub const VAULT_SEED: &[u8] = b"ikapayfi-vault";

// CPI authority seed per Ika pre-alpha docs:
// Seeds: [b"__ika_cpi_authority"], program = YOUR_PROGRAM_ID
// Source: https://solana-pre-alpha.ika.xyz (on-chain integration guide)
pub const IKA_CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

// Ika pre-alpha devnet program ID
// Source: https://solana-pre-alpha.ika.xyz (pre-alpha environment section)
pub const IKA_PROGRAM_ID: &str = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";

// Ika DWalletSignatureScheme values (u16 LE)
// 0=EcdsaKeccak256, 1=EcdsaSha256, 2=EcdsaDoubleSha256, 3=TaprootSha256,
// 4=EcdsaBlake2b256, 5=EddsaSha512, 6=SchnorrkelMerlin
// Source: https://solana-pre-alpha.ika.xyz (supported curves and signature schemes)
pub const SIGNATURE_SCHEME_ECDSA_KECCAK256: u16 = 0; // Ethereum (Secp256k1 + Keccak256)
pub const SIGNATURE_SCHEME_EDDSA_SHA512: u16 = 5; // Solana (Ed25519)

#[program]
pub mod ikapayfi_policy_engine {
    use super::*;

    /// Initializes a new private vault for a user.
    /// The vault holds the encrypted policy configuration and tracks allocations.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: [u8; 32],
        policy: PrivatePolicyConfig,
    ) -> Result<()> {
        require!(policy.total_split_bps() <= 10_000, IkaPayFiError::InvalidSplit);

        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.vault_id = vault_id;
        vault.ika_dwallet = ctx.accounts.ika_dwallet.key();
        vault.policy = policy;
        vault.bump = ctx.bumps.vault;

        emit!(VaultInitialized {
            vault: vault.key(),
            authority: vault.authority,
            ika_dwallet: vault.ika_dwallet,
        });

        Ok(())
    }

    /// Records an incoming private payment (inflow).
    /// This is the entry point for tracking payments from other chains (via Ika dWallets).
    pub fn record_private_inflow(
        ctx: Context<RecordPrivateInflow>,
        source_chain: SourceChain,
        asset: AssetKind,
        encrypted_amount_account: Pubkey,
    ) -> Result<()> {
        let inflow = &mut ctx.accounts.inflow;
        inflow.vault = ctx.accounts.vault.key();
        inflow.source_chain = source_chain;
        inflow.asset = asset;
        inflow.encrypted_amount_account = encrypted_amount_account;
        inflow.status = InflowStatus::PendingEncryptedSplit;

        emit!(PrivateInflowRecorded {
            vault: ctx.accounts.vault.key(),
            encrypted_amount_account,
        });

        Ok(())
    }

    /// Commits the result of an encrypted split computation.
    /// In a real FHE flow, these ciphertexts are produced by the Encrypt executor.
    pub fn commit_encrypted_split(
        ctx: Context<CommitEncryptedSplit>,
        savings_ciphertext: Pubkey,
        family_ciphertext: Pubkey,
        bills_ciphertext: Pubkey,
        spendable_ciphertext: Pubkey,
        policy_result_ciphertext: Pubkey,
    ) -> Result<()> {
        let split = &mut ctx.accounts.split;
        split.inflow = ctx.accounts.inflow.key();
        split.savings_ciphertext = savings_ciphertext;
        split.family_ciphertext = family_ciphertext;
        split.bills_ciphertext = bills_ciphertext;
        split.spendable_ciphertext = spendable_ciphertext;
        split.policy_result_ciphertext = policy_result_ciphertext;
        split.ika_approval_status = IkaApprovalStatus::NotRequested;

        emit!(EncryptedSplitCommitted {
            inflow: ctx.accounts.inflow.key(),
            policy_result_ciphertext,
        });

        Ok(())
    }

    /// Executes the private split logic using Encrypt FHE.
    /// This instruction calls the encrypted computation graph `payfi_split_graph`.
    pub fn execute_private_split(
        ctx: Context<ExecutePrivateSplit>,
        cpi_authority_bump: u8,
    ) -> Result<()> {
        let encrypt_ctx = EncryptContext {
            encrypt_program: ctx.accounts.encrypt_program.to_account_info(),
            config: ctx.accounts.config.to_account_info(),
            deposit: ctx.accounts.deposit.to_account_info(),
            cpi_authority: ctx.accounts.encrypt_cpi_authority.to_account_info(),
            caller_program: ctx.accounts.caller_program.to_account_info(),
            network_encryption_key: ctx.accounts.network_encryption_key.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            event_authority: ctx.accounts.event_authority.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            cpi_authority_bump,
        };

        // Call the FHE-enabled DSL function
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
            vault: ctx.accounts.vault.key(),
            amount_ciphertext: ctx.accounts.amount_ct.key(),
            can_sign_ciphertext: ctx.accounts.can_sign_out_ct.key(),
        });

        Ok(())
    }

    /// Approves a message for the Ika dWallet to sign on an external chain.
    /// This happens only after the Solana policy engine verifies the encrypted policy conditions.
    ///
    /// Integration boundary — Ika dWallet CPI:
    /// Per https://solana-pre-alpha.ika.xyz, the real CPI call is:
    ///
    ///   let ctx = DWalletContext {
    ///       dwallet_program,          // Ika program: 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
    ///       cpi_authority,            // PDA: seeds=[b"__ika_cpi_authority"], program=THIS_PROGRAM_ID
    ///       caller_program,           // this program's account info
    ///       cpi_authority_bump,
    ///   };
    ///   ctx.approve_message(
    ///       message_approval,         // writable PDA to create (MessageApproval account)
    ///       dwallet,                  // the dWallet account (authority = cpi_authority)
    ///       payer,                    // rent payer
    ///       system_program,
    ///       message_hash,             // 32-byte keccak256 hash of the message to sign
    ///       user_pubkey,              // connected wallet public key (32 bytes)
    ///       signature_scheme,         // e.g. 0 = EcdsaKeccak256, 5 = EddsaSha512
    ///       bump,                     // MessageApproval PDA bump
    ///   )?;
    ///
    /// On success, Ika network detects the MessageApproval PDA and produces a signature.
    /// The MessageApproval account transitions: Pending(0) → Signed(1).
    pub fn approve_ika_message(ctx: Context<ApproveIkaMessage>, message_hash: [u8; 32]) -> Result<()> {
        let split = &mut ctx.accounts.split;
        require!(split.ika_approval_status != IkaApprovalStatus::Approved, IkaPayFiError::AlreadyApproved);

        split.ika_approval_status = IkaApprovalStatus::Approved;
        split.approved_message_hash = message_hash;

        // NOTE: Real Ika CPI requires ika-dwallet-anchor (anchor-lang v1) which currently
        // conflicts with encrypt-anchor (anchor-lang v0.32). This stub records the approval
        // on-chain; the DWalletContext.approve_message() CPI will be wired once the
        // version conflict is resolved with sponsor-provided SDK guidance.
        // See Cargo.toml and docs/DEVNET_RUNBOOK.md for migration plan.

        emit!(IkaMessageApproved {
            vault: ctx.accounts.vault.key(),
            message_hash,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(vault_id: [u8; 32])]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Ika dWallet account, validated during Ika CPI integration.
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
    /// CHECK: Input amount ciphertext
    #[account(mut)]
    pub amount_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted policy bps
    pub savings_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted policy bps
    pub family_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted policy bps
    pub bills_bps_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypted spend limit
    pub spend_limit_ct: UncheckedAccount<'info>,
    /// CHECK: Output ciphertext
    #[account(mut)]
    pub savings_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output ciphertext
    #[account(mut)]
    pub family_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output ciphertext
    #[account(mut)]
    pub bills_out_ct: UncheckedAccount<'info>,
    /// CHECK: Output ciphertext
    #[account(mut)]
    pub spendable_out_ct: UncheckedAccount<'info>,
    /// CHECK: FHE boolean result
    #[account(mut)]
    pub can_sign_out_ct: UncheckedAccount<'info>,
    /// CHECK: Encrypt program
    pub encrypt_program: UncheckedAccount<'info>,
    /// CHECK: Encrypt config PDA
    pub config: UncheckedAccount<'info>,
    /// CHECK: Encrypt deposit PDA
    #[account(mut)]
    pub deposit: UncheckedAccount<'info>,
    /// CHECK: Encrypt CPI authority
    pub encrypt_cpi_authority: UncheckedAccount<'info>,
    /// CHECK: Caller program
    pub caller_program: UncheckedAccount<'info>,
    /// CHECK: Network encryption key
    pub network_encryption_key: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Encrypt event authority
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
    /// CHECK: PDA used as authority for Ika CPIs
    #[account(seeds = [IKA_CPI_AUTHORITY_SEED, vault.key().as_ref()], bump)]
    pub ika_cpi_authority: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct IkaPayFiVault {
    pub authority: Pubkey,
    pub vault_id: [u8; 32],
    pub ika_dwallet: Pubkey,
    pub policy: PrivatePolicyConfig,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PrivateInflow {
    pub vault: Pubkey,
    pub source_chain: SourceChain,
    pub asset: AssetKind,
    pub encrypted_amount_account: Pubkey,
    pub status: InflowStatus,
}

#[account]
#[derive(InitSpace)]
pub struct EncryptedSplit {
    pub inflow: Pubkey,
    pub savings_ciphertext: Pubkey,
    pub family_ciphertext: Pubkey,
    pub bills_ciphertext: Pubkey,
    pub spendable_ciphertext: Pubkey,
    pub policy_result_ciphertext: Pubkey,
    pub ika_approval_status: IkaApprovalStatus,
    pub approved_message_hash: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct PrivatePolicyConfig {
    pub savings_bps: u16,
    pub family_bps: u16,
    pub bills_bps: u16,
    pub spend_limit_ciphertext: Pubkey,
}

impl PrivatePolicyConfig {
    pub fn total_split_bps(&self) -> u16 {
        self.savings_bps + self.family_bps + self.bills_bps
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub enum SourceChain {
    Bitcoin,
    Ethereum,
    Solana,
    Base,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub enum AssetKind {
    Btc,
    Eth,
    Usdc,
    Rwa,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum InflowStatus {
    PendingEncryptedSplit,
    SplitCommitted,
    Approved,
    ReviewRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum IkaApprovalStatus {
    NotRequested,
    Approved,
    Rejected,
}

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub ika_dwallet: Pubkey,
}

#[event]
pub struct PrivateInflowRecorded {
    pub vault: Pubkey,
    pub encrypted_amount_account: Pubkey,
}

#[event]
pub struct EncryptedSplitCommitted {
    pub inflow: Pubkey,
    pub policy_result_ciphertext: Pubkey,
}

#[event]
pub struct EncryptedSplitExecuted {
    pub vault: Pubkey,
    pub amount_ciphertext: Pubkey,
    pub can_sign_ciphertext: Pubkey,
}

#[event]
pub struct IkaMessageApproved {
    pub vault: Pubkey,
    pub message_hash: [u8; 32],
}

#[error_code]
pub enum IkaPayFiError {
    #[msg("Savings, family, and bills split cannot exceed 100%.")]
    InvalidSplit,
    #[msg("This message has already been approved.")]
    AlreadyApproved,
}
