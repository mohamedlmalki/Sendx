import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Account {
    id: string;
    name: string;
    clientId: string;
    secretId: string;
}

interface EditAccountDialogProps {
  account: Account;
  onAccountUpdate: (id: string, data: Omit<Account, 'id'>) => void;
  children: React.ReactNode;
}

export function EditAccountDialog({ account, onAccountUpdate, children }: EditAccountDialogProps) {
  const [name, setName] = useState(account.name);
  const [clientId, setClientId] = useState(account.clientId);
  const [secretId, setSecretId] = useState(account.secretId);
  const [open, setOpen] = useState(false);

  // This effect ensures the dialog's state is fresh every time it's opened
  useEffect(() => {
    if (open) {
      setName(account.name);
      setClientId(account.clientId);
      setSecretId(account.secretId);
    }
  }, [open, account]);

  const handleSubmit = () => {
    onAccountUpdate(account.id, { name, clientId, secretId });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Update the details for "{account.name}".</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Account Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="clientId" className="text-right">Client ID</Label>
                <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="secretId" className="text-right">Secret ID</Label>
                <Input id="secretId" value={secretId} onChange={(e) => setSecretId(e.target.value)} className="col-span-3"/>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}