import { useState, useEffect, useCallback } from "react";
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

const PAGE_SIZE = 10;

interface GetResponseList {
    campaignId: string;
    name: string;
}

interface Subscriber {
    contactId: string;
    name: string | null;
    email: string;
    origin: string;
    createdOn: string;
}

export default function UserManagement() {
  const { activeAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [lists, setLists] = useState<GetResponseList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const totalPages = Math.ceil(totalSubscribers / PAGE_SIZE);

  const fetchSubscribers = useCallback(async (listId: string, page: number) => {
    if (!activeAccount) return;
    setIsLoading(true);
    setSelectedEmails([]);
    try {
        const response = await fetch('/api/getresponse/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: activeAccount.apiKey,
                campaignId: listId,
                page: page,
                perPage: PAGE_SIZE
            })
        });
        if (!response.ok) throw new Error("Failed to fetch subscribers");
        const data = await response.json();
        setSubscribers(data.contacts || []);
        setTotalSubscribers(data.total || 0);
    } catch (error) {
        toast({ title: "Error", description: "Could not fetch subscribers.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount) {
            try {
                const response = await fetch('/api/getresponse/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey })
                });
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                setLists(data);
                setSelectedList(null);
                setSubscribers([]);
                setTotalSubscribers(0);
                setCurrentPage(1);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch lists.", variant: "destructive" });
            }
        }
    };
    fetchLists();
  }, [activeAccount]);

  useEffect(() => {
    if (selectedList) {
        fetchSubscribers(selectedList, currentPage);
    }
  }, [selectedList, currentPage, fetchSubscribers]);
  
  const handleListChange = (listId: string) => {
    setSelectedList(listId);
    setCurrentPage(1);
  };
  
  const handleBulkDelete = async () => {
    if(!activeAccount || !selectedList || selectedEmails.length === 0) return;
    try {
         const response = await fetch('/api/getresponse/contacts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: activeAccount.apiKey,
                campaignId: selectedList,
                emails: selectedEmails
            })
        });
        if (!response.ok) throw new Error("Failed to delete");
        toast({ title: "Success", description: `${selectedEmails.length} subscriber(s) have been deleted.` });
        fetchSubscribers(selectedList, currentPage);
    } catch (error) {
         toast({ title: "Error", description: "Could not delete subscribers.", variant: "destructive" });
    }
  };

  const getOriginBadge = (origin: string) => {
    switch(origin) {
        case 'import': return <Badge variant="outline">Import</Badge>;
        case 'api': return <Badge variant="default" className="bg-blue-600">API</Badge>;
        case 'form': return <Badge variant="secondary">Form</Badge>;
        default: return <Badge variant="outline">{origin}</Badge>;
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
          <p className="text-muted-foreground">View and manage subscribers in your lists.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers ({totalSubscribers} Total)</CardTitle>
          <CardDescription>Select a list to view the subscribers within it.</CardDescription>
          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <Select onValueChange={handleListChange} disabled={!activeAccount} value={selectedList ?? ""}>
                <SelectTrigger className="w-full md:w-auto md:min-w-64">
                    <SelectValue placeholder="Select a list..." />
                </SelectTrigger>
                <SelectContent>
                    {lists.map(list => (
                        <SelectItem key={list.campaignId} value={list.campaignId}>{list.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedEmails.length > 0 && (
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
          </div>
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
                            <TableHead>Origin</TableHead>
                            <TableHead>Added Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                        ) : subscribers.length > 0 ? (
                            subscribers.map(sub => (
                                <TableRow key={sub.contactId}>
                                    <TableCell>
                                        <Checkbox 
                                            onCheckedChange={(checked) => toggleSelectOne(sub.email, !!checked)}
                                            checked={selectedEmails.includes(sub.email)}
                                            aria-label={`Select row for ${sub.email}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{sub.email}</TableCell>
                                    <TableCell>{sub.name || '-'}</TableCell>
                                    <TableCell>{getOriginBadge(sub.origin)}</TableCell>
                                    <TableCell>{new Date(sub.createdOn).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="text-center">No subscribers found in this list.</TableCell></TableRow>
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
                    disabled={currentPage >= totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}