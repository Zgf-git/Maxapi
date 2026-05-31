import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "系统状态 - MaxAPI",
  description: "实时监控 MaxAPI 上游线路的健康状况与 Key 池状态。"
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
