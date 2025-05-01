import { db } from '../config/firebase-config.js';
import { fetchCountryMap } from './country-utils.js';

export class EmailTemplate {
constructor(winner, loser, matchId, stage) {
  this.winningCountryName = winner;
  this.losingCountryName = loser;
  this.matchId = matchId;
  this.stage = stage;
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

  // Fetch the winner's email and owner's name
  const winnerData = await this.getTeamEmailAndName(this.winningCountryName);
  const winnerEmail = winnerData?.teamEmail || null;
  const winnerOwnersName = winnerData?.teamsOwnerName || 'Unknown';

  // Fetch loser's email and owner's name
  const loserData = await this.getTeamEmailAndName(this.losingCountryName);
  const loserEmail = loserData?.teamEmail || null;
  const loserOwnersName = loserData?.teamsOwnerName || 'Unknown';

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
matchResult;
buildEmailTemplate(
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
    extraTimeTeam2Score
) {
  const emailTemplates = {};

  const regularTimeWasTied = (regularTimeTeam1Score != null && regularTimeTeam2Score != null);
  const extraTimeWasTied = (extraTimeTeam1Score != null && extraTimeTeam2Score != null);

  if (regularTimeWasTied && extraTimeWasTied === false) {
    this.matchResult = 'regularTimeWasTied';
  } else if (regularTimeWasTied && extraTimeWasTied) {
    this.matchResult = 'extraTimeWasTied';
  } else {
    this.matchResult = 'default';
  }

  // Build the winner's email template if the winner's email exists
  if ((winnersScore > losersScore) && winnerEmail) {
    let winnerMessage;
    const winnerSubject = `${stage}: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} won!`;
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        winnerMessage =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} after extra time was added with a score of ${winnersScore}-${losersScore}.
          Celebrate the victory!
          The match ended after 90 minutes in a tie with the score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.`;
        break;
      case 'extraTimeWasTied':
        winnerMessage =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} after an intense penalty shootouts with the score of ${winnersScore}-${losersScore}.
          Celebrate the victory!
          The match ended after 90 minutes in a tie with the score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.
          After 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.`;
        break;
      default:
        winnerMessage =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.
          Celebrate the victory!`;
    }

    emailTemplates.winner = {
      email: winnerEmail,
      subject: winnerSubject,
      message: winnerMessage,
    };
  }

  // Build the loser's email template if the loser's email exists
  if ((losersScore < winnersScore) && loserEmail) {
    let loserMessage;
    const loserSubject = `${stage}: Better Luck Next Time, ${loserOwnersName}, your team ${losingCountryFullName} lost!`;
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after extra time with a score of ${losersScore}-${winnersScore}.
          Keep your spirits high!
          The match ended after 90 minutes in a tie with the score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.`;
        break;
      case 'extraTimeWasTied':
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after an intense penalty shootout with the score of ${losersScore}-${winnersScore}.
          Keep your spirits high!
          The match ended after 90 minutes in a tie with the score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.
          After 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.`;
        break;
      default:
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} with a score of ${winnersScore}-${losersScore}.
          Keep your spirits high!`;
    }

    emailTemplates.loser = {
      email: loserEmail,
      subject: loserSubject,
      message: loserMessage,
    };
  }

  // Handle the case of a draw
  if (winnersScore === losersScore) {
    if (winnerEmail) {
      console.log('sending email to the winner');
      
      const drawSubjectWinner = `${this.stage}: It's a Draw! ${winningCountryFullName} vs ${losingCountryFullName}`;
      const drawMessageWinner = 
      `Your team ${winningCountryFullName} drew against ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.
      Keep up the great effort!`;

      emailTemplates.winner = {
        email: winnerEmail,
        subject: drawSubjectWinner,
        message: drawMessageWinner,
      };
    }

    if (loserEmail) {
      console.log('sending email to the loser');
      const drawSubjectLoser = `${this.stage}: It's a Draw! ${losingCountryFullName} vs ${winningCountryFullName}`;
      const drawMessageLoser = 
      `Your team ${losingCountryFullName} drew against ${winningCountryFullName} with a score of ${winnersScore}-${losersScore}.
      Keep up the great effort!`;

      emailTemplates.loser = {
        email: loserEmail,
        subject: drawSubjectLoser,
        message: drawMessageLoser,
      };
    }
  }

  return emailTemplates;
}
}