"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingError({ reset }: { reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing could not be loaded</CardTitle>
        <CardDescription>We could not load billing records right now. No internal error details are exposed here.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset} type="button">Try again</Button>
      </CardContent>
    </Card>
  );
}
