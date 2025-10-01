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
  onAccountAdd: (account: { name: string; publishableKey: string; secretKey: string; }) => void;
  children: React.ReactNode;
}

export function AddAccountDialog({ onAccountAdd, children }: AddAccountDialogProps) {
  const [name, setName] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onAccountAdd({ name, publishableKey, secretKey });
    // Reset fields and close dialog
    setName("");
    setPublishableKey("");
    setSecretKey("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Magic.link Account</DialogTitle>
          <DialogDescription>
            Enter the details for the new account. These can be found in your Magic.link dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Account Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Production"/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="publishableKey" className="text-right">Publishable Key</Label>
            <Input id="publishableKey" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} className="col-span-3" placeholder="pk_live_..."/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secretKey" className="text-right">Secret Key</Label>
            <Input id="secretKey" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="col-span-3" placeholder="sk_live_..."/>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}