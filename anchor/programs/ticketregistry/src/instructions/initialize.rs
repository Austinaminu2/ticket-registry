use anchor_lang::prelude::*;

use crate::{
    error::TicketRegistryError,
    state::{Event, MAX_EVENT_DESCRIPTION_LENGTH, MAX_EVENT_NAME_LENGTH},
};

pub fn _initialize(
    ctx: Context<InitializeContext>,
    name: String,
    description: String,
    ticket_price: u64,
    available_tickets: u64,
    start_date: i64,
) -> Result<()> {
    let event = &mut ctx.accounts.event;

    require!(name.len() <= MAX_EVENT_NAME_LENGTH, TicketRegistryError::NameTooLong);
    require!(description.len() <= MAX_EVENT_DESCRIPTION_LENGTH, TicketRegistryError::DescriptionTooLong);
    require!(available_tickets > 0, TicketRegistryError::AvailableTicketLow);
    require!(start_date > Clock::get()?.unix_timestamp, TicketRegistryError::StartDatePast);

    event.name = name;
    event.description = description;
    event.ticket_price = ticket_price;
    event.available_tickets = available_tickets;
    event.start_date = start_date;
    event.event_organizer = ctx.accounts.event_organizer.key();

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeContext<'info> {
    #[account(mut)]
    pub event_organizer: Signer<'info>,
    #[account(
        init,
        payer = event_organizer,
        space = 8 + Event::INIT_SPACE,
        seeds = [b"event", name.as_bytes(), event_organizer.key().as_ref()],
        bump
    )]
    pub event: Account<'info, Event>,
    pub system_program: Program<'info, System>,
}
