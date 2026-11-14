#!/usr/bin/env node

import { parseArgs } from "node:util";
import { FxTwitterV1 } from "./v1";
import { FxTwitterV2 } from "./v2";

const HELP = `Usage: fxtwitter <command> <argument> [options]

Commands:
  status <id-or-url>      Fetch a post by ID or X/Twitter status URL
  profile <screen-name>  Fetch a profile by screen name
  search <query>         Search posts (v2 only)

Options:
  --api-version <v1|v2>  API version (default: v2)
  --base-url <url>       Override the API base URL
  --timeout <ms>         Request timeout
  --retry <count>        Retry count (use 0 to disable retries)
  --retry-delay <ms>     Delay between retries
  --pretty              Indent JSON output
  -h, --help            Show this help`;

const STATUS_ID = /^\d{2,20}$/;
const STATUS_URL =
  /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/\w{1,15}\/status\/(\d{2,20})\/?(?:[?#].*)?$/i;

const parseStatusId = (input: string) => {
  if (STATUS_ID.test(input)) return input;

  const id = STATUS_URL.exec(input)?.[1];
  if (id !== undefined) return id;

  throw new Error(
    "Expected a status ID (2–20 digits) or an X/Twitter status URL"
  );
};

const parseNonNegativeInteger = (flag: string, value: string | undefined) => {
  if (value === undefined) return undefined;

  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)) {
    throw new Error(`--${flag} must be a non-negative integer`);
  }

  return number;
};

const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "api-version": { type: "string", default: "v2" },
      "base-url": { type: "string" },
      timeout: { type: "string" },
      retry: { type: "string" },
      "retry-delay": { type: "string" },
      pretty: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const [command, input] = positionals;
  if (command !== "status" && command !== "profile" && command !== "search") {
    throw new Error(
      command === undefined
        ? "Expected a command. Run fxtwitter --help for usage."
        : `Unknown command ${JSON.stringify(command)}. Run fxtwitter --help for usage.`
    );
  }
  if (positionals.length !== 2 || !input.trim()) {
    throw new Error(`${command} requires exactly one non-empty argument`);
  }

  const version = values["api-version"];
  if (version !== "v1" && version !== "v2") {
    throw new Error("--api-version must be v1 or v2");
  }
  if (command === "search" && version === "v1") {
    throw new Error("search requires API v2");
  }

  const options = {
    baseUrl: values["base-url"],
    timeout: parseNonNegativeInteger("timeout", values.timeout),
    retry: parseNonNegativeInteger("retry", values.retry),
    retryDelay: parseNonNegativeInteger("retry-delay", values["retry-delay"]),
  };

  const response = await (() => {
    switch (command) {
      case "status": {
        const id = parseStatusId(input);
        const client =
          version === "v1"
            ? new FxTwitterV1(options)
            : new FxTwitterV2(options);
        return client.getStatus(id);
      }
      case "profile":
        return version === "v1"
          ? new FxTwitterV1(options).getUser(input)
          : new FxTwitterV2(options).getProfile(input);
      case "search":
        return new FxTwitterV2(options).search(input);
    }
  })();

  console.log(JSON.stringify(response, null, values.pretty ? 2 : undefined));
};

try {
  await main();
} catch (error) {
  console.error(`fxtwitter: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
