import { afterEach, describe, expect, it, vi } from "vitest";
import { assetsApi, authApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UrbanGrid API client", () => {
  it("sends tenant-authenticated map queries for the current viewport", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { type: "FeatureCollection", features: [], meta: { returned: 0, limit: 500, truncated: false } }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await assetsApi.map("access-token", { status: "active", criticality: "critical" }, "88.1,22.1,88.8,23.1");

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/assets/map?");
    expect(url).toContain("bbox=88.1%2C22.1%2C88.8%2C23.1");
    expect(url).toContain("status=active");
    expect(url).toContain("criticality=critical");
    expect(options.credentials).toBe("include");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("submits organization login without persisting credentials in the client API layer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        accessToken: "short-lived-access-token",
        user: { name: "Avery", email: "avery@example.test" },
        organization: { name: "North Works", slug: "north-works" },
        membership: { role: "organization_owner" }
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const session = await authApi.login("avery@example.test", "a-strong-password", "north-works");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/auth/login");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(String(options.body))).toEqual({
      email: "avery@example.test",
      password: "a-strong-password",
      organizationSlug: "north-works"
    });
    expect(session.accessToken).toBe("short-lived-access-token");
  });

  it("surfaces safe API error messages to the UI", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Email, password, or organization is incorrect." }
    }), { status: 401, headers: { "Content-Type": "application/json" } })));

    await expect(authApi.refresh()).rejects.toThrow("Email, password, or organization is incorrect.");
  });
});
