"use client";

import { useState } from "react";
import { Copy, Check, Users, DollarSign, Percent, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatUsd(micros: bigint | number): string {
  const num = typeof micros === "bigint" ? Number(micros) : micros;
  return `$${(num / 1_000_000).toFixed(2)}`;
}

export function ReferralDashboard({
  baseUrl,
  stats
}: {
  baseUrl: string;
  stats: {
    code: string;
    rate: number;
    totalCommissionUsdMicros: bigint;
    referralCount: number;
  };
}) {
  const [copied, setCopied] = useState(false);
  const referralUrl = `${baseUrl}/sign-in?ref=${encodeURIComponent(stats.code)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Referral program</h1>
        <p className="text-slate-400">Share this link and earn commission when your friends top up.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Your referral code</CardTitle>
          <CardDescription>Copy your personal link and share it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border border-white/8 bg-white/[0.045] px-3 py-2 text-sm font-medium text-slate-100">
              {referralUrl}
            </div>
            <Button size="sm" onClick={handleCopy} variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/8 p-3">
              <Users className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total referrals</p>
              <p className="text-2xl font-bold text-slate-100">{stats.referralCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/8 p-3">
              <DollarSign className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total commission earned</p>
              <p className="text-2xl font-bold text-slate-100">{formatUsd(stats.totalCommissionUsdMicros)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/8 p-3">
              <Percent className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Commission rate</p>
              <p className="text-2xl font-bold text-slate-100">{stats.rate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-400">
            <li>Share your link with friends.</li>
            <li>They sign up and make a top-up.</li>
            <li>You earn commission on their purchase.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
