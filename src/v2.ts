import { FxTwitterError } from "./errors";
import { type ClientOptions, HttpClient, type QueryValue } from "./http";
import type * as V2 from "./types/v2";

export type FxTwitterV2Options = ClientOptions;

export type RankingMode = "likes" | "recency";
export type SearchFeed = "latest" | "top" | "media";
export type TypeaheadResultType = "events" | "users" | "topics";

/** Per-call cancellation, composed with the client-level `timeout`. */
export interface AbortOptions {
  signal?: AbortSignal;
}

export interface GetStatusOptions extends AbortOptions {
  /** Include `about_account` on the author when available. */
  aboutAccount?: boolean;
  /** ISO 639-1/639-5 target language for inline translation. */
  lang?: string;
}

export interface PageOptions extends AbortOptions {
  /** Page size (1-100, API default 20). */
  count?: number;
  /** Pagination cursor from a prior response. */
  cursor?: string;
}

export interface GetStatusQuotesOptions extends PageOptions {
  lang?: string;
}

export interface GetConversationOptions extends AbortOptions {
  rankingMode?: RankingMode;
  cursor?: string;
  aboutAccount?: boolean;
  lang?: string;
}

export interface GetProfileOptions extends AbortOptions {
  aboutAccount?: boolean;
}

export interface GetProfileStatusesOptions extends PageOptions {
  /**
   * Unix timestamp (seconds, or ms if >= 1e12). When set without `cursor`,
   * the API returns 204 — and this method resolves to `null` — if no post in
   * the page is newer than this instant.
   */
  since?: number;
  withReplies?: boolean;
  /** Return `results` as a mix of `status` and `thread` entries. */
  groupThreads?: boolean;
  lang?: string;
}

export interface GetProfileArticlesOptions extends PageOptions {
  lang?: string;
}

export interface GetProfileMediaOptions extends PageOptions {
  lang?: string;
}

export interface SearchOptions extends PageOptions {
  feed?: SearchFeed;
  lang?: string;
}

export interface TypeaheadOptions extends AbortOptions {
  resultType?: TypeaheadResultType[];
  /** Upstream `src` hint. Defaults to `search_box`. */
  src?: string;
}

export interface TrendsOptions extends AbortOptions {
  /** Number of trends to return (1-50, API default 20). */
  count?: number;
}

/** Builds the `id:<rest_id>` handle form accepted by the profile endpoints. */
export function byUserId(id: string): string {
  return `id:${id}`;
}

/**
 * Recovers the body of a 404 that carries a well-formed, empty result page,
 * which is how the list endpoints report "no results or timeline unavailable".
 */
function emptyPage<T>(error: unknown): T | null {
  if (!(error instanceof FxTwitterError) || error.status !== 404) return null;

  const body = error.body;
  if (typeof body !== "object" || body === null) return null;

  const results = (body as { results?: unknown }).results;
  return Array.isArray(results) ? (body as T) : null;
}

/** Client for the FxTwitter/FxEmbed v2 API (https://docs.fxembed.com/api/twitter/). */
export class FxTwitterV2 {
  private readonly http: HttpClient;

  constructor(options: FxTwitterV2Options = {}) {
    this.http = new HttpClient(options);
  }

  /** Only `/2/profile/{handle}/statuses` can answer 204, so everything else demands a body. */
  private async get<T>(
    path: string,
    query: Record<string, QueryValue> | undefined,
    signal: AbortSignal | undefined
  ): Promise<T> {
    const body = await this.http.get<T>({ path, query, signal });
    if (body === null) {
      throw new FxTwitterError("The API returned an empty response");
    }
    return body;
  }

  /**
   * Same as {@link get}, for the endpoints that report "no results" as a 404
   * carrying an otherwise normal body. An empty page is a result, not an
   * error, so it is returned rather than thrown.
   *
   * The API uses that same 404 for an unknown handle, which it does not
   * distinguish from an empty timeline.
   */
  private async getPage<T>(
    path: string,
    query: Record<string, QueryValue> | undefined,
    signal: AbortSignal | undefined
  ): Promise<T> {
    try {
      return await this.get<T>(path, query, signal);
    } catch (error) {
      const page = emptyPage<T>(error);
      if (page) return page;
      throw error;
    }
  }

  /** `GET /2/status/{id}` — a single post by snowflake ID. */
  getStatus(
    id: string,
    options: GetStatusOptions = {}
  ): Promise<V2.SocialThreadResponse> {
    return this.get<V2.SocialThreadResponse>(
      `/2/status/${encodeURIComponent(id)}`,
      {
        about_account: options.aboutAccount ? "1" : undefined,
        lang: options.lang,
      },
      options.signal
    );
  }

  /** `GET /2/status/{id}/reposts` — users who reposted a post. */
  getStatusReposts(
    id: string,
    options: PageOptions = {}
  ): Promise<V2.UserListResults> {
    return this.getPage<V2.UserListResults>(
      `/2/status/${encodeURIComponent(id)}/reposts`,
      { count: options.count, cursor: options.cursor },
      options.signal
    );
  }

  /** `GET /2/status/{id}/quotes` — posts quoting a post. */
  getStatusQuotes(
    id: string,
    options: GetStatusQuotesOptions = {}
  ): Promise<V2.SearchResults> {
    return this.getPage<V2.SearchResults>(
      `/2/status/${encodeURIComponent(id)}/quotes`,
      { count: options.count, cursor: options.cursor, lang: options.lang },
      options.signal
    );
  }

  /** `GET /2/thread/{id}` — a post with its unrolled thread. */
  getThread(
    id: string,
    options: GetStatusOptions = {}
  ): Promise<V2.SocialThreadResponse> {
    return this.get<V2.SocialThreadResponse>(
      `/2/thread/${encodeURIComponent(id)}`,
      {
        about_account: options.aboutAccount ? "1" : undefined,
        lang: options.lang,
      },
      options.signal
    );
  }

  /** `GET /2/conversation/{id}` — a post, its thread, and ranked replies. */
  getConversation(
    id: string,
    options: GetConversationOptions = {}
  ): Promise<V2.SocialConversationResponse> {
    return this.get<V2.SocialConversationResponse>(
      `/2/conversation/${encodeURIComponent(id)}`,
      {
        ranking_mode: options.rankingMode,
        cursor: options.cursor,
        about_account: options.aboutAccount ? "1" : undefined,
        lang: options.lang,
      },
      options.signal
    );
  }

  /**
   * `GET /2/profile/{handle}` — a user's profile. `handle` is a username
   * without `@`, or `byUserId(id)` for a numeric user ID.
   */
  getProfile(
    handle: string,
    options: GetProfileOptions = {}
  ): Promise<V2.ProfileResponse> {
    return this.get<V2.ProfileResponse>(
      `/2/profile/${encodeURIComponent(handle)}`,
      { about_account: options.aboutAccount ? "1" : undefined },
      options.signal
    );
  }

  /**
   * `GET /2/profile/{handle}/statuses` — a user's posts. Resolves to `null`
   * when `since` is set (without `cursor`) and nothing is newer than it.
   */
  async getProfileStatuses(
    handle: string,
    options: GetProfileStatusesOptions = {}
  ): Promise<V2.SearchResults | V2.GroupedSearchResults | null> {
    type Page = V2.SearchResults | V2.GroupedSearchResults;
    try {
      return await this.http.get<Page>({
        path: `/2/profile/${encodeURIComponent(handle)}/statuses`,
        query: {
          count: options.count,
          cursor: options.cursor,
          since: options.since,
          with_replies: options.withReplies ? "1" : undefined,
          groupthreads: options.groupThreads ? "1" : undefined,
          lang: options.lang,
        },
        signal: options.signal,
      });
    } catch (error) {
      const page = emptyPage<Page>(error);
      if (page) return page;
      throw error;
    }
  }

  /** `GET /2/profile/{handle}/articles` — a user's long-form articles. */
  getProfileArticles(
    handle: string,
    options: GetProfileArticlesOptions = {}
  ): Promise<V2.SearchResults> {
    return this.getPage<V2.SearchResults>(
      `/2/profile/${encodeURIComponent(handle)}/articles`,
      { count: options.count, cursor: options.cursor, lang: options.lang },
      options.signal
    );
  }

  /** `GET /2/profile/{handle}/about` — account metadata (based-in country, name changes). */
  getProfileAbout(
    handle: string,
    options: AbortOptions = {}
  ): Promise<V2.ProfileAboutResponse> {
    return this.get<V2.ProfileAboutResponse>(
      `/2/profile/${encodeURIComponent(handle)}/about`,
      undefined,
      options.signal
    );
  }

  /** `GET /2/profile/{handle}/media` — a user's posts that contain media. */
  getProfileMedia(
    handle: string,
    options: GetProfileMediaOptions = {}
  ): Promise<V2.SearchResults> {
    return this.getPage<V2.SearchResults>(
      `/2/profile/${encodeURIComponent(handle)}/media`,
      { count: options.count, cursor: options.cursor, lang: options.lang },
      options.signal
    );
  }

  /** `GET /2/profile/{handle}/followers` — a user's followers. */
  getProfileFollowers(
    handle: string,
    options: PageOptions = {}
  ): Promise<V2.ProfileRelationshipList> {
    return this.getPage<V2.ProfileRelationshipList>(
      `/2/profile/${encodeURIComponent(handle)}/followers`,
      { count: options.count, cursor: options.cursor },
      options.signal
    );
  }

  /** `GET /2/profile/{handle}/following` — accounts a user follows. */
  getProfileFollowing(
    handle: string,
    options: PageOptions = {}
  ): Promise<V2.ProfileRelationshipList> {
    return this.getPage<V2.ProfileRelationshipList>(
      `/2/profile/${encodeURIComponent(handle)}/following`,
      { count: options.count, cursor: options.cursor },
      options.signal
    );
  }

  /** `GET /2/search` — search posts. */
  search(
    query: string,
    options: SearchOptions = {}
  ): Promise<V2.SearchResults> {
    return this.getPage<V2.SearchResults>(
      "/2/search",
      {
        q: query,
        feed: options.feed,
        count: options.count,
        cursor: options.cursor,
        lang: options.lang,
      },
      options.signal
    );
  }

  /** `GET /2/typeahead` — search-box autocomplete suggestions. */
  typeahead(
    query: string,
    options: TypeaheadOptions = {}
  ): Promise<V2.TypeaheadResponse> {
    return this.get<V2.TypeaheadResponse>(
      "/2/typeahead",
      {
        q: query,
        result_type: options.resultType?.join(","),
        src: options.src,
      },
      options.signal
    );
  }

  /** `GET /2/trends` — trending topics. */
  trends(options: TrendsOptions = {}): Promise<V2.TrendsResponse> {
    return this.get<V2.TrendsResponse>(
      "/2/trends",
      { type: "trending", count: options.count },
      options.signal
    );
  }
}

export type * from "./types/v2";
