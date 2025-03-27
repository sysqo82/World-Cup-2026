import { dbAll } from './database.js';
import fs from 'fs';

(async () => {
    try {
        const rows = await dbAll(`SELECT * FROM countries`);

        // Group countries by their group name
        const groups = rows.reduce((acc, row) => {
            if (!acc[row.group_name]) acc[row.group_name] = [];
            acc[row.group_name].push(row.name);
            return acc;
        }, {});

        // Generate the HTML
        let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>World Cup 2026</title>
                <link rel="stylesheet" href="styles/style.css">
            </head>
            <body>
                <h1>World Cup 2026</h1>
                <div class="tables-container">
        `;

        for (const [group, countries] of Object.entries(groups)) {
            html += `
                <div>
                    <h2>${group}</h2>
                    <table>
                        <tr><th>Country</th><th>Games</th><th>W</th><th>D</th><th>L</th><th>Points</th></tr>
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

        // Write the HTML to a file
        fs.writeFileSync('./public/index.html', html);
        console.log('Static index.html generated successfully!');
    } catch (err) {
        console.error('Error generating static HTML:', err);
    }
})();