"use client";

import { useState, useTransition } from "react";
import { ShieldOff } from "lucide-react";

import { revokeApiKeyAction } from "@/components/dashboard/api-key-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function RevokeApiKeyButton({ keyId, disabled }: { keyId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    setError(null);

    const formData = new FormData();
    formData.set("keyId", keyId);

    startTransition(async () => {
      const result = await revokeApiKeyAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
    });
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={disabled} size="sm" variant="outline">
          <ShieldOff className="mr-2 h-4 w-4" />
          {disabled ? "Revoked" : "Revoke"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke this API key?</DialogTitle>
          <DialogDescription>This key will remain visible in the dashboard, but it will no longer be valid for future requests.</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isPending} onClick={handleRevoke} type="button" variant="destructive">
            {isPending ? "Revoking..." : "Confirm revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
