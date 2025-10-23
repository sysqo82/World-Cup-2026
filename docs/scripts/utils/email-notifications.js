import { EmailTemplate } from './email-template.js';
import { sendEmailNotification } from './email-service.js';

export async function sendMatchEmails(
  winner,
  loser, 
  match, 
  stage, 
  winnersScore, 
  losersScore, 
  regularTimeTeam1Score, 
  regularTimeTeam2Score,
  extraTimeTeam1Score,
  extraTimeTeam2Score,
  prizePotSum
) {
  try {
    const emailTemplate = new EmailTemplate(winner, loser, match, stage);

    // Fetch emails and full names for both winner and loser
    const {
      winnerEmail,
      loserEmail,
      winningCountryFullName,
      losingCountryFullName,
      winnerOwnersName,
      loserOwnersName,
    } = await emailTemplate.fetchEmailAndOwnersName();

    // Build the email templates
    const emails = emailTemplate.buildEmailTemplate(
      winnerEmail,
      loserEmail,
      winningCountryFullName,
      losingCountryFullName,
      winnerOwnersName,
      loserOwnersName,
      stage,
      winnersScore,
      losersScore,
      regularTimeTeam1Score,
      regularTimeTeam2Score,
      extraTimeTeam1Score,
      extraTimeTeam2Score,
      prizePotSum
    );

    // Send emails only if they exist
    if (emails.winner) {
      const winnerResult = await sendEmailNotification(emails.winner.email, emails.winner.subject, emails.winner.message);
      if (winnerResult.sent) {
        console.log(`Email sent to winner: ${emails.winner.email}`);
      } else {
        console.log(`Email not sent to winner (${emails.winner.email}): ${winnerResult.message}`);
      }
    }

    if (emails.loser) {
      const loserResult = await sendEmailNotification(emails.loser.email, emails.loser.subject, emails.loser.message);
      if (loserResult.sent) {
        console.log(`Email sent to loser: ${emails.loser.email}`);
      } else {
        console.log(`Email not sent to loser (${emails.loser.email}): ${loserResult.message}`);
      }
    }
  } catch (error) {
    console.error('Error sending match emails:', error);
  }
}