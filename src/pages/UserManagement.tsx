import { useState, useEffect, useCallback, useRef } from "react";
import { Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

const PAGE_SIZE = 10;

interface SendPulseAddressBook {
    id: string;
    name: string;
}

interface Subscriber {
    email: string;
    status: number;
    variables: {
        FirstName?: string;
        LastName?: string;
        [key: string]: any;
    } | null;
    added_date: string;
}

interface DeletionJob {
    status: 'started' | 'fetching' | 'deleting' | 'completed' | 'failed';
    progress: number;
    message: string;
}

export default function UserManagement() {
  const { activeAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [addressBooks, setAddressBooks] = useState<SendPulseAddressBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  const [deletionJob, setDeletionJob] = useState<DeletionJob | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);


  const totalPages = Math.ceil(totalSubscribers / PAGE_SIZE);

  const fetchSubscribers = useCallback(async (bookId: string, page: number) => {
    if (!activeAccount) return;
    setIsLoading(true);
    setSelectedEmails([]);
    try {
        const offset = (page - 1) * PAGE_SIZE;
        const response = await fetch('/api/subscribers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: activeAccount.clientId,
                secretId: activeAccount.secretId,
                addressBookId: bookId,
                limit: PAGE_SIZE,
                offset: offset
            })
        });
        if (!response.ok) throw new Error("Failed to fetch subscribers");
        const data = await response.json();
        setSubscribers(data.emails || []);
        setTotalSubscribers(data.total || 0);
    } catch (error) {
        toast({ title: "Error", description: "Could not fetch subscribers.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    return () => { // Cleanup polling on component unmount
        if(pollingRef.current) clearInterval(pollingRef.current);
    }
  }, []);

  useEffect(() => {
    const fetchAddressBooks = async () => {
        if (activeAccount) {
            try {
                const response = await fetch('/api/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId })
                });
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                setAddressBooks(data);
                setSelectedBook(null);
                setSubscribers([]);
                setTotalSubscribers(0);
                setCurrentPage(1);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch address books.", variant: "destructive" });
            }
        }
    };
    fetchAddressBooks();
  }, [activeAccount]);

  useEffect(() => {
    if (selectedBook) {
        fetchSubscribers(selectedBook, currentPage);
    }
  }, [selectedBook, currentPage, fetchSubscribers]);
  
  const handleBookChange = (bookId: string) => {
    setSelectedBook(bookId);
    setCurrentPage(1);
  };
  
  const handleBulkDelete = async () => {
    if(!activeAccount || !selectedBook || selectedEmails.length === 0) return;
    try {
         const response = await fetch('/api/subscribers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: activeAccount.clientId,
                secretId: activeAccount.secretId,
                addressBookId: selectedBook,
                emails: selectedEmails
            })
        });
        if (!response.ok) throw new Error("Failed to delete");
        toast({ title: "Success", description: `${selectedEmails.length} subscriber(s) have been deleted.` });
        fetchSubscribers(selectedBook, currentPage);
    } catch (error) {
         toast({ title: "Error", description: "Could not delete subscribers.", variant: "destructive" });
    }
  };
  
  const startPollingJobStatus = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
        const response = await fetch(`/api/jobs/${jobId}/status`);
        if(response.ok) {
            const jobStatus: DeletionJob = await response.json();
            setDeletionJob(jobStatus);

            if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                toast({
                    title: `Job ${jobStatus.status}`,
                    description: jobStatus.message,
                    variant: jobStatus.status === 'failed' ? 'destructive' : undefined,
                });
                // Refresh data
                if(selectedBook) fetchSubscribers(selectedBook, 1);
                setTimeout(() => setDeletionJob(null), 5000); // Hide progress bar after 5s
            }
        } else {
             if (pollingRef.current) clearInterval(pollingRef.current);
             setDeletionJob(null);
        }
    }, 2000); // Poll every 2 seconds
  }

  const handleDeleteAll = async () => {
    if(!activeAccount || !selectedBook) return;
    try {
        const response = await fetch(`/api/addressbooks/${selectedBook}/all-subscribers`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: activeAccount.clientId,
                secretId: activeAccount.secretId
            })
        });
        if (!response.ok) throw new Error("Failed to start deletion job.");
        
        const { jobId } = await response.json();
        setDeletionJob({ status: 'started', progress: 0, message: 'Job initialized...'});
        startPollingJobStatus(jobId);

    } catch(error) {
        toast({ title: "Error", description: "Could not start the 'delete all' job.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: number) => {
    switch(status) {
        case 0: return <Badge variant="outline">New</Badge>;
        case 1: return <Badge variant="default" className="bg-green-600">Active</Badge>;
        case 2: return <Badge variant="secondary">Unsubscribed</Badge>;
        default: return <Badge variant="destructive">Other</Badge>;
    }
  };
  
  const toggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
        setSelectedEmails(subscribers.map(s => s.email));
    } else {
        setSelectedEmails([]);
    }
  };
  
  const toggleSelectOne = (email: string, checked: boolean) => {
    if (checked) {
        setSelectedEmails(prev => [...prev, email]);
    } else {
        setSelectedEmails(prev => prev.filter(e => e !== email));
    }
  };

  const isAllSelected = selectedEmails.length === subscribers.length && subscribers.length > 0;
  const isSomeSelected = selectedEmails.length > 0 && selectedEmails.length < subscribers.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground">View and manage subscribers in your address books.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers ({totalSubscribers} Total)</CardTitle>
          <CardDescription>Select an address book to view the subscribers within it.</CardDescription>
          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <Select onValueChange={handleBookChange} disabled={!activeAccount || !!deletionJob} value={selectedBook ?? ""}>
                <SelectTrigger className="w-full md:w-auto md:min-w-64">
                    <SelectValue placeholder="Select an address book..." />
                </SelectTrigger>
                <SelectContent>
                    {addressBooks.map(book => (
                        <SelectItem key={book.id} value={book.id.toString()}>{book.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedEmails.length > 0 && !deletionJob && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete Selected ({selectedEmails.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{selectedEmails.length} subscriber(s)</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
            )}
             {selectedBook && totalSubscribers > 0 && !deletionJob && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                           <Trash2 className="h-4 w-4 mr-2" />
                           Delete All ({totalSubscribers})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>DANGER: Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will start a background job to permanently delete **ALL {totalSubscribers} subscribers** from this address book. This action cannot be undone and may take several minutes to complete.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                          Yes, Delete All Subscribers
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
            )}
          </div>
          {deletionJob && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-semibold text-center mb-2">{deletionJob.message}</p>
                <Progress value={deletionJob.progress} />
            </div>
          )}
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox 
                                    onCheckedChange={toggleSelectAll}
                                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                    aria-label="Select all rows on this page"
                                />
                            </TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                        ) : subscribers.length > 0 ? (
                            subscribers.map(sub => (
                                <TableRow key={sub.email}>
                                    <TableCell>
                                        <Checkbox 
                                            onCheckedChange={(checked) => toggleSelectOne(sub.email, !!checked)}
                                            checked={selectedEmails.includes(sub.email)}
                                            aria-label={`Select row for ${sub.email}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{sub.email}</TableCell>
                                    <TableCell>{`${sub.variables?.FirstName || ''} ${sub.variables?.LastName || ''}`.trim()}</TableCell>
                                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                                    <TableCell>{new Date(sub.added_date).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="text-center">No subscribers found in this address book.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}