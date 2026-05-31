"use client";

import { useState, useTransition } from "react";
import { PlusCircle } from "lucide-react";

import { grantDeveloperCreditAction } from "@/components/billing/actions";
import { Button } from "@/components/ui/button";

export function DeveloperCreditButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await grantDeveloperCreditAction();

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setMessage("Developer credit added.");
    });
  }

  return (
    <div className="space-y-2">
      <Button disabled={isPending} onClick={onClick} type="button">
        <PlusCircle className="mr-2 h-4 w-4" />
        {isPending ? "Adding credit..." : "Add developer credit"}
      </Button>
      {message ? <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p> : null}
    </div>
  );
}
