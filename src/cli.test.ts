import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getStatusV1, getStatusV2, getUser, getProfile, search, v2Options } =
  vi.hoisted(() => ({
    getStatusV1: vi.fn(),
    getStatusV2: vi.fn(),
    getUser: vi.fn(),
    getProfile: vi.fn(),
    search: vi.fn(),
    v2Options: vi.fn(),
  }));

vi.mock("./v1", () => ({
  FxTwitterV1: class {
    getStatus = getStatusV1;
    getUser = getUser;
  },
}));

vi.mock("./v2", () => ({
  FxTwitterV2: class {
    getStatus = getStatusV2;
    getProfile = getProfile;
    search = search;

    constructor(options: unknown) {
      v2Options(options);
    }
  },
}));

const run = async (...args: string[]) => {
  process.argv = ["node", "fxtwitter", ...args];
  const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

  await import("./cli");

  return { stdout, stderr, exitCode: process.exitCode };
};

const originalArgv = process.argv;
const originalExitCode = process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.exitCode = undefined;
});

afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

describe("fxtwitter CLI", () => {
  it("fetches a status by ID using v2 and writes compact JSON", async () => {
    getStatusV2.mockResolvedValue({ status: { id: "20" } });

    const result = await run("status", "20");

    expect(getStatusV2).toHaveBeenCalledWith("20");
    expect(result.stdout).toHaveBeenCalledExactlyOnceWith(
      '{"status":{"id":"20"}}'
    );
    expect(result.stderr).not.toHaveBeenCalled();
    expect(result.exitCode).toBeUndefined();
  });

  it("extracts a status ID from a share URL and formats the v1 response", async () => {
    const body = { tweet: { id: "1234567890123456789" } };
    getStatusV1.mockResolvedValue(body);

    const result = await run(
      "--api",
      "v1",
      "status",
      "https://x.com/jack/status/1234567890123456789?s=20",
      "--pretty"
    );

    expect(getStatusV1).toHaveBeenCalledWith("1234567890123456789");
    expect(result.stdout).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify(body, null, 2)
    );
  });

  it.each([
    ["v1", getUser],
    ["v2", getProfile],
  ])(
    "fetches a %s profile with the matching client",
    async (version, fetchProfile) => {
      fetchProfile.mockResolvedValue({ user: {} });
      await run("profile", "@jack", "--api", version);

      expect(fetchProfile).toHaveBeenCalledExactlyOnceWith("jack");
    }
  );

  it("passes the search query and connection options to the v2 client", async () => {
    search.mockResolvedValue({ results: [] });

    await run(
      "search",
      "from:jack puppies",
      "--base-url=https://example.test",
      "--timeout=500",
      "--retry=0",
      "--retry-delay=25"
    );

    expect(search).toHaveBeenCalledExactlyOnceWith("from:jack puppies");
    expect(v2Options).toHaveBeenCalledExactlyOnceWith({
      baseUrl: "https://example.test",
      timeout: 500,
      retry: 0,
      retryDelay: 25,
    });
  });

  it.each([
    {
      args: ["search", "puppies", "--api", "v1"],
      message: "search requires API v2",
    },
    {
      args: ["status", "https://example.test/jack/status/20"],
      message: "Expected a status ID",
    },
    {
      args: ["status", "20", "--timeout=NaN"],
      message: "--timeout must be a non-negative integer",
    },
    {
      args: ["status", "20", "--api", "v3"],
      message: "Expected one of",
    },
    {
      args: ["status", "20", "--prety"],
      message: "Unknown option",
    },
    {
      args: ["status", "20", "--base-url"],
      message: "--base-url must be an absolute HTTP or HTTPS URL",
    },
    {
      args: ["status", "20", "--retry-delay", "2147483648"],
      message: "--retry-delay must be at most 2147483647",
    },
  ])(
    "rejects invalid input before making a request ($message)",
    async ({ args, message }) => {
      const result = await run(...args);

      expect(result.stdout).not.toHaveBeenCalled();
      expect(result.stderr).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining(message)
      );
      expect(result.exitCode).toBe(1);
      expect(v2Options).not.toHaveBeenCalled();
      expect(search).not.toHaveBeenCalled();
    }
  );

  it("shows command-specific help without fetching a post", async () => {
    const result = await run("status", "-h");

    expect(result.stdout).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("fxtwitter status")
    );
    expect(result.stdout).toHaveBeenCalledWith(
      expect.stringContaining("--api <v1|v2>")
    );
    expect(result.stderr).not.toHaveBeenCalled();
    expect(getStatusV2).not.toHaveBeenCalled();
    expect(result.exitCode).toBeUndefined();
  });

  it("reports a client error on stderr and exits with a nonzero status", async () => {
    getStatusV2.mockRejectedValue(new Error("NOT_FOUND"));

    const result = await run("status", "20");

    expect(result.stdout).not.toHaveBeenCalled();
    expect(result.stderr).toHaveBeenCalledExactlyOnceWith(
      "fxtwitter: NOT_FOUND"
    );
    expect(result.exitCode).toBe(1);
  });
});
