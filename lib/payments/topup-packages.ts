export type TopUpPackage = {
  id: string;
  label: string;
  description: string;
  amountUsdCents: number;
  creditsUsdMicros: bigint;
  isPublic: boolean;
  sortOrder: number;
};

export const TOP_UP_PACKAGES = [
  {
    id: "topup_10",
    label: "$10 credit",
    description: "Good for local validation and light API testing.",
    amountUsdCents: 1_000,
    creditsUsdMicros: 10_000_000n,
    isPublic: true,
    sortOrder: 10
  },
  {
    id: "topup_25",
    label: "$25 credit",
    description: "A practical starter balance for early integration work.",
    amountUsdCents: 2_500,
    creditsUsdMicros: 25_000_000n,
    isPublic: true,
    sortOrder: 20
  },
  {
    id: "topup_50",
    label: "$50 credit",
    description: "For sustained testing across route policies and models.",
    amountUsdCents: 5_000,
    creditsUsdMicros: 50_000_000n,
    isPublic: true,
    sortOrder: 30
  },
  {
    id: "topup_100",
    label: "$100 credit",
    description: "For larger MVP workloads before automated billing exists.",
    amountUsdCents: 10_000,
    creditsUsdMicros: 100_000_000n,
    isPublic: true,
    sortOrder: 40
  }
] satisfies TopUpPackage[];

export function listPublicTopUpPackages() {
  return TOP_UP_PACKAGES.filter((item) => item.isPublic).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTopUpPackage(packageId: string) {
  return TOP_UP_PACKAGES.find((item) => item.id === packageId && item.isPublic) ?? null;
}
