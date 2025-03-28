import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static('public')); // Serve static files from the 'public' folder
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});