import { useState, useEffect, useRef } from "react";
import { Upload, Play, RefreshCw, FileJson2, Pause, Play as PlayIcon, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SendPulseAddressBook {
    id: string;
    name: string;
}

interface ImportResult {
    index: number;
    email: string;
    status: 'success' | 'failed';
    data: string; // The raw JSON string from the API
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function BulkImport() {
  const { activeAccount } = useAccount();
  const [addressBooks, setAddressBooks] = useState<SendPulseAddressBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [delay, setDelay] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Derived state for the stats panel
  const successCount = importResults.filter(r => r.status === 'success').length;
  const failedCount = importResults.filter(r => r.status === 'failed').length;
  const totalProcessed = importResults.length;
  const totalContacts = importData.split('\n').filter(line => line.trim() !== '').length;
  const remainingCount = totalContacts - totalProcessed;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
  };
  
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePause = () => {
    setIsPaused(true);
    stopTimer();
  };

  const handleResume = () => {
    setIsPaused(false);
    startTimer();
  };
  
  const handleEndJob = () => {
    isCancelledRef.current = true;
    setIsPaused(false); // Ensure the loop doesn't stay paused
  };

  useEffect(() => {
    return () => stopTimer(); // Cleanup timer on component unmount
  }, []);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.clientId) {
            try {
                const response = await fetch('/api/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId })
                });
                const data = await response.json();
                setAddressBooks(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch SendPulse address books.", variant: "destructive" });
            }
        }
    };
    fetchLists();
  }, [activeAccount]);

  const handleStartImport = async () => {
    if (!selectedBook) {
        toast({ title: "No address book selected", variant: "destructive" });
        return;
    }
    const contacts = importData.split('\n').filter(line => line.trim() !== '').map(line => ({ email: line.trim() }));
    if (contacts.length === 0) {
        toast({ title: "No contacts to import", variant: "destructive" });
        return;
    }

    isCancelledRef.current = false;
    setIsImporting(true);
    setIsPaused(false);
    setProgress(0);
    setImportResults([]);
    setElapsedTime(0);
    startTimer();
    
    const totalContactsToProcess = contacts.length;

    // Loop forwards from the first contact to the last
    for (let i = 0; i < totalContactsToProcess; i++) {
        if(isCancelledRef.current) {
            toast({ title: "Import Cancelled", description: "The import process was stopped." });
            break;
        }

        while (isPausedRef.current) {
            if(isCancelledRef.current) break;
            await sleep(500);
        }
        if(isCancelledRef.current) break;

        const contact = contacts[i];
        
        // Don't delay before the very first request
        if (i > 0) {
          await sleep(delay * 1000);
        }

        try {
            const response = await fetch('/api/contacts/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: activeAccount?.clientId,
                    secretId: activeAccount?.secretId,
                    contacts: [contact],
                    addressBookId: selectedBook
                })
            });
            const data = await response.json();

            const newResult: ImportResult = {
                index: i + 1, // Number based on original order (1, 2, 3...)
                email: contact.email,
                status: data.success.length > 0 ? 'success' : 'failed',
                data: data.success.length > 0 ? JSON.stringify(data.success[0].data) : JSON.stringify(data.failed[0].error),
            };
            // CORRECTED: Prepend the new result to the array to show it at the top of the table
            setImportResults(prev => [newResult, ...prev]);
            
        } catch (error) {
             const newResult: ImportResult = {
                index: i + 1,
                email: contact.email,
                status: 'failed',
                data: JSON.stringify({ error: "An unexpected client-side error occurred." }),
            };
            setImportResults(prev => [newResult, ...prev]);
        }
        
        setProgress(((i + 1) / totalContactsToProcess) * 100);
    }
    
    stopTimer();
    setIsImporting(false);
    setIsPaused(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Bulk User Import</h1>
          <p className="text-muted-foreground">Import existing users into SendPulse</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="list">Select Address Book</Label>
                    <Select onValueChange={setSelectedBook} disabled={!activeAccount || isImporting}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an address book" />
                        </SelectTrigger>
                        <SelectContent>
                            {addressBooks.map(book => (
                                <SelectItem key={book.id} value={book.id.toString()}>{book.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="delay">Delay (seconds)</Label>
                    <Input id="delay" type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} min="0" disabled={isImporting} />
                </div>
            </div>
            
            {(isImporting || importResults.length > 0) && (
                <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 border rounded-lg bg-muted/50">
                        <div>
                            <p className="text-xs text-muted-foreground">Time Elapse</p>
                            <p className="text-lg font-bold font-mono">{formatTime(elapsedTime)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Success</p>
                            <p className="text-lg font-bold text-green-600">{successCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Fail</p>
                            <p className="text-lg font-bold text-red-600">{failedCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Remain</p>
                            <p className="text-lg font-bold">{remainingCount}</p>
                        </div>
                    </div>
                    <div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-muted-foreground mt-2 text-center">{progress.toFixed(0)}% Complete</p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        {/* User Data Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              User Data Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Label htmlFor="emails">Paste data manually:</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses, one per line"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                readOnly={isImporting}
              />
            </div>

            <div className="flex gap-2">
              {!isImporting && (
                <Button 
                    onClick={handleStartImport} 
                    className="flex-1"
                    disabled={!activeAccount || !selectedBook}
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start Import
                </Button>
              )}
              {isImporting && !isPaused && (
                  <Button variant="outline" onClick={handlePause} className="flex-1">
                      <Pause className="w-4 h-4 mr-2"/> Pause
                  </Button>
              )}
              {isImporting && isPaused && (
                  <Button variant="outline" onClick={handleResume} className="flex-1">
                      <PlayIcon className="w-4 h-4 mr-2"/> Resume
                  </Button>
              )}
              {isImporting && (
                  <Button variant="destructive" onClick={handleEndJob} className="flex-1">
                      <XCircle className="w-4 h-4 mr-2"/> End Job
                  </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
        {importResults.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Import Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResults.map((result) => (
                          <TableRow key={result.index}>
                            <TableCell className="font-medium">{result.index}</TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell>
                               <Badge className={cn(result.status === 'success' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                                {result.status}
                               </Badge>
                            </TableCell>
                            <TableCell>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <FileJson2 className="h-4 w-4" />
                                            <span className="sr-only">View Details</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Import Details for {result.email}</DialogTitle>
                                        </DialogHeader>
                                        <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
                                            <code className="text-white">
                                                {JSON.stringify(JSON.parse(result.data), null, 2)}
                                            </code>
                                        </pre>
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}