import { describe, expect, it } from "vitest";
import { hasSupabaseConfig } from "./has-supabase-config";

describe("hasSupabaseConfig", () => {
  it("requires both the project URL and publishable key", () => {
    expect(hasSupabaseConfig(undefined, "sb_publishable_example")).toBe(false);
    expect(hasSupabaseConfig("https://example.supabase.co", undefined)).toBe(false);
  });

  it("rejects empty or whitespace-only values", () => {
    expect(hasSupabaseConfig("", "sb_publishable_example")).toBe(false);
    expect(hasSupabaseConfig("   ", "sb_publishable_example")).toBe(false);
    expect(hasSupabaseConfig("https://example.supabase.co", "   ")).toBe(false);
  });

  it("accepts a configured project URL and publishable key", () => {
    expect(
      hasSupabaseConfig("https://example.supabase.co", "sb_publishable_example")
    ).toBe(true);
  });
});
