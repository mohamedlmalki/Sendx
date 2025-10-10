import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GetResponseList {
    campaignId: string;
    name: string;
}

export default function SingleUserImport() {
  const { activeAccount } = useAccount();
  const [isImporting, setIsImporting] = useState(false);
  const [lists, setLists] = useState<GetResponseList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [serverResponse, setServerResponse] = useState("");

  useEffect(() => {
    const fetchLists = async () => {
        if (activeAccount && activeAccount.apiKey) {
            try {
                const response = await fetch('/api/getresponse/campaigns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: activeAccount.apiKey })
                });
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                setLists(data);
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch GetResponse lists.", variant: "destructive" });
                setLists([]);
            }
        } else {
            setLists([]);
        }
    };
    fetchLists();
  }, [activeAccount]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) {
      toast({ title: "No Active Account", description: "Please select an account first.", variant: "destructive" });
      return;
    }
     if (!selectedList) {
      toast({ title: "No List Selected", description: "Please select a list to add the user to.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    setServerResponse("Importing user...");

    const contactPayload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName
    };

    try {
        const response = await fetch("/api/getresponse/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                apiKey: activeAccount.apiKey,
                contact: contactPayload,
                campaignId: selectedList,
                customFields: [] // No custom fields for single import
            })
        });
        
        const data = await response.json();
        
        if (response.status !== 202) { // GetResponse returns 202 Accepted on success
           throw data;
        }

        setServerResponse(JSON.stringify(data, null, 2));
        toast({ title: "Success", description: `User ${formData.email} has been queued for import.`});
        setFormData({ firstName: "", lastName: "", email: ""});

    } catch (error: any) {
        setServerResponse(JSON.stringify(error, null, 2));
        toast({ title: "Import Failed", description: "Could not import the user. See server response for details.", variant: "destructive" });
    } finally {
        setIsImporting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Single User Import</h1>
          <p className="text-muted-foreground">Add a new contact to a GetResponse list.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
            <CardDescription>
                Fill in the details for the new contact you want to add.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="list">List</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                    disabled={isImporting}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter last name"
                    disabled={isImporting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={isImporting}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isImporting || !activeAccount}>
                {isImporting ? "Importing..." : "Import User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Response</CardTitle>
            <CardDescription>The raw JSON response from the GetResponse API will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-4 min-h-[300px]">
              <Textarea
                value={serverResponse}
                readOnly
                placeholder="Server response will appear here..."
                className="w-full h-full min-h-[300px] bg-transparent border-none resize-none font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}