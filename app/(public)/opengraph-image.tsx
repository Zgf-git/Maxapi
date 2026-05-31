import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export const alt = "MaxAPI - AI API 网关 · 托管路由与故障转移";
export const size = {
  width: 1200,
  height: 630
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 40
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: "-0.02em"
            }}
          >
            MaxAPI
          </span>
        </div>
        <p
          style={{
            fontSize: 36,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 900
          }}
        >
          AI API 网关 · 托管路由与故障转移
        </p>
        <p
          style={{
            fontSize: 24,
            marginTop: 24,
            opacity: 0.9,
            textAlign: "center"
          }}
        >
          多上游路由 · 智能熔断 · 自动故障转移
        </p>
      </div>
    ),
    {
      ...size
    }
  );
}
