const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/yourDBName', 
{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

const LogSchema = new mongoose.Schema(
    {
    level:String,
    message:String,
    resourceId: String,
    timestamp: Date,
    traceId: String, // Additional fields
    spanId: String,
    commit: String,
    metadata: {
        parentResourceId: String
    }
}
);

const LogModel = mongoose.model('Log', LogSchema);

// Log ingestion endpoint
app.post('/logs', async (req, res) => {
    try 
    {
        const logs = req.body;

        // Input validation - ensuring logs array is present and not empty
        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).send('Logs should be an array and not empty');
        }

        await LogModel.insertMany(logs);

        res.status(200).send('Logs received successfully');
    } 
    catch (error)
     {
        console.error('Error receiving logs:', error);
        res.status(500).send('Internal Server Error');
    }
}
);

// Log ingestion from a file endpoint
app.post('/logs/file', async (req, res) => {
    try {
        const { file } = req.body;

        if (!file) {
            return res.status(400).send('File path not provided');
        }

        const data = fs.readFileSync(file);
        const logs = JSON.parse(data);

        if (!Array.isArray(logs) || logs.length === 0) {
            return res.status(400).send('Logs should be an array and not empty');
        }

        await LogModel.insertMany(logs);

        res.status(200).send('Logs received successfully');
    } catch (error) {
        console.error('Error receiving logs:', error);
        res.status(500).send('Internal Server Error');
    }
}
);

// Search endpoint with pagination and sorting
app.get('/logs', async (req, res) => {
    try {
        const { level, message, resourceId, timestamp, page = 1, limit = 10, sort } = req.query;
        const filter = {};

        if (level) filter.level = { $regex: level, $options: 'i' };
        if (message) filter.message = { $regex: message, $options: 'i' };
        if (resourceId) filter.resourceId = resourceId;
        if (timestamp) filter.timestamp = new Date(timestamp);

        const options = {
            limit: parseInt(limit), // Convert string to number
            skip: (page - 1) * parseInt(limit), // Pagination logic
            sort: sort ? { [sort]: 1 } : {} // Sorting logic based on a field (1 for ascending, -1 for descending)
        };

        const logs = await LogModel.find(filter, null, options);

        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
