import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { isPriceFresh } from "../products";

const now = Date.parse("2026-10-19T12:00:00Z");
describe("isPriceFresh (Amazon 24h price rule)", () => {
  it("shows a price checked 23 hours ago", () => {
    expect(isPriceFresh({ price: 10, priceUpdatedAt: "2026-10-18T13:00:00Z" }, now)).toBe(true);
  });
  it("hides a price checked 25 hours ago", () => {
    expect(isPriceFresh({ price: 10, priceUpdatedAt: "2026-10-18T11:00:00Z" }, now)).toBe(false);
  });
  it("hides a price with no check time", () => {
    expect(isPriceFresh({ price: 10, priceUpdatedAt: null }, now)).toBe(false);
  });
});
