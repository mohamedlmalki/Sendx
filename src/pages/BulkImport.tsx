import { useState, useEffect } from "react";
import { Upload, Play, X, RefreshCw } from "lucide-react";
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

interface SendXList {
    id: string;
    name: string;
}

export default function BulkImport() {
  const { activeAccount } = useAccount();
  const [lists, setLists] = useState<SendXList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: any[], failed: any[]}>({ success: [], failed: [] });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.apiKey) {
            try {
                const response = await fetch('/api/lists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey })
                });
                const data = await response.json();
                setLists(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch SendX lists.", variant: "destructive" });
            }
        }
    };
    fetchLists();
  }, [activeAccount]);

  const handleStartImport = async () => {
    if (!selectedList) {
        toast({ title: "No list selected", description: "Please select a list to import contacts into.", variant: "destructive" });
        return;
    }
    const contacts = importData.split('\n').filter(line => line.trim() !== '').map(line => ({ email: line.trim() }));
    if (contacts.length === 0) {
        toast({ title: "No contacts to import", description: "Please enter at least one email address.", variant: "destructive" });
        return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResults({ success: [], failed: [] });

    try {
        const response = await fetch('/api/contacts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: activeAccount?.apiKey,
                contacts,
                listId: selectedList
            })
        });
        const data = await response.json();
        setImportResults(data);
        setProgress(100);
    } catch (error) {
        toast({ title: "Import Failed", description: "An unexpected error occurred during the import.", variant: "destructive" });
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Bulk User Import</h1>
          <p className="text-muted-foreground">Import existing users into SendX</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Import Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <Label htmlFor="list">Select List</Label>
                <Select onValueChange={setSelectedList} disabled={!activeAccount}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a list to import contacts to" />
                    </SelectTrigger>
                    <SelectContent>
                        {lists.map(list => (
                            <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isImporting && (
                <div className="pt-4">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">{progress.toFixed(0)}% Complete</p>
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
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleStartImport} 
                className="flex-1"
                disabled={isImporting || !activeAccount || !selectedList}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
        {(importResults.success.length > 0 || importResults.failed.length > 0) && (
            <Card>
                <CardHeader>
                    <CardTitle>Import Results</CardTitle>
                    <CardDescription>
                        {importResults.success.length} successful imports, {importResults.failed.length} failed imports.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {importResults.success.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-green-600">Success</h3>
                            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                {importResults.success.map((result, index) => (
                                    <div key={index} className="text-xs p-2 bg-green-50 rounded-md">
                                        <p><strong>Email:</strong> {result.email}</p>
                                        <p><strong>ID:</strong> {result.data.id}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                     {importResults.failed.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-red-600">Failed</h3>
                             <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                                {importResults.failed.map((result, index) => (
                                    <div key={index} className="text-xs p-2 bg-red-50 rounded-md">
                                        <p><strong>Email:</strong> {result.email}</p>
                                        <p><strong>Error:</strong> {JSON.stringify(result.error)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
    </div>
  );
}