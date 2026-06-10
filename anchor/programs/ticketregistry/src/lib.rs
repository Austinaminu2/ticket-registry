use anchor_lang::prelude::*;

#[cfg(test)]
mod tests;

declare_id!("9TbE4whxJ8dwvxtcR7UB9CDZGbRSpG4oL4EJAxNtjfCC");

pub mod instructions;
pub mod error;
pub mod state;

use instructions::*;

#[program]
pub mod ticketregistry {

    use super::*;

    pub fn initialize(ctx: Context<InitializeContext>, name: String, description: String, ticket_price: u64, available_tickets: u64, start_date: i64) -> Result<()> {
        _initialize(ctx, name, description, ticket_price, available_tickets, start_date)
    }

    pub fn buy(ctx: Context<BuyContext>) -> Result<()> {
        _buy(ctx)
    }

    pub fn withdraw(ctx: Context<WithdrawContext>, amount: u64) -> Result<()> {
        _withdraw(ctx, amount)
    }
}
