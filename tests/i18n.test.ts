import { describe, expect, it } from "vitest";

import { normalizeLocale } from "@/lib/i18n/config";
import { zhTranslations } from "@/lib/i18n/translations";

describe("i18n support", () => {
  it("normalizes unsupported locales to English", () => {
    expect(normalizeLocale("zh")).toBe("zh");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });

  it("contains Chinese translations for core navigation and activation pages", () => {
    expect(zhTranslations["Developer console"]).toBe("开发者控制台");
    expect(zhTranslations["Requests"]).toBe("请求");
    expect(zhTranslations["API playground"]).toBe("API 调试台");
    expect(zhTranslations["Plans define access. Usage is still billed from balance."]).toBe(
      "计划定义访问权限，用量仍从余额扣费。"
    );
  });

  it("contains Chinese translations for catalog, plan, docs, and billing copy", () => {
    expect(zhTranslations["Cheap"]).toBe("低成本");
    expect(zhTranslations["Trial"]).toBe("试用版");
    expect(zhTranslations["Text only."]).toBe("仅支持文本。");
    expect(zhTranslations["Top up balance"]).toBe("充值余额");
    expect(zhTranslations["Activation checklist"]).toBe("激活清单");
    expect(zhTranslations["cURL: route policy"]).toBe("cURL：路由策略");
  });
});
