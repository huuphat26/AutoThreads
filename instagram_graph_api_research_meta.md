# Meta Instagram Graph API - Endpoint Research for Next.js

Last checked: 2026-03-02
Audience: engineering / backend-integration

## 1) Executive summary

If your project needs to manage an Instagram professional account (Business or Creator) from a Next.js app, Meta currently exposes two closely related integration paths:

1. **Instagram API with Instagram Login**
   - Host: `https://graph.instagram.com/{version}`
   - Best when you want a more direct Instagram-native auth flow.

2. **Instagram API with Facebook Login**
   - Host: `https://graph.facebook.com/{version}`
   - Best when your org already uses Facebook Login for Business or needs some Facebook-linked capabilities such as **Business Discovery**.

Both paths target **Instagram professional accounts only** (Business and Creator), not personal accounts.

---

## 2) Pick the correct API flavor first

### Instagram API with Instagram Login
Use this when:
- you want a direct Instagram login flow,
- you mainly manage the logged-in user's own professional account,
- you want host consistency on `graph.instagram.com`.

Typical permission names:
- `instagram_business_basic`
- `instagram_business_content_publish`
- `instagram_business_manage_comments`
- `instagram_business_manage_insights`
- `instagram_business_manage_messages`

### Instagram API with Facebook Login
Use this when:
- you already use Facebook Login for Business,
- your integration depends on Facebook Page / Business Manager relationships,
- you need some features documented specifically under this path, especially **Business Discovery**.

Typical permission names:
- `instagram_basic`
- `instagram_content_publish`
- `instagram_manage_comments`
- `instagram_manage_insights`
- plus Facebook/Page permissions such as `pages_show_list`, `pages_read_engagement`
- in some Business Manager cases: `ads_management` or `business_management`

> Recommendation for a new greenfield Next.js app: start by evaluating **Instagram Login** first. If you later need cross-business discovery or existing Facebook business infrastructure, add or migrate to **Facebook Login** where needed.

---

## 3) Permission map by use case

| Use case | Instagram Login | Facebook Login |
|---|---|---|
| Read own profile + own media | `instagram_business_basic` | `instagram_basic` + commonly `pages_show_list`, `pages_read_engagement` |
| Publish post / reel / carousel | `instagram_business_basic`, `instagram_business_content_publish` | `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` |
| Read / reply / hide / delete comments | `instagram_business_basic`, `instagram_business_manage_comments` | `instagram_basic`, `instagram_manage_comments`, `pages_show_list`, `pages_read_engagement` |
| Read account/media insights | `instagram_business_basic`, `instagram_business_manage_insights` | `instagram_basic`, `instagram_manage_insights`, plus page permissions as required |
| Messaging | `instagram_business_basic`, `instagram_business_manage_messages` | check Messaging-specific docs for your exact flow |
| Business Discovery | not the primary documented path | available/documented under Facebook Login |

---

## 4) Core endpoint catalog

> In all examples below, replace:
- `<HOST>` with either `graph.instagram.com` or `graph.facebook.com`
- `<VERSION>` with your selected Graph API version
- `<ACCESS_TOKEN>` with the correct user access token
- `<IG_USER_ID>` with the Instagram professional account ID
- `<IG_MEDIA_ID>` with a media object ID
- `<IG_COMMENT_ID>` with a comment ID
- `<IG_CONTAINER_ID>` with a publishing container ID

---

## 5) Identity / "who am I"

### 5.1 Resolve the logged-in IG user via token

**Endpoint**

```http
GET https://<HOST>/<VERSION>/me?fields=id,user_id,username,name,profile_picture_url&access_token=<ACCESS_TOKEN>
```

**Use when**
- user has just authenticated,
- you want to resolve the IG account bound to the token,
- you want a lightweight bootstrap call before storing account metadata.

**Suggested fields**
- `id`
- `user_id`
- `username`
- `name`
- `profile_picture_url`

**Notes**
- `/me` is a special endpoint that inspects the Instagram User Access Token and resolves the Instagram user who granted it.
- Good first call after login in your OAuth callback flow.

---

## 6) Read the logged-in user's profile

### 6.1 Get own account metadata

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>?fields=id,biography,followers_count,follows_count,media_count,name,profile_picture_url,username,website&access_token=<ACCESS_TOKEN>
```

**Useful fields**
- `id`
- `biography`
- `followers_count`
- `follows_count`
- `media_count`
- `name`
- `profile_picture_url`
- `username`
- `website`

**Good for**
- profile screen in your dashboard,
- caching public profile metadata,
- account onboarding and health checks.

---

## 7) List and read published media

### 7.1 List own media timeline

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>/media?fields=id,caption,comments_count,like_count,media_product_type,media_type,media_url,permalink,shortcode,thumbnail_url,timestamp,username,is_comment_enabled&access_token=<ACCESS_TOKEN>
```

**Use when**
- building a media library,
- syncing all published posts into your DB,
- showing status + engagement overview in admin UI.

**Recommended fields**
- `id`
- `caption`
- `comments_count`
- `like_count`
- `media_product_type` (`FEED`, `STORY`, `REELS`, `AD`)
- `media_type` (`IMAGE`, `VIDEO`, `CAROUSEL_ALBUM`)
- `media_url`
- `permalink`
- `shortcode`
- `thumbnail_url`
- `timestamp`
- `username`
- `is_comment_enabled`

**Important limitations**
- aggregated fields such as `comments_count` and `like_count` do not include ad-generated data,
- some fields are unavailable for album children,
- API returns data for **professional-account-owned media**, not personal-account media.

### 7.2 Read one specific media object

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_MEDIA_ID>?fields=id,caption,comments_count,like_count,media_product_type,media_type,media_url,permalink,shortcode,thumbnail_url,timestamp,username,children,insights&access_token=<ACCESS_TOKEN>
```

**Use when**
- user opens a post detail page,
- you need richer expansion like `children` for a carousel,
- you need to query comment settings or insights on a single object.

### 7.3 Get active stories

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>/stories?fields=id,media_type,media_url,permalink,timestamp&access_token=<ACCESS_TOKEN>
```

**Use when**
- you need current story inventory in your dashboard,
- you want to attach story insights or status panels.

**Limitations**
- responses do not include Live Video stories.

---

## 8) Publishing flow (post / reel / carousel / story)

Publishing is a **multi-step flow**.

### 8.1 Step A - Create an IG Container

**Endpoint**

```http
POST https://<HOST>/<VERSION>/<IG_USER_ID>/media
```

**Common parameters**
- `caption`
- `image_url`
- `video_url`
- `media_type`
- `is_carousel_item`
- `children`
- `share_to_feed`
- `thumb_offset`
- `cover_url`
- `location_id`
- `user_tags`
- `collaborators`
- `upload_type` (used for resumable / rupload flows)

**Typical examples**

Single image:
```http
POST /<IG_USER_ID>/media?image_url=<IMAGE_URL>&caption=<CAPTION>
```

Single video / reel:
```http
POST /<IG_USER_ID>/media?media_type=REELS&video_url=<VIDEO_URL>&caption=<CAPTION>&share_to_feed=true
```

Carousel item:
```http
POST /<IG_USER_ID>/media?image_url=<IMAGE_URL>&is_carousel_item=true
```

Carousel container:
```http
POST /<IG_USER_ID>/media?media_type=CAROUSEL&children=<CONTAINER_ID_1>,<CONTAINER_ID_2>&caption=<CAPTION>
```

**Returned value**
- returns a container ID like:

```json
{ "id": "<IG_CONTAINER_ID>" }
```

### 8.2 Step B - Poll container status

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_CONTAINER_ID>?fields=status,status_code&access_token=<ACCESS_TOKEN>
```

**Why needed**
- a container may still be processing,
- especially important for video / reel uploads.

**Known `status_code` values**
- `IN_PROGRESS`
- `FINISHED`
- `ERROR`
- `EXPIRED`

**Rule of thumb**
- publish only when `status_code=FINISHED`.

### 8.3 Step C - Publish the container

**Endpoint**

```http
POST https://<HOST>/<VERSION>/<IG_USER_ID>/media_publish?creation_id=<IG_CONTAINER_ID>&access_token=<ACCESS_TOKEN>
```

**Returned value**
- published media object ID:

```json
{ "id": "<PUBLISHED_IG_MEDIA_ID>" }
```

### 8.4 Step D - Check content publishing quota before publishing

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>/content_publishing_limit?fields=quota_usage,config&access_token=<ACCESS_TOKEN>
```

**What it returns**
- `quota_usage`
- `config.quota_total`
- `config.quota_duration`

**Important note about quota docs**
Meta's docs currently surface **two different numbers** in search-visible documentation:
- the publishing guide says **100 API-published posts in a 24-hour moving period**,
- the `content_publishing_limit` reference currently says `quota_total` is **50** in `86400` seconds.

**Practical recommendation**
- do **not** hard-code the limit from docs,
- always query `content_publishing_limit` before a publish action and treat the endpoint response as source of truth for runtime enforcement.

---

## 9) Comments and moderation

### 9.1 List comments on a media object

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_MEDIA_ID>/comments?fields=id,text,timestamp,username,like_count,replies_count,hidden&access_token=<ACCESS_TOKEN>
```

**Use when**
- building comment moderation UI,
- loading engagement threads for a post detail page,
- syncing comments to your DB.

**Important limitation**
- non-organic comments on ads are not supported here; for ad comments Meta points to the Marketing API and `effective_instagram_media_id` / `effective_instagram_story_id` flow.

### 9.2 Create a top-level comment on own media

**Endpoint**

```http
POST https://<HOST>/<VERSION>/<IG_MEDIA_ID>/comments?message=<TEXT>&access_token=<ACCESS_TOKEN>
```

**Use when**
- you want to post an owner comment from your app.

### 9.3 Read one comment

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_COMMENT_ID>?fields=id,text,timestamp,username,like_count,replies_count,hidden,media,parent_id&access_token=<ACCESS_TOKEN>
```

### 9.4 Hide / unhide a comment

**Endpoint**

```http
POST https://<HOST>/<VERSION>/<IG_COMMENT_ID>?hide=true&access_token=<ACCESS_TOKEN>
POST https://<HOST>/<VERSION>/<IG_COMMENT_ID>?hide=false&access_token=<ACCESS_TOKEN>
```

**Use when**
- moderators need to soft-moderate user comments.

### 9.5 Delete a comment

**Endpoint**

```http
DELETE https://<HOST>/<VERSION>/<IG_COMMENT_ID>?access_token=<ACCESS_TOKEN>
```

**Notes**
- a comment can only be deleted by the owner of the object on which the comment was made.

### 9.6 Reply to a comment

**Endpoint**

```http
POST https://<HOST>/<VERSION>/<IG_COMMENT_ID>/replies?message=<TEXT>&access_token=<ACCESS_TOKEN>
```

**Important limitations**
- you can only reply to **top-level comments**,
- replies to a reply are attached to the top-level comment,
- you cannot reply to hidden comments,
- live-video comments require different messaging/private-reply handling.

### 9.7 Read replies under a comment

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_COMMENT_ID>/replies?fields=id,text,timestamp,username&access_token=<ACCESS_TOKEN>
```

### 9.8 Private reply to a commenter

**Endpoint family**
- documented under the **Private Replies** guide,
- Meta documents sending a private reply to a commenter on professional posts/reels/stories via the Instagram messaging surface.

**Use when**
- you want a DM-style private follow-up instead of a public comment reply.

---

## 10) Insights / interaction metrics

### 10.1 Media insights

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_MEDIA_ID>/insights?metric=<CSV_METRICS>&access_token=<ACCESS_TOKEN>
```

**Common metrics you will likely use**
- `likes`
- `comments`
- `saved`
- `shares`
- `reach`
- `views`
- `plays`
- `replies`
- `total_interactions`

**Reality check**
- metric availability depends on media type (`FEED`, `STORY`, `REELS`, video, etc.),
- Meta has changed / deprecated some insight behaviors over time,
- some impression-related behavior depends on API version and media creation date.

**Good product usage**
- show different metric presets by media type,
- validate metrics server-side before requesting them in bulk.

### 10.2 Account insights

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>/insights?metric=<CSV_METRICS>&period=<PERIOD>&access_token=<ACCESS_TOKEN>
```

**Common account-level metrics**
- `follower_count`
- `online_followers`
- `reach`
- `views`
- profile/account activity metrics depending on current version

**Known limitations**
- `online_followers` data is only available for the last 30 days,
- `follower_count` and `online_followers` are not available for accounts with fewer than 100 followers.

**Best practice**
- implement a metric registry in code instead of hard-coding one universal set for all accounts / periods.

---

## 11) Mentions, tags, and discovery

### 11.1 Media where the user is tagged

**Endpoint**

```http
GET https://<HOST>/<VERSION>/<IG_USER_ID>/tags?fields=id,caption,media_type,media_url,permalink,timestamp,username&access_token=<ACCESS_TOKEN>
```

**Use when**
- showing tagged media in dashboard,
- building brand monitoring features.

### 11.2 Mentioned media / mentioned comments

Meta documents a Mentions guide for both login flows. The guide covers endpoints for identifying when a Business or Creator account is **tagged** or **@mentioned** in media captions and comments.

**Recommendation**
- treat the Mentions guide as the canonical source for this feature because the surface spans `tags`, `mentioned_media`, and `mentioned_comment` semantics.

### 11.3 Business Discovery (other professional accounts)

**Availability**
- documented as available for **Instagram API with Facebook Login**.

**Pattern**

```http
GET https://graph.facebook.com/<VERSION>/<IG_USER_ID>
  ?fields=business_discovery.username(<TARGET_USERNAME>){followers_count,media_count,website,media{caption,comments_count,like_count,media_type,permalink,timestamp}}
  &access_token=<ACCESS_TOKEN>
```

**Use when**
- competitor monitoring,
- public benchmark dashboards,
- pulling high-level metadata for another business/creator account.

**Notes**
- Business Discovery is for **other** Instagram professional accounts,
- do not confuse it with reading your own account via `/<IG_USER_ID>`.

---

## 12) What you can and cannot manage on already-published posts

### Supported
- read/list posts,
- read a single post,
- read insights,
- list comments,
- reply to comments,
- hide/unhide comments,
- delete comments,
- enable/disable comments on media,
- fetch stories,
- fetch tagged media.

### Not supported / do not assume available
- editing an already-published caption via a normal update endpoint,
- deleting an already-published IG Media object via the standard IG Media endpoint,
- generic "update post" like a CMS PATCH endpoint.

**Important**
- `POST /<IG_MEDIA_ID>` is documented for toggling `comment_enabled`, not for editing caption/media content.
- `DELETE /<IG_MEDIA_ID>` is not supported on the standard IG Media node.

---

## 13) Recommended Next.js integration structure

### 13.1 Environment variables

```bash
META_APP_ID=
META_APP_SECRET=
META_GRAPH_VERSION=v25.0
META_IG_GRAPH_HOST=graph.instagram.com
META_FB_GRAPH_HOST=graph.facebook.com
META_REDIRECT_URI=
```

### 13.2 Suggested server-only API wrapper

Create a server-side module such as:

```ts
// src/lib/meta-ig.ts
export async function igGet(path: string, params: Record<string, string>) {}
export async function igPost(path: string, params: Record<string, string>) {}
export async function igDelete(path: string, params: Record<string, string>) {}
```

### 13.3 Suggested service split

- `instagram-auth.service.ts`
- `instagram-profile.service.ts`
- `instagram-media.service.ts`
- `instagram-publishing.service.ts`
- `instagram-comments.service.ts`
- `instagram-insights.service.ts`
- `instagram-discovery.service.ts`

### 13.4 Suggested DB entities

- `InstagramAccount`
- `InstagramMedia`
- `InstagramComment`
- `InstagramInsightSnapshot`
- `InstagramPublishJob`
- `InstagramOAuthToken`

### 13.5 Safe publish job flow

1. Resolve account via `/me`
2. Query `content_publishing_limit`
3. Create container via `/<IG_USER_ID>/media`
4. Poll container status until `FINISHED`
5. Publish via `/<IG_USER_ID>/media_publish`
6. Read back the published media object
7. Store media ID + permalink + timestamp in DB

### 13.6 Sync flow for dashboard

1. Read `/<IG_USER_ID>` for profile snapshot
2. Read `/<IG_USER_ID>/media`
3. For each media, optionally fetch `/insights`
4. For selected media, fetch `/comments`
5. Upsert into DB with pagination cursors

---

## 14) Minimal endpoint shortlist for a first project version

If you only want the minimum viable integration, start with these:

1. `GET /me`
2. `GET /<IG_USER_ID>?fields=...`
3. `GET /<IG_USER_ID>/media?fields=...`
4. `GET /<IG_MEDIA_ID>?fields=...`
5. `POST /<IG_USER_ID>/media`
6. `GET /<IG_CONTAINER_ID>?fields=status,status_code`
7. `POST /<IG_USER_ID>/media_publish`
8. `GET /<IG_USER_ID>/content_publishing_limit`
9. `GET /<IG_MEDIA_ID>/comments`
10. `POST /<IG_COMMENT_ID>/replies`
11. `GET /<IG_MEDIA_ID>/insights`
12. `GET /<IG_USER_ID>/insights`

This shortlist is enough to build:
- connect account,
- show profile,
- list posts,
- publish content,
- moderate comments,
- show engagement metrics.

---

## 15) High-risk implementation notes

### 15.1 Do not mix hosts casually
- Instagram Login docs use `graph.instagram.com`
- Facebook Login docs use `graph.facebook.com`
- decide per auth flow and keep it explicit in code.

### 15.2 Do not hard-code every metric forever
Insights metrics change over time. Build a per-media-type metric map.

### 15.3 Do not assume post editing/deletion exists
Treat publish as append-only content management unless docs explicitly confirm otherwise.

### 15.4 Always poll container status for video/reel workflows
Publishing immediately after container creation is fragile.

### 15.5 Always gate publishing by runtime quota check
The docs surface inconsistent quota values; query the live endpoint.

---

## 16) Suggested source links (official Meta docs)

Overview
- https://developers.facebook.com/docs/instagram-platform/overview/

Instagram API with Instagram Login
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/

Instagram API with Facebook Login
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/

IG User reference
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/

/me reference
- https://developers.facebook.com/docs/instagram-platform/reference/me/

IG Media reference
- https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/

IG User media edge
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/

IG Container reference
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-container/

Media publish
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/

Content publishing guide
- https://developers.facebook.com/docs/instagram-platform/content-publishing/

Content publishing limit
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit/

Comment moderation
- https://developers.facebook.com/docs/instagram-platform/comment-moderation/

Comments edge
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments/

IG Comment reference
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/

IG Comment replies
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment/replies/

Private replies
- https://developers.facebook.com/docs/instagram-platform/private-replies/

Media insights
- https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/

Account insights
- https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights/

Mentions
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/mentions/

Business Discovery
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/

Permissions reference
- https://developers.facebook.com/docs/permissions/

---

## 17) Final recommendation for your project

For a practical Next.js implementation, I would phase it like this:

### Phase 1
- OAuth login
- `/me`
- own profile
- own media list
- single media detail

### Phase 2
- publish image / reel / carousel
- container polling
- quota check

### Phase 3
- comments + replies + hide/unhide
- media insights + account insights

### Phase 4
- mentions / tagged media
- business discovery
- messaging / private replies if needed

That sequencing keeps your first version small, stable, and review-friendly for Meta App Review.
