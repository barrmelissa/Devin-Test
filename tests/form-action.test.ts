import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { runFormAction } from "@/foundation/actions";
import { ValidationError } from "@/foundation/errors";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  fd.set("$ACTION_ID_abc", "");
  return fd;
};

describe("runFormAction (shared create form)", () => {
  it("returns the error and the submitted values on a server-side error, so the form keeps them", async () => {
    const state = await runFormAction(form({ customerName: "Acme", refundAmount: "900", originalAmount: "100" }), async () => {
      throw new ValidationError("Refund amount cannot exceed the original charge.");
    });
    expect(state).toEqual({
      error: "Refund amount cannot exceed the original charge.",
      values: { customerName: "Acme", refundAmount: "900", originalAmount: "100" },
    });
  });

  it("redirects with a flash message on success and puts no field values in the URL", async () => {
    await expect(
      runFormAction(form({ taxId: "123-45-6789" }), async () => ({ message: "Created.", redirectTo: "/apps/kyc/c1" }))
    ).rejects.toThrow("REDIRECT:/apps/kyc/c1?flash=Created.");
  });
});
