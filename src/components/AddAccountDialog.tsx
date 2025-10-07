import { useState } from "react";
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

interface AddAccountDialogProps {
  onAccountAdd: (account: { name: string; clientId: string; secretId: string; }) => void;
  children: React.ReactNode;
}

export function AddAccountDialog({ onAccountAdd, children }: AddAccountDialogProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [secretId, setSecretId] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onAccountAdd({ name, clientId, secretId });
    // Reset fields and close dialog
    setName("");
    setClientId("");
    setSecretId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add SendPulse Account</DialogTitle>
          <DialogDescription>
            Enter the details for the new account. These can be found in your SendPulse dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Account Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Production"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clientId" className="text-right">Client ID</Label>
            <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className="col-span-3" placeholder="Your SendPulse Client ID"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secretId" className="text-right">Secret ID</Label>
            <Input id="secretId" value={secretId} onChange={(e) => setSecretId(e.target.value)} className="col-span-3" placeholder="Your SendPulse Secret ID"/>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}