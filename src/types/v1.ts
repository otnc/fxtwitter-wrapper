// Types for the FxTwitter v1 API.
//
// There is no live documentation for it: docs.fxtwitter.com redirects to the
// current docs, and the archived FixTweet wiki describes a much older response
// than the API returns today. These types were derived by inspecting live
// responses and cross-checking github.com/FxEmbed/FxEmbed.
//
// The payload largely matches later versions, under a few older names — noted
// per field below.

export interface Facet {
  /** e.g. `url`, `mention`, `hashtag`, `media`. */
  type: string;
  /** Start/end UTF-16 indices. */
  indices: [number, number];
  original?: string;
  replacement?: string;
  display?: string;
  id?: string;
}

export interface RawText {
  text: string;
  facets: Facet[];
}

export interface StatusRawText extends RawText {
  display_text_range: [number, number];
}

export interface Website {
  url: string;
  display_url: string;
}

export type VerificationType =
  "organization" | "government" | "individual" | null;

export interface Verification {
  verified: boolean;
  type: VerificationType;
  verified_at?: string | null;
  identity_verified?: boolean;
  verified_by?: string;
}

/** The author embedded in a status. Same shape as {@link User}, plus `avatar_color`. */
export interface Author {
  id: string;
  name: string;
  screen_name: string;
  url: string;
  description: string;
  raw_description: RawText;
  location: string;
  avatar_url: string | null;
  banner_url: string | null;
  /** @deprecated Always `null` upstream. */
  avatar_color?: string | null;
  followers: number;
  following: number;
  likes: number;
  media_count: number;
  joined: string;
  protected: boolean;
  website: Website | null;
  verification?: Verification;
}

/** The user returned by `GET /:screen_name`. Uses `tweets` where v2 uses `statuses`. */
export interface User extends Author {
  /** Status count. Named `statuses` in the v2 API. */
  tweets: number;
}

export interface Translation {
  text: string;
  source_lang: string;
  source_lang_en: string;
  target_lang: string;
  provider: string;
}

export interface PollChoice {
  label: string;
  count: number;
  /** 0-100. */
  percentage: number;
}

export interface Poll {
  choices: PollChoice[];
  total_votes: number;
  ends_at: string;
  time_left_en: string;
}

export interface VideoFormat {
  container?: "mp4" | "webm" | "m3u8";
  codec?: "h264" | "hevc" | "vp9" | "av1";
  bitrate?: number;
  url: string;
  size?: number;
  height?: number;
  width?: number;
}

export interface Photo {
  id?: string;
  /** MIME type, e.g. `image/jpeg`. */
  format?: string;
  type: "photo" | "gif";
  url: string;
  width: number;
  height: number;
  transcode_url?: string | null;
  altText?: string;
}

export interface Video {
  id?: string;
  /** MIME type, e.g. `video/mp4`. */
  format?: string;
  type: "video" | "gif";
  url: string;
  width: number;
  height: number;
  thumbnail_url?: string | null;
  transcode_url?: string | null;
  duration: number;
  filesize?: number;
  formats?: VideoFormat[];
}

export interface MosaicPhoto {
  id?: string;
  type: "mosaic_photo";
  url?: string;
  width: number;
  height: number;
  formats: {
    webp: string;
    jpeg: string;
  };
}

export interface ExternalMedia {
  /** Currently always `video`. */
  type: string;
  url: string;
  thumbnail_url?: string;
  height?: number;
  width?: number;
  duration?: number;
}

export type AnyMedia = Photo | Video | MosaicPhoto;

export interface StatusMedia {
  /** Preserves the original ordering across photos and videos. */
  all?: AnyMedia[];
  external?: ExternalMedia;
  photos?: Photo[];
  videos?: Video[];
  mosaic?: MosaicPhoto;
}

export interface CommunityNote {
  text: string;
  facets: Facet[];
}

export interface RepostedBy {
  id: string;
  name: string;
  screen_name: string;
  avatar_url?: string | null;
  url?: string;
}

export type TwitterCard =
  "tweet" | "summary" | "summary_large_image" | "player";

export interface Tweet {
  id: string;
  url: string;
  text: string;
  raw_text: StatusRawText;
  created_at: string;
  created_timestamp: number;
  author: Author;
  likes: number;
  /** Named `reposts` in the v2 API. */
  retweets: number;
  replies: number;
  quotes: number;
  views: number | null;
  bookmarks?: number | null;
  lang: string | null;
  /** Screen name of the account being replied to. An object in the v2 API. */
  replying_to: string | null;
  /** Status ID being replied to. Folded into `replying_to` in the v2 API. */
  replying_to_status: string | null;
  source: string | null;
  /** Named `embed_card` in the v2 API. */
  twitter_card: TwitterCard;
  provider?: string;
  possibly_sensitive?: boolean;
  is_note_tweet: boolean;
  community_note: CommunityNote | null;
  reposted_by: RepostedBy | null;
  /** @deprecated Always `null` upstream. */
  color?: string | null;
  quote?: Tweet;
  poll?: Poll;
  /** Only present when a translation target was requested. */
  translation?: Translation;
  media?: StatusMedia;
}

/**
 * `message` values the API maps onto its status codes: 200, 401, 404, 503
 * and 500 respectively.
 */
export type StatusMessage =
  "OK" | "PRIVATE_TWEET" | "NOT_FOUND" | "UPSTREAM_UNAVAILABLE" | "API_FAIL";

export interface StatusResponse {
  /** Mirrors the HTTP status code. */
  code: number;
  message: StatusMessage | string;
  /** `null` when the status could not be retrieved. */
  tweet: Tweet | null;
}

export interface UserResponse {
  /** Mirrors the HTTP status code. */
  code: number;
  message: string;
  /** Omitted entirely when the user could not be retrieved. */
  user?: User;
  /** Set to `suspended` when the account is suspended. */
  reason?: "suspended";
}
