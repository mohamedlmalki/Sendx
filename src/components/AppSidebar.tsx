import { useState, useEffect } from "react";
import { Upload, UserPlus, Users, Workflow, Plus, Trash2, Pencil, Check, RefreshCw } from "lucide-react"; // UPDATED: Changed Mail to Workflow
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar as useSidebarUI,
} from "@/components/ui/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { AddAccountDialog } from "./AddAccountDialog";
import { EditAccountDialog } from "./EditAccountDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";

// UPDATED: Changed Email Templates to Automation
const navigationItems = [
  { title: "Bulk Import", url: "/", icon: Upload },
  { title: "Single User Import", url: "/single-import", icon: UserPlus },
  { title: "User Management", url: "/users", icon: Users },
  { title: "Automation", url: "/automation", icon: Workflow },
];

interface Account {
  id: string;
  name: string;
  clientId: string;
  secretId: string;
  status?: "unknown" | "checking" | "connected" | "failed";
  lastCheckResponse?: any;
}

interface Sender {
    name: string;
    email: string;
    status: string;
    created_at: string;
}

const StatusIndicator = ({ account }: { account: Account }) => {
    const { checkAccountStatus } = useAccount();
    const { status, lastCheckResponse } = account;

    const statusConfig = {
      connected: { color: "bg-green-500", text: "Connected" },
      failed: { color: "bg-red-500", text: "Failed" },
      checking: { color: "bg-yellow-500 animate-pulse", text: "Checking..." },
      unknown: { color: "bg-gray-400", text: "Unknown" },
    };
    const config = statusConfig[status || 'unknown'];

    return (
        <div className="flex items-center justify-between mt-2">
            <Dialog>
                <DialogTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer text-xs p-2 hover:bg-muted rounded-md flex-1">
                        <div className={cn("h-2 w-2 rounded-full", config.color)}></div>
                        <span>{config.text}</span>
                    </div>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Connection Status: {account.name}</DialogTitle>
                        <DialogDescription>
                            This is the last raw response received from the SendPulse server when checking credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
                        <code className="text-white">{JSON.stringify(lastCheckResponse, null, 2) || 'No response data available.'}</code>
                    </pre>
                </DialogContent>
            </Dialog>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => checkAccountStatus(account)}
                disabled={status === 'checking'}
                aria-label="Refresh connection status"
            >
                <RefreshCw className={cn("h-4 w-4", status === 'checking' && "animate-spin")} />
            </Button>
        </div>
    );
  };

export function AppSidebar() {
  const { state } = useSidebarUI(); 
  const { 
    accounts, 
    activeAccount, 
    setActiveAccount, 
    addAccount, 
    updateAccount, 
    deleteAccount,
    checkAccountStatus
  } = useAccount(); 
  
  const [senders, setSenders] = useState<Sender[]>([]);
  const [isLoadingSenders, setIsLoadingSenders] = useState(false);

  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath === path;
  };
  
  const fetchSenders = async () => {
    if (!activeAccount) return;
    setIsLoadingSenders(true);
    try {
        const response = await fetch('/api/senders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId })
        });
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setSenders(data);
    } catch (error) {
        toast({ title: "Error", description: "Could not fetch senders.", variant: "destructive" });
    } finally {
        setIsLoadingSenders(false);
    }
  };

  useEffect(() => {
    if (activeAccount) {
        fetchSenders();
    } else {
        setSenders([]);
    }
  }, [activeAccount]);

  const handleDeleteSender = async (email: string) => {
    if (!activeAccount) return;
     try {
        const response = await fetch('/api/senders', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: activeAccount.clientId, secretId: activeAccount.secretId, email })
        });
        if (!response.ok) throw new Error("Failed to delete");
        toast({ title: "Success", description: `Sender ${email} has been deleted.` });
        fetchSenders(); // Refresh the list
    } catch (error) {
        toast({ title: "Error", description: "Could not delete sender.", variant: "destructive" });
    }
  };

  const activeAccountName = activeAccount ? activeAccount.name : "No Account";

  const usage = activeAccount?.lastCheckResponse?.email;
  const usagePercentage = usage ? (usage.current_subscribers / usage.maximum_subscribers) * 100 : 0;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-foreground">Fusion Manager</h2>
                <p className="text-xs text-muted-foreground">User Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Dropdown */}
        <div className="p-4 border-b bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-2">ACTIVE ACCOUNT</div>
            {!collapsed && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left h-auto">
                      <div className="flex-1 truncate">{activeAccountName}</div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    {accounts.map((acc: Account) => (
                      <DropdownMenuItem 
                        key={acc.id} 
                        className="flex justify-between items-center" 
                        onSelect={(e) => {
                          e.preventDefault(); 
                          setActiveAccount(acc);
                        }}
                      >
                        <div className="flex items-center" onClick={() => setActiveAccount(acc)}>
                          {acc.id === activeAccount?.id && <Check className="inline-block w-4 h-4 mr-2" />}
                          {acc.name}
                        </div>
                        <div className="flex">
                          <EditAccountDialog account={acc} onAccountUpdate={updateAccount}>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                          </EditAccountDialog>
                          <AlertDialog onOpenChange={(open) => !open && event?.stopPropagation()}>
                            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader><AlertDialogTitle>Delete "{acc.name}"?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteAccount(acc.id)} className={buttonVariants({ variant: 'destructive' })}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <AddAccountDialog onAccountAdd={addAccount}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Plus className="w-4 h-4 mr-2" /> Add Account
                        </DropdownMenuItem>
                    </AddAccountDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
                {activeAccount && (
                  <StatusIndicator account={activeAccount} />
                )}
              </>
            )}
        </div>
        
        {/* Senders Management */}
        {!collapsed && activeAccount && (
            <Collapsible className="p-4 border-b" defaultOpen={true}>
                <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="text-xs font-medium text-muted-foreground flex-1 text-left">
                        SENDERS
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSenders}>
                        <RefreshCw className={cn("h-3 w-3", isLoadingSenders && "animate-spin")} />
                    </Button>
                </div>
                <CollapsibleContent className="mt-2 space-y-1">
                    {senders.length > 0 ? senders.map(sender => (
                        <div key={sender.email} className="flex items-center justify-between text-sm p-1 rounded-md hover:bg-muted/50 group">
                           <span className="truncate" title={sender.email}>{sender.name}</span>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100">
                                    <Trash2 className="h-3 w-3" />
                                 </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Sender?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogDescription>Are you sure you want to delete {sender.name} ({sender.email})?</AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSender(sender.email)} className={buttonVariants({ variant: 'destructive' })}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )) : (<p className="text-sm text-muted-foreground p-1">No senders found.</p>)}
                </CollapsibleContent>
            </Collapsible>
        )}

        {/* Plan Usage */}
        {!collapsed && activeAccount && usage && (
            <Collapsible className="p-4 border-b" defaultOpen={true}>
                 <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="text-xs font-medium text-muted-foreground flex-1 text-left">PLAN USAGE</CollapsibleTrigger>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => checkAccountStatus(activeAccount)}>
                        <RefreshCw className={cn("h-3 w-3", activeAccount?.status === 'checking' && "animate-spin")} />
                    </Button>
                </div>
                 <CollapsibleContent className="mt-2 space-y-2">
                    {usage ? (
                        <>
                            <p className="text-sm font-semibold">{usage.tariff_name}</p>
                            <Progress value={usagePercentage} />
                            <p className="text-xs text-muted-foreground text-center">
                                {usage.current_subscribers} / {usage.maximum_subscribers} subscribers
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground p-1">Usage data not available.</p>
                    )}
                 </CollapsibleContent>
            </Collapsible>
        )}
        
        {/* Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto p-4 text-xs text-muted-foreground">
          {!collapsed && "Built for multi-account SendPulse management"}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}