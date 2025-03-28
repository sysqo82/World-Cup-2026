import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
// Serve static files from the correct directory (e.g., 'docs' or 'public')
app.use(express.static(path.join(__dirname, 'docs'))); // Change 'docs' to the correct folder name if needed
app.use(bodyParser.json());

// API to add a country
app.post('/api/countries', async (req, res) => {
    const { name, group } = req.body;
    if (!name || !group) {
        return res.status(400).json({ error: 'Country name and group are required' });
    }

    try {
        // Simulate adding a country (replace with actual database logic if needed)
        res.json({ message: `Country ${name} added to group ${group}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to delete a country
app.post('/delete-country', async (req, res) => {
    const { country } = req.body;

    try {
        // Simulate deleting a country (replace with actual database logic if needed)
        res.json({ message: `Country ${country} deleted` });
    } catch (err) {
        res.status(500).send('Error deleting the country');
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});