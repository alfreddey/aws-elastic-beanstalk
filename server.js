const express = require('express');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const app = express();
// Elastic Beanstalk automatically sets the PORT environment variable (usually to 8080)
const port = process.env.PORT || 8080;

// Initialize DynamoDB Client
// The AWS_REGION is set by our Elastic Beanstalk environment variables
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const tableName = process.env.DYNAMODB_TABLE_NAME;

app.get('/', async (req, res) => {
    try {
        let dbStatus = "DynamoDB is NOT configured. DYNAMODB_TABLE_NAME environment variable is missing.";

        if (tableName) {
            // Write a dummy record to the DynamoDB table to demonstrate integration
            const id = uuidv4();
            const putCommand = new PutItemCommand({
                TableName: tableName,
                Item: {
                    id: { S: id },
                    timestamp: { S: new Date().toISOString() },
                    message: { S: "Hello from Elastic Beanstalk!" }
                }
            });
            await client.send(putCommand);

            // Read records back to confirm it worked
            const scanCommand = new ScanCommand({
                TableName: tableName,
                Limit: 5
            });
            const data = await client.send(scanCommand);
            dbStatus = `DynamoDB integration successful! Connected to table: <strong>${tableName}</strong>.<br/> Items in table: ${data.Count}.<br/> Last inserted ID: ${id}`;
        }

        res.send(`
            <div style="font-family: sans-serif; padding: 2rem;">
                <h1 style="color: #2e7d32;">Deployment Successful! ✅</h1>
                <p><strong>Application Version:</strong> 1.0.0 (Deployed via GitHub Actions)</p>
                <p><strong>Node.js Version:</strong> ${process.version}</p>
                <div style="margin-top: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 8px;">
                    <h3>External Service Integration (Optional Challenge)</h3>
                    <p>${dbStatus}</p>
                </div>
            </div>
        `);
    } catch (error) {
        console.error("DynamoDB Error:", error);
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 2rem;">
                <h1 style="color: #c62828;">Deployment Successful (with errors) ⚠️</h1>
                <p><strong>Application Version:</strong> 1.0.0</p>
                <div style="margin-top: 2rem; padding: 1rem; background-color: #ffebee; border-radius: 8px;">
                    <h3>External Service Integration Error</h3>
                    <p>Failed to connect to DynamoDB. Error details:</p>
                    <pre>${error.message}</pre>
                </div>
            </div>
        `);
    }
});

// Health check endpoint (recommended for Load Balancers)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
