import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db; // Declare the database variable

// Resolve the absolute path to the database file
const dbPath = path.resolve('./worldcup2026.db');

// Function to initialize and return the database connection
export const getDb = async () => {
    if (!db) {
        console.log(`Opening database at path: ${dbPath}`);
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        console.log('Database connection established successfully.');
    }
    return db;
};

// Helper functions for database operations
export const dbRun = async (query, params = []) => {
    const db = await getDb(); // Ensure the database is initialized
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                console.error('Error running query:', query, err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

export const dbAll = async (query, params = []) => {
    const db = await getDb(); // Ensure the database is initialized
    console.log('Database connection is ready.');
    return new Promise((resolve, reject) => {
        console.log(`Executing query: ${query} with params: ${params}`);
        console.log('params: ', params);
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching data:', query, err);
                reject(err);
            } else {
                console.log('Query executed successfully.');
                if (!rows || rows.length === 0) {
                    console.warn('Query returned no results:', query);
                } else {
                    console.log('Query result:', rows);
                }
                resolve(rows);
            }
        });
    });
};

export default getDb;