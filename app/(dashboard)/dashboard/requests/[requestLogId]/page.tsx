import { notFound } from "next/navigation";

import { RequestDetailView } from "@/components/requests/request-detail-view";
import { requirePageUser } from "@/lib/auth/session";
import { getObservabilityRequestDetail } from "@/lib/observability/service";

type Params = Promise<{ requestLogId: string }>;

export default async function RequestDetailPage({ params }: { params: Params }) {
  const user = await requirePageUser();
  const { requestLogId } = await params;
  const detail = await getObservabilityRequestDetail(user.id, requestLogId);

  if (!detail) {
    notFound();
  }

  return <RequestDetailView detail={detail} />;
}
