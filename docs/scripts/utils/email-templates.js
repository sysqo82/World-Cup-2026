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
      'Group Stage': 'Round of 32',
      'Round of 32': 'Round of 16',
      'Round of 16': 'Quarter Final',
      'Quarter Final': 'Semi Final',
      'Quarter Finals': 'Semi Final',
      'Semi Final': 'Final',
      'Semi Finals': 'Final',
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

// Helper method to convert country abbreviation to flag SVG icon using flag-icons CDN
getFlagIconUrl(abbreviation, countryMap) {
  if (!countryMap || !abbreviation) return '';
  const country = countryMap[abbreviation?.toUpperCase()];
  if (!country || !country.flagCode) return '';
  const flagCode = country.flagCode;
  return `<img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${flagCode}.svg" alt="${abbreviation}" style="width: 20px; height: 15px; margin: 0 4px; vertical-align: middle;">`;
}

// Helper method to convert country abbreviation to flag emoji
getCountryFlag(abbreviation, countryMap) {
  return this.getFlagIconUrl(abbreviation, countryMap);
}

// Helper method to convert stage to URL slug
getStageUrlSlug(stage) {
  const slugMap = {
    'Group Stage': 'group-stage',
    'Round of 32': 'round-of-32',
    'Round of 16': 'round-of-16',
    'Quarter Final': 'quarter-final',
    'Quarter Finals': 'quarter-final',
    'Semi Final': 'semi-final',
    'Semi Finals': 'semi-final',
    'Final': 'final',
    'Third Place Playoff': 'third-place-playoff'
  };
  return slugMap[stage] || 'group-stage';
}

// Helper method to generate styled HTML email
generateStyledEmail(title, headline, teamName, message, details, isVictory, isFinal, prizePot, ctaText = 'View Tournament', countryAbbr = '', countryMap = null, opponentAbbr = '', stage = 'Group Stage') {
  const headerColor = isVictory ? '#28a745' : '#dc3545';
  const accentColor = isVictory ? '#d4edda' : '#f8d7da';
  const flagIcon = this.getFlagIconUrl(countryAbbr, countryMap);
  const opponentFlagIcon = this.getFlagIconUrl(opponentAbbr, countryMap);
  const opponentName = opponentAbbr && countryMap ? countryMap[opponentAbbr?.toUpperCase()]?.fullName || '' : '';
  const stageSlug = this.getStageUrlSlug(stage);
  const ctaLink = `https://sysqo82.github.io/World-Cup-2026/pages/${stageSlug}.html`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: ${headerColor};
          background: linear-gradient(135deg, ${headerColor} 0%, ${isVictory ? '#357ae8' : '#a71930'} 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 30px;
        }
        .headline {
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        .team-name {
          font-size: 18px;
          color: ${headerColor};
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
        }
        .score-box {
          background-color: ${accentColor};
          border-left: 4px solid ${headerColor};
          padding: 25px;
          margin: 25px 0;
          border-radius: 4px;
          text-align: center;
        }
        .score-display {
          font-size: 48px;
          font-weight: bold;
          color: ${headerColor};
          margin: 10px 0;
        }
        .score-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 15px;
        }
        .details {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          margin: 15px 0;
          font-size: 14px;
          line-height: 1.8;
        }
        .detail-item {
          margin: 8px 0;
          padding-left: 15px;
          border-left: 3px solid #ddd;
        }
        .prize-pot {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          font-weight: bold;
          color: #856404;
        }
        .message-section {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        .message-section p {
          margin: 8px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #28a745 !important;
          color: white !important;
          padding: 14px 32px;
          text-decoration: none !important;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
          margin-left: 50%;
          transform: translateX(-50%);
        }
        .cta-button:hover {
          background-color: #1e7e34 !important;
        }
        .footer {
          background-color: #f4f4f9;
          color: #999;
          text-align: center;
          padding: 20px;
          font-size: 12px;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          <p>World Cup 2026</p>
        </div>
        
        <div class="content">
          <div class="headline">${headline}</div>
          <div class="team-name">${flagIcon}${teamName}</div>
          
          <div class="score-box">
            <div class="score-label">${isVictory ? 'Final Score' : 'Match Result'}</div>
            <div class="score-display">${details.score}</div>
            <div class="score-label">${flagIcon}${teamName} vs ${opponentName}${opponentFlagIcon}</div>
          </div>
          
          ${details.timingInfo ? `<div class="details">${details.timingInfo}</div>` : ''}
          ${prizePot ? `<div class="prize-pot">💰 Prize winnings: £${prizePot}!</div>` : ''}
          
          <div class="message-section">
            ${message.split('\n').map(p => p.trim()).filter(p => p).map(p => `<p>${p}</p>`).join('')}
          </div>
          
          <center>
            <a href="${ctaLink}" class="cta-button" style="display: inline-block; background-color: #28a745 !important; color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 4px; font-weight: bold; margin: 20px 0;">${ctaText}</a>
          </center>
        </div>
        
        <div class="footer">
          <p>World Cup 2026</p>
          <p>You received this email because you are subscribed for match updates.</p>
          <p>Manage your preferences from My Account page.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Build the email template for both winner and loser
matchResult;
async buildEmailTemplate(
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
    prizePotSum,
    isGroupStageComplete = false
) {
  const emailTemplates = {};
  const countryMap = await fetchCountryMap();

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
    let winnerMessagePlain;
    const nextStage = this.getNextStage(stage);
    const isGroupStage = stage === 'Group Stage';
    let nextStageMessage = '';
    if (isFinal || isThirdPlacePlayoff) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    } else if (isGroupStage && isGroupStageComplete) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    } else if (!isGroupStage) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    }
    const placementMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 3rd place in the World Cup!' : '';
    
    if (stage === 'Final') {
      winnerSubject = `${stage}: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} are the World Cup Champions!`;
    } else if (isThirdPlacePlayoff) {
      winnerSubject = `Third Place: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} finished in 3rd place!`;
    } else {
      winnerSubject = `${stage}: Congratulations ${winnerOwnersName}, your team ${winningCountryFullName} won!`;
    }

    let detailsInfo = {};
    let timingInfo = '';
    
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        detailsInfo = {
          score: `${winnersScore}-${losersScore}`,
          matchup: `${winningCountryFullName} vs ${losingCountryFullName}`,
          timingInfo: `<strong>After Extra Time</strong><br/>90 minutes: ${regularTimeTeam1Score}-${regularTimeTeam2Score}`
        };
        winnerMessagePlain =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} after extra time was added with a score of ${winnersScore}-${losersScore}.\n\nCelebrate the victory!\n\nThe match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.${nextStageMessage}${placementMessage}`;
        break;
      case 'extraTimeWasTied':
        detailsInfo = {
          score: `${winnersScore}-${losersScore}`,
          matchup: `${winningCountryFullName} vs ${losingCountryFullName}`,
          timingInfo: `<strong>After Penalty Shootout</strong><br/>90 minutes: ${regularTimeTeam1Score}-${regularTimeTeam2Score}<br/>120 minutes: ${extraTimeTeam1Score}-${extraTimeTeam2Score}`
        };
        winnerMessagePlain =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} after an intense penalty shootout with a score of ${winnersScore}-${losersScore}.\n\nCelebrate the victory!\n\nThe match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.\nAfter 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.${nextStageMessage}${placementMessage}`;
        break;
      default:
        detailsInfo = {
          score: `${winnersScore}-${losersScore}`,
          matchup: `${winningCountryFullName} vs ${losingCountryFullName}`,
          timingInfo: ''
        };
        winnerMessagePlain =
          `Your team ${winningCountryFullName} beat ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.\n\nCelebrate the victory!${nextStageMessage}${placementMessage}`;
    }

    const winnerHeadline = isFinal ? '🏆 World Cup Champions!' : isThirdPlacePlayoff ? '🥉 Third Place Finish!' : '✅ Victory!';
    const winnerTitle = stage === 'Final' ? 'FINAL: Champions!' : stage === 'Third Place Playoff' ? 'THIRD PLACE: Victory!' : `${stage}: Victory!`;
    const winnerPrizePot = isFinal ? Math.floor(prizePotSum * 0.60) : (isThirdPlacePlayoff ? Math.floor(prizePotSum * 0.15) : null);
    const winnerHTML = this.generateStyledEmail(
      winnerTitle,
      winnerHeadline,
      winningCountryFullName,
      winnerMessagePlain,
      detailsInfo,
      true,
      isFinal,
      winnerPrizePot,
      'View Tournament',
      this.winningCountryName,
      countryMap,
      this.losingCountryName,
      stage
    );

    emailTemplates.winner = {
      email: winnerEmail,
      subject: winnerSubject,
      message: winnerMessagePlain,
      html: winnerHTML
    };
  }

  // Build the loser's email template if the loser's email exists
  if ((losersScore < winnersScore) && loserEmail) {
    let loserSubject;
    let loserMessagePlain;
    let isFinal = stage === 'Final';
    let isThirdPlacePlayoff = stage === 'Third Place Playoff';
    const isGroupStage = stage === 'Group Stage';
    const isSemiFinal = stage === 'Semi Final' || stage === 'Semi Finals';
    const isKnockout = ['Round of 32', 'Round of 16', 'Quarter Final', 'Quarter Finals', 'Semi Final', 'Semi Finals', 'Final', 'Third Place Playoff'].includes(stage);
    let tournamentEndMessage = '';
    if (isFinal) {
      tournamentEndMessage = '\n\nYour tournament has come to an end, but you made it all the way to the Final!';
    } else if (isThirdPlacePlayoff) {
      tournamentEndMessage = '\n\nYour team has finished in 4th place in the World Cup.';
    } else if (isSemiFinal) {
      tournamentEndMessage = '\n\nYour team did not advance to the Final, but you still have one last chance — you\'ll compete in the Third Place Playoff for 3rd place!';
    } else if (isGroupStage && isGroupStageComplete) {
      tournamentEndMessage = '\n\nYour team has been eliminated from the tournament.';
    } else if (isKnockout) {
      tournamentEndMessage = '\n\nYour team has been eliminated from the tournament.';
    }
    
    if (stage === 'Final') {
      loserSubject = `${stage}: Commiserations ${loserOwnersName}, your team ${losingCountryFullName} lost the World Cup Final!`;
    } else if (isThirdPlacePlayoff) {
      loserSubject = `Fourth Place: Commiserations ${loserOwnersName}, your team ${losingCountryFullName} finished in 4th place!`;
    } else {
      loserSubject = `${stage}: Better Luck Next Time, ${loserOwnersName}, your team ${losingCountryFullName} lost!`;
    }

    let detailsInfo = {};
    
    switch (this.matchResult) {
      case 'regularTimeWasTied':
        detailsInfo = {
          score: `${losersScore}-${winnersScore}`,
          matchup: `${losingCountryFullName} vs ${winningCountryFullName}`,
          timingInfo: `<strong>After Extra Time</strong><br/>90 minutes: ${regularTimeTeam1Score}-${regularTimeTeam2Score}`
        };
        loserMessagePlain =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after extra time with a score of ${losersScore}-${winnersScore}.\n\nKeep your spirits high!\n\nThe match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.${tournamentEndMessage}`;
        break;
      case 'extraTimeWasTied':
        detailsInfo = {
          score: `${losersScore}-${winnersScore}`,
          matchup: `${losingCountryFullName} vs ${winningCountryFullName}`,
          timingInfo: `<strong>After Penalty Shootout</strong><br/>90 minutes: ${regularTimeTeam1Score}-${regularTimeTeam2Score}<br/>120 minutes: ${extraTimeTeam1Score}-${extraTimeTeam2Score}`
        };
        loserMessagePlain =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} after an intense penalty shootout with the score of ${losersScore}-${winnersScore}.\n\nKeep your spirits high!\n\nThe match ended after 90 minutes in a tie with a score of ${regularTimeTeam1Score}-${regularTimeTeam2Score}.\nAfter 120 minutes the match was still tied at ${extraTimeTeam1Score}-${extraTimeTeam2Score}.${tournamentEndMessage}`;
        break;
      default:
        detailsInfo = {
          score: `${losersScore}-${winnersScore}`,
          matchup: `${losingCountryFullName} vs ${winningCountryFullName}`,
          timingInfo: ''
        };
        loserMessagePlain =
          `Your team ${losingCountryFullName} fought hard but lost to ${winningCountryFullName} with a score of ${losersScore}-${winnersScore}.\n\nKeep your spirits high!${tournamentEndMessage}`;
    }

    const loserHeadline = isFinal ? '💔 Runner-up' : isThirdPlacePlayoff ? '📍 Fourth Place' : '❌ Defeat';
    const loserTitle = stage === 'Final' ? 'FINAL: Runner-up' : stage === 'Third Place Playoff' ? 'THIRD PLACE: Fourth Place' : (isKnockout ? `${stage}: Unlucky` : `${stage}: Defeat`);
    const loserPrizePot = isFinal ? Math.floor(prizePotSum * 0.25) : null;
    const loserHTML = this.generateStyledEmail(
      loserTitle,
      loserHeadline,
      losingCountryFullName,
      loserMessagePlain,
      detailsInfo,
      false,
      false,
      loserPrizePot,
      'View Tournament',
      this.losingCountryName,
      countryMap,
      this.winningCountryName,
      stage
    );

    emailTemplates.loser = {
      email: loserEmail,
      subject: loserSubject,
      message: loserMessagePlain,
      html: loserHTML
    };
  }

  // Handle the case of a draw
  if (winnersScore === losersScore) {
    const nextStage = this.getNextStage(stage);
    const isFinal = stage === 'Final';
    const isThirdPlacePlayoff = stage === 'Third Place Playoff';
    const isGroupStage = stage === 'Group Stage';
    let nextStageMessage = '';
    if (isFinal || isThirdPlacePlayoff) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    } else if (isGroupStage && isGroupStageComplete) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    } else if (!isGroupStage) {
      nextStageMessage = nextStage ? `\n\nYour team is advancing to the ${nextStage}!` : '';
    }
    const thirdPlaceMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 3rd place in the World Cup!' : '';
    const fourthPlaceMessage = isThirdPlacePlayoff ? '\n\nYour team has finished in 4th place in the World Cup.' : '';
    
    if (winnerEmail) {
      const drawSubjectWinner = `${stage}: It's a Draw! ${winningCountryFullName} vs ${losingCountryFullName}`;
      const drawMessageWinner =
      `Your team ${winningCountryFullName} drew against ${losingCountryFullName} with a score of ${winnersScore}-${losersScore}.\n\nKeep up the great effort!${nextStageMessage}${thirdPlaceMessage}`;

      const drawDetailsWinner = {
        score: `${winnersScore}-${losersScore}`,
        matchup: `${winningCountryFullName} vs ${losingCountryFullName}`,
        timingInfo: ''
      };

      const drawHTMLWinner = this.generateStyledEmail(
        `${stage}: Draw`,
        '🤝 It\'s a Draw!',
        winningCountryFullName,
        drawMessageWinner,
        drawDetailsWinner,
        true,
        false,
        null,
        'View Tournament',
        this.winningCountryName,
        countryMap,
        this.losingCountryName,
        stage
      );

      emailTemplates.winner = {
        email: winnerEmail,
        subject: drawSubjectWinner,
        message: drawMessageWinner,
        html: drawHTMLWinner
      };
    }

    if (loserEmail) {
      const drawSubjectLoser = `${stage}: It's a Draw! ${losingCountryFullName} vs ${winningCountryFullName}`;
      const drawMessageLoser =
      `Your team ${losingCountryFullName} drew against ${winningCountryFullName} with a score of ${winnersScore}-${losersScore}.\n\nKeep up the great effort!${fourthPlaceMessage}`;

      const drawDetailsLoser = {
        score: `${winnersScore}-${losersScore}`,
        matchup: `${losingCountryFullName} vs ${winningCountryFullName}`,
        timingInfo: ''
      };

      const drawHTMLLoser = this.generateStyledEmail(
        `${stage}: Draw`,
        '🤝 It\'s a Draw!',
        losingCountryFullName,
        drawMessageLoser,
        drawDetailsLoser,
        true,
        false,
        null,
        'View Tournament',
        this.losingCountryName,
        countryMap,
        this.winningCountryName,
        stage
      );

      emailTemplates.loser = {
        email: loserEmail,
        subject: drawSubjectLoser,
        message: drawMessageLoser,
        html: drawHTMLLoser
      };
    }
  }

  return emailTemplates;
}

// Build group conclusion emails based on final standings (Phase 2)
async buildGroupConclusionEmails(groupData, groupName) {
  const emailTemplates = {};
  const countryMap = await fetchCountryMap();

  // Sort teams by standings: Points (desc), Goal Difference (desc), Goals Scored (desc)
  const teamsArray = Object.entries(groupData.teams).map(([abbr, teamData]) => ({
    abbr,
    ...teamData
  }));

  teamsArray.sort((a, b) => {
    const pointsA = (a.W || 0) * 3 + (a.D || 0);
    const pointsB = (b.W || 0) * 3 + (b.D || 0);
    const diffA = (a.goalsScored || 0) - (a.goalsReceived || 0);
    const diffB = (b.goalsScored || 0) - (b.goalsReceived || 0);

    if (pointsA !== pointsB) return pointsB - pointsA;
    if (diffA !== diffB) return diffB - diffA;
    return (b.goalsScored || 0) - (a.goalsScored || 0);
  });

  // Send emails to top 3 (advancing) and 4th place (eliminated)
  // Send emails to top 3 (advancing) and 4th place (eliminated)
  for (let rank = 0; rank < teamsArray.length; rank++) {
    const team = teamsArray[rank];
    const teamFullName = countryMap[team.name]?.fullName;
    
    const userData = await this.getTeamEmailAndName(team.name);
    
    if (!userData) {
      continue;
    }

    const { teamEmail, teamsOwnerName } = userData;
    const placement = rank + 1;

    if (placement <= 3) {
      // Advancement email for top 3
      const nextStage = this.getNextStage('Group Stage') || 'Knockout Stage';
      const subject = `Group Stage Complete: Congratulations ${teamsOwnerName}, ${teamFullName} finished ${this.getOrdinalSuffix(placement)} in ${groupName}!`;
      const message = `Your team ${teamFullName} finished in ${this.getOrdinalSuffix(placement)} place in ${groupName}.

Congratulations! Your team is advancing to the ${nextStage}!

Keep up the great effort and good luck in the next stage!`;

      const detailsInfo = {
        score: `${this.getOrdinalSuffix(placement)} Place`,
        matchup: `${groupName} - ${teamFullName}`,
        timingInfo: ''
      };

      const html = this.generateStyledEmail(
        `GROUP STAGE: ${this.getOrdinalSuffix(placement)} Place`,
        `🎉 ${this.getOrdinalSuffix(placement)} Place Finish!`,
        teamFullName,
        message,
        detailsInfo,
        true,
        false,
        null,
        'View Tournament',
        team.name,
        countryMap,
        '',
        'Group Stage'
      );

      emailTemplates[team.abbr] = {
        email: teamEmail,
        subject,
        message,
        html
      };
    } else {
      // Elimination email for 4th place
      const subject = `Group Stage Complete: ${teamsOwnerName}, your team ${teamFullName} finished 4th in ${groupName}`;
      const message = `Your team ${teamFullName} finished in 4th place in ${groupName}.

Unfortunately, your time in the World Cup has come to an end, but there's always next time! Better luck in the next tournament!`;

      const detailsInfo = {
        score: '4th Place',
        matchup: `${groupName} - ${teamFullName}`,
        timingInfo: ''
      };

      const html = this.generateStyledEmail(
        'GROUP STAGE: Eliminated',
        '📍 Fourth Place',
        teamFullName,
        message,
        detailsInfo,
        false,
        false,
        null,
        'View Tournament',
        team.name,
        countryMap,
        '',
        'Group Stage'
      );

      emailTemplates[team.abbr] = {
        email: teamEmail,
        subject,
        message,
        html
      };
    }
  }

  return emailTemplates;
}

// Helper method to get ordinal suffix (1st, 2nd, 3rd, etc.)
getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
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
