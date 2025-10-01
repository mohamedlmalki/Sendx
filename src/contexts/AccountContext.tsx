import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

// Define the shape of a Magic.link account
interface Account {
  id: string;
  name: string;
  publishableKey: string;
  secretKey: string;
  status?: "unknown" | "checking" | "connected" | "failed";
  lastCheckResponse?: any;
}

interface AccountContextType {
  accounts: Account[];
  activeAccount: Account | null;
  setActiveAccount: (account: Account | null) => void;
  fetchAccounts: () => Promise<void>;
  addAccount: (accountData: Omit<Account, 'id' | 'status' | 'lastCheckResponse'>) => Promise<void>;
  updateAccount: (id: string, data: Omit<Account, 'id' | 'status' | 'lastCheckResponse'>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  checkAccountStatus: (account: Account) => Promise<Account>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);

  const setActiveAccount = (account: Account | null) => {
    if (account) {
        setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
    }
    setActiveAccountState(account);
  }

  const checkAccountStatus = useCallback(async (account: Account): Promise<Account> => {
    const response = await fetch('/api/accounts/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: account.secretKey }) // Send the secret key for validation
    });
    const result = await response.json();
    return { ...account, status: result.status, lastCheckResponse: result.response };
  }, []);
  
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts");
      let data: Account[] = await response.json();
      
      const accountsWithStatus = await Promise.all(data.map(acc => checkAccountStatus(acc)));
      
      setAccounts(accountsWithStatus);

      if (accountsWithStatus.length > 0) {
        const currentActiveExists = activeAccount ? accountsWithStatus.some(a => a.id === activeAccount.id) : false;
        if (!currentActiveExists) {
            setActiveAccountState(accountsWithStatus[0]);
        }
      } else {
        setActiveAccountState(null);
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  }, [activeAccount, checkAccountStatus]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const addAccount = async (accountData: Omit<Account, 'id' | 'status' | 'lastCheckResponse'>) => {
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accountData),
    });
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: Omit<Account, 'id' | 'status' | 'lastCheckResponse'>) => {
    await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchAccounts();
  };
  
  const deleteAccount = async (id: string) => {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if(activeAccount?.id === id) {
        const remainingAccounts = accounts.filter(acc => acc.id !== id);
        setActiveAccountState(remainingAccounts.length > 0 ? remainingAccounts[0] : null);
    }
    await fetchAccounts();
  };
  
  const manualCheckAccountStatus = async (account: Account) => {
    setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: 'checking' } : a));
    const updatedAccount = await checkAccountStatus(account);
    setAccounts(prev => prev.map(a => a.id === account.id ? updatedAccount : a));
    if (activeAccount?.id === account.id) {
        setActiveAccount(updatedAccount);
    }
  }
  
  return (
    <AccountContext.Provider value={{ accounts, activeAccount, setActiveAccount, fetchAccounts, addAccount, updateAccount, deleteAccount, checkAccountStatus: manualCheckAccountStatus }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};