import { db } from '../config/firebase-config.js';
import { fetchCountryMap } from './country-utils.js';
import { decryptTeamName } from './team-encryption.js';

export class EmailTemplate {
constructor(winner, loser, matchId, stage) {
  this.winningCountryName = winner;
  this.losingCountryName = loser;
  this.matchId = matchId;
  this.stage = stage;
  }

  // Get the next stage based on the current stage
  getNextStage(currentStage) {
    const stageProgression = {
      'Round of 32': 'Round of 16',
      'Round of 16': 'Quarter Final',
      'Quarter Final': 'Semi Final',
      'Semi Final': 'Final',
      'Final': null,
      'Third Place Playoff': null
    };
    return stageProgression[currentStage] || null;
  }

  // Fetch the email of the user associated with a team
  async getTeamEmailAndName(teamAbbreviation) {
    const countryMap = await fetchCountryMap();
    const teamFullName = countryMap[teamAbbreviation]?.fullName;
    if (!teamFullName) {
      console.error(`No country found for abbreviation: ${teamAbbreviation}`);
      return null;
    }
    
    // Fetch all users since team names are encrypted
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.warn(`No users found in database`);
      return null;
    }
    
    // Decrypt and compare each team name
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const encryptedTeam = userData.team;
      
      if (encryptedTeam) {
        const decryptedTeam = await decryptTeamName(encryptedTeam);
        
        if (decryptedTeam === teamFullName) {
          return {
            teamEmail: userData.email,
            teamsOwnerName: userData.firstName
          };
        }
      }
    }
    
    console.warn(`No user found for country: ${teamFullName}`);
    return null;
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
    extraTimeTeam2Score,
    prizePotSum
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
    let isFinal = stage === 'Final';
    let isThirdPlacePlayoff = stage === 'Third Place Playoff';
    let winnerSubject;
    let winnerMessage;
    const nextStage = this.getNextStage(stage);
    const nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    const placementMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 3rd place in the World Cup!' : '';
    
    if (stage === 'Final') {
      winnerSubject = `${stage}: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} are the World Cup Champions!`;
    } else if (isThirdPlacePlayoff) {
      winnerSubject = `Third Place: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} finished in 3rd place!`;
    } else {
      winnerSubject = `${stage}: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} won!`;
    }
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        winnerMessage =
          `${isFinal ? `You have won the prize pot, which stands at £${prizePotSum}!` : ''}
Your team ${winningCountryFullName} beat ${losingCountryFullName} after extra time was added with a score of ${winnersScore}-${losersScore}.
Celebrate the victory!
The match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.${nextStageMessage}${placementMessage}`;
        break;
      case 'extraTimeWasTied':
        winnerMessage =
          `${isFinal ? `You have won the prize pot, which stands at £${prizePotSum}!` : ''}
Your team ${winningCountryFullName} beat ${losingCountryFullName} after an intense penalty shootouts with a score of ${winnersScore}-${losersScore}.
Celebrate the victory!
The match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.
After 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.${nextStageMessage}${placementMessage}`;
        break;
      default:
        winnerMessage =
          `${isFinal ? `You have won the prize pot, which stands at £${prizePotSum}!` : ''}
Your team ${winningCountryFullName} beat ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.
Celebrate the victory!${nextStageMessage}${placementMessage}`;
    }

    emailTemplates.winner = {
      email: winnerEmail,
      subject: winnerSubject,
      message: winnerMessage,
    };
  }

  // Build the loser's email template if the loser's email exists
  if ((losersScore < winnersScore) && loserEmail) {
    let loserSubject
    let loserMessage;
    let isThirdPlacePlayoff = stage === 'Third Place Playoff';
    const tournamentEndMessage = stage === 'Final' ? '\nYour tournament has come to an end, but you made it all the way to the Final!' : isThirdPlacePlayoff ? '\nYour team has finished in 4th place in the World Cup.' : '\nUnfortunately, your tournament has come to an end, but there\'s always next time!';
    
    if (stage === 'Final') {
      loserSubject = `${stage}: Commiserations ${loserOwnersName}, your team ${losingCountryFullName} lost the World Cup Final!`;
    } else if (isThirdPlacePlayoff) {
      loserSubject = `Fourth Place: Commiserations ${loserOwnersName}, your team ${losingCountryFullName} finished in 4th place!`;
    } else {
      loserSubject = `${stage}: Better Luck Next Time, ${loserOwnersName}, your team ${losingCountryFullName} lost!`;
    }
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after extra time with a score of ${losersScore}-${winnersScore}.
Keep your spirits high!
The match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.${tournamentEndMessage}`;
        break;
      case 'extraTimeWasTied':
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after an intense penalty shootout with the score of ${losersScore}-${winnersScore}.
Keep your spirits high!
The match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.
After 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.${tournamentEndMessage}`;
        break;
      default:
        loserMessage =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} with a score of ${losersScore}-${winnersScore}.
Keep your spirits high!${tournamentEndMessage}`;
    }

    emailTemplates.loser = {
      email: loserEmail,
      subject: loserSubject,
      message: loserMessage,
    };
  }

  // Handle the case of a draw
  if (winnersScore === losersScore) {
    const nextStage = this.getNextStage(stage);
    const nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    let isThirdPlacePlayoff = stage === 'Third Place Playoff';
    const thirdPlaceMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 3rd place in the World Cup!' : '';
    const fourthPlaceMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 4th place in the World Cup.' : '';
    const tournamentEndMessage = stage === 'Final' ? '\nYour tournament has come to an end, but you made it all the way to the Final!' : '\nUnfortunately, your tournament has come to an end, but there\'s always next time!';
    
    if (winnerEmail) {
      const drawSubjectWinner = `${stage}: It's a Draw! ${winningCountryFullName} vs ${losingCountryFullName}`;
      const drawMessageWinner =
      `Your team ${winningCountryFullName} drew against ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.
Keep up the great effort!${nextStageMessage}${thirdPlaceMessage}`;

      emailTemplates.winner = {
        email: winnerEmail,
        subject: drawSubjectWinner,
        message: drawMessageWinner,
      };
    }

    if (loserEmail) {
      const drawSubjectLoser = `${stage}: It's a Draw! ${losingCountryFullName} vs ${winningCountryFullName}`;
      const drawMessageLoser =
      `Your team ${losingCountryFullName} drew against ${winningCountryFullName} with a score of ${winnersScore}-${losersScore}.
Keep up the great effort!${fourthPlaceMessage}`;

      emailTemplates.loser = {
        email: loserEmail,
        subject: drawSubjectLoser,
        message: drawMessageLoser,
      };
    }
  }

  return emailTemplates;
}

// Static method for generating email change verification form HTML
static generateEmailVerificationForm(newEmail) {
  return `
    <h4>Verify New Email Address</h4>
    <p>A 6-digit verification code has been sent to:</p>
    <p><strong>${newEmail}</strong></p>
    <p>Please enter the code below (expires in 10 minutes):</p>
    <form id="email-verification-form">
        <div>
            <label for="email-verification-code">Verification Code:</label>
            <input type="text" id="email-verification-code" name="email-verification-code" maxlength="6" pattern="[0-9]{6}" required>
        </div>
        <div class="button-group">
            <button type="submit" class="submit-button" id="verify-email-button">Verify & Change Email</button>
            <button type="button" class="submit-button secondary" id="resend-email-code-button">Resend Code</button>
            <button type="button" class="submit-button secondary" id="cancel-email-change-button">Cancel</button>
        </div>
    </form>
    <div id="email-verification-status" class="status-message"></div>
  `;
}
}
