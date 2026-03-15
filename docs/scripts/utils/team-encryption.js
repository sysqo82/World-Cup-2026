import { decryptTeamURL } from '../config/firebase-config.js';

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
        
        // SECURITY FIX 1.8: Get session token from sessionStorage and include in Authorization header
        const sessionToken = sessionStorage.getItem('sessionToken');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const response = await fetch(decryptTeamURL, {
            method: 'POST',
            headers: headers,
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
