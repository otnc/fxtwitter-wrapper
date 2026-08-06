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
import { FxTwitterV2 } from "fxtwitter/v2";

const fx = new FxTwitterV2();

const { status } = await fx.getStatus("20");
const { user } = await fx.getProfile("X");
const { results } = await fx.search("puppies");
```

Each version ships under its own subpath, where its types are exported
alongside the client:

```ts
import { FxTwitterV2, type TwitterStatus } from "fxtwitter/v2";
import { FxTwitterV1, type Tweet } from "fxtwitter/v1";
```

If you need both at once, `FxTwitter` bundles them:

```ts
import { FxTwitter } from "fxtwitter";

const fx = new FxTwitter();
await fx.v2.getStatus("20");
await fx.v1.getStatus("20");
```

## Options

Every client takes the same options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://api.fxtwitter.com` | API host, e.g. a self-hosted instance |
| `headers` | `Record<string, string>` | — | Extra headers sent with every request |
| `timeout` | `number` | disabled | Abort a request after this many ms |
| `retry` | `number \| false` | `1` | Retries for failed requests |
| `retryDelay` | `number` | `0` | Delay between retries, in ms |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch implementation |

Every method takes an optional `signal` for per-call cancellation.

> The API requires a `User-Agent` identifying the caller and answers `401`
> without one. When you don't set one, a header describing the current runtime
> is sent — `Node.js/22.16.0`, `Bun/1.3.0`, `Cloudflare-Workers` and so on.
> Set your own to identify your app instead:
>
> ```ts
> new FxTwitterV2({
>   headers: { "User-Agent": "MyApp/1.0 (+https://example.com)" },
> });
> ```
>
> Nothing is sent in browsers, where `User-Agent` is a forbidden header and the
> browser supplies its own.

## v2

### `new FxTwitterV2(options?)`

| Method | Returns |
| --- | --- |
| `getStatus(id, options?)` | A single post |
| `getThread(id, options?)` | A post with its unrolled thread |
| `getConversation(id, options?)` | A post, its thread, and ranked replies |
| `getStatusReposts(id, options?)` | Users who reposted a post |
| `getStatusQuotes(id, options?)` | Posts quoting a post |
| `getProfile(handle, options?)` | A user profile |
| `getProfileStatuses(handle, options?)` | A user's posts |
| `getProfileArticles(handle, options?)` | A user's long-form articles |
| `getProfileMedia(handle, options?)` | A user's posts containing media |
| `getProfileAbout(handle, options?)` | Account metadata |
| `getProfileFollowers(handle, options?)` | A user's followers |
| `getProfileFollowing(handle, options?)` | Accounts a user follows |
| `search(query, options?)` | Post search results |
| `typeahead(query, options?)` | Autocomplete suggestions |
| `trends(options?)` | Trending topics |

Common options: `count` and `cursor` paginate list endpoints, `lang` requests an
inline translation, and `aboutAccount` adds `about_account` to an author.

```ts
// Paginate
let cursor: string | undefined;
do {
  const page = await fx.search("puppies", { feed: "top", count: 50, cursor });
  cursor = page.cursor.bottom ?? undefined;
} while (cursor);

// Look a profile up by numeric ID
import { byUserId } from "fxtwitter/v2";
await fx.getProfile(byUserId("783214"));
```

The list endpoints report "no results" as a `404` carrying an otherwise normal
body. An empty page is a result rather than an error, so it resolves with
`results: []`. The API uses that same `404` for an unknown handle, which it does
not distinguish from an empty timeline.

`getProfileStatuses` resolves to `null` when `since` is set without a `cursor`
and nothing is newer — the API's documented `204`. Every other method either
resolves with a body or throws.

## v1

### `new FxTwitterV1(options?)`

#### `getStatus(id, options?)`

Fetches a single status by its snowflake ID.

```ts
const { tweet } = await fx.getStatus("20", { translateTo: "es" });
tweet?.translation?.text;
```

| Option | Type | Description |
| --- | --- | --- |
| `translateTo` | `string` | Target language — an ISO 639-1 code (`es`) or locale (`zh-cn`). Adds `translation` to the status |
| `screenName` | `string` | Author handle, for a readable URL. The API resolves the status from `id` alone and never checks it |

Resolves to `{ code, message, tweet }`. `tweet` is `null` when the status could
not be retrieved.

#### `getUser(handle, options?)`

Fetches a user profile by handle, without a leading `@`.

```ts
const { user } = await fx.getUser("jack");
```

Resolves to `{ code, message, user, reason? }`. `user` is absent when the
profile could not be retrieved, and `reason` is `"suspended"` for a suspended
account.

On success, `code` mirrors the HTTP status and `message` is one of `OK`,
`PRIVATE_TWEET`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE` or `API_FAIL`.

Malformed input is rejected before a request is sent, because v1 answers those
cases with HTML or a redirect rather than JSON: a status ID must be 2-20 digits,
and a handle passed to `getUser` must match `\w{1,15}`. A well-formed handle
that does not exist is a normal `404`.

## Errors

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

For a network failure or a timeout there is no response, so `status`, `code`
and `body` are all `undefined` and `message` is a generic description. The
original error is still available as `cause`.

## Requirements

- Node.js >= 22

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

Distributed under the [MIT License](./LICENSE).
