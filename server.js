import express from 'express';
import bodyParser from 'body-parser';
import { dbRun, dbAll } from './database.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());

// Serve the dynamically generated homepage
app.get('/', async (req, res) => {
    try {
        // Fetch all countries from the database
        const rows = await dbAll(`SELECT * FROM countries`);

        // Group countries by their group name
        const groups = rows.reduce((acc, row) => {
            if (!acc[row.group_name]) acc[row.group_name] = [];
            acc[row.group_name].push(row.name);
            return acc;
        }, {});

        // Generate the HTML dynamically
        let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>World Cup 2026</title>
                <link rel="stylesheet" href="/styles/style.css">
            </head>
            <body>
                <h1>World Cup 2026</h1>
                <div class="tables-container">
        `;

        // Add tables for each group
        for (const [group, countries] of Object.entries(groups)) {
            html += `
                <div>
                    <h2>${group}</h2>
                    <table>
                        <tr><th>Country</th><th>Games</th><th>W</th><th>D</th><th>L</th><th>Points</th><th>Actions</th></tr>
            `;
            countries.forEach((country) => {
                html += `
                    <tr>
                        <td>${country}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td><form method="POST" action="/delete-country" style="display:inline;">
                            <input type="hidden" name="country" value="${country}">
                            <button type="submit">Remove</button>
                        </form></td>
                    </tr>
                `;
            });
            html += `
                    </table>
                </div>
            `;
        }

        html += `
                </div>
            </body>
            </html>
        `;

        // Send the generated HTML to the client
        res.send(html);
    } catch (err) {
        res.status(500).send('Error generating the page');
    }
});

// API to add a country
app.post('/api/countries', async (req, res) => {
    const { name, group } = req.body;
    if (!name || !group) {
        return res.status(400).json({ error: 'Country name and group are required' });
    }

    try {
        const result = await dbRun(`INSERT INTO countries (name, group_name) VALUES (?, ?)`, [name, group]);
        res.json({ id: result.lastID, name, group });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to delete a country
app.post('/delete-country', async (req, res) => {
    const { country } = req.body;

    try {
        const result = await dbRun(`DELETE FROM countries WHERE name = ?`, [country]);
        if (result.changes > 0) {
            res.redirect('/'); // Redirect back to the homepage after deletion
        } else {
            res.status(404).send('Country not found');
        }
    } catch (err) {
        res.status(500).send('Error deleting the country');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});