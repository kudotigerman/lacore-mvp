import type { ComponentType } from "react";
import React from "react";
import { transform } from "sucrase";

function stripReactImports(source: string): string {
  let body = source.trimStart();
  for (;;) {
    const match = body.match(/^import\s+[\s\S]*?from\s+["']react["']\s*;?\s*/);
    if (!match) break;
    body = body.slice(match[0].length).trimStart();
  }
  return body;
}

function ensureReturnLandingPage(body: string): string {
  if (/\breturn\s+LandingPage\s*;/.test(body)) return body;
  if (/export\s+default\s+function\s+LandingPage\b/.test(body)) {
    return body.replace(/\bexport\s+default\s+function\s+LandingPage\b/, "function LandingPage") + "\nreturn LandingPage;";
  }
  return body.replace(/\bexport\s+default\s+LandingPage\b\s*;?/g, "return LandingPage;");
}

/**
 * Turns AI-generated JSX source into a mountable React component.
 * Expects classic JSX runtime output and strips React imports (passed explicitly).
 */
export function compileLandingJsx(jsxSource: string): ComponentType {
  let cleaned = jsxSource.trim();
  cleaned = cleaned.replace(/^```(?:tsx|jsx|typescript)?\s*/i, "").replace(/\s*```\s*$/i, "");

  const { code } = transform(cleaned, {
    transforms: ["jsx", "typescript"],
    jsxRuntime: "classic",
    production: true
  });

  let body = stripReactImports(code.trim());
  body = ensureReturnLandingPage(body);

  // Executing AI-generated code; sandbox is structural (trusted owner content only).
  // eslint-disable-next-line no-new-func -- runtime JSX compilation for stored landings
  const factory = new Function("React", "useState", `"use strict";\n${body}`);
  const Comp = factory(React, React.useState) as unknown;
  if (typeof Comp !== "function") {
    throw new Error("Landing component did not compile.");
  }
  return Comp as ComponentType;
}
