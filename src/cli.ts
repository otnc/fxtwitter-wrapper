#!/usr/bin/env node

import { parseArgs, renderUsage, type ArgsDef } from "citty";
import type { ClientOptions } from "./http";
import { FxTwitterV1 } from "./v1";
import { FxTwitterV2 } from "./v2";

const flags = {
  api: {
    type: "enum",
    options: ["v1", "v2"],
    default: "v2",
    description: "API version",
  },
  "base-url": {
    type: "string",
    valueHint: "url",
    description: "Override the API base URL",
  },
  timeout: { type: "string", valueHint: "ms", description: "Request timeout" },
  retry: {
    type: "string",
    valueHint: "count",
    description: "Retry count (use 0 to disable retries)",
  },
  "retry-delay": {
    type: "string",
    valueHint: "ms",
    description: "Delay between retries",
  },
  pretty: { type: "boolean", description: "Indent JSON output" },
  help: { type: "boolean", alias: "h", description: "Show help" },
} as const satisfies ArgsDef;

const STATUS_ID = /^\d{2,20}$/;
const STATUS_HOSTS = new Set(["x.com", "twitter.com"]);

const parseStatusId = (input: string) => {
  if (STATUS_ID.test(input)) return input;

  const url = URL.canParse(input) ? new URL(input) : null;
  if (url && (url.protocol === "https:" || url.protocol === "http:")) {
    const host = url.hostname.replace(/^(www|mobile)\./, "");
    const id = /^\/(?:\w{1,15}|i\/web)\/status\/(\d{2,20})\/?$/.exec(
      url.pathname
    )?.[1];

    if (STATUS_HOSTS.has(host) && id !== undefined) return id;
  }

  throw new Error(
    "Expected a status ID (2–20 digits) or an X/Twitter status URL"
  );
};

const parseBaseUrl = (input: string | undefined) => {
  if (input === undefined) return undefined;
  const url = URL.canParse(input) ? new URL(input) : null;
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    throw new Error("--base-url must be an absolute HTTP or HTTPS URL");
  }
  return input;
};

const parseNonNegativeInteger = (
  flag: string,
  value: string | undefined,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)) {
    throw new Error(`--${flag} must be a non-negative integer`);
  }
  if (number > max) throw new Error(`--${flag} must be at most ${max}`);
  return number;
};

// Node clamps out-of-range timer delays to 1 ms.
const MAX_TIMER_DELAY = 2_147_483_647;

const commands = {
  status: {
    argument: "id-or-url",
    description: "Fetch a post by ID or X/Twitter status URL",
    run: (input: string, version: "v1" | "v2", options: ClientOptions) => {
      const id = parseStatusId(input);
      const client =
        version === "v1" ? new FxTwitterV1(options) : new FxTwitterV2(options);
      return client.getStatus(id);
    },
  },
  profile: {
    argument: "screen-name",
    description: "Fetch a profile by screen name",
    run: (input: string, version: "v1" | "v2", options: ClientOptions) => {
      const handle = input.replace(/^@/, "");
      if (!handle) throw new Error("Expected a profile screen name");
      if (version === "v1") return new FxTwitterV1(options).getUser(handle);
      return new FxTwitterV2(options).getProfile(handle);
    },
  },
  search: {
    argument: "query",
    description: "Search posts (v2 only)",
    run: (input: string, version: "v1" | "v2", options: ClientOptions) => {
      if (version === "v1") throw new Error("search requires API v2");
      return new FxTwitterV2(options).search(input);
    },
  },
};

const cliMeta = { name: "fxtwitter", description: "Query the FxTwitter API" };

const printUsage = async (...params: Parameters<typeof renderUsage>) => {
  // Citty renders option values with "=". Use the same space syntax as the README.
  console.log((await renderUsage(...params)).replace(/(--[\w-]+)=</g, "$1 <"));
};

const main = async (rawArgs: string[]) => {
  const args = parseArgs<typeof flags>(rawArgs, flags);

  // Citty keeps unknown options in the result and adds camelCase aliases.
  for (const key of Object.keys(args)) {
    const flag = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    if (key !== "_" && key !== "h" && !Object.hasOwn(flags, flag)) {
      throw new Error(`Unknown option ${JSON.stringify(key)}`);
    }
  }

  const [name, input] = args._;
  if (name === undefined && (args.help || rawArgs.length === 0)) {
    const subCommands = Object.fromEntries(
      Object.entries(commands).map(([name, { description }]) => [
        name,
        { meta: { description } },
      ])
    );
    await printUsage({ meta: cliMeta, args: flags, subCommands });
    return;
  }
  if (name === undefined || !Object.hasOwn(commands, name)) {
    throw new Error(
      name === undefined
        ? "Expected a command. Run fxtwitter --help for usage."
        : `Unknown command ${JSON.stringify(name)}. Run fxtwitter --help for usage.`
    );
  }

  const command = commands[name as keyof typeof commands];
  if (args.help) {
    await printUsage(
      {
        meta: { name, description: command.description },
        args: { ...flags, [command.argument]: { type: "positional" } },
      },
      { meta: cliMeta }
    );
    return;
  }

  if (args._.length !== 2 || !input.trim()) {
    throw new Error(`${name} requires exactly one non-empty argument`);
  }

  const options = {
    baseUrl: parseBaseUrl(args["base-url"]),
    timeout: parseNonNegativeInteger("timeout", args.timeout, MAX_TIMER_DELAY),
    retry: parseNonNegativeInteger("retry", args.retry),
    retryDelay: parseNonNegativeInteger(
      "retry-delay",
      args["retry-delay"],
      MAX_TIMER_DELAY
    ),
  };
  const response = await command.run(input, args.api, options);
  console.log(JSON.stringify(response, null, args.pretty ? 2 : undefined));
};

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(`fxtwitter: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
