import { redirect } from "next/navigation";

type Params = Promise<{ requestLogId: string }>;

export default async function ObservabilityRequestDetailPage({ params }: { params: Params }) {
  const { requestLogId } = await params;
  redirect(`/dashboard/requests/${requestLogId}`);
}
