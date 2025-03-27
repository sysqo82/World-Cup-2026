import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open the database connection
const db = await open({
    filename: './worldcup2026.db',
    driver: sqlite3.Database,
});

// Helper functions for database operations
export const dbRun = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

export const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

export default db;