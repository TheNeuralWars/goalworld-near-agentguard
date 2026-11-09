use near_sdk::json_types::U128;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};

/// On-chain spend policy for a Hermes agent FC key.
/// Funds live in this contract. `pay` attaches 0 deposit so an FC key can call it.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct SpendCap {
    owner: AccountId,
    per_tx_yocto: u128,
    daily_yocto: u128,
    spent_today: u128,
    day_bucket: u64,
    allowlist: LookupMap<AccountId, bool>,
    allowlist_enabled: bool,
}

#[near]
impl SpendCap {
    #[init]
    pub fn new(per_tx_yocto: U128, daily_yocto: U128) -> Self {
        Self {
            owner: env::predecessor_account_id(),
            per_tx_yocto: per_tx_yocto.0,
            daily_yocto: daily_yocto.0,
            spent_today: 0,
            day_bucket: env::block_timestamp() / 86_400_000_000_000,
            allowlist: LookupMap::new(b"a"),
            allowlist_enabled: false,
        }
    }

    pub fn get_config(&self) -> (AccountId, U128, U128, U128, bool) {
        (
            self.owner.clone(),
            U128(self.per_tx_yocto),
            U128(self.daily_yocto),
            U128(self.spent_today),
            self.allowlist_enabled,
        )
    }

    pub fn set_allowlist_enabled(&mut self, enabled: bool) {
        self.assert_owner();
        self.allowlist_enabled = enabled;
    }

    pub fn allow(&mut self, account: AccountId) {
        self.assert_owner();
        self.allowlist.insert(account, true);
    }

    pub fn disallow(&mut self, account: AccountId) {
        self.assert_owner();
        self.allowlist.remove(&account);
    }

    #[payable]
    pub fn deposit(&mut self) {
        assert!(
            env::attached_deposit() > NearToken::from_yoctonear(0),
            "attach NEAR"
        );
    }

    /// Zero-deposit payout — FC-key safe.
    pub fn pay(&mut self, payee: AccountId, amount: U128) -> Promise {
        let amt = amount.0;
        assert!(amt > 0, "amount=0");
        assert!(amt <= self.per_tx_yocto, "per_tx_cap");
        self.roll_day();
        assert!(self.spent_today + amt <= self.daily_yocto, "daily_cap");
        if self.allowlist_enabled {
            assert!(
                self.allowlist.get(&payee).copied().unwrap_or(false),
                "payee_not_allowlisted"
            );
        }
        let bal = env::account_balance().as_yoctonear();
        let reserve: u128 = 50_000_000_000_000_000_000_000; // 0.05 NEAR
        assert!(bal >= amt + reserve, "insufficient_vault");
        self.spent_today += amt;
        Promise::new(payee).transfer(NearToken::from_yoctonear(amt))
    }

    fn roll_day(&mut self) {
        let day = env::block_timestamp() / 86_400_000_000_000;
        if day != self.day_bucket {
            self.day_bucket = day;
            self.spent_today = 0;
        }
    }

    fn assert_owner(&self) {
        assert_eq!(env::predecessor_account_id(), self.owner, "owner only");
    }

    pub fn owner_withdraw(&mut self, payee: AccountId, amount: U128) -> Promise {
        self.assert_owner();
        Promise::new(payee).transfer(NearToken::from_yoctonear(amount.0))
    }
}
