use anchor_lang::prelude::*;

use crate::{error::TicketRegistryError, state::Event};

pub fn _withdraw(ctx: Context<WithdrawContext>, amount: u64) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let organizer = &ctx.accounts.organizer;

    require!(
        event.event_organizer == organizer.key(),
        TicketRegistryError::Unauthorized
    );

    require!(
        event.get_lamports() >= amount,
        TicketRegistryError::InsufficientFunds
    );

    event.sub_lamports(amount)?;
    ctx.accounts.organizer.add_lamports(amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawContext<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}
