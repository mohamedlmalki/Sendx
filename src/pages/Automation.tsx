import { useState, useEffect, useCallback } from "react";
import { Workflow, TrendingUp, CheckCircle, Mail, MousePointerClick, BarChart, Users, AlertCircle, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAccount } from "@/contexts/AccountContext";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface Automation {
    id: number;
    name: string;
    status: number;
}

interface AutomationStats {
    started: number;
    finished: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    spam: number;
    send_error: number;
}

interface ActionSubscriber {
    email: string;
    // Add other properties if you want to display them, e.g., open_date
}

const StatCard = ({ title, value, icon, rate, onClick, clickable }: { title: string; value: number; icon: React.ReactNode; rate?: number | null; onClick?: () => void; clickable?: boolean }) => {
    const cardContent = (
        <Card className={cn(clickable && "cursor-pointer hover:bg-muted/50 transition-colors")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {rate !== undefined && rate !== null && (
                     <p className="text-xs text-muted-foreground">({rate.toFixed(2)}%)</p>
                )}
            </CardContent>
        </Card>
    );

    return clickable && value > 0 ? <button onClick={onClick} className="text-left w-full">{cardContent}</button> : cardContent;
};

const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'sent_not_known', label: 'Sent, delivery status not known yet' },
    { value: 'delivered_not_read', label: 'Delivered, not read' },
    { value: 'opened', label: 'Opened' },
    { value: 'clicked', label: 'Clicked a link' },
    { value: 'unsubscribed', label: 'Unsubscribed' },
    { value: 'spam_by_user', label: 'Marked spam by user' },
    { value: 'errors', label: 'Errors' },
];

export default function Automation() {
    const { activeAccount } = useAccount();
    const [isLoading, setIsLoading] = useState(false);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
    const [stats, setStats] = useState<AutomationStats | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState<ActionSubscriber[]>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [modalFilter, setModalFilter] = useState('opened');

    const fetchAutomations = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId }),
            });
            if (!response.ok) throw new Error('Could not fetch automations');
            const data = await response.json();
            setAutomations(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch automations list.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount]);

    const fetchStats = useCallback(async (automationId: string) => {
        if (!activeAccount) return;
        setIsLoading(true);
        setStats(null);
        try {
            const response = await fetch(`/api/automations/${automationId}/statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId }),
            });
            if (!response.ok) throw new Error('Could not fetch statistics');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            toast({ title: "Error", description: "Could not fetch automation statistics.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount]);
    
    const fetchFilteredSubscribers = useCallback(async () => {
        if (!activeAccount || !selectedAutomation || !isModalOpen) return;
        
        setIsModalLoading(true);
        setModalData([]);

        try {
            const response = await fetch('/api/automations/action-subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: activeAccount.clientId,
                    secretId: activeAccount.secretId,
                    automationId: selectedAutomation,
                    filterType: modalFilter
                }),
            });
             if (!response.ok) throw new Error(`Could not fetch subscribers for filter: ${modalFilter}`);
             const data = await response.json();
             setModalData(data);
        } catch (error) {
             toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsModalLoading(false);
        }
    }, [activeAccount, selectedAutomation, isModalOpen, modalFilter]);
    
    useEffect(() => {
        fetchFilteredSubscribers();
    }, [fetchFilteredSubscribers]);


    const handleStatCardClick = (filterType: string) => {
        const filterLabel = filterOptions.find(f => f.value === filterType)?.label || 'Subscribers';
        setModalTitle(filterLabel);
        setModalFilter(filterType);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchAutomations();
        setSelectedAutomation(null);
        setStats(null);
    }, [activeAccount, fetchAutomations]);

    useEffect(() => {
        if (selectedAutomation) {
            fetchStats(selectedAutomation);
        }
    }, [selectedAutomation, fetchStats]);

    const openRate = stats && stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
    const clickRate = stats && stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Automation Statistics</h1>
          <p className="text-muted-foreground">View statistics for your A360 flows.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Select an Automation</CardTitle>
            <div className="pt-4">
                <Select onValueChange={setSelectedAutomation} disabled={!activeAccount || automations.length === 0}>
                    <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Choose an automation to view its stats..." />
                    </SelectTrigger>
                    <SelectContent>
                        {automations.map(auto => (
                            <SelectItem key={auto.id} value={auto.id.toString()}>{auto.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Loading...</p>}
            {!isLoading && stats && (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <StatCard title="Started" value={stats.started} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('all')} clickable={true}/>
                    <StatCard title="Finished" value={stats.finished} icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="Emails Sent" value={stats.sent} icon={<Mail className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('all')} clickable={true} />
                    <StatCard title="Delivered" value={stats.delivered} icon={<Users className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('delivered_not_read')} clickable={true} />
                    <StatCard title="Opened" value={stats.opened} rate={openRate} icon={<BarChart className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('opened')} clickable={true} />
                    <StatCard title="Clicked" value={stats.clicked} rate={clickRate} icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('clicked')} clickable={true} />
                    <StatCard title="Unsubscribed" value={stats.unsubscribed} icon={<UserX className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('unsubscribed')} clickable={true} />
                    <StatCard title="Spam" value={stats.spam} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('spam_by_user')} clickable={true} />
                    <StatCard title="Errors" value={stats.send_error} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} onClick={() => handleStatCardClick('errors')} clickable={true} />
                 </div>
            )}
             {!isLoading && !stats && selectedAutomation && (
                <p className="text-muted-foreground">No statistics available for this automation.</p>
             )}
             {!isLoading && !selectedAutomation && (
                <p className="text-muted-foreground">Please select an automation to see its statistics.</p>
             )}
        </CardContent>
      </Card>
        
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
             <DialogDescription>
              A list of subscribers who match the selected filter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
                <Label htmlFor="filter">Filter by status</Label>
                <Select value={modalFilter} onValueChange={setModalFilter}>
                    <SelectTrigger id="filter">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {filterOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-md p-2">
                {isModalLoading ? (
                    <p>Loading subscribers...</p>
                ) : modalData.length > 0 ? (
                    <ul className="space-y-2">
                        {modalData.map((sub, index) => (
                            <li key={`${sub.email}-${index}`} className="text-sm p-2 bg-muted/50 rounded-md">{sub.email}</li>
                        ))}
                    </ul>
                ) : (
                    <p>No subscribers found for this action.</p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}