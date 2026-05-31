import type { Metadata } from "next";

import { HeroSection } from "@/components/public/hero-section";
import { LogoBar } from "@/components/public/logo-bar";
import { PopularModels } from "@/components/public/popular-models";
import { StepGuide } from "@/components/public/step-guide";
import { FeatureGrid } from "@/components/public/feature-grid";
import { FaqSection } from "@/components/public/faq-section";
import { CtaSection } from "@/components/public/cta-section";
import { AnimatedSection } from "@/components/public/animated-section";
import { StatsBar } from "@/components/public/stats-bar";

export const metadata: Metadata = {
  title: "MaxAPI - Unified AI Gateway",
  description:
    "MaxAPI 是统一 AI 网关。兼容 OpenAI SDK，提供模型路由、余额计费、请求日志和稳定的上游故障切换。"
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MaxAPI",
    applicationCategory: "DeveloperApplication",
    description:
      "MaxAPI 是统一 AI 网关，提供 OpenAI-compatible 接口、路由、计费、日志与稳定的上游切换能力。",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    operatingSystem: "Any",
    url: "https://your-domain.com"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <StatsBar totalRequests={0} totalUsers={0} uptimePercentage="99.9%" />
      <AnimatedSection>
        <LogoBar />
      </AnimatedSection>
      <AnimatedSection>
        <PopularModels />
      </AnimatedSection>
      <AnimatedSection>
        <StepGuide />
      </AnimatedSection>
      <AnimatedSection>
        <FeatureGrid />
      </AnimatedSection>
      <AnimatedSection>
        <FaqSection />
      </AnimatedSection>
      <AnimatedSection>
        <CtaSection />
      </AnimatedSection>
    </>
  );
}
