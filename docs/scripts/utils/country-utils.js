/**
 * Fetch and parse the countries.txt file into a map of abbreviations to full names.
 * @returns {Promise<Object>} A map where the key is the abbreviation and the value is the full name.
 */
export async function fetchCountryMap() {
    const response = await fetch('./Countries/countries.txt');
    if (!response.ok) {
        throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }
    const text = await response.text();

    const countryMap = {};
    text.split('\n').forEach(line => {
        const [abbreviation, fullName] = line.split('\t');
        if (abbreviation && fullName) {
            countryMap[abbreviation.trim()] = fullName.trim();
        }
    });

    return countryMap;
}

/**
 * Get the full name of a country based on its abbreviation.
 * @param {Object} countryMap - The map of abbreviations to full names.
 * @param {string} abbreviation - The abbreviation of the country.
 * @returns {string} The full name of the country, or "Unknown" if not found.
 */
export function getCountryFullName(countryMap, abbreviation) {
    return countryMap[abbreviation] || 'Unknown';
}