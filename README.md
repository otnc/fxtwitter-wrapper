# fxtwitter

[![npm](https://img.shields.io/npm/v/fxtwitter)](https://www.npmjs.com/package/fxtwitter)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/otnc/fxtwitter-wrapper/ci.yml?branch=main)](https://github.com/otnc/fxtwitter-wrapper/actions)
[![GitHub](https://img.shields.io/github/license/otnc/fxtwitter-wrapper)](https://github.com/otnc/fxtwitter-wrapper/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/fxtwitter)](https://www.npmjs.com/package/fxtwitter)

Typed wrapper for the [FxTwitter](https://github.com/FxEmbed/FxEmbed) v1 API.

> The v2 client is developed on the [`release/v2`](https://github.com/otnc/fxtwitter-wrapper/tree/release/v2)
> branch and will be published under the `fxtwitter/v2` subpath.

## Install

```sh
npm install fxtwitter
```

## Usage

```ts
import { FxTwitterV1 } from "fxtwitter";

const fx = new FxTwitterV1();

const { tweet } = await fx.getStatus("20");
const { user } = await fx.getUser("jack");
```

The same client is available from the `fxtwitter/v1` subpath, so imports keep
working unchanged once the v2 client ships alongside it:

```ts
import { FxTwitterV1, type Tweet } from "fxtwitter/v1";
```

### Endpoints

v1 has exactly two endpoints, and both are covered:

| Method | Request |
| --- | --- |
| `getStatus(id)` | `GET /status/:id` |
| `getStatus(id, { translateTo })` | `GET /status/:id/:language` |
| `getStatus(id, { screenName })` | `GET /:handle/status/:id` |
| `getStatus(id, { screenName, translateTo })` | `GET /:handle/status/:id/:language` |
| `getUser(handle)` | `GET /:handle` |

`screenName` only makes the URL readable — the API resolves the status from the
ID alone. `translateTo` takes an ISO 639-1 code (`es`) or a locale (`zh-cn`) and
adds a `translation` object to the returned status.

### Options

```ts
const fx = new FxTwitterV1({
  baseUrl: "https://api.fxtwitter.com", // e.g. a self-hosted FxEmbed instance
  timeout: 5000, // ms; disabled by default
  retry: 2, // defaults to ofetch's 1 for GET
  retryDelay: 250,
  headers: { "User-Agent": "my-app/1.0 (+https://example.com)" },
  fetch: myFetch, // custom fetch implementation
});

// Per-call cancellation
await fx.getStatus("20", { signal: AbortSignal.timeout(2000) });
```

> **The API requires a `User-Agent` header** and answers `401` without one. This
> package sends a default identifying itself, but setting your own is
> recommended — the API's own guidance is to use something that identifies your
> app, such as `MyAwesomeBot/1.0 (+http://example.com/myawesomebot)`.

### Errors

HTTP 4xx/5xx, network failures, timeouts, invalid input, and non-JSON responses
are all thrown as `FxTwitterError`, carrying `status`, `code`, and the parsed
response `body` when available:

```ts
import { FxTwitterError } from "fxtwitter";

try {
  await fx.getStatus("20");
} catch (error) {
  if (error instanceof FxTwitterError) {
    console.error(error.status, error.code, error.message);
    // 404 404 "NOT_FOUND"
  }
}
```

Successful responses mirror the HTTP status in `code`, with `message` being one
of `OK`, `PRIVATE_TWEET`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE` or `API_FAIL`.

### Input validation

Malformed input is rejected before a request goes out, because the API does not
answer those cases with JSON:

- A status ID must be 2-20 digits. Anything else makes the API return its embed
  page as **HTML at HTTP 200**.
- A handle must match `\w{1,15}` (no leading `@`). Anything else is **redirected
  to the project's GitHub page**.

A handle that is well-formed but does not exist is a normal `404` and is
reported as such.

## Requirements

- Node.js >= 22

## Features

- Both v1 endpoints — status (with optional handle and translation) and user.
- Fully typed responses, derived from live API responses rather than the
  archived wiki, which documents a much older shape.
- Timeout, retry, and `AbortSignal` support via [ofetch](https://github.com/unjs/ofetch).
- ESM + CJS, with a `fxtwitter/v1` subpath export.

### A note on the v1 response shape

FxTwitter's v1 API has no live documentation — `docs.fxtwitter.com` now redirects
to the v2 docs at `docs.fxembed.com`, and the archived
[FixTweet wiki](https://github.com/FixTweet/FixTweet/wiki/Status-Fetch-API)
describes a much older response than what the API returns today. The types here
were derived by inspecting live responses and cross-checking the
[FxEmbed source](https://github.com/FxEmbed/FxEmbed).

In practice v1 now returns v2's data model under a few legacy names — `retweets`
(v2 `reposts`), `twitter_card` (v2 `embed_card`), a string-valued `replying_to`
plus `replying_to_status`, and `tweets` (v2 `statuses`) on the user object.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

Distributed under the [MIT License](./LICENSE).
