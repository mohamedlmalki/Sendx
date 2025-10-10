import { useState, useEffect, useCallback } from "react";
import { Workflow, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";

interface Workflow {
    workflowId: string;
    name: string;
    status: string;
    subscriberStatistics: {
        completedCount: number;
        inProgressCount: number;
    }
}

const StatCard = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode; }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
};


export default function Automation() {
    const { activeAccount } = useAccount();
    const [isLoading, setIsLoading] = useState(false);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
    const [stats, setStats] = useState<Workflow['subscriberStatistics'] | null>(null);

    const fetchWorkflows = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/getresponse/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: activeAccount.apiKey }),
            });
            if (!response.ok) throw new Error('Could not fetch workflows');
            const data = await response.json();
            setWorkflows(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch workflows list.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount]);

    const fetchStats = useCallback(async (workflowId: string) => {
        if (!activeAccount) return;
        setIsLoading(true);
        setStats(null);
        try {
            const response = await fetch(`/api/getresponse/workflows/${workflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: activeAccount.apiKey }),
            });
            if (!response.ok) throw new Error('Could not fetch statistics');
            const data: Workflow = await response.json();
            setStats(data.subscriberStatistics);
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch workflow statistics.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount]);
    

    useEffect(() => {
        fetchWorkflows();
        setSelectedWorkflow(null);
        setStats(null);
    }, [activeAccount, fetchWorkflows]);

    useEffect(() => {
        if (selectedWorkflow) {
            fetchStats(selectedWorkflow);
        }
    }, [selectedWorkflow, fetchStats]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Automation Statistics</h1>
          <p className="text-muted-foreground">View statistics for your GetResponse workflows.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Select a Workflow</CardTitle>
            <div className="pt-4">
                <Select onValueChange={setSelectedWorkflow} disabled={!activeAccount || workflows.length === 0}>
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Choose a workflow to view its stats..." />
                    </SelectTrigger>
                    <SelectContent>
                        {workflows.map(flow => (
                            <SelectItem key={flow.workflowId} value={flow.workflowId}>{flow.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Loading...</p>}
            {!isLoading && stats && (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="In Progress" value={stats.inProgressCount} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Completed" value={stats.completedCount} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
                 </div>
            )}
             {!isLoading && !stats && selectedWorkflow && (
                <p className="text-muted-foreground">No statistics available for this workflow.</p>
             )}
             {!isLoading && !selectedWorkflow && (
                <p className="text-muted-foreground">Please select a workflow to see its statistics.</p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}