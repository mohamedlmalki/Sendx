import { useState, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";

export default function SingleUserImport() {
  const { activeAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    sendInvitation: true,
    applicationId: "", 
  });

  const [serverResponse, setServerResponse] = useState("");

  // This effect will run whenever the active account changes
  useEffect(() => {
    if (activeAccount) {
      setFormData(prev => ({ ...prev, applicationId: activeAccount.applicationId || "" }));
    }
  }, [activeAccount]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) {
      toast({ title: "No Active Account", description: "Please select an account from the sidebar.", variant: "destructive" });
      return;
    }
     if (!formData.applicationId) {
      toast({ title: "Application ID Required", description: "The active account must have an Application ID set.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setServerResponse("Importing user...");

    try {
        const response = await fetch("/api/users/import-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                account: activeAccount,
                userData: formData,
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
           throw data;
        }

        setServerResponse(JSON.stringify(data, null, 2));
        toast({ title: "Success", description: `User ${formData.email} imported successfully.`});
        // Clear form fields after successful import, but keep applicationId
        setFormData(prev => ({...prev, firstName: "", lastName: "", email: ""}));

    } catch (error: any) {
        setServerResponse(JSON.stringify(error, null, 2));
        toast({ title: "Import Failed", description: "Could not import the user. See server response for details.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Single User Import</h1>
          <p className="text-muted-foreground">Create a new user and register them to an application.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
                The Application ID is automatically populated from your active account settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="applicationId">Application ID</Label>
                <Input
                    id="applicationId"
                    value={formData.applicationId}
                    readOnly // Make the field read-only
                    className="bg-muted/50" // Add a slightly different background to indicate it's read-only
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter last name"
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
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="sendInvitation"
                  checked={formData.sendInvitation}
                  onCheckedChange={(checked) => handleInputChange("sendInvitation", checked as boolean)}
                />
                <Label htmlFor="sendInvitation">Send a "Set up password" email to the user</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !activeAccount}>
                {isLoading ? "Importing..." : "Import User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Server Response */}
        <Card>
          <CardHeader>
            <CardTitle>Server Response</CardTitle>
            <CardDescription>The raw JSON response from the FusionAuth API will appear here.</CardDescription>
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