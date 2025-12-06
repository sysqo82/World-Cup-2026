// Team encryption/decryption utilities for client-side

/**
 * Decrypt an encrypted team name by calling the Cloud Function
 * @param {string} encryptedTeam - The encrypted team name from the database
 * @returns {Promise<string>} The decrypted team name
 */
export async function decryptTeamName(encryptedTeam) {
    if (!encryptedTeam) return '';
    
    try {
        // Check if it's already decrypted (for backward compatibility)
        if (!encryptedTeam.includes(':')) {
            return encryptedTeam;
        }
        
        const response = await fetch('https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/decryptTeam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ encryptedTeam }),
        });

        if (!response.ok) {
            throw new Error('Failed to decrypt team name');
        }

        const data = await response.json();
        return data.teamName;
    } catch (error) {
        console.error('Error decrypting team name:', error);
        return encryptedTeam; // Return encrypted version if decryption fails
    }
}

/**
 * Check if a team name is encrypted
 * @param {string} teamName - The team name to check
 * @returns {boolean} True if encrypted, false otherwise
 */
export function isEncrypted(teamName) {
    return teamName && teamName.includes(':');
}
