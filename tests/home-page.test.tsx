import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(public)/page";

describe("home page", () => {
  it("renders the public landing page", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("MaxAPI");
    expect(html).toContain("OpenAI-compatible API");
    expect(html).toContain("Popular models");
  });
});
