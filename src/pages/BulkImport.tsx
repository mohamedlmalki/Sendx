import { useState } from "react";
import { Upload, Play, X, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function BulkImport() {
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState({
    total: 11,
    success: 11,
    failed: 0,
    timeElapsed: "00:12"
  });

  const sampleEmails = `med217623@gmail.com
mohamelamalik1@yahoo.com
yassintarlaysin@outlook.com
yassp123400@outlook.com
abdullaha1ha125@outlook.com
korhonenbivirtanen@outlook.com
kariemckinley@outlook.com
colettesenger19254@outlook.com
speziloouditori@outlook.com
gertafox144@outlook.com`;

  const handleStartImport = () => {
    setIsImporting(true);
    // Simulate import process
    setTimeout(() => {
      setIsImporting(false);
    }, 3000);
  };

  const successResults = [
    { id: "11", email: "sergiegonzat45@outlook.com", status: "Invitation sent", inviteId: "inv_32H40uaI121980125Q5EYLDCr" },
    { id: "10", email: "posterfr144@outlook.com", status: "Invitation sent", inviteId: "inv_32H401x09qcdc6bl3EZH5I900M5" },
    { id: "9", email: "speziloouditori@outlook.com", status: "Invitation sent", inviteId: "inv_32H6Mne53ZEuM0uTnTsBzFy" },
    { id: "8", email: "colettesenger19254@outlook.com", status: "Invitation sent", inviteId: "inv_32H6M01ubh6Pagedr4m2G40a0" },
    { id: "7", email: "kariemckinley@outlook.com", status: "Invitation sent", inviteId: "inv_32H6M4c7AcLcH2f4oC7a4CaQ0" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Bulk User Import</h1>
          <p className="text-muted-foreground">Import existing users into 2</p>
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
              <Label htmlFor="delay">Delay (seconds)</Label>
              <Input id="delay" type="number" defaultValue="1" className="w-20" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Time Elapsed</div>
                <div className="text-lg font-mono font-semibold">{importResults.timeElapsed}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Success</div>
                <div className="text-lg font-semibold text-success">{importResults.success}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-lg font-semibold text-destructive">{importResults.failed}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Data Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              User Data Input
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Emails: 18</span>
                <Button variant="ghost" size="sm" onClick={() => setImportData("")}>
                  <X className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV File
                <input type="file" className="hidden" accept=".csv" />
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Format: email,firstName,lastName,password (one per line)
              </p>
            </div>

            <div className="relative">
              <Label htmlFor="emails">Or paste data manually:</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses, one per line"
                value={importData || sampleEmails}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleStartImport} 
                className="flex-1"
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                )}
              </Button>
              <Button variant="destructive">
                <X className="w-4 h-4 mr-2" />
                End Job
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Password generation is disabled when "Send invitation emails" is checked.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Import Results
            <Button variant="outline" size="sm">
              Export Filtered
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Importing users...</span>
              <span className="text-sm font-medium">61%</span>
            </div>
            <Progress value={61} className="h-2" />
          </div>

          <div className="flex gap-4 mb-4">
            <Button variant="outline" size="sm" className="text-primary">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              All (11)
            </Button>
            <Button variant="ghost" size="sm" className="text-success">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              Success (11)
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <div className="w-2 h-2 bg-muted rounded-full mr-2"></div>
              Failed (0)
            </Button>
          </div>

          <div className="space-y-3">
            {successResults.map((result) => (
              <div key={result.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-6 h-6 bg-success text-success-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="font-medium">{result.id}. {result.email}</div>
                  <div className="text-sm text-success">{result.status}</div>
                  <div className="text-xs text-muted-foreground font-mono">ID: {result.inviteId}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}