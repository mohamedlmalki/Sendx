import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAccount } from './AccountContext';
import { toast } from "@/components/ui/use-toast";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Interfaces ---
interface Job {
    id: string;
    accountId: string;
    listId: string;
    listName: string;
    status: 'running' | 'paused' | 'completed' | 'cancelled';
    progress: number;
    results: ImportResult[];
    totalContacts: number;
    elapsedTime: number;
    delay: number;
}

interface ImportResult {
    index: number;
    email: string;
    status: 'success' | 'failed';
    data: string;
}

interface JobContextType {
    jobs: Record<string, Job>;
    startJob: (accountId: string, listId: string, listName: string, importData: string, delay: number) => void;
    pauseJob: (jobId: string) => void;
    resumeJob: (jobId: string) => void;
    cancelJob: (jobId: string) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

// --- Provider Component ---
export const JobProvider = ({ children }: { children: ReactNode }) => {
    const { accounts } = useAccount();
    const [jobs, setJobs] = useState<Record<string, Job>>({});

    // Refs to control the loops from outside
    const jobControlRefs = useRef<Record<string, { isPaused: boolean; isCancelled: boolean }>>({});
    
    // Timer management
    useEffect(() => {
        const timer = setInterval(() => {
            setJobs(prevJobs => {
                const newJobs = { ...prevJobs };
                let hasChanged = false;
                for (const jobId in newJobs) {
                    if (newJobs[jobId].status === 'running') {
                        newJobs[jobId] = { ...newJobs[jobId], elapsedTime: newJobs[jobId].elapsedTime + 1 };
                        hasChanged = true;
                    }
                }
                return hasChanged ? newJobs : prevJobs;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    const startJob = useCallback(async (accountId: string, listId: string, listName: string, importData: string, delay: number) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (!account) {
            toast({ title: "Account not found", variant: "destructive" });
            return;
        }

        const contacts = importData.split('\n').filter(line => line.trim() !== '').map(line => {
            const parts = line.split(',');
            return {
                email: parts[0]?.trim(),
                firstName: parts[1]?.trim() || '',
                lastName: parts[2]?.trim() || ''
            };
        });

        if (contacts.length === 0) {
            toast({ title: "No contacts to import", variant: "destructive" });
            return;
        }

        const jobId = uuidv4();
        jobControlRefs.current[jobId] = { isPaused: false, isCancelled: false };

        const newJob: Job = {
            id: jobId,
            accountId,
            listId,
            listName,
            status: 'running',
            progress: 0,
            results: [],
            totalContacts: contacts.length,
            elapsedTime: 0,
            delay,
        };

        setJobs(prev => ({ ...prev, [jobId]: newJob }));

        // --- The actual import loop ---
        for (let i = 0; i < contacts.length; i++) {
            const controls = jobControlRefs.current[jobId];
            if (controls.isCancelled) {
                setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'cancelled' } }));
                toast({ title: `Job for ${listName} cancelled` });
                break;
            }
            while (controls.isPaused) {
                await sleep(500);
            }
             if (controls.isCancelled) {
                setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'cancelled' } }));
                toast({ title: `Job for ${listName} cancelled` });
                break;
            }

            const contact = contacts[i];
            if (i > 0) {
                await sleep(delay * 1000);
            }

            try {
                const response = await fetch('/api/getresponse/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiKey: account.apiKey,
                        contact: contact,
                        campaignId: listId,
                        customFields: []
                    })
                });
                const data = await response.json();
                if (response.status !== 202) throw data;

                setJobs(prev => {
                    const currentJob = prev[jobId];
                    const newResult: ImportResult = { index: i + 1, email: contact.email, status: 'success', data: JSON.stringify(data) };
                    return {
                        ...prev,
                        [jobId]: { ...currentJob, results: [newResult, ...currentJob.results], progress: ((i + 1) / currentJob.totalContacts) * 100 }
                    };
                });

            } catch (error) {
                setJobs(prev => {
                    const currentJob = prev[jobId];
                    const newResult: ImportResult = { index: i + 1, email: contact.email, status: 'failed', data: JSON.stringify(error) };
                    return {
                        ...prev,
                        [jobId]: { ...currentJob, results: [newResult, ...currentJob.results], progress: ((i + 1) / currentJob.totalContacts) * 100 }
                    };
                });
            }
        }
        
        // --- Finalize Job ---
        if (!jobControlRefs.current[jobId]?.isCancelled) {
             setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'completed', progress: 100 } }));
        }

    }, [accounts]);

    const pauseJob = (jobId: string) => {
        jobControlRefs.current[jobId].isPaused = true;
        setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'paused' } }));
    };

    const resumeJob = (jobId: string) => {
        jobControlRefs.current[jobId].isPaused = false;
        setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], status: 'running' } }));
    };

    const cancelJob = (jobId: string) => {
        jobControlRefs.current[jobId].isCancelled = true;
    };

    return (
        <JobContext.Provider value={{ jobs, startJob, pauseJob, resumeJob, cancelJob }}>
            {children}
        </JobContext.Provider>
    );
};

// --- Hook ---
export const useJobs = () => {
    const context = useContext(JobContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
};