
# AutoThreads — Auto Content System Plan

This document describes the extension plan for AutoThreads to support:

1. Content Pool System (AI generate posts in advance)
2. Viral Prompt Optimization
3. Topic Strategy for 365 Days

The design **does NOT change the existing project architecture**.

All extensions follow current project rules:

- No database
- AI via `createProvider()`
- Topics defined in `lib/topics.ts`
- JSON persistence in `data/`
- Scheduler logic unchanged
- Browser AI generation via Puter.js

---

# 1. Goals

Current system:

11:58 → AI generate  
12:00 → Post

Potential issues:
- AI delay
- API timeout
- generation failure

Solution:

Introduce a **Content Pool System** where posts are generated **ahead of time**.

Scheduler will then pull content from the pool instead of generating it in real time.

---

# 2. High-Level Architecture

Current Flow

Scheduler  
→ AI Generate  
→ Post to Platforms

New Flow

Topic Rotator  
→ AI Generator  
→ Content Pool (JSON)  
→ Scheduler  
→ Facebook → Threads → Instagram

Important: Scheduler logic **must remain unchanged**.

---

# 3. Content Pool System

## Purpose

Store **300 ready-to-publish posts**.

Benefits:

- Prevent scheduler delays
- Remove AI dependency at posting time
- Enable batch generation

---

## New Files

lib/content-pool.ts  
data/content-pool.json

---

## Data Model

Add to `types/index.ts`

```ts
export interface ContentPoolItem {
  id: string
  topic: ContentTopic
  content: string
  imagePrompt?: string
  createdAt: number
  used: boolean
}
```

---

## JSON Example

data/content-pool.json

```json
{
  "records": [
    {
      "id": "cp_001",
      "topic": "green-refresh",
      "content": "Ly nước ép táo xanh và dưa leo này rất dễ uống...",
      "imagePrompt": "fresh cucumber apple juice in glass, natural sunlight",
      "createdAt": 1710000000,
      "used": false
    }
  ]
}
```

---

## Content Pool Rules

- Maximum pool size: **300**
- Always `unshift()` newest records
- Remove oldest records when exceeding limit
- Used items marked with `used: true`

---

## Content Pool Service

File:

lib/content-pool.ts

Functions:

getPool()  
addToPool()  
getNextContent()  
markContentUsed()  
getUnusedCount()

---

## Scheduler Integration

Inside:

lib/services/auto-scheduler.ts

Instead of:

generateContent()

Use:

const content = getNextContent()

if (!content) {
  generateFallbackContent()
}

Scheduler logic must **not change**.

---

# 4. Batch AI Content Generator

Purpose:

Generate large batches of content in advance.

Target:

300 posts in content pool.

---

## API Route

POST /api/content-pool/generate

Example:

```json
{
  "count": 50
}
```

Flow:

Select Topic  
→ Build Prompt  
→ createProvider()  
→ Generate Content  
→ Save to Pool

---

# 5. Prompt System Upgrade

Current prompt files:

lib/prompts/system.ts  
lib/prompts/user.ts

We introduce a new **strategy layer**.

---

## New File

lib/prompts/strategy.ts

---

## Prompt Layers

System Prompt  
+ Strategy Prompt  
+ Topic Description  
+ User Prompt

---

## Strategy Prompt Example

Goal:

Create engaging content that makes readers want to try the juice immediately.

Structure:

1 hook opening  
1 taste description  
1 ingredient paragraph  
1 preparation paragraph  
1 flavor adjustment tip  
1 drinking suggestion  
1 light CTA

---

## Viral Hook Examples

Examples AI can use:

- Hôm nay thử một ly nước ép rất dễ uống...
- Có một công thức nước ép mình hay làm buổi chiều...
- Nếu hôm nay trời nóng thì thử ly này...

---

# 6. Topic Strategy (365 Days)

Topics remain defined in:

lib/topics.ts

But topic diversity should increase.

---

## Topic Categories

Green juice — 25%  
Fruit juice — 25%  
Energy drinks — 15%  
Morning drinks — 10%  
Afternoon refresh — 10%  
Seasonal drinks — 10%  
Creative mix — 5%

---

## Example Topics

Green

green-refresh  
spinach-energy  
celery-fresh  
cucumber-cool  
green-morning  

Fruit

orange-morning  
apple-sweet  
pineapple-cool  
watermelon-fresh  
mango-smooth  

Energy

banana-energy  
oat-smoothie  
protein-fruit  

---

# 7. Topic Rotation System

New helper:

lib/topic-rotator.ts

---

## Rotation Logic

Shuffle topics and rotate:

topics = shuffle(topics)

for day in 365  
topic = topics[day % topics.length]

Alternative:

Random topic selection.

---

# 8. Image Prompt System

Each content item should include:

imagePrompt

Example:

fresh cucumber apple juice in glass, natural sunlight, healthy lifestyle

These prompts can later support:

- Midjourney
- SDXL
- DALL·E

---

# 9. Pool Refill Strategy

Minimum unused content:

50 posts

When:

unusedCount < 50

Trigger:

generate 100 posts

---

# 10. Full AutoThreads AI Flow

Topic Rotator  
→ Prompt Builder  
→ AI Generator (Puter)  
→ Content Pool  
→ Scheduler  
→ Facebook  
→ Threads  
→ Instagram

---

# 11. Performance Expectations

Pool size: 300 posts  
Daily posts: 2  
Platforms: 3  
AI cost: $0  
Reliability: ~99%

---

# 12. Future Extensions

Possible upgrades without breaking architecture:

AI Image Generation

Content + Image

Hashtag Generator

#nuocep  
#healthy  
#juice

Viral Score System

AI ranks generated content before publishing.

Trend Topic Detection

Use Google Trends or social signals.

---

# 13. Implementation Order

Recommended development order:

1. Content Pool System
2. Batch AI Generator
3. Topic Rotator
4. Prompt Strategy Layer
5. Scheduler Integration
6. Image Prompt Support

---

# 14. Constraints

Must NOT change:

- scheduler logic
- AI provider abstraction
- topic definition system
- JSON persistence approach
- platform services

All additions must remain **modular extensions**.
