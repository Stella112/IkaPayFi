use encrypt_dsl::prelude::encrypt_fn;
use encrypt_types::encrypted::{EBool, EUint64};

#[encrypt_fn]
pub fn payfi_split_graph(
    amount: EUint64,
    savings_bps: EUint64,
    family_bps: EUint64,
    bills_bps: EUint64,
    spend_limit: EUint64,
) -> (EUint64, EUint64, EUint64, EUint64, EBool) {
    let denominator = EUint64::from(10_000u64);

    let savings = amount * savings_bps / denominator;
    let family = amount * family_bps / denominator;
    let bills = amount * bills_bps / denominator;
    let spendable = amount - savings - family - bills;
    let can_sign = spendable <= spend_limit;

    (savings, family, bills, spendable, can_sign)
}
