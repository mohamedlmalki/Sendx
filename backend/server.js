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

// In-memory cache for access tokens and background jobs
const tokenCache = {};
const backgroundJobs = {};

// Helper function to get a SendPulse access token
const getAccessToken = async (clientId, clientSecret) => {
    const cacheKey = clientId;
    const now = Date.now();

    if (tokenCache[cacheKey] && tokenCache[cacheKey].expiresAt > now) {
        return tokenCache[cacheKey].token;
    }

    console.log("Fetching new access token for client:", clientId);
    try {
        const response = await axios.post("https://api.sendpulse.com/oauth/access_token", {
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret,
        });

        const { access_token, expires_in } = response.data;
        
        tokenCache[cacheKey] = {
            token: access_token,
            expiresAt: now + ((expires_in - 60) * 1000),
        };

        return access_token;
    } catch (error) {
        console.error("Failed to get access token:", error.response ? error.response.data : error.message);
        throw new Error("Could not authenticate with SendPulse.");
    }
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
  const { name, clientId, secretId } = req.body;
  const accounts = await readAccounts();
  const newAccount = { id: `acc_${Date.now()}`, name, clientId, secretId };
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, clientId, secretId } = req.body;
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) return res.status(404).json({ error: "Account not found" });
    accounts[accountIndex] = { ...accounts[accountIndex], name, clientId, secretId };
    await writeAccounts(accounts);
    res.json(accounts[accountIndex]);
});

app.delete("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    let accounts = await readAccounts();
    const accountToDelete = accounts.find(acc => acc.id === id);
    if (!accountToDelete) return res.status(404).json({ error: "Account not found" });
    if (tokenCache[accountToDelete.clientId]) delete tokenCache[accountToDelete.clientId];
    const updatedAccounts = accounts.filter(acc => acc.id !== id);
    await writeAccounts(updatedAccounts);
    res.status(200).json({ message: "Account deleted successfully" });
});

// --- SendPulse API Endpoints ---

app.post("/api/accounts/check-status", async (req, res) => {
  const { clientId, secretId } = req.body;
  try {
    const accessToken = await getAccessToken(clientId, secretId);
    const response = await axios.get('https://api.sendpulse.com/user/balance/detail', { headers: { 'Authorization': `Bearer ${accessToken}` }});
    res.json({ status: 'connected', response: response.data });
  } catch (error) {
    res.status(401).json({ status: 'failed', response: error.message });
  }
});

app.post("/api/lists", async (req, res) => {
    const { clientId, secretId } = req.body;
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const response = await axios.get('https://api.sendpulse.com/addressbooks', { headers: { 'Authorization': `Bearer ${accessToken}` }});
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch address books" });
    }
});

app.post("/api/contacts/bulk", async (req, res) => {
    const { clientId, secretId, contacts, addressBookId } = req.body;
    const results = { success: [], failed: [] };
    for (const contact of contacts) {
        try {
            const accessToken = await getAccessToken(clientId, secretId);
            const response = await axios.post(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails`, { emails: [contact] }, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            results.success.push({ email: contact.email, data: response.data });
        } catch (error) {
            results.failed.push({ email: contact.email, error: error.response ? error.response.data : error.message });
        }
    }
    res.json(results);
});

app.post("/api/subscribers", async (req, res) => {
    const { clientId, secretId, addressBookId, limit = 25, offset = 0 } = req.body;
    if (!clientId || !secretId || !addressBookId) {
        return res.status(400).json({ error: "Client credentials and address book ID are required" });
    }
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const config = { headers: { 'Authorization': `Bearer ${accessToken}` } };

        const [emailsResponse, totalResponse] = await Promise.all([
            axios.get(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails`, { ...config, params: { limit, offset } }),
            axios.get(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails/total`, config)
        ]);
        
        res.json({
            emails: emailsResponse.data,
            total: totalResponse.data.total
        });

    } catch (error) {
        console.error("Error fetching subscribers:", error);
        res.status(500).json({ error: "Failed to fetch subscribers" });
    }
});

app.delete("/api/subscribers", async (req, res) => {
    const { clientId, secretId, addressBookId, emails } = req.body;
    if (!clientId || !secretId || !addressBookId || !emails) {
        return res.status(400).json({ error: "Client credentials, address book ID, and emails are required" });
    }
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const response = await axios.delete(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            data: { emails }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete subscribers" });
    }
});

app.delete("/api/addressbooks/:addressBookId/all-subscribers", async (req, res) => {
    const { clientId, secretId } = req.body;
    const { addressBookId } = req.params;

    if (!clientId || !secretId) {
        return res.status(400).json({ error: "Client credentials are required" });
    }

    const jobId = uuidv4();
    backgroundJobs[jobId] = { status: 'started', progress: 0, total: 0, message: 'Initializing job...' };
    
    res.status(202).json({ message: "Deletion job started.", jobId });

    (async () => {
        try {
            console.log(`Starting background job: Delete all subscribers from address book ${addressBookId}`);
            const accessToken = await getAccessToken(clientId, secretId);
            const config = { headers: { 'Authorization': `Bearer ${accessToken}` } };
            
            const totalResponse = await axios.get(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails/total`, config);
            const total = totalResponse.data.total;
            if (total === 0) {
                 backgroundJobs[jobId] = { status: 'completed', progress: 100, total: 0, message: 'No subscribers to delete.' };
                 return;
            }
            backgroundJobs[jobId].total = total;
            backgroundJobs[jobId].status = 'fetching';
            backgroundJobs[jobId].message = `Fetching ${total} emails...`;

            let allEmails = [];
            let offset = 0;
            const limit = 100;

            while (allEmails.length < total) {
                const response = await axios.get(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails`, {
                    ...config,
                    params: { limit, offset }
                });

                const fetchedEmails = response.data.map(sub => sub.email);
                if (fetchedEmails.length === 0) break;
                
                allEmails.push(...fetchedEmails);
                offset += limit;
                backgroundJobs[jobId].progress = Math.round((allEmails.length / total) * 50);
            }

            if (allEmails.length > 0) {
                 backgroundJobs[jobId].status = 'deleting';
                 backgroundJobs[jobId].message = `Deleting ${allEmails.length} emails...`;

                 await axios.delete(`https://api.sendpulse.com/addressbooks/${addressBookId}/emails`, {
                    ...config,
                    data: { emails: allEmails }
                });

                backgroundJobs[jobId] = { status: 'completed', progress: 100, total, message: 'All subscribers deleted successfully.' };
            }
        } catch (error) {
            console.error(`Background job failed for address book ${addressBookId}:`, error.response ? error.response.data : error.message);
            let errorMessage = "An unknown error occurred.";
            if (error.response && error.response.data) {
                errorMessage = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            backgroundJobs[jobId] = { status: 'failed', progress: backgroundJobs[jobId]?.progress || 0, total: backgroundJobs[jobId]?.total || 0, message: `Job failed: ${errorMessage}` };
        }
    })();
});

app.get("/api/jobs/:jobId/status", (req, res) => {
    const { jobId } = req.params;
    const job = backgroundJobs[jobId];

    if (!job) {
        return res.status(404).json({ error: "Job not found." });
    }

    res.json(job);

    if(job.status === 'completed' || job.status === 'failed') {
        setTimeout(() => {
            delete backgroundJobs[jobId];
        }, 60000);
    }
});

app.post("/api/senders", async (req, res) => {
    const { clientId, secretId } = req.body;
    if (!clientId || !secretId) {
        return res.status(400).json({ error: "Client credentials are required" });
    }
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const response = await axios.get('https://api.sendpulse.com/senders', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch senders" });
    }
});

app.delete("/api/senders", async (req, res) => {
    const { clientId, secretId, email } = req.body;
    if (!clientId || !secretId || !email) {
        return res.status(400).json({ error: "Client credentials and email are required" });
    }
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const response = await axios.delete('https://api.sendpulse.com/senders', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            data: { email }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete sender" });
    }
});

app.post("/api/automations", async (req, res) => {
    const { clientId, secretId } = req.body;
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const response = await axios.get('https://api.sendpulse.com/a360/autoresponders/list', { 
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        res.json(response.data.data);
    } catch (error) {
        console.error("Failed to fetch automations:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch automations", details: error.response ? error.response.data : error.message });
    }
});

app.post("/api/automations/:id/statistics", async (req, res) => {
    const { clientId, secretId } = req.body;
    const { id } = req.params;
    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const config = { headers: { 'Authorization': `Bearer ${accessToken}` } };

        const flowDetailsResponse = await axios.get(`https://api.sendpulse.com/a360/autoresponders/${id}`, config);
        const flowData = flowDetailsResponse.data;

        const emailElements = flowData.flows.filter(f => f.af_type === 'email');
        
        const totalStats = {
            sent: 0, delivered: 0, opened: 0, clicked: 0,
            unsubscribed: 0, spam: 0, send_error: 0,
        };

        for (const emailElement of emailElements) {
            try {
                const emailStatsResponse = await axios.get(`https://api.sendpulse.com/a360/stats/email/${emailElement.id}/group-stat`, config);
                const stats = emailStatsResponse.data.data;
                totalStats.sent += stats.sent || 0;
                totalStats.delivered += stats.delivered || 0;
                totalStats.opened += stats.opened || 0;
                totalStats.clicked += stats.clicked || 0;
                totalStats.unsubscribed += stats.unsubscribed || 0;
                totalStats.spam += stats.marked_as_spam || 0;
                totalStats.send_error += stats.errors || 0;
            } catch (statError) {
                console.error(`Could not fetch stats for email element ${emailElement.id}:`, statError.message);
            }
        }

        const combinedStats = {
            started: flowData.starts,
            finished: flowData.end_count,
            in_queue: flowData.in_queue,
            ...totalStats
        };

        res.json(combinedStats);
    } catch (error) {
        console.error("Failed to fetch automation stats:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch automation statistics", details: error.response ? error.response.data : error.message });
    }
});


app.post("/api/automations/action-subscribers", async (req, res) => {
    const { clientId, secretId, automationId, filterType } = req.body;
    if (!clientId || !secretId || !automationId || !filterType) {
        return res.status(400).json({ error: "Missing required parameters." });
    }

    try {
        const accessToken = await getAccessToken(clientId, secretId);
        const config = { headers: { 'Authorization': `Bearer ${accessToken}` } };
        const flowDetailsResponse = await axios.get(`https://api.sendpulse.com/a360/autoresponders/${automationId}`, config);
        const emailElements = flowDetailsResponse.data.flows.filter(f => f.af_type === 'email');

        if (emailElements.length === 0) return res.json([]);

        let allSubscribers = [];
        for (const emailElement of emailElements) {
            try {
                let offset = 0;
                const limit = 100;
                while (true) {
                    const listResponse = await axios.get(`https://api.sendpulse.com/a360/stats/email/${emailElement.id}/addresses`, {
                        ...config,
                        params: { limit, offset }
                    });
                    const subscribers = listResponse.data.data;
                    if (!subscribers || subscribers.length === 0) break;
                    allSubscribers.push(...subscribers);
                    offset += limit;
                }
            } catch (listError) {
                if (listError.response && listError.response.status === 404) {
                    console.log(`No subscribers found for email element ${emailElement.id}, continuing...`);
                    continue;
                }
                throw listError;
            }
        }
        
        const errorStatuses = [3, 4, 5, 6, 7, 8, 10, 11, 12];
        let filteredList = [];

        switch(filterType) {
            case 'all':
                filteredList = allSubscribers;
                break;
            case 'sent_not_known':
                filteredList = allSubscribers.filter(sub => sub.delivered_status === 0);
                break;
            case 'delivered_not_read':
                filteredList = allSubscribers.filter(sub => sub.delivered_status === 1 && sub.open_date === null);
                break;
            case 'opened':
                filteredList = allSubscribers.filter(sub => sub.open_date !== null);
                break;
            case 'clicked':
                filteredList = allSubscribers.filter(sub => sub.redirect_date !== null);
                break;
            case 'unsubscribed':
                filteredList = allSubscribers.filter(sub => sub.is_unsubscribe === 1 || sub.delivered_status === 2);
                break;
            case 'spam_by_user':
                filteredList = allSubscribers.filter(sub => sub.is_spam === 1 || sub.delivered_status === 9);
                break;
            case 'errors':
                filteredList = allSubscribers.filter(sub => errorStatuses.includes(sub.delivered_status));
                break;
            default:
                filteredList = allSubscribers;
        }
        
        res.json(filteredList);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.json([]);
        }
        console.error("Failed to fetch action subscribers:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to fetch action subscribers", details: error.response ? error.response.data : error.message });
    }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});