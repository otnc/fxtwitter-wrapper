# fxtwitter

[![npm](https://img.shields.io/npm/v/fxtwitter)](https://www.npmjs.com/package/fxtwitter)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/otnc/fxtwitter-wrapper/ci.yml?branch=main)](https://github.com/otnc/fxtwitter-wrapper/actions)
[![GitHub](https://img.shields.io/github/license/otnc/fxtwitter-wrapper)](https://github.com/otnc/fxtwitter-wrapper/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/fxtwitter)](https://www.npmjs.com/package/fxtwitter)

Typed wrapper for the [FxTwitter](https://github.com/FxEmbed/FxEmbed) API.

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

Types can be imported alongside the client:

```ts
import { FxTwitterV1, type Tweet, type User } from "fxtwitter";
```

The client is also available from the `fxtwitter/v1` subpath, which will keep
working unchanged as further API versions are added to the root:

```ts
import { FxTwitterV1 } from "fxtwitter/v1";
```

## API

### `new FxTwitterV1(options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://api.fxtwitter.com` | API host, e.g. a self-hosted instance |
| `headers` | `Record<string, string>` | — | Extra headers sent with every request |
| `timeout` | `number` | disabled | Abort a request after this many ms |
| `retry` | `number \| false` | `1` | Retries for failed requests |
| `retryDelay` | `number` | `0` | Delay between retries, in ms |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch implementation |

> The API requires a `User-Agent` identifying the caller and answers `401`
> without one. When you don't set one, a header describing the current runtime
> is sent — `Node.js/22.16.0`, `Bun/1.3.0`, `Cloudflare-Workers` and so on.
> Set your own to identify your app instead:
>
> ```ts
> new FxTwitterV1({
>   headers: { "User-Agent": "MyApp/1.0 (+https://example.com)" },
> });
> ```
>
> Nothing is sent in browsers, where `User-Agent` is a forbidden header and the
> browser supplies its own.

### `getStatus(id, options?)`

Fetches a single status by its snowflake ID.

```ts
const { tweet } = await fx.getStatus("20");

// Translate the status
const { tweet } = await fx.getStatus("20", { translateTo: "es" });
tweet?.translation?.text;
```

| Option | Type | Description |
| --- | --- | --- |
| `translateTo` | `string` | Target language — an ISO 639-1 code (`es`) or locale (`zh-cn`). Adds `translation` to the status |
| `screenName` | `string` | Author handle, for a readable URL. The API resolves the status from `id` alone and never checks it |
| `signal` | `AbortSignal` | Per-call cancellation |

Resolves to `{ code, message, tweet }`. `tweet` is `null` when the status could
not be retrieved.

### `getUser(handle, options?)`

Fetches a user profile by handle, without a leading `@`.

```ts
const { user } = await fx.getUser("jack");
```

| Option | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | Per-call cancellation |

Resolves to `{ code, message, user, reason? }`. `user` is absent when the
profile could not be retrieved, and `reason` is `"suspended"` for a suspended
account.

### Errors

HTTP 4xx/5xx, network failures, timeouts, invalid input, and non-JSON responses
are thrown as `FxTwitterError`:

```ts
import { FxTwitterError } from "fxtwitter";

try {
  await fx.getStatus("20");
} catch (error) {
  if (error instanceof FxTwitterError) {
    error.status; // 404
    error.code; // 404
    error.message; // "NOT_FOUND"
    error.body; // parsed response body, when available
    error.cause; // underlying error, when available
  }
}
```

On success, `code` mirrors the HTTP status and `message` is one of `OK`,
`PRIVATE_TWEET`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE` or `API_FAIL`.

For a network failure or a timeout there is no response, so `status`, `code`
and `body` are all `undefined` and `message` is a generic description. The
original error is still available as `cause`.

Malformed input is rejected before a request is sent, because the API answers
those cases with HTML or a redirect rather than JSON: a status ID must be 2-20
digits, and a handle passed to `getUser` must match `\w{1,15}`. A well-formed
handle that does not exist is a normal `404`.

## Requirements

- Node.js >= 22

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

Distributed under the [MIT License](./LICENSE).
