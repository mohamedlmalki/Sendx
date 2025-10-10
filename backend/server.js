const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const ACCOUNTS_FILE = path.join(__dirname, "accounts.json");

app.use(cors());
app.use(express.json());

// In-memory cache for background jobs
const backgroundJobs = {};

// Helper function to create an authorized Axios instance for GetResponse
const getGetResponseApiClient = (apiKey) => {
    if (!apiKey) {
        throw new Error("API Key is missing.");
    }
    return axios.create({
        baseURL: 'https://api.getresponse.com/v3',
        headers: {
            'X-Auth-Token': `api-key ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
};


// Helper function to read accounts
const readAccounts = async () => {
  try {
    const data = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

// Helper function to write accounts
const writeAccounts = async (accounts) => {
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
};

// --- Account Management Endpoints ---
app.get("/api/accounts", async (req, res) => {
  const accounts = await readAccounts();
  res.json(accounts);
});

app.post("/api/accounts", async (req, res) => {
  const { name, apiKey } = req.body;
  const accounts = await readAccounts();
  const newAccount = { id: `acc_${Date.now()}`, name, apiKey };
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, apiKey } = req.body;
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) return res.status(404).json({ error: "Account not found" });
    accounts[accountIndex] = { ...accounts[accountIndex], name, apiKey };
    await writeAccounts(accounts);
    res.json(accounts[accountIndex]);
});

app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    let accounts = await readAccounts();
    const updatedAccounts = accounts.filter(acc => acc.id !== id);
    await writeAccounts(updatedAccounts);
    res.status(200).json({ message: "Account deleted successfully" });
});

// --- GetResponse API Endpoints ---

app.post("/api/accounts/check-status", async (req, res) => {
  const { apiKey } = req.body;
  try {
    const apiClient = getGetResponseApiClient(apiKey);
    const response = await apiClient.get('/accounts');
    res.json({ status: 'connected', response: response.data });
  } catch (error) {
    console.error("Check status failed:", error.response ? error.response.data : error.message);
    res.status(401).json({ status: 'failed', response: error.response ? error.response.data : { message: error.message } });
  }
});


// --- From Fields (Senders) Endpoints ---
app.post("/api/from-fields", async (req, res) => {
    const { apiKey, name, email } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: "API Key is required" });
    }

    try {
        const apiClient = getGetResponseApiClient(apiKey);

        if (name && email) {
            const response = await apiClient.post('/from-fields', { name, email });
            return res.status(201).json(response.data);
        }
        
        const response = await apiClient.get('/from-fields');
        return res.json(response.data);

    } catch (error) {
        console.error("Failed to process from-fields request:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to process from-fields request with GetResponse", details: error.response ? error.response.data : error.message });
    }
});


app.delete("/api/from-fields/:fromFieldId", async (req, res) => {
    const { apiKey } = req.body;
    const { fromFieldId } = req.params;
    if (!apiKey || !fromFieldId) {
        return res.status(400).json({ error: "API Key and From Field ID are required" });
    }
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        await apiClient.delete(`/from-fields/${fromFieldId}`);
        res.status(200).json({ message: "From field deleted successfully" });
    } catch (error) {
        console.error("Failed to delete from-field:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to delete from-field from GetResponse", details: error.response ? error.response.data : error.message });
    }
});

// --- GetResponse Contact/Campaign Endpoints ---
app.post("/api/getresponse/campaigns", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        const response = await apiClient.get('/campaigns');
        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch campaigns:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch campaigns", details: error.response ? error.response.data : error.message });
    }
});

app.post("/api/getresponse/contact", async (req, res) => {
    const { apiKey, contact, campaignId, customFields } = req.body;
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        
        const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();

        const payload = {
            name: name || contact.email,
            email: contact.email,
            campaign: {
                campaignId: campaignId
            },
            customFields: customFields
        };
        const response = await apiClient.post('/contacts', payload);
        res.status(202).json(response.data);
    } catch (error) {
         console.error("Failed to create contact:", error.response ? error.response.data : error.message);
         res.status(error.response?.status || 500).json(error.response?.data || { message: "An unknown error occurred" });
    }
});

app.post("/api/getresponse/contacts", async (req, res) => {
    const { apiKey, campaignId, page = 1, perPage = 10 } = req.body;
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        const response = await apiClient.get('/contacts', {
            params: {
                'query[campaignId]': campaignId,
                'page': page,
                'perPage': perPage,
                'sort[createdOn]': 'desc'
            }
        });
        const total = response.headers['total-count'];
        res.json({ contacts: response.data, total: parseInt(total, 10) });
    } catch (error) {
        console.error("Failed to fetch contacts:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch contacts", details: error.response ? error.response.data : error.message });
    }
});

app.delete("/api/getresponse/contacts", async (req, res) => {
    const { apiKey, emails, campaignId } = req.body;
    if (!apiKey || !emails || !campaignId) {
        return res.status(400).json({ error: "API Key, emails, and campaignId are required" });
    }
    
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        
        const allContactsResponse = await apiClient.get('/contacts', {
            params: {
                'query[campaignId]': campaignId,
                'fields': 'contactId,email'
            }
        });
        
        const contactsToDelete = allContactsResponse.data.filter(contact => emails.includes(contact.email));

        if (contactsToDelete.length === 0) {
            return res.status(404).json({ message: "No matching contacts found to delete." });
        }

        for (const contact of contactsToDelete) {
            await apiClient.delete(`/contacts/${contact.contactId}`);
        }

        res.status(200).json({ message: `${contactsToDelete.length} contact(s) deleted successfully` });

    } catch (error) {
        console.error("Failed to delete contacts:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to delete contacts from GetResponse", details: error.response ? error.response.data : error.message });
    }
});

// --- GetResponse Automation (Workflow) Endpoints ---
app.post("/api/getresponse/workflows", async (req, res) => {
    const { apiKey } = req.body;
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        const response = await apiClient.get('/workflow'); // Corrected endpoint
        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch workflows:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch workflows", details: error.response ? error.response.data : error.message });
    }
});

// This endpoint now just fetches the single workflow, as stats are included.
app.post("/api/getresponse/workflows/:workflowId", async (req, res) => {
    const { apiKey } = req.body;
    const { workflowId } = req.params;
    try {
        const apiClient = getGetResponseApiClient(apiKey);
        const response = await apiClient.get(`/workflow/${workflowId}`); // Corrected endpoint
        res.json(response.data);
    } catch (error) {
        console.error("Failed to fetch workflow stats:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch workflow statistics", details: error.response ? error.response.data : error.message });
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});