use anchor_lang::prelude::*;

#[error_code]
pub enum TicketRegistryError {
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Start date is in the past")]
    StartDatePast,
    #[msg("Available ticket count is too low")]
    AvailableTicketLow,
    #[msg("All tickets sold out")]
    AllTicketsSoldOut,
    #[msg("Only the event organizer can withdraw")]
    Unauthorized,
    #[msg("Insufficient funds in event account")]
    InsufficientFunds,
}
