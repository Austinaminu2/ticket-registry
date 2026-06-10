use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::{error::TicketRegistryError, state::{Event, Ticket}};

pub fn _buy(ctx: Context<BuyContext>) -> Result<()> {
    let event = &mut ctx.accounts.event;
    let ticket = &mut ctx.accounts.ticket;
    let buyer = &ctx.accounts.buyer;

    require!(
        event.start_date > Clock::get()?.unix_timestamp,
        TicketRegistryError::StartDatePast
    );

    require!(
        event.available_tickets > 0,
        TicketRegistryError::AllTicketsSoldOut
    );

    event.available_tickets = event.available_tickets.checked_sub(1).unwrap();

    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: buyer.to_account_info(),
            to: event.to_account_info(),
        },
    );

    transfer(cpi_context, event.ticket_price)?;

    ticket.event = event.key();
    ticket.price = event.ticket_price;
    ticket.buyer = buyer.key();

    Ok(())
}

#[derive(Accounts)]
pub struct BuyContext<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + std::mem::size_of::<Ticket>(),
        seeds = [b"ticket", event.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub ticket: Account<'info, Ticket>,
    #[account(mut)]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}
