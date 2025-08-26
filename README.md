# Afriwork Applier

An automated job-matching and application tool for Afriwork. It polls jobs via GraphQL, filters them using stored preferences, prevents duplicates, and sends instant Telegram alerts with “Apply”/“Ignore” options. Powered by AI LLMs (Groq) for generating tailored cover letters.

## Features
- Polls GraphQL endpoint for published jobs (configurable interval & page size)
- Loads user job preferences from MongoDB
- Scores jobs and marks matches above threshold
- Avoids duplicates using stored `jobs_applied` collection
- Persists each processed job with status `matched` or `ignored`
- Sends Telegram notifications for matched jobs with inline Apply/Ignore buttons
- Generates a cover letter draft on Apply using Groq (optional)
- Telegram commands to view & update preferences and manage saved experience

## Configuration
Create a `.env` file:
```
GRAPHQL_ENDPOINT=https://api.afriworket.com/v1/graphql
HASURA_ANON_ROLE=anonymous
POLL_INTERVAL_MS=60000
PAGE_SIZE=5
SCORE_THRESHOLD=8
MONGODB_URI=mongodb://localhost:27017/afriwork
DB_NAME=afriwork
TELEGRAM_BOT_TOKEN=xxxx
TELEGRAM_CHAT_ID=123456
GROQ_API_KEY=sk_xxx  # required only if you want cover letter generation
# Afriwork API auth (for API-based apply)
# If AFRIWORK_BEARER_TOKEN is missing or expired, the app will login using the credentials below
# and cache a fresh token automatically.
AFRIWORK_LOGIN_EMAIL=you@example.com
AFRIWORK_LOGIN_PASSWORD=your-password
AFRIWORK_ORIGIN_PLATFORM_ID=<uuid-from-afriwork>
# Optional: provide an initial token; can be left empty
AFRIWORK_BEARER_TOKEN=
```

## Run
```
npm install
npm run start
```

## Test
```
npm test
```

## Folder Structure
- `src/config` – environment & constants
- `src/integrations` – external service clients (GraphQL, MongoDB, Telegram)
- `src/repositories` – data access layer
- `src/core` – domain logic (scoring)
- `src/services` – orchestration (polling loop)
- `test` – lightweight tests

## Next Ideas
- Add pagination loop to fetch multiple pages
- Implement Telegram inline keyboard for apply/ignore commands via webhook
- Add preference editing API
- Robust logging & metrics
- Deduplicate using unique index on `jobs_applied.job_id`

## Telegram Preference Commands

Inside your Telegram chat with the bot:

1. View current preferences:
```
/pref
```
2. Set (add/update) a weighted preference (category one of roles|skills|locations|experience):
```
/pref set roles frontend 5
```
3. Remove a preference key:
```
/pref del roles frontend
```
Weights should be numbers; higher means more influence on the score.

## Telegram Experience Commands

These let the bot “remember” only your experience summary and use it in cover letters.

1. Show saved experience:
```
/exp
```
2. Save/update your experience:
```
/exp set 5+ years as Planning Engineer using Primavera P6; led schedules for multi-site projects.
```
3. Clear saved experience:
```
/exp clear
```

## Docker (recommended for deployment)

1. Copy environment template and fill values:
```
cp .env.example .env
# edit .env
```

2. Build and start with MongoDB:
```
docker compose up -d --build
```
This starts two services: `mongo` and `app`. The app will connect to `mongodb://mongo:27017/afriwork` inside the compose network.

3. View logs:
```
docker compose logs -f app
```

4. Stop:
```
docker compose down
```

Notes:
- Ensure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `AFRIWORK_BEARER_TOKEN` are set in `.env`.
- The `.dockerignore` excludes heavy/secret files. The app image is built from Node 20 Alpine and runs `node src/index.js`.
