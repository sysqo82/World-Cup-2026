// FIFA World Cup 2026 Official Match Schedule
// Centralized schedule constants to avoid duplication

// Chronological list of all 72 group stage matches, sorted by date and time
export const chronologicalMatches = [
    { date: '2026-06-11', time: '20:00', group: 'group01', team1: 'MEX', team2: 'RSA' },
    { date: '2026-06-12', time: '03:00', group: 'group01', team1: 'KOR', team2: 'CZE' },
    { date: '2026-06-12', time: '20:00', group: 'group02', team1: 'CAN', team2: 'BIH' },
    { date: '2026-06-13', time: '02:00', group: 'group04', team1: 'USA', team2: 'PAR' },
    { date: '2026-06-13', time: '20:00', group: 'group02', team1: 'QAT', team2: 'SUI' },
    { date: '2026-06-13', time: '23:00', group: 'group03', team1: 'BRA', team2: 'MAR' },
    { date: '2026-06-14', time: '02:00', group: 'group03', team1: 'HAI', team2: 'SCO' },
    { date: '2026-06-14', time: '05:00', group: 'group04', team1: 'AUS', team2: 'TUR' },
    { date: '2026-06-14', time: '18:00', group: 'group05', team1: 'GER', team2: 'CUW' },
    { date: '2026-06-14', time: '21:00', group: 'group06', team1: 'NED', team2: 'JPN' },
    { date: '2026-06-15', time: '00:00', group: 'group05', team1: 'CIV', team2: 'ECU' },
    { date: '2026-06-15', time: '03:00', group: 'group06', team1: 'SWE', team2: 'TUN' },
    { date: '2026-06-15', time: '17:00', group: 'group08', team1: 'ESP', team2: 'CPV' },
    { date: '2026-06-15', time: '20:00', group: 'group07', team1: 'BEL', team2: 'EGY' },
    { date: '2026-06-15', time: '23:00', group: 'group08', team1: 'KSA', team2: 'URU' },
    { date: '2026-06-16', time: '02:00', group: 'group07', team1: 'IRN', team2: 'NZL' },
    { date: '2026-06-16', time: '20:00', group: 'group09', team1: 'FRA', team2: 'SEN' },
    { date: '2026-06-16', time: '23:00', group: 'group09', team1: 'IRQ', team2: 'NOR' },
    { date: '2026-06-17', time: '02:00', group: 'group10', team1: 'ARG', team2: 'ALG' },
    { date: '2026-06-17', time: '05:00', group: 'group10', team1: 'AUT', team2: 'JOR' },
    { date: '2026-06-17', time: '18:00', group: 'group11', team1: 'POR', team2: 'COD' },
    { date: '2026-06-17', time: '21:00', group: 'group12', team1: 'ENG', team2: 'CRO' },
    { date: '2026-06-18', time: '00:00', group: 'group12', team1: 'GHA', team2: 'PAN' },
    { date: '2026-06-18', time: '03:00', group: 'group11', team1: 'UZB', team2: 'COL' },
    { date: '2026-06-18', time: '17:00', group: 'group01', team1: 'CZE', team2: 'RSA' },
    { date: '2026-06-18', time: '20:00', group: 'group02', team1: 'SUI', team2: 'BIH' },
    { date: '2026-06-18', time: '23:00', group: 'group02', team1: 'CAN', team2: 'QAT' },
    { date: '2026-06-19', time: '02:00', group: 'group01', team1: 'MEX', team2: 'KOR' },
    { date: '2026-06-19', time: '20:00', group: 'group04', team1: 'USA', team2: 'AUS' },
    { date: '2026-06-19', time: '23:00', group: 'group03', team1: 'SCO', team2: 'MAR' },
    { date: '2026-06-20', time: '01:30', group: 'group03', team1: 'BRA', team2: 'HAI' },
    { date: '2026-06-20', time: '04:00', group: 'group04', team1: 'TUR', team2: 'PAR' },
    { date: '2026-06-20', time: '18:00', group: 'group06', team1: 'NED', team2: 'SWE' },
    { date: '2026-06-20', time: '21:00', group: 'group05', team1: 'GER', team2: 'CIV' },
    { date: '2026-06-21', time: '01:00', group: 'group05', team1: 'ECU', team2: 'CUW' },
    { date: '2026-06-21', time: '05:00', group: 'group06', team1: 'TUN', team2: 'JPN' },
    { date: '2026-06-21', time: '17:00', group: 'group08', team1: 'ESP', team2: 'KSA' },
    { date: '2026-06-21', time: '20:00', group: 'group07', team1: 'BEL', team2: 'IRN' },
    { date: '2026-06-21', time: '23:00', group: 'group08', team1: 'URU', team2: 'CPV' },
    { date: '2026-06-22', time: '02:00', group: 'group07', team1: 'NZL', team2: 'EGY' },
    { date: '2026-06-22', time: '18:00', group: 'group10', team1: 'ARG', team2: 'AUT' },
    { date: '2026-06-22', time: '22:00', group: 'group09', team1: 'FRA', team2: 'IRQ' },
    { date: '2026-06-23', time: '01:00', group: 'group09', team1: 'NOR', team2: 'SEN' },
    { date: '2026-06-23', time: '04:00', group: 'group10', team1: 'JOR', team2: 'ALG' },
    { date: '2026-06-23', time: '18:00', group: 'group11', team1: 'POR', team2: 'UZB' },
    { date: '2026-06-23', time: '21:00', group: 'group12', team1: 'ENG', team2: 'GHA' },
    { date: '2026-06-24', time: '00:00', group: 'group12', team1: 'PAN', team2: 'CRO' },
    { date: '2026-06-24', time: '03:00', group: 'group11', team1: 'COL', team2: 'COD' },
    { date: '2026-06-24', time: '20:00', group: 'group02', team1: 'SUI', team2: 'CAN' },
    { date: '2026-06-24', time: '20:00', group: 'group02', team1: 'BIH', team2: 'QAT' },
    { date: '2026-06-24', time: '23:00', group: 'group03', team1: 'SCO', team2: 'BRA' },
    { date: '2026-06-24', time: '23:00', group: 'group03', team1: 'MAR', team2: 'HAI' },
    { date: '2026-06-25', time: '02:00', group: 'group01', team1: 'CZE', team2: 'MEX' },
    { date: '2026-06-25', time: '02:00', group: 'group01', team1: 'RSA', team2: 'KOR' },
    { date: '2026-06-25', time: '21:00', group: 'group05', team1: 'CUW', team2: 'CIV' },
    { date: '2026-06-25', time: '21:00', group: 'group05', team1: 'ECU', team2: 'GER' },
    { date: '2026-06-26', time: '00:00', group: 'group06', team1: 'JPN', team2: 'SWE' },
    { date: '2026-06-26', time: '00:00', group: 'group06', team1: 'TUN', team2: 'NED' },
    { date: '2026-06-26', time: '03:00', group: 'group04', team1: 'TUR', team2: 'USA' },
    { date: '2026-06-26', time: '03:00', group: 'group04', team1: 'PAR', team2: 'AUS' },
    { date: '2026-06-26', time: '20:00', group: 'group09', team1: 'NOR', team2: 'FRA' },
    { date: '2026-06-26', time: '20:00', group: 'group09', team1: 'SEN', team2: 'IRQ' },
    { date: '2026-06-27', time: '01:00', group: 'group08', team1: 'CPV', team2: 'KSA' },
    { date: '2026-06-27', time: '01:00', group: 'group08', team1: 'URU', team2: 'ESP' },
    { date: '2026-06-27', time: '04:00', group: 'group07', team1: 'EGY', team2: 'IRN' },
    { date: '2026-06-27', time: '04:00', group: 'group07', team1: 'NZL', team2: 'BEL' },
    { date: '2026-06-27', time: '22:00', group: 'group12', team1: 'PAN', team2: 'ENG' },
    { date: '2026-06-27', time: '22:00', group: 'group12', team1: 'CRO', team2: 'GHA' },
    { date: '2026-06-28', time: '00:30', group: 'group11', team1: 'COL', team2: 'POR' },
    { date: '2026-06-28', time: '00:30', group: 'group11', team1: 'COD', team2: 'UZB' },
    { date: '2026-06-28', time: '03:00', group: 'group10', team1: 'ALG', team2: 'AUT' },
    { date: '2026-06-28', time: '03:00', group: 'group10', team1: 'JOR', team2: 'ARG' },
];

// Legacy structures for backward compatibility
// Group Stage Match Schedule (June 11-27, 2026)
export const matchSchedule = {
    'group01': { matchday1: '2026-06-11', matchday2: '2026-06-18', matchday3: '2026-06-25' }, // Group A - Mexico
    'group02': { matchday1: '2026-06-12', matchday2: '2026-06-18', matchday3: '2026-06-24' }, // Group B - Canada
    'group03': { matchday1: '2026-06-13', matchday2: '2026-06-19', matchday3: '2026-06-24' }, // Group C
    'group04': { matchday1: '2026-06-13', matchday2: '2026-06-19', matchday3: '2026-06-26' }, // Group D - United States
    'group05': { matchday1: '2026-06-14', matchday2: '2026-06-20', matchday3: '2026-06-25' }, // Group E
    'group06': { matchday1: '2026-06-14', matchday2: '2026-06-20', matchday3: '2026-06-26' }, // Group F
    'group07': { matchday1: '2026-06-15', matchday2: '2026-06-21', matchday3: '2026-06-27' }, // Group G
    'group08': { matchday1: '2026-06-15', matchday2: '2026-06-21', matchday3: '2026-06-27' }, // Group H
    'group09': { matchday1: '2026-06-16', matchday2: '2026-06-22', matchday3: '2026-06-26' }, // Group I
    'group10': { matchday1: '2026-06-17', matchday2: '2026-06-22', matchday3: '2026-06-27' }, // Group J
    'group11': { matchday1: '2026-06-17', matchday2: '2026-06-23', matchday3: '2026-06-27' }, // Group K
    'group12': { matchday1: '2026-06-17', matchday2: '2026-06-23', matchday3: '2026-06-27' }  // Group L
};

// Match Times (HH:MM in 24-hour format)
// Array of two times for each group's matchdays (for the two matches in that matchday)
// Times are in order of the matches as played
export const matchTimes = {
    'group01': { matchday1: ['20:00', '03:00'], matchday2: ['17:00', '02:00'], matchday3: ['02:00', '02:00'] },
    'group02': { matchday1: ['20:00', '20:00'], matchday2: ['20:00', '23:00'], matchday3: ['20:00', '20:00'] },
    'group03': { matchday1: ['23:00', '02:00'], matchday2: ['23:00', '01:30'], matchday3: ['23:00', '23:00'] },
    'group04': { matchday1: ['02:00', '05:00'], matchday2: ['20:00', '04:00'], matchday3: ['03:00', '03:00'] },
    'group05': { matchday1: ['18:00', '00:00'], matchday2: ['21:00', '01:00'], matchday3: ['21:00', '21:00'] },
    'group06': { matchday1: ['21:00', '03:00'], matchday2: ['18:00', '05:00'], matchday3: ['00:00', '00:00'] },
    'group07': { matchday1: ['20:00', '02:00'], matchday2: ['20:00', '02:00'], matchday3: ['04:00', '04:00'] },
    'group08': { matchday1: ['17:00', '23:00'], matchday2: ['17:00', '23:00'], matchday3: ['01:00', '01:00'] },
    'group09': { matchday1: ['20:00', '23:00'], matchday2: ['22:00', '01:00'], matchday3: ['20:00', '20:00'] },
    'group10': { matchday1: ['02:00', '05:00'], matchday2: ['18:00', '04:00'], matchday3: ['22:00', '22:00'] },
    'group11': { matchday1: ['18:00', '03:00'], matchday2: ['18:00', '03:00'], matchday3: ['18:00', '22:00'] },
    'group12': { matchday1: ['21:00', '00:00'], matchday2: ['21:00', '00:00'], matchday3: ['22:00', '22:00'] }
};

// Knockout Stage Match Schedule
export const knockoutMatchSchedule = {
    'Round of 32': {
        // June 28-July 4, 2026 (ordered by TV airtime)
        'match1': { date: '2026-06-28', time: '20:00' },
        'match2': { date: '2026-06-29', time: '18:00' },
        'match3': { date: '2026-06-29', time: '21:30' },
        'match4': { date: '2026-06-30', time: '02:00' },
        'match5': { date: '2026-06-30', time: '18:00' },
        'match6': { date: '2026-06-30', time: '22:00' },
        'match7': { date: '2026-07-01', time: '02:00' },
        'match8': { date: '2026-07-01', time: '17:00' },
        'match9': { date: '2026-07-01', time: '21:00' },
        'match10': { date: '2026-07-02', time: '01:00' },
        'match11': { date: '2026-07-02', time: '20:00' },
        'match12': { date: '2026-07-03', time: '00:00' },
        'match13': { date: '2026-07-03', time: '04:00' },
        'match14': { date: '2026-07-03', time: '19:00' },
        'match15': { date: '2026-07-03', time: '23:00' },
        'match16': { date: '2026-07-04', time: '02:30' }
    },
    'Round of 16': {
        // July 4-7, 2026 (ordered by TV airtime)
        'match1': { date: '2026-07-04', time: '18:00' },
        'match2': { date: '2026-07-04', time: '22:00' },
        'match3': { date: '2026-07-05', time: '21:00' },
        'match4': { date: '2026-07-06', time: '01:00' },
        'match5': { date: '2026-07-06', time: '20:00' },
        'match6': { date: '2026-07-07', time: '01:00' },
        'match7': { date: '2026-07-07', time: '17:00' },
        'match8': { date: '2026-07-07', time: '21:00' }
    },
    'Quarter Finals': {
        // July 9-12, 2026 (ordered by TV airtime)
        'match1': { date: '2026-07-09', time: '21:00' },
        'match2': { date: '2026-07-10', time: '20:00' },
        'match3': { date: '2026-07-11', time: '22:00' },
        'match4': { date: '2026-07-12', time: '02:00' }
    },
    'Semi Finals': {
        // July 14-15, 2026
        'match1': { date: '2026-07-14', time: '20:00' },
        'match2': { date: '2026-07-15', time: '20:00' }
    },
    'Third Place Playoff': {
        // July 18, 2026
        'match1': { date: '2026-07-18', time: '22:00' }
    },
    'Final': {
        // July 19, 2026
        'match1': { date: '2026-07-19', time: '20:00' }
    }
};

export function getKnockoutScheduleEntry(stage, matchKey) {
    return knockoutMatchSchedule[stage]?.[matchKey] || null;
}

export function getKnockoutScheduleDate(stage, matchKey) {
    const entry = getKnockoutScheduleEntry(stage, matchKey);
    if (!entry) {
        return null;
    }

    return typeof entry === 'string' ? entry : entry.date || null;
}

export function getKnockoutScheduleTime(stage, matchKey) {
    const entry = getKnockoutScheduleEntry(stage, matchKey);
    if (!entry || typeof entry === 'string') {
        return null;
    }

    return entry.time || null;
}

/**
 * Utility function to get the display date based on match date and time
 * Matches at early morning times (00:00-12:00) are on the next calendar day
 * @param {string} dateString - The base date in YYYY-MM-DD format (e.g., '2026-06-11')
 * @param {string} timeString - The time in HH:MM format (e.g., '03:00')
 * @returns {Date} The date object to use for display
 */
export function getDisplayDate(dateString, timeString) {
    if (!dateString) {
        return new Date();
    }

    // Create date in UTC
    let date = new Date(dateString + 'T00:00:00Z');

    // If match time is early morning (00:00-11:59), it's on the next calendar day
    if (timeString) {
        const [hours] = timeString.split(':').map(Number);
        if (hours < 12) {
            date.setUTCDate(date.getUTCDate() + 1);
        }
    }

    return date;
}
