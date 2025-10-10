import { useState, useEffect } from "react";
import { Upload, Play, FileJson2, Pause, Play as PlayIcon, XCircle } from "lucide-react";
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
import { useJobs } from "@/contexts/JobContext"; // Import the new hook

// --- Interfaces ---
interface GetResponseList {
    campaignId: string;
    name: string;
}

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export default function BulkImport() {
  const { activeAccount } = useAccount();
  const { jobs, startJob, pauseJob, resumeJob, cancelJob } = useJobs();
  
  // Find the active job for the current account
  const activeJob = Object.values(jobs).find(job => job.accountId === activeAccount?.id);

  // Local state is now only for inputs
  const [lists, setLists] = useState<GetResponseList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [importData, setImportData] = useState("");
  const [delay, setDelay] = useState(1);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.apiKey) {
            try {
                const response = await fetch('/api/getresponse/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey })
                });
                const data = await response.json();
                setLists(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch GetResponse lists.", variant: "destructive" });
            }
        }
    };
    fetchLists();
  }, [activeAccount]);

  const handleStartImport = () => {
    if (!activeAccount || !selectedList) return;
    const selectedListName = lists.find(l => l.campaignId === selectedList)?.name || 'Unknown List';
    startJob(activeAccount.id, selectedList, selectedListName, importData, delay);
  };
  
  // Derived state from the active job
  const isImporting = activeJob && (activeJob.status === 'running' || activeJob.status === 'paused');
  const successCount = activeJob?.results.filter(r => r.status === 'success').length || 0;
  const failedCount = activeJob?.results.filter(r => r.status === 'failed').length || 0;
  const remainingCount = activeJob ? activeJob.totalContacts - (successCount + failedCount) : 0;


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Bulk User Import</h1>
          <p className="text-muted-foreground">Import users into GetResponse. You can run multiple jobs across accounts.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="list">Select List</Label>
                    <Select onValueChange={setSelectedList} disabled={!activeAccount || isImporting}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a list" />
                        </SelectTrigger>
                        <SelectContent>
                            {lists.map(list => (
                                <SelectItem key={list.campaignId} value={list.campaignId}>{list.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="delay">Delay (seconds)</Label>
                    <Input id="delay" type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} min="0" disabled={isImporting} />
                </div>
            </div>
            
            {activeJob && (
                <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 border rounded-lg bg-muted/50">
                        <div>
                            <p className="text-xs text-muted-foreground">Time Elapse</p>
                            <p className="text-lg font-bold font-mono">{formatTime(activeJob.elapsedTime)}</p>
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
                        <Progress value={activeJob.progress} className="h-2" />
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                            Job for "{activeJob.listName}" is {activeJob.status}. ({activeJob.progress.toFixed(0)}%)
                        </p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              User Data Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Label htmlFor="emails">Paste data manually (email,firstname,lastname):</Label>
              <Textarea
                id="emails"
                placeholder="test@example.com,John,Doe&#x0a;another@example.com,Jane,Smith"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                readOnly={!!isImporting}
              />
            </div>

            <div className="flex gap-2">
              {!isImporting && (
                <Button 
                    onClick={handleStartImport} 
                    className="flex-1"
                    disabled={!activeAccount || !selectedList || !!activeJob}
                >
                    <Play className="w-4 h-4 mr-2" />
                    Start Import
                </Button>
              )}
              {isImporting && activeJob?.status === 'running' && (
                  <Button variant="outline" onClick={() => pauseJob(activeJob.id)} className="flex-1">
                      <Pause className="w-4 h-4 mr-2"/> Pause
                  </Button>
              )}
              {isImporting && activeJob?.status === 'paused' && (
                  <Button variant="outline" onClick={() => resumeJob(activeJob.id)} className="flex-1">
                      <PlayIcon className="w-4 h-4 mr-2"/> Resume
                  </Button>
              )}
              {isImporting && (
                  <Button variant="destructive" onClick={() => cancelJob(activeJob.id)} className="flex-1">
                      <XCircle className="w-4 h-4 mr-2"/> End Job
                  </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {activeJob && activeJob.results.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Import Results for "{activeJob.listName}"</CardTitle>
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
                        {activeJob.results.map((result) => (
                          <TableRow key={result.index}>
                            <TableCell className="font-medium">{result.index}</TableCell>
                            <TableCell>{result.email}</TableCell>
                            <TableCell>
                               <Badge className={cn(result.status === 'success' ? 'bg-green-600' : 'bg-destructive', 'text-white')}>
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