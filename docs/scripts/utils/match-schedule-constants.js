// FIFA World Cup 2026 Official Match Schedule
// Centralized schedule constants to avoid duplication

// Group Stage Match Schedule (June 11-27, 2026)
export const matchSchedule = {
    'group01': { matchday1: '2026-06-11', matchday2: '2026-06-18', matchday3: '2026-06-24' }, // Group A - Mexico
    'group02': { matchday1: '2026-06-12', matchday2: '2026-06-18', matchday3: '2026-06-24' }, // Group B - Canada
    'group03': { matchday1: '2026-06-13', matchday2: '2026-06-19', matchday3: '2026-06-24' }, // Group C
    'group04': { matchday1: '2026-06-12', matchday2: '2026-06-19', matchday3: '2026-06-25' }, // Group D - United States
    'group05': { matchday1: '2026-06-14', matchday2: '2026-06-20', matchday3: '2026-06-25' }, // Group E
    'group06': { matchday1: '2026-06-14', matchday2: '2026-06-20', matchday3: '2026-06-25' }, // Group F
    'group07': { matchday1: '2026-06-15', matchday2: '2026-06-21', matchday3: '2026-06-26' }, // Group G
    'group08': { matchday1: '2026-06-15', matchday2: '2026-06-21', matchday3: '2026-06-26' }, // Group H
    'group09': { matchday1: '2026-06-16', matchday2: '2026-06-22', matchday3: '2026-06-26' }, // Group I
    'group10': { matchday1: '2026-06-17', matchday2: '2026-06-22', matchday3: '2026-06-27' }, // Group J
    'group11': { matchday1: '2026-06-17', matchday2: '2026-06-23', matchday3: '2026-06-27' }, // Group K
    'group12': { matchday1: '2026-06-17', matchday2: '2026-06-23', matchday3: '2026-06-27' }  // Group L
};

// Match Times (HH:MM in 24-hour format)
// Array of two times for each group's matchdays (for the two matches in that matchday)
// Times are in order of the matches as played
export const matchTimes = {
    'group01': { matchday1: ['20:00', '03:00'], matchday2: ['14:00', '20:00'], matchday3: ['16:00', '20:00'] },
    'group02': { matchday1: ['20:00', '20:00'], matchday2: ['14:00', '20:00'], matchday3: ['16:00', '20:00'] },
    'group03': { matchday1: ['23:00', '02:00'], matchday2: ['14:00', '20:00'], matchday3: ['23:00', '23:00'] },
    'group04': { matchday1: ['02:00', '05:00'], matchday2: ['02:00', '03:00'], matchday3: ['20:00', '03:00'] },
    'group05': { matchday1: ['18:00', '01:00'], matchday2: ['14:00', '20:00'], matchday3: ['21:00', '21:00'] },
    'group06': { matchday1: ['21:00', '05:00'], matchday2: ['14:00', '20:00'], matchday3: ['18:00', '00:00'] },
    'group07': { matchday1: ['20:00', '02:00'], matchday2: ['03:00', '20:00'], matchday3: ['20:00', '04:00'] },
    'group08': { matchday1: ['17:00', '23:00'], matchday2: ['23:00', '01:00'], matchday3: ['01:00', '01:00'] },
    'group09': { matchday1: ['20:00', '01:00'], matchday2: ['20:00', '02:00'], matchday3: ['23:00', '23:00'] },
    'group10': { matchday1: ['02:00', '04:00'], matchday2: ['14:00', '02:00'], matchday3: ['03:00', '03:00'] },
    'group11': { matchday1: ['18:00', '03:00'], matchday2: ['20:00', '00:30'], matchday3: ['18:00', '00:30'] },
    'group12': { matchday1: ['21:00', '00:00'], matchday2: ['22:00', '22:00'], matchday3: ['21:00', '22:00'] }
};

// Knockout Stage Match Schedule
export const knockoutMatchSchedule = {
    'Round of 32': {
        // June 28-July 3, 2026 (16 matches over 6 days)
        'match1': '2026-06-28', 'match2': '2026-06-28', 'match3': '2026-06-29', 'match4': '2026-06-29',
        'match5': '2026-06-30', 'match6': '2026-06-30', 'match7': '2026-06-30', 'match8': '2026-07-01',
        'match9': '2026-07-01', 'match10': '2026-07-01', 'match11': '2026-07-02', 'match12': '2026-07-02',
        'match13': '2026-07-02', 'match14': '2026-07-03', 'match15': '2026-07-03', 'match16': '2026-07-03'
    },
    'Round of 16': {
        // July 4-7, 2026 (8 matches over 4 days)
        'match1': '2026-07-04', 'match2': '2026-07-04', 'match3': '2026-07-05', 'match4': '2026-07-05',
        'match5': '2026-07-06', 'match6': '2026-07-06', 'match7': '2026-07-07', 'match8': '2026-07-07'
    },
    'Quarter Finals': {
        // July 9-11, 2026 (4 matches over 3 days)
        'match1': '2026-07-09', 'match2': '2026-07-09', 'match3': '2026-07-10', 'match4': '2026-07-11'
    },
    'Semi Finals': {
        // July 14-15, 2026 (2 matches)
        'match1': '2026-07-14', 'match2': '2026-07-15'
    },
    'Third Place Playoff': {
        // July 18, 2026
        'match1': '2026-07-18'
    },
    'Final': {
        // July 19, 2026
        'match1': '2026-07-19'
    }
};

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
