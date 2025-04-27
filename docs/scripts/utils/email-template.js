import { db } from '../config/firebase-config.js';
import { fetchCountryMap } from './country-utils.js';

export class EmailTemplate {
constructor(winner, loser, matchId) {
  this.winningCountryName = winner;
  this.losingCountryName = loser;
  this.matchId = matchId;
  }

  // Fetch the email of the user associated with a team
  async getTeamEmailAndName(teamAbbreviation) {
    const countryMap = await fetchCountryMap();
    const teamFullName = countryMap[teamAbbreviation]?.fullName;
    if (!teamFullName) {
      console.error(`No country found for abbreviation: ${teamAbbreviation}`);
      return null;
    }
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('team', '==', teamFullName).get();
    if (snapshot.empty) {
      console.warn(`No user found for country: ${teamFullName}`);
      return null;
    }
    let teamEmail = null;
    let teamsOwnerName = null;
    snapshot.forEach(doc => {
      teamEmail = doc.data().email;
      teamsOwnerName = doc.data().firstName;
    });
    return { teamEmail, teamsOwnerName };
  }
  // Fetch emails for both winner and loser
  async fetchEmailAndOwnersName() {
  const countryMap = await fetchCountryMap();

  const winningCountryFullName = countryMap[this.winningCountryName]?.fullName;
  const losingCountryFullName = countryMap[this.losingCountryName]?.fullName;

  if (!winningCountryFullName) {
    console.warn(`No full name found for the winning team: ${this.winningCountryName}`);
  }

  if (!losingCountryFullName) {
    console.warn(`No full name found for the losing team: ${this.losingCountryName}`);
  }

  const { teamEmail: winnerEmail, teamsOwnerName: winnerOwnersName } = 
  await this.getTeamEmailAndName(this.winningCountryName);
  const { teamEmail: loserEmail, teamsOwnerName: loserOwnersName } = 
  await this.getTeamEmailAndName(this.losingCountryName);

  if (!winnerEmail) {
    console.warn(`No email found for the winning team: ${winningCountryFullName}`);
  }

  if (!loserEmail) {
    console.warn(`No email found for the losing team: ${losingCountryFullName}`);
  }

  return { 
    winnerEmail,
    loserEmail, 
    winningCountryFullName, 
    losingCountryFullName, 
    winnerOwnersName, 
    loserOwnersName 
  };
}

// Build the email template for both winner and loser
buildEmailTemplate(
    winnerEmail,
    loserEmail, 
    winningCountryFullName, 
    losingCountryFullName, 
    winnerOwnersName, 
    loserOwnersName
) {
  const emailTemplates = {};

  // Build the winner's email template if the winner's email exists
  if (winnerEmail) {
    const winnerSubject = `Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} won!`;
    const winnerMessage = 
    `Your team ${winningCountryFullName} has won their match against ${losingCountryFullName}.
    Celebrate the victory!`;

    emailTemplates.winner = {
      email: winnerEmail,
      subject: winnerSubject,
      message: winnerMessage,
    };
  }

  // Build the loser's email template if the loser's email exists
  if (loserEmail) {
    const loserSubject = `Better Luck Next Time, ${loserOwnersName}, your team ${losingCountryFullName} lost!`;
    const loserMessage = 
    `Your team ${losingCountryFullName} fought hard but lost their match against ${winningCountryFullName}.
    Keep your spirits high!`;

    emailTemplates.loser = {
      email: loserEmail,
      subject: loserSubject,
      message: loserMessage,
    };
  }

  return emailTemplates;
}
}