/**
 * Fetch and parse the countries.txt file into a map of abbreviations to full names and their flag codes.
 * @returns {Promise<Object>} A map where the key is the abbreviation and the value is an object containing the full name and flag code.
 */
export async function fetchCountryMap() {
    const response = await fetch('../Countries/countries.txt');
    if (!response.ok) {
        throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }
    const text = await response.text();

    const countryMap = {};
    const lines = text.split('\n');

    lines.forEach(line => {
        const [abbreviation, fullName, flagCode] = line.split('\t');
        if (abbreviation && fullName && flagCode) {
            countryMap[abbreviation.trim()] = {
                fullName: fullName.trim(),
                flagCode: flagCode.trim()
            };
        }
    });

    return countryMap;
}

/**
 * Normalize a string by removing accents and diacritics.
 * @param {string} str - The string to normalize.
 * @returns {string} The normalized string.
 */
function normalizeString(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Get the full name and flag code of a country based on its abbreviation or name.
 * @param {Object} countryMap - The map of abbreviations to country details.
 * @param {string} nameOrAbbreviation - The name or abbreviation of the country.
 * @returns {Object} An object containing the full name and flag code, or { fullName: "Unknown", flagCode: "unknown" } if not found.
 */
export function getCountryFullName(countryMap, nameOrAbbreviation) {
    // Check if the input matches an abbreviation
    if (countryMap[nameOrAbbreviation]) {
        return {
            fullName: countryMap[nameOrAbbreviation].fullName,
            flagCode: countryMap[nameOrAbbreviation].flagCode
        };
    }

    const normalizedInput = normalizeString(nameOrAbbreviation);

    // Check if the input matches a full name (exact match)
    const exactMatch = Object.entries(countryMap).find(
        ([, details]) => details.fullName.toLowerCase() === nameOrAbbreviation.toLowerCase()
    );

    if (exactMatch) {
        return { fullName: exactMatch[1].fullName, flagCode: exactMatch[1].flagCode };
    }

    // Check if the input matches a full name (normalized match for accented characters)
    const normalizedMatch = Object.entries(countryMap).find(
        ([, details]) => normalizeString(details.fullName) === normalizedInput
    );

    if (normalizedMatch) {
        return { fullName: normalizedMatch[1].fullName, flagCode: normalizedMatch[1].flagCode };
    }

    // Check if input matches alternative names in parentheses
    const alternativeMatch = Object.entries(countryMap).find(
        ([, details]) => {
            const fullName = details.fullName.toLowerCase();
            const input = nameOrAbbreviation.toLowerCase();
            
            // Extract text within parentheses
            const parenMatch = fullName.match(/\(([^)]+)\)/);
            if (parenMatch && parenMatch[1] === input) {
                return true;
            }
            
            // Also check normalized version of parentheses content
            if (parenMatch && normalizeString(parenMatch[1]) === normalizedInput) {
                return true;
            }
            
            return false;
        }
    );

    return alternativeMatch
        ? { fullName: alternativeMatch[1].fullName, flagCode: alternativeMatch[1].flagCode }
        : { fullName: "Unknown", flagCode: "unknown" };
}