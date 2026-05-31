"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock, Globe, Server } from "lucide-react";

type KeyPoolStatus = {
  id: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  cooldownUntil: string | null;
  totalRequests: number;
  totalFailures: number;
};

type SystemStatus = {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  upstream: {
    platform: string;
    keysTotal: number;
    keysHealthy: number;
    keysUnhealthy: number;
    keyPool: KeyPoolStatus[];
  };
  cache: {
    backend: "memory" | "redis";
  };
};

function StatusBadge({ status }: { status: SystemStatus["status"] }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        正常运行
      </span>
    );
  }

  if (status === "degraded") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
        <AlertCircle className="h-4 w-4" />
        性能下降
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
      <AlertCircle className="h-4 w-4" />
      服务中断
    </span>
  );
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString("zh-CN"));
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString("zh-CN")), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
          <Globe className="h-4 w-4" />
          系统状态
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">MaxAPI 服务状态</h1>
        <p className="mt-3 text-lg text-slate-500">
          实时监控上游供应线路与 Key 池状态
        </p>
        <p className="mt-2 text-sm text-slate-400">最后更新：{currentTime}</p>
      </div>

      {/* Overall Status */}
      <div
        className={`mb-8 rounded-2xl border p-6 text-center ${
          status?.status === "ok"
            ? "border-emerald-200 bg-emerald-50"
            : status?.status === "degraded"
              ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          {status?.status === "ok" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-amber-600" />
          )}
          <span className="text-xl font-semibold text-slate-900">
            {status?.status === "ok" ? "所有系统运行正常" : status?.status === "degraded" ? "部分 Key 出现异常" : "服务中断"}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {status?.status === "ok"
            ? "上游 Key 池正常运行，API 调用无影响。"
            : "部分 Key 处于冷却或熔断状态，已自动切换至健康 Key。"}
        </p>
      </div>

      {/* Key Pool Cards */}
      <div className="mb-8 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {status?.upstream.platform ?? "Upstream"} Key 池
        </h2>
        {status ? (
          status.upstream.keyPool.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${key.isHealthy ? "bg-emerald-100" : "bg-red-100"}`}>
                  <Server className={`h-5 w-5 ${key.isHealthy ? "text-emerald-600" : "text-red-600"}`} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{key.id}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {key.totalRequests} 请求
                    </span>
                    {key.totalFailures > 0 ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertCircle className="h-3 w-3" />
                        {key.totalFailures} 失败
                      </span>
                    ) : null}
                    {key.cooldownUntil ? (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        冷却中
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <StatusBadge status={key.isHealthy ? "ok" : "down"} />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white p-5 text-center text-slate-500">
            加载中...
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Key 总数", value: status?.upstream.keysTotal ?? "—" },
          { label: "健康 Key", value: status?.upstream.keysHealthy ?? "—" },
          { label: "缓存后端", value: status?.cache.backend === "redis" ? "Redis" : "内存" }
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{stat.value}</div>
            <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
