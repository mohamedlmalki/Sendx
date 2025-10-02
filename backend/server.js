const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
const axios = require("axios");


const app = express();
const PORT = 3001;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

app.use(cors());
app.use(express.json());

// Helper function to read accounts
const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return []; // If file doesn't exist, return empty array
    throw error;
  }
};

// Helper function to write accounts
const writeAccounts = async (accounts) => {
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
};

// GET all accounts
app.get("/api/accounts", async (req, res) => {
  const accounts = await readAccounts();
  res.json(accounts);
});

// POST a new account
app.post("/api/accounts", async (req, res) => {
  const { name, apiKey } = req.body;
  if (!name || !apiKey) {
    return res.status(400).json({ error: "Name and API Key are required" });
  }
  const accounts = await readAccounts();
  const newAccount = { id: `acc_${Date.now()}`, name, apiKey };
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

// PUT (update) an existing account
app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, apiKey } = req.body;
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);

    if (accountIndex === -1) {
        return res.status(404).json({ error: "Account not found" });
    }

    accounts[accountIndex] = { ...accounts[accountIndex], name, apiKey };
    await writeAccounts(accounts);
    res.json(accounts[accountIndex]);
});

// DELETE an account
app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    let accounts = await readAccounts();
    const updatedAccounts = accounts.filter(acc => acc.id !== id);

    if (accounts.length === updatedAccounts.length) {
        return res.status(404).json({ error: "Account not found" });
    }

    await writeAccounts(updatedAccounts);
    res.status(200).json({ message: "Account deleted successfully" });
});

// Endpoint to check connection status for SendX
app.post("/api/accounts/check-status", async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ status: 'failed', response: { message: 'API Key is required.' }});
  }
  try {
    const response = await axios.get('https://api.sendx.io/api/v1/rest/sender', {
      headers: {
        'X-Team-ApiKey': apiKey
      }
    });

    res.json({
      status: 'connected',
      response: {
        message: 'Connection successful.',
        originalResponse: response.data
      }
    });
  } catch (error) {
    const getErrorResponse = (err) => ({
        name: err.name,
        message: err.message,
        data: err.response ? err.response.data : "No additional data provided.",
    });

    res.json({
      status: 'failed',
      response: getErrorResponse(error)
    });
  }
});

// GET all lists for an account
app.post("/api/lists", async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ error: "API Key is required" });
    }
    try {
        const response = await axios.get('https://api.sendx.io/api/v1/rest/list', {
            headers: { 'X-Team-ApiKey': apiKey }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch lists" });
    }
});

// POST bulk contacts
app.post("/api/contacts/bulk", async (req, res) => {
    const { apiKey, contacts, listId } = req.body;
    if (!apiKey || !contacts || !listId) {
        return res.status(400).json({ error: "API Key, contacts, and listId are required" });
    }

    const results = { success: [], failed: [] };

    for (const contact of contacts) {
        try {
            const response = await axios.post('https://api.sendx.io/api/v1/rest/contact', {
                ...contact,
                lists: [listId]
            }, {
                headers: { 'X-Team-ApiKey': apiKey }
            });
            results.success.push({ email: contact.email, data: response.data });
        } catch (error) {
            results.failed.push({ email: contact.email, error: error.response ? error.response.data : error.message });
        }
    }

    res.json(results);
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});