// Types for the FxTwitter/FxEmbed v2 API (https://docs.fxembed.com/api/twitter/),
// transcribed from the machine-readable spec at
// https://api.fxtwitter.com/2/openapi.json.
//
// FxEmbed's v2 API is shared across several platforms (Bluesky, Mastodon,
// Instagram, Threads...), so the OpenAPI spec's unions include a schema per
// platform. This package only ever talks to api.fxtwitter.com, so those
// branches are dropped here in favor of the Twitter-only ones the API
// actually returns for this host.

export interface Facet {
  /** e.g. `url`, `mention`, `hashtag`, `bold`, `media`. */
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

export interface Birthday {
  day?: number;
  month?: number;
  year?: number;
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

export interface AboutAccount {
  based_in?: string | null;
  location_accurate?: boolean;
  created_country_accurate?: boolean | null;
  source?: string | null;
  username_changes?: {
    count: number;
    last_changed_at: string | null;
  };
}

export interface User {
  type: "profile";
  id: string;
  name: string;
  screen_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  description: string;
  raw_description: RawText;
  location: string;
  url: string;
  protected: boolean;
  followers: number;
  following: number;
  statuses: number;
  media_count: number;
  likes: number;
  joined: string;
  website: Website | null;
  birthday?: Birthday | null;
  verification?: Verification;
  /** Only present when the request opted in via `aboutAccount`. */
  about_account?: AboutAccount;
  profile_embed?: boolean;
}

export interface ReplyingTo {
  /** Handle or account id used in permalinks. */
  screen_name: string;
  /** Parent post id (X snowflake). */
  status: string;
  url?: string;
  profile_url?: string;
  display_name?: string;
}

export interface RepostedBy {
  id: string;
  name: string;
  screen_name: string;
  avatar_url?: string | null;
  url?: string;
}

// --- Media -----------------------------------------------------------------

export type VideoContainer = "mp4" | "webm" | "m3u8";
export type VideoCodec = "h264" | "hevc" | "vp9" | "av1";

export interface VideoFormat {
  container?: VideoContainer;
  codec?: VideoCodec;
  bitrate?: number;
  url: string;
  size?: number;
  height?: number;
  width?: number;
}

export interface Photo {
  id?: string;
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
  format?: string;
  type: "video" | "gif";
  url: string;
  width: number;
  height: number;
  thumbnail_url?: string | null;
  transcode_url?: string | null;
  duration: number;
  filesize?: number;
  formats: VideoFormat[];
  publisher?: User | null;
}

export interface MosaicPhoto {
  id?: string;
  format?: string;
  type: "mosaic_photo";
  url: string;
  width: number;
  height: number;
  formats: {
    webp: string;
    jpeg: string;
  };
}

export interface ExternalMedia {
  /** Currently always `video`. */
  type: "video";
  url: string;
  thumbnail_url?: string;
  height?: number;
  width?: number;
}

/** Any other media item shape the API may return that isn't one of the known kinds. */
export interface GenericMedia {
  id?: string;
  format?: string;
  type: string;
  url: string;
  width: number;
  height: number;
}

export type AnyMedia = Photo | Video | MosaicPhoto | GenericMedia;

export type BroadcastState = "LIVE" | "ENDED";
export type BroadcastOrientation = "landscape" | "portrait";

export interface BroadcastThumbnail {
  url: string;
}

export interface Broadcast {
  url: string;
  width: number;
  height: number;
  state: BroadcastState;
  broadcaster: {
    username: string;
    display_name: string;
    id: string;
  };
  stream?: { url: string };
  title: string;
  source: string;
  orientation: BroadcastOrientation;
  broadcast_id: string;
  media_id: string;
  media_key: string;
  is_high_latency: boolean;
  thumbnail: {
    original: BroadcastThumbnail;
    small?: BroadcastThumbnail;
    medium?: BroadcastThumbnail;
    large?: BroadcastThumbnail;
    x_large?: BroadcastThumbnail;
  };
}

export interface StatusMedia {
  external?: ExternalMedia;
  photos?: Photo[];
  videos?: Video[];
  /** Preserves original ordering across photos and videos. */
  all?: AnyMedia[];
  mosaic?: MosaicPhoto;
  broadcast?: Broadcast;
}

export type SubstatusMedia = StatusMedia;

// --- Poll / translation / card ---------------------------------------------

export interface PollChoice {
  label: string;
  count: number;
  percentage: number;
}

export interface Poll {
  choices: PollChoice[];
  total_votes: number;
  ends_at: string;
  time_left_en: string;
}

export interface Translation {
  text: string;
  source_lang: string;
  source_lang_en: string;
  target_lang: string;
  provider: string;
}

export interface CardImage {
  width?: number;
  height?: number;
  url?: string;
  alt?: string;
}

export interface Card {
  url: string;
  title?: string;
  description?: string;
  domain?: string;
  card_name?: string;
  image?: CardImage;
}

export interface CommunityNote {
  text: string;
  facets: Facet[];
}

export type CommunityJoinPolicy = "Open" | "Closed";
export type CommunityInvitesPolicy =
  "MemberInvitesAllowed" | "MemberInvitesDisabled";

export interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  search_tags: string[];
  is_nsfw: boolean;
  topic: string | null;
  admin?: User | null;
  creator?: User | null;
  join_policy?: CommunityJoinPolicy;
  invites_policy?: CommunityInvitesPolicy;
  is_pinned: boolean;
}

// --- Article (X's long-form "articles" feature) -----------------------------

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

interface ColorPalette {
  palette: Array<{ percentage: number; rgb: RgbColor }>;
}

export interface ArticleImageInfo {
  __typename: "ApiImage";
  original_img_height: number;
  original_img_width: number;
  original_img_url: string;
  color_info: ColorPalette;
}

export interface ArticleVideoInfo {
  __typename: "ApiVideo" | "ApiGif";
  type: "video" | "animated_gif";
  id: string;
  id_str: string;
  ext_alt_text: string | null;
  ext_media_color: ColorPalette;
  media_url: string;
  media_url_https: string;
  url: string;
  display_url: string;
  expanded_url: string;
  original_info: { height: number; width: number };
  sizes: { original: { h: number; resize: "fit"; w: number } };
  video_info: {
    aspect_ratio: [number, number];
    duration_millis: number;
    variants: Array<{ bitrate: number; content_type: string; url: string }>;
  };
}

export type ArticleMediaInfo = ArticleImageInfo | ArticleVideoInfo;

export interface ArticleMediaEntity {
  id: string;
  media_key: string;
  media_id: string;
  media_info: ArticleMediaInfo;
}

export interface ArticleContentBlock {
  key: string;
  data: Record<string, unknown>;
  entityRanges: Array<{ key: number; length: number; offset: number }>;
  inlineStyleRanges: Array<{ length: number; offset: number; style: string }>;
  text: string;
  type: string;
}

export interface ArticleMarkdownEntity {
  key: string;
  value: {
    type: "MARKDOWN";
    mutability: "Mutable";
    data: { entityKey: string; markdown: string };
  };
}

export interface ArticleMediaEntityRef {
  key: string;
  value: {
    type: "MEDIA";
    mutability: "Immutable";
    data: {
      entityKey: string;
      mediaItems: Array<{
        localMediaId: string;
        mediaCategory: string;
        mediaId: string;
      }>;
    };
  };
}

export interface ArticleTweetEntity {
  key: string;
  value: {
    type: "TWEET";
    mutability: "Immutable";
    data: { tweetId: string };
  };
}

export type ArticleEntity =
  ArticleMarkdownEntity | ArticleMediaEntityRef | ArticleTweetEntity;

export interface ArticleContent {
  blocks: ArticleContentBlock[];
  entityMap: ArticleEntity[];
}

export interface Article {
  created_at: string;
  modified_at?: string;
  id: string;
  title: string;
  preview_text: string;
  cover_media: ArticleMediaEntity;
  content: ArticleContent;
  media_entities: ArticleMediaEntity[];
}

// --- Status ------------------------------------------------------------------

export type EmbedCard = "tweet" | "summary" | "summary_large_image" | "player";

export interface TwitterStatus {
  type: "status";
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  quote?: TwitterStatus | StatusTombstone;
  poll?: Poll;
  author: User;
  /** Absent on posts without media, despite being marked required upstream. */
  media?: StatusMedia;
  raw_text: StatusRawText;
  lang: string | null;
  /** Only present when translation was requested via `lang`. */
  translation?: Translation;
  /** Omitted upstream rather than sent as `false`. */
  possibly_sensitive?: boolean;
  replying_to: ReplyingTo | null;
  source: string | null;
  embed_card: EmbedCard;
  provider: "twitter";
  views?: number | null;
  bookmarks?: number | null;
  community?: Community;
  article?: Article;
  is_note_tweet: boolean;
  community_note: CommunityNote | null;
  reposted_by: RepostedBy | null;
  card?: Card;
}

export type TombstoneReason =
  "deleted" | "suspended" | "private" | "blocked" | "unavailable";

/** Placeholder returned in place of a quote/thread post that's no longer available. */
export interface StatusTombstone {
  type: "tombstone";
  provider: "twitter";
  reason: TombstoneReason;
  message: string;
  id?: string;
  url?: string;
  author?: User;
}

/**
 * A reply row inside `/2/conversation`. Documented as part of the shared
 * multi-platform schema (its `provider` enum on FxEmbed excludes Twitter),
 * kept here only because the API's own union allows it to appear in
 * `SocialConversationResponse.replies`.
 */
export interface Substatus {
  type: "substatus";
  parent_id: string;
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;
  likes: number;
  reposts: number;
  replies: number;
  author: User;
  media?: SubstatusMedia | null;
  raw_text: RawText;
  lang: string | null;
  possibly_sensitive?: boolean;
  replying_to?: ReplyingTo | null;
  source: string | null;
  embed_card?: EmbedCard;
  provider: "instagram" | "tiktok" | "threads";
  media_pk?: string;
}

export type AnyStatus = TwitterStatus | StatusTombstone;
export type AnyReply = TwitterStatus | StatusTombstone | Substatus;

// --- Response envelopes -------------------------------------------------------

export interface Cursor {
  top: string | null;
  bottom: string | null;
}

/** Response for `/2/status/{id}` and `/2/thread/{id}`. */
export interface SocialThreadResponse {
  code: number;
  status: AnyStatus | null;
  thread: AnyStatus[] | null;
  author: User | null;
}

/** Response for `/2/conversation/{id}`. */
export interface SocialConversationResponse {
  code: number;
  status: AnyStatus | null;
  thread: AnyStatus[] | null;
  replies: AnyReply[] | null;
  author: User | null;
  cursor: { bottom: string | null } | null;
}

export interface SearchResults {
  code: number;
  results: TwitterStatus[];
  cursor: Cursor;
}

export interface UserListResults {
  code: number;
  results: User[];
  cursor: Cursor;
}

/** A grouped conversation snippet, returned when `groupthreads` is set. */
export interface ThreadTimelineEntry {
  type: "thread";
  conversation_id: string;
  statuses: TwitterStatus[];
  all_status_ids?: string[];
  /** True when `statuses` doesn't contain the full conversation. */
  truncated: boolean;
}

export type TimelineEntry = TwitterStatus | ThreadTimelineEntry;

export interface GroupedSearchResults {
  code: number;
  results: TimelineEntry[];
  cursor: Cursor;
}

export interface ProfileRelationshipList {
  code: number;
  results: User[];
  cursor: Cursor;
}

export interface ProfileResponse {
  code: number;
  message?: string;
  user?: User;
  /** Set to `suspended` when the user is suspended. */
  reason?: "suspended";
  id?: string;
}

export interface ProfileAboutResponse {
  code: number;
  message?: string;
  about_account?: AboutAccount;
}

export interface TypeaheadTopic {
  topic: string;
  result_context?: {
    display_string?: string;
    redirect_url?: string;
    types?: Array<{ type: string }>;
  };
}

export interface TypeaheadEvent {
  topic: string;
  url?: string;
  supporting_text?: string;
  primary_image?: {
    url: string;
    width?: number;
    height?: number;
  };
}

export interface TypeaheadResponse {
  code: number;
  query: string;
  num_results: number;
  users: User[];
  topics: TypeaheadTopic[];
  events: TypeaheadEvent[];
}

export interface Trend {
  name: string;
  rank: string | null;
  context: string | null;
  grouped_topics?: Array<{ name: string }>;
}

export interface TrendsResponse {
  code: number;
  message?: string;
  timeline_type: string;
  trends: Trend[];
  cursor: Cursor;
}

/** Body returned for 400 responses (invalid path/query parameters). */
export interface QueryError {
  code: 400;
  message: string;
}
