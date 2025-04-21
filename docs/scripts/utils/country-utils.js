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

    // Check if the input matches a full name
    const country = Object.entries(countryMap).find(
        ([, details]) => details.fullName.toLowerCase() === nameOrAbbreviation.toLowerCase()
    );

    return country
        ? { fullName: country[1].fullName, flagCode: country[1].flagCode }
        : { fullName: "Unknown", flagCode: "unknown" };
}