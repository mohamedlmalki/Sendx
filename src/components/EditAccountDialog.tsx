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
    publishableKey: string;
    secretKey: string;
}

interface EditAccountDialogProps {
  account: Account;
  onAccountUpdate: (id: string, data: Omit<Account, 'id'>) => void;
  children: React.ReactNode;
}

export function EditAccountDialog({ account, onAccountUpdate, children }: EditAccountDialogProps) {
  const [name, setName] = useState(account.name);
  const [publishableKey, setPublishableKey] = useState(account.publishableKey);
  const [secretKey, setSecretKey] = useState(account.secretKey);
  const [open, setOpen] = useState(false);

  // This effect ensures the dialog's state is fresh every time it's opened
  useEffect(() => {
    if (open) {
      setName(account.name);
      setPublishableKey(account.publishableKey);
      setSecretKey(account.secretKey);
    }
  }, [open, account]);

  const handleSubmit = () => {
    onAccountUpdate(account.id, { name, publishableKey, secretKey });
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
                <Label htmlFor="publishableKey" className="text-right">Publishable Key</Label>
                <Input id="publishableKey" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} className="col-span-3"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="secretKey" className="text-right">Secret Key</Label>
                <Input id="secretKey" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="col-span-3"/>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}