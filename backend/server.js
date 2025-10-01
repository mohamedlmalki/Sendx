const express = require("express");
const fs = require("fs").promises;
const cors = require("cors");
const path = require("path");
const { Magic } = require("@magic-sdk/admin");


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
  const { name, publishableKey, secretKey } = req.body;
  if (!name || !publishableKey || !secretKey) {
    return res.status(400).json({ error: "Name, Publishable Key, and Secret Key are required" });
  }
  const accounts = await readAccounts();
  const newAccount = { id: `acc_${Date.now()}`, name, publishableKey, secretKey };
  accounts.push(newAccount);
  await writeAccounts(accounts);
  res.status(201).json(newAccount);
});

// PUT (update) an existing account
app.put("/api/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const { name, publishableKey, secretKey } = req.body;
    const accounts = await readAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === id);

    if (accountIndex === -1) {
        return res.status(404).json({ error: "Account not found" });
    }

    accounts[accountIndex] = { ...accounts[accountIndex], name, publishableKey, secretKey };
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

// ... (keep all the code from the top of the file)


// ... (keep all the code from the top of the file)

// Endpoint to check connection status for Magic.link
app.post("/api/accounts/check-status", async (req, res) => {
  const { secretKey } = req.body;
  if (!secretKey) {
    return res.status(400).json({ status: 'failed', response: { message: 'Secret Key is required.' }});
  }
  try {
    const magic = new Magic(secretKey);
    
    // Make the API call and store its successful response
    const metadataResponse = await magic.users.getMetadataByIssuer("did:ethr:0x0000000000000000000000000000000000000000");

    // Now, we include the actual response in our success message.
    res.json({
      status: 'connected',
      response: {
        message: 'Connection successful. The API call succeeded.',
        originalResponse: metadataResponse // This is the raw data from Magic
      }
    });
  } catch (error) {
    // This catch block now correctly handles real errors.
    const getErrorResponse = (err) => ({
        name: err.name,
        message: err.message,
        data: err.data || "No additional data provided.", 
    });

    res.json({
      status: 'failed',
      response: getErrorResponse(error)
    });
  }
});


// ... (the rest of the file remains the same) ...


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});