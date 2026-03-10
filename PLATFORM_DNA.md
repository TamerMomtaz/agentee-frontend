# Platform DNA Report
# A-GENTEE Frontend (The Wave)
# Generated: 2026-03-10
# Extracted by: Claude Code from live codebase

---

## 1. IDENTITY

- **Platform Name:** A-GENTEE (also branded "The Wave")
- **One-Line Purpose:** A bilingual (Arabic/English) AI-powered PWA that combines voice-first chat with a creative comic book writing studio ("Book Mode").
- **Target Users:** Tee (TamerMomtaz) — a creative builder who uses AI to write trilingual comic books, capture voice-based ideas, and manage an AI-assisted creative workflow.
- **Domain:** Creative AI / Voice-First Authoring / Comic Book Production
- **Build Period:** Feb 8, 2026 — Feb 14, 2026 (6 days of intense development across ~48 commits)
- **Current Status:** Live (deployed on Vercel, backend on Railway)
- **Repo Structure:** Separate frontend (this repo) + separate backend (agentee backend on Railway). This repo is frontend-only — a Vite + React SPA.

## 2. TECH STACK (exact versions from package.json)

### Frontend
- **Framework:** React ^18.2.0
- **UI Library:** Custom components (no component library — fully hand-crafted glassmorphism UI)
- **State Management:** React useState + useCallback + useRef (no external state library)
- **Routing:** None — single-page app with mode-based navigation (chat/writing/library), not route-based
- **Build Tool:** Vite ^7.3.1
- **CSS Approach:** Single global CSS file (App.css, ~919 lines) with CSS custom properties, glassmorphism, and extensive animations
- **Key Dependencies (with versions):**
  - react: ^18.2.0
  - react-dom: ^18.2.0
  - @vitejs/plugin-react: ^4.2.0 (dev)
  - vite: ^7.3.1 (dev)
- **Deployment Target:** Vercel (static SPA)

### Backend
- **Framework:** N/A — backend is in a separate repo (agentee backend)
- **Language + Version:** N/A (inferred from API calls: Python/FastAPI based on OpenAPI v6.0.0 reference in api.js comments)
- **ORM / DB Client:** N/A (backend handles this)
- **Auth Approach:** None on frontend — no JWT, no login, no auth tokens. All API calls are unauthenticated.
- **Key Dependencies (with versions):** N/A
- **Deployment Target:** Railway (inferred from default BASE URL: `https://agentee.up.railway.app/api/v1`)

### Database
- **Engine:** Supabase (PostgreSQL) — inferred from api.js history endpoint and Library component patterns
- **Provider:** Supabase (managed)
- **Tables (list ALL table names):** Cannot determine from frontend code alone. Inferred tables from API calls:
  - `ideas` (via POST /ideas, GET /ideas)
  - `history` (via GET /history)
  - `push_subscriptions` (via POST /push/subscribe, POST /push/unsubscribe)
  - `guard_services` or similar (via GET /guard/status, GET /guard/check)
- **Uses RLS:** Unknown from frontend — likely yes given Supabase usage
- **Migration Approach:** Unknown from frontend

### AI Layer (if applicable)
- **Model(s) Used:** Claude Opus ("claude-opus" string in Chat.jsx), Claude Sonnet (default, "claude-sonnet" fallback), Gemini (displayed in splash but not directly called from frontend)
- **API Integration:** Indirect — frontend calls backend `/think` endpoint which routes to AI models. The `opus` toggle on frontend sends `modelOverride: 'claude-opus'` to backend.
- **System Prompts:** One system prompt in WritingSession.jsx for the "Organize with AI" feature — a bilingual comic book chapter organizer that outputs both markdown text AND structured JSON panel configurations.
- **JSON Parse Protection:** YES — WritingSession.jsx line 178 strips markdown code fences from AI JSON output: `const codeBlockMatch = jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/)`
- **Failover:** No explicit failover on frontend. Backend presumably handles model fallback.

### Infrastructure
- **CI/CD:** None configured in repo (no GitHub Actions, no CI config files)
- **Hosting Frontend:** Vercel (vercel.json present with SPA rewrites and security headers)
- **Hosting Backend:** Railway (from default API URL)
- **Environment Variables (list ALL env var names, NOT values):**
  - `VITE_API_URL` — Backend API base URL (used in api.js, push.js, ModeSwitcher.jsx, GuardTeeWidget.jsx)
- **Domain/URLs (from config files):**
  - Default backend: `https://agentee.up.railway.app/api/v1`
  - Frontend: Vercel-deployed (domain not hardcoded)

## 3. ARCHITECTURE PATTERNS

### Auth Pattern
- **How does auth work?** There is NO authentication. All API calls are open/unauthenticated. No JWT, no session cookies, no API keys sent from frontend.
- **Where is the auth middleware?** Nonexistent on frontend.
- **Is there role-based access? What roles?** No.
- **Is there a 401 interceptor on the frontend?** No. The `api()` wrapper in utils/api.js catches errors but does not handle 401 specifically.
- **Is JWT auto-refresh implemented?** No.

### API Pattern
- **REST / GraphQL / RPC?** REST
- **How are routes organized?** Single api.js utility file with named exports for each endpoint. Flat organization, no route grouping.
- **Is there a gateway/aggregator?** The backend acts as a gateway — frontend calls `/think` which routes to different AI models internally.
- **CORS configuration:** Not configured on frontend (it's the client). Backend presumably handles CORS. vercel.json sets security headers (Permissions-Policy, X-Content-Type-Options, X-Frame-Options) but not CORS.
- **Error response format:** Frontend wraps all responses as `{ ok: boolean, data: object|null, error?: string }`. On failure, returns `{ ok: false, data: null, error: err.message }`.

### Data Flow Pattern
- **How does data flow from UI -> API -> DB -> back?**
  1. User speaks or types in Chat/WritingSession
  2. Frontend calls `api()` wrapper which does `fetch(BASE + path)`
  3. Backend processes (AI routing, Supabase storage)
  4. Backend returns JSON response
  5. Frontend updates local React state (`useState`)
  6. Components re-render with new data
- **Are there intermediate services/layers?** The backend acts as an intermediate service — it handles AI model routing, Whisper transcription, voice synthesis, and database operations.
- **Is there an event system / message queue?** Push notifications via Web Push API (service worker + VAPID). No real-time WebSocket or SSE.

### State Management Pattern (Frontend)
- **How is state managed?** Pure React `useState` in App.jsx (top-level) and individual components. No Context API, no Redux, no Zustand. State is passed via props from App to child components.
- **Where is API data cached?** Not cached. Each Library load fetches fresh data. Chat messages are in-memory only — lost on page refresh.
- **How are loading/error states handled?** Each component manages its own loading/error states via useState booleans. ErrorBoundary wraps major sections for crash recovery. Loading states shown as Wave animations and text indicators.

### File Organization Pattern
- **Directory tree:**
  ```
  .
  ├── public/
  │   ├── kahotia/          # Avatar images, icons
  │   ├── manifest.json     # PWA manifest
  │   └── sw.js             # Service worker (cache + push)
  ├── src/
  │   ├── components/       # All React components (13 files)
  │   │   ├── Avatar.jsx
  │   │   ├── Chat.jsx
  │   │   ├── ErrorBoundary.jsx
  │   │   ├── GuardTeeWidget.jsx
  │   │   ├── Library.jsx
  │   │   ├── Mic.jsx
  │   │   ├── ModeSwitcher.jsx
  │   │   ├── NotificationBell.jsx
  │   │   ├── PanelBuilder.jsx
  │   │   ├── PanelPreview.jsx
  │   │   ├── Splash.jsx
  │   │   ├── Wave.jsx
  │   │   └── WritingSession.jsx
  │   ├── hooks/            # Custom React hooks (1 file)
  │   │   └── useSpeechRecognition.js
  │   ├── lib/              # Library utilities (1 file)
  │   │   └── push.js
  │   ├── utils/            # Utility functions (3 files)
  │   │   ├── api.js
  │   │   ├── panelToSVGString.js
  │   │   └── parseDirection.js
  │   ├── App.css
  │   ├── App.jsx
  │   └── main.jsx
  ├── index.html
  ├── package.json
  ├── vercel.json
  ├── vite.config.js
  └── eslint.config.js
  ```
- **How are things grouped?** By type (components/, hooks/, utils/, lib/).
- **Is there a clear separation of concerns?** Yes — clean separation between components, hooks, utilities, and API layer. Each component is a single file. The API layer is centralized in utils/api.js.

## 4. DATABASE SCHEMA (complete)

Cannot determine exact schema from frontend code. Reconstructed from API calls and response shape assumptions:

### Table: ideas
- **Purpose:** Stores user ideas, book chunks, saved chats
- **Columns (inferred):**
  - `id` — primary key
  - `idea` — text content (string)
  - `category` — categorization tag (string: "general", "book_dialogue", "book_narration", "book_direction", "book_idea", "saved_chat", "book_organized")
  - `created_at` — timestamp
- **Relationships:** None inferred
- **Indexes:** Unknown
- **RLS Policies:** Unknown
- **Created How:** Unknown from frontend

### Table: history
- **Purpose:** Conversation history log
- **Columns (inferred):**
  - `id` — primary key
  - Query/response pairs
  - Limit/offset pagination supported
- **Relationships:** Unknown
- **Indexes:** Unknown
- **RLS Policies:** Unknown
- **Created How:** Unknown from frontend

### Table: push_subscriptions (inferred)
- **Purpose:** Stores Web Push subscription endpoints
- **Columns (inferred):**
  - `endpoint` — push endpoint URL (string)
  - `p256dh` — encryption key (string)
  - `auth` — authentication secret (string)
  - `user_agent` — browser user agent (string)
- **Relationships:** None
- **Indexes:** Unknown
- **RLS Policies:** Unknown
- **Created How:** Unknown from frontend

### Table: guard_services (inferred)
- **Purpose:** Health monitoring status for tracked services
- **Columns (inferred):**
  - `service_name` — service identifier (string)
  - `status` — health status ("healthy", "degraded", "down", "unknown")
  - `response_ms` — response time in milliseconds (number)
  - `error` — error message if any (string, nullable)
- **Relationships:** None
- **Indexes:** Unknown
- **RLS Policies:** Unknown
- **Created How:** Unknown from frontend

## 5. API ENDPOINTS (complete)

All endpoints inferred from frontend code (utils/api.js, lib/push.js, ModeSwitcher.jsx, GuardTeeWidget.jsx):

| Method | Path | Auth? | Purpose | Request Body | Response Shape |
|--------|------|-------|---------|-------------|----------------|
| GET | /health | No | Health check + engine status | - | `{status: "alive", components: {mind: {online: "3/3"}}}` |
| POST | /think | No | Send text query to AI | `{query, language, context_window}` | `{response, engine, category, cost, transcript?, voice_id?, timestamp}` |
| POST | /think/audio | No | Send audio blob for Whisper transcription + AI response | FormData: `{audio: blob, language}` | Same as /think + `{transcript}` |
| GET | /voice/:voice_id | No | Fetch generated TTS audio | - | Audio file |
| POST | /ideas | No | Save an idea/chunk | `{idea, category}` | `{id, ...}` |
| GET | /ideas | No | List all saved ideas | - | `{ideas: [...]}` |
| GET | /history | No | Get conversation history | Query: `?limit=20&offset=0` | Array of history entries |
| GET | /stats | No | Get platform statistics | - | Stats object |
| POST | /mode | No | Set behavioral mode | `{mode, voice_personality?, voice_enabled?}` | Confirmation |
| GET | /modes | No | Get available modes + current | - | `{current_mode, ...}` |
| GET | /push/vapid | No | Get VAPID public key | - | `{public_key}` |
| POST | /push/subscribe | No | Register push subscription | `{endpoint, p256dh, auth, user_agent}` | Confirmation |
| POST | /push/unsubscribe | No | Remove push subscription | `{endpoint}` | Confirmation |
| GET | /guard/status | No | Get cached service health statuses | - | `{services: [...]}` |
| GET | /guard/check | No | Run fresh health checks on all services | - | `{services: [...]}` |

## 6. BUGS ENCOUNTERED & FIXES

### Bug: Schema Mismatch — API Field Names
- **Severity:** Critical
- **Category:** Schema
- **Evidence:** api.js comments on lines 1-6: "Corrected: Feb 9 2026 — Aligned with backend OpenAPI v6.0.0 schema. Fixes: field names (query not message, idea not content), transcribe route (/think/audio not /transcribe), voice URL construction from voice_id"
- **Root Cause:** Frontend was using different field names than backend expected. Frontend sent `message` but backend expected `query`. Frontend sent `content` but backend expected `idea`. Frontend called `/transcribe` but endpoint was `/think/audio`.
- **Fix Applied:** Renamed all fields and endpoints to match backend OpenAPI schema. Added inline comments (lines 34, 54, 91) marking the corrections.
- **Prevention Rule:** Always generate frontend API client from backend OpenAPI spec. Never assume field names — validate against the contract.
- **Codex Match:** #6 — Schema mismatch: API vs Frontend field names

### Bug: Speech Recognition Stale Callback
- **Severity:** Critical
- **Category:** UI
- **Evidence:** useSpeechRecognition.js lines 14-19: "★ FIX: Use refs for callbacks so the running recognition always calls the LATEST version". Line 97: "★ FIX: removed onResult/onInterim from deps — refs handle freshness"
- **Root Cause:** When the SpeechRecognition `onresult` handler captured the initial `onResult` callback via closure, it would forever use the stale version. When the user switched writing modes (dialogue → narration), chunks would still be tagged with the old mode.
- **Fix Applied:** Store callbacks in `useRef` instead of closing over them. The running recognition instance always reads from `onResultRef.current` to get the latest callback.
- **Prevention Rule:** In long-running browser APIs (SpeechRecognition, WebSocket, setInterval), NEVER close over React state/callbacks. Always use refs for callback indirection.
- **Codex Match:** NEW PATTERN — "Long-Running Browser API Stale Closure" — React hooks + continuous browser APIs create stale closure bugs when callbacks depend on changing state.

### Bug: AI JSON Parse Failure (Markdown Fences)
- **Severity:** Warning
- **Category:** AI
- **Evidence:** WritingSession.jsx lines 177-180: Code strips markdown code blocks from AI JSON output before parsing.
- **Root Cause:** AI models wrap JSON in ` ```json ... ``` ` markdown fences even when asked not to.
- **Fix Applied:** Regex extraction of JSON from code blocks: `jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/)`
- **Prevention Rule:** ALWAYS strip markdown fences before JSON.parse on AI output. This is universal across all models.
- **Codex Match:** #8 — AI JSON parse failure (markdown fences)

### Bug: Double-Send on Mobile
- **Severity:** Warning
- **Category:** UI
- **Evidence:** Chat.jsx line 27: `const sendingRef = useRef(false); // Double-send guard`. Lines 69-72: Lock check and immediate lock.
- **Root Cause:** Mobile browsers fire both `onClick` and `onSubmit` events, or fire rapid duplicate events on tap. Without a guard, the same message gets sent twice.
- **Fix Applied:** Used a ref (`sendingRef`) as a mutex lock. Set to true immediately before any async work, cleared in `finally` block.
- **Prevention Rule:** All async form submissions on mobile PWAs need a double-send guard. Use a ref (not state) because state updates are batched and not immediate.
- **Codex Match:** NEW PATTERN — "Mobile PWA Double-Send" — touch events on mobile PWAs can fire duplicate submissions.

### Bug: Service Worker Hanging on Push Subscribe
- **Severity:** Warning
- **Category:** Deployment
- **Evidence:** NotificationBell.jsx lines 13-16: "Race against a 3-second timeout — isSubscribed() can hang forever if the service worker never becomes ready". Lines 29-33: Timeout guard on subscribeToPush.
- **Root Cause:** `navigator.serviceWorker.ready` is a promise that never resolves if the service worker fails to register (e.g., in development, or on HTTP). This hangs the notification bell forever.
- **Fix Applied:** `Promise.race([isSubscribed(), timeout])` with a 3-second timeout. Similar 5-second timeout on subscribe/unsubscribe actions.
- **Prevention Rule:** NEVER await `navigator.serviceWorker.ready` without a timeout. Service workers can fail silently.
- **Codex Match:** NEW PATTERN — "Service Worker Ready Hang" — `navigator.serviceWorker.ready` can hang indefinitely if SW registration fails.

### Bug: Clipboard API Fallback
- **Severity:** Info
- **Category:** UI
- **Evidence:** Chat.jsx lines 51-63 and WritingSession.jsx lines 259-273: Both implement fallback clipboard copy using a hidden textarea and `document.execCommand('copy')`.
- **Root Cause:** `navigator.clipboard.writeText()` requires HTTPS and a secure context. On localhost or older browsers, it throws.
- **Fix Applied:** try/catch with textarea fallback.
- **Prevention Rule:** Always implement clipboard fallback for PWAs that may run in insecure contexts.
- **Codex Match:** N/A — minor but universal web pattern.

## 7. AI PROMPTS (if applicable)

### Prompt: Book Mode — AI Chapter Organizer + Panel Configurator
- **Location:** `src/components/WritingSession.jsx` lines 131-161
- **Model:** Whatever model the backend routes to via `/think` (likely Claude Sonnet by default)
- **System Prompt:** (embedded as user message, not system prompt)
  ```
  You are helping Tee write his trilingual comic book (Egyptian Arabic + English). Organize these raw voice captures into a structured chapter draft.

  IMPORTANT: Your response MUST have TWO sections separated by the exact marker "===PANELS===".

  SECTION 1 (before the marker): The organized chapter draft in markdown with:
  1) Dialogue with character names (keep original language as spoken)
  2) Narration passages
  3) Scene directions and visual notes
  4) Keep Egyptian Arabic as-is — do NOT translate it

  SECTION 2 (after the marker): A JSON array of panel configurations for each scene direction. Each panel object should have:
  - "panelNumber": sequential number
  - "layout": one of "wide", "tall", "closeup", "medium", "establishing", "split", "fullpage", "small"
  - "background": one of "city", "ocean", "desert", "sky", "interior", "street", "forest", "mountain", "factory", "space", "abstract" or null
  - "characters": array of { "name", "position", "pose" }
  - "bubbles": array of { "type": "speech"|"thought", "text" }
  - "directionText": the original direction text

  Interpret the poetic/natural language carefully. For example:
  - "واقفة على جنب" → character standing to the side
  - "بيتفرج" → character watching/looking
  - "السحاب ابتدت تجمع" → sky background with clouds
  ```
- **User Message Template:** `Raw captures (${chunks.length} segments):\n${raw}` where raw is formatted as `[TYPE] text` per chunk.
- **Expected Output Format:** Two sections separated by `===PANELS===` marker. First section is markdown text. Second section is a JSON array of panel config objects.
- **Has JSON Fence Stripping:** Yes (line 178)
- **Has Error Handling:** Yes — catches JSON parse failures gracefully (line 186), falls back to empty panels array. Displays error UI if API call fails entirely (line 222).
- **Effectiveness Assessment:** Clever dual-output design using a marker separator. The `===PANELS===` approach is more reliable than asking AI to output pure JSON, because it lets the AI write natural markdown first (which it's good at) and then structured JSON. The fence stripping adds resilience. The prompt includes concrete Arabic examples for cultural/linguistic context, which likely improves output quality. No retry mechanism exists.

## 8. DEPLOYMENT CONFIGURATION

### Backend Deployment
- **Provider:** Railway (inferred from default URL)
- **Start Command:** N/A — backend is in separate repo
- **Build Command:** N/A
- **Root Directory:** N/A
- **Dockerfile:** N/A
- **Health Check:** Yes — frontend calls GET `/health` on mount

### Frontend Deployment
- **Provider:** Vercel
- **Build Command:** `vite build` (from package.json scripts)
- **Output Directory:** `dist` (Vite default)
- **SPA Rewrites:** Yes — `vercel.json`: `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`
- **Security Headers:** Yes — Permissions-Policy (microphone self, camera none), X-Content-Type-Options (nosniff), X-Frame-Options (DENY)
- **Environment Variables:** `VITE_API_URL` (only one)

### Database Deployment
- **Provider:** Supabase (inferred)
- **Migration Method:** Unknown from frontend
- **Backup Strategy:** Unknown from frontend

## 9. WHAT WORKED (positive patterns to replicate)

### 1. Voice-First Architecture with Multi-Mode Tagging
- **Where:** `WritingSession.jsx`, `useSpeechRecognition.js`
- **What:** Users speak, and each voice segment is tagged with a type (dialogue, narration, direction, idea) BEFORE being captured. The mode can be switched while recording is active.
- **Why it works:** This is a genuinely novel interaction pattern. Instead of transcribing everything as flat text and sorting later, the user's intent is captured at the moment of creation. This makes downstream AI processing much more effective because the AI receives pre-categorized input.

### 2. Parser → Builder → Preview Pipeline (parseDirection.js → PanelBuilder.jsx → PanelPreview.jsx)
- **Where:** `src/utils/parseDirection.js`, `src/components/PanelBuilder.jsx`, `src/components/PanelPreview.jsx`
- **What:** A three-stage pipeline: (1) NLP parser extracts scene elements from natural language, (2) Interactive builder lets users refine with tappable chips, (3) Live SVG wireframe preview updates in real-time.
- **Why it works:** This is the "&I" philosophy in action — machine suggests, human decides. The parser provides smart defaults that the user can override. Each layer is independent and composable.

### 3. Bilingual Pattern Detection
- **Where:** `src/utils/parseDirection.js`
- **What:** Regex patterns for both English AND Arabic (including Egyptian dialect) for layout detection, background detection, character positions, and poses.
- **Why it works:** Bilingual support isn't bolted on — it's built into the core parsing logic. Arabic patterns like `لقطة مقربة` (closeup shot) and `واقفة على جنب` (standing to the side) are first-class citizens.

### 4. Ref-Based Callback Indirection for Long-Running APIs
- **Where:** `src/hooks/useSpeechRecognition.js` lines 14-19
- **What:** Using `useRef` to hold the latest callback, so long-running browser APIs always call the current version.
- **Why it works:** Solves the stale closure problem elegantly. Should be a universal pattern in any React app using continuous browser APIs (SpeechRecognition, WebSocket, etc.).

### 5. SVG Wireframe Generator (Both React Component and Raw String)
- **Where:** `src/components/PanelPreview.jsx` (React SVG), `src/utils/panelToSVGString.js` (raw SVG string)
- **What:** Two implementations of the same wireframe renderer — one as a React component for live preview, one as a raw SVG string generator for HTML export.
- **Why it works:** The string version enables generating complete standalone HTML documents with embedded SVG, which can be printed to PDF. Having both versions is deliberate, not duplication.

### 6. Service Worker with Dual Responsibility
- **Where:** `public/sw.js`
- **What:** Single service worker handles both PWA caching (network-first with cache fallback) and push notifications.
- **Why it works:** Clean versioned cache management (`agentee-v2.0`), old caches are purged on activate. Push notification handler gracefully handles both JSON and text payloads.

### 7. Error Boundary Wrapping per Feature Area
- **Where:** `src/App.jsx` lines 109-127
- **What:** Each major section (WritingSession, Library, Chat) is wrapped in its own ErrorBoundary.
- **Why it works:** A crash in Book Mode doesn't kill the whole app. User can recover by clicking "Try Again" which resets just that section.

### 8. Storyboard HTML Export with Print Styles
- **Where:** `src/utils/panelToSVGString.js` function `generateStoryboardHTML()`
- **What:** Generates a complete, self-contained HTML document with embedded SVG panels, dark theme for screen, light theme for print, and auto-print capability.
- **Why it works:** The output is a standalone file with no external dependencies (except a Google Font import). It can be opened in any browser and printed to PDF. The print media query flips to a white background automatically.

## 10. WHAT BROKE OR WAS PAINFUL (anti-patterns to prevent)

### 1. No Authentication At All
- **Where:** Everywhere — `src/utils/api.js`, all components
- **What:** Zero authentication. No JWT, no API key, no session. All backend endpoints are publicly accessible.
- **Why it's a problem:** Anyone who discovers the API URL can read all ideas, send AI queries (costing money), subscribe to push notifications, and read conversation history. This is acceptable for a personal tool but completely unacceptable for any multi-user deployment.
- **What should be done instead:** At minimum, add Supabase Auth with a JWT token attached to all API calls.

### 2. No Data Persistence on Frontend
- **Where:** `src/App.jsx` — `msgs` state
- **What:** Chat messages exist only in React state. Page refresh = everything gone. WritingSession chunks are also in-memory only (though individual chunks are saved to backend via `onChunk`).
- **Why it's a problem:** Users lose their work context on any page refresh, browser crash, or accidental navigation.
- **What should be done instead:** Persist chat messages to localStorage or IndexedDB. Load conversation history from `/history` endpoint on mount.

### 3. Massive Single CSS File
- **Where:** `src/App.css` (919 lines)
- **What:** Every component's styles are in a single global CSS file. No CSS modules, no styled-components, no scoping.
- **Why it's a problem:** Class name collisions are likely as the app grows. No way to tree-shake unused styles. Hard to find which styles belong to which component.
- **What should be done instead:** Use CSS Modules (Vite supports them natively) or move to component-scoped styles.

### 4. BASE URL Hardcoded in Multiple Files
- **Where:** `src/utils/api.js`, `src/lib/push.js`, `src/components/ModeSwitcher.jsx`, `src/components/GuardTeeWidget.jsx`
- **What:** The fallback backend URL `https://agentee.up.railway.app/api/v1` is duplicated in 4 files. The env var `VITE_API_URL` is read independently in each file.
- **Why it's a problem:** If the backend URL changes, you need to update 4 files (or set the env var). DRY violation.
- **What should be done instead:** Define BASE in a single config module and import it everywhere.

### 5. Inline Styles Everywhere
- **Where:** `Library.jsx`, `GuardTeeWidget.jsx`, `ModeSwitcher.jsx`, `NotificationBell.jsx`, `Chat.jsx`
- **What:** Heavy use of inline style objects in JSX instead of CSS classes.
- **Why it's a problem:** Creates new object references on every render (minor perf issue). Makes styles hard to search and maintain. Inconsistent with the CSS-class approach used in other components.
- **What should be done instead:** Move to CSS classes or CSS modules consistently.

### 6. No Routing Library
- **Where:** `src/App.jsx`
- **What:** Navigation between Chat, Book, and Library modes is done via a `mode` state variable. No URL-based routing.
- **Why it's a problem:** Users can't share links to specific modes. Browser back button doesn't work. Refreshing always returns to chat mode.
- **What should be done instead:** Add react-router with hash routing at minimum. Map modes to URLs.

### 7. No Loading/Error States for GuardTee Initial Load
- **Where:** `src/components/GuardTeeWidget.jsx`
- **What:** If the `/guard/status` endpoint fails, the widget shows "No data yet — hit Check" with no error indication.
- **Why it's a problem:** Users can't distinguish between "no services configured" and "backend is unreachable".
- **What should be done instead:** Show a distinct error state when the fetch fails.

### 8. Inconsistent Component Architecture
- **Where:** Various components
- **What:** Some components (ModeSwitcher, GuardTeeWidget) make their own fetch calls directly, bypassing the centralized `api()` wrapper in utils/api.js.
- **Why it's a problem:** Error handling, base URL configuration, and response parsing logic is duplicated. If the API contract changes, some components will break while others are fixed.
- **What should be done instead:** Route ALL API calls through the centralized api.js module.

## 11. UNIQUE CONTRIBUTIONS

### The "&I" Interactive Pipeline: Machine Suggests → Human Decides → Live Preview

This platform introduces a genuinely novel pattern to the DEVONEERS methodology: **the AI-assisted creative pipeline with human override at every stage**.

The `parseDirection.js → PanelBuilder.jsx → PanelPreview.jsx` chain is unique:
1. **NLP Parser** reads natural language (bilingual) and extracts structured scene data
2. **Interactive Builder** presents the parser's suggestions as highlighted chips, but lets the user override every choice
3. **Live SVG Preview** renders the panel wireframe in real-time as the user makes selections
4. **AI Organize** takes all user input and generates BOTH prose AND structured panel configs
5. **Storyboard Export** produces a print-ready HTML document with embedded SVG wireframes

No other platform in the portfolio combines: voice input → typed tagging → NLP parsing → interactive visual configuration → AI enhancement → export. This is the most sophisticated content creation pipeline.

### Voice-First Bilingual Content Capture

The `useSpeechRecognition` hook with its ref-based callback fix is a pattern that should be extracted for any voice-first application. The ability to switch languages (EN/AR) while recording is active, with each chunk tagged by mode AND language, is unique.

### Dual-Format SVG Generation

Having both a React component (`PanelPreview.jsx`) and a string generator (`panelToSVGString.js`) for the same visual output is a pattern worth replicating whenever you need both live interactive previews AND static document generation.

## 12. COMPLEXITY METRICS

- **Total files:** 37 (excluding node_modules, .git)
- **Total lines of code:** 5,981 (excluding node_modules, .git, package-lock.json)
- **Backend files / lines:** 0 / 0 (separate repo)
- **Frontend files / lines:** 37 / 5,981
- **Database migration files / lines:** 0 / 0 (separate repo)
- **Config files:** 5 (package.json, vite.config.js, vercel.json, eslint.config.js, manifest.json)
- **Test files (if any):** 0 — no tests
- **Number of API endpoints:** 15 (called from frontend)
- **Number of database tables:** ~4 (inferred from API)
- **Number of frontend pages/routes:** 3 modes (Chat, Book/Writing, Library) — no URL routing
- **Number of AI prompts/agents:** 1 (Book Mode organizer in WritingSession.jsx)
- **Number of external dependencies (backend):** N/A
- **Number of external dependencies (frontend):** 2 production (react, react-dom) + 2 dev (vite, @vitejs/plugin-react)

## 13. REUSABLE CODE FRAGMENTS

### Fragment: API Wrapper with Error Handling
- **Purpose:** Centralized fetch wrapper that normalizes all API responses
- **Language:** JavaScript (ES Module)
- **Code:**
```javascript
const BASE = import.meta.env.VITE_API_URL || 'https://your-backend.up.railway.app/api/v1';

async function api(path, opts = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error('API error:', path, err);
    return { ok: false, data: null, error: err.message };
  }
}
```
- **Where It's Used:** `src/utils/api.js`
- **Reuse Instructions:** Replace BASE URL. Add auth headers (e.g., `Authorization: Bearer ${token}`) to the headers object. Add 401 interceptor to handle token refresh.

### Fragment: useSpeechRecognition Hook with Ref-Based Fix
- **Purpose:** Crash-proof, stale-closure-proof speech recognition hook for React
- **Language:** JavaScript (React Hook)
- **Code:**
```javascript
import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function useSpeechRecognition({ lang = 'en-US', onResult, onInterim, continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef(null);
  const stopping = useRef(false);
  const supported = !!SpeechRecognition;
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const stop = useCallback(() => {
    stopping.current = true;
    if (recRef.current) { try { recRef.current.stop(); } catch (_) {} }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback((language) => {
    if (!SpeechRecognition) return;
    if (recRef.current) { try { recRef.current.stop(); } catch (_) {} }
    const rec = new SpeechRecognition();
    rec.lang = language || lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    stopping.current = false;
    rec.onresult = (e) => {
      let interimText = '', finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (interimText) { setInterim(interimText); if (onInterimRef.current) onInterimRef.current(interimText); }
      if (finalText) { setInterim(''); if (onResultRef.current) onResultRef.current(finalText); }
    };
    rec.onerror = (e) => { if (e.error !== 'aborted' && e.error !== 'no-speech') setListening(false); };
    rec.onend = () => { if (!stopping.current && continuous) { try { rec.start(); } catch (_) { setListening(false); } } else { setListening(false); } };
    try { rec.start(); recRef.current = rec; setListening(true); } catch (err) { console.error('Speech recognition start failed:', err); }
  }, [lang, continuous]);

  useEffect(() => { return () => { stopping.current = true; if (recRef.current) { try { recRef.current.stop(); } catch (_) {} } }; }, []);
  return { listening, interim, start, stop, supported };
}
```
- **Where It's Used:** `src/hooks/useSpeechRecognition.js`
- **Reuse Instructions:** Import and use with `const speech = useSpeechRecognition({ lang: 'en-US', onResult: (text) => {}, continuous: true })`. The ref-based callback pattern is critical — do not remove it.

### Fragment: ErrorBoundary Component
- **Purpose:** Catch React render errors and show recovery UI
- **Language:** JSX (React Class Component)
- **Code:**
```jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error.message || 'Something went wrong' }; }
  componentDidCatch(err, info) { console.error('ErrorBoundary caught:', err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ color: '#EF5350', fontSize: '0.85rem', textAlign: 'center' }}>{this.state.error}</div>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '6px 16px', borderRadius: 14, border: '1px solid rgba(79,195,247,0.3)', background: 'rgba(79,195,247,0.08)', color: '#4FC3F7', fontSize: '0.75rem', cursor: 'pointer' }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```
- **Where It's Used:** `src/components/ErrorBoundary.jsx`
- **Reuse Instructions:** Wrap any component section: `<ErrorBoundary><YourComponent /></ErrorBoundary>`. Customize styling to match your theme.

### Fragment: Push Notification Subscribe/Unsubscribe
- **Purpose:** Complete Web Push lifecycle — VAPID key fetch, permission request, subscribe, unsubscribe with backend sync
- **Language:** JavaScript (ES Module)
- **Code:** See `src/lib/push.js` (complete — 140 lines)
- **Where It's Used:** `src/lib/push.js`, consumed by `NotificationBell.jsx`
- **Reuse Instructions:** Update BASE URL. Backend needs three endpoints: GET /push/vapid, POST /push/subscribe, POST /push/unsubscribe. The VAPID key conversion (`urlBase64ToUint8Array`) is a standard utility.

### Fragment: Vercel SPA Config with Security Headers
- **Purpose:** Vercel configuration for SPA routing + security headers + microphone permission
- **Language:** JSON
- **Code:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Permissions-Policy", "value": "microphone=(self), camera=()" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```
- **Where It's Used:** `vercel.json`
- **Reuse Instructions:** Copy directly. Add `camera=(self)` if the platform needs camera access. Add CSP header if needed.

### Fragment: JSON Fence Stripping for AI Output
- **Purpose:** Extract clean JSON from AI responses that may wrap JSON in markdown code fences
- **Language:** JavaScript
- **Code:**
```javascript
let cleanJson = jsonPart;
const codeBlockMatch = jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/);
if (codeBlockMatch) {
  cleanJson = codeBlockMatch[1].trim();
}
try {
  const parsed = JSON.parse(cleanJson);
} catch (e) {
  console.warn('Could not parse AI JSON:', e);
}
```
- **Where It's Used:** `src/components/WritingSession.jsx` lines 177-189
- **Reuse Instructions:** Use BEFORE every `JSON.parse()` call on AI-generated output. This pattern should be in every AI service wrapper.

## 14. DEPENDENCY MAP

| Service | Purpose | Required? | Env Var | Fallback |
|---------|---------|-----------|---------|----------|
| A-GENTEE Backend (Railway) | AI routing, database, voice, push | Yes | VITE_API_URL | Hardcoded Railway URL |
| Supabase | Database (ideas, history, push subs) | Yes (via backend) | N/A (backend handles) | None |
| Claude API | AI responses (Sonnet default, Opus optional) | Yes (via backend) | N/A (backend handles) | None on frontend |
| Gemini API | AI responses (alternate engine) | Optional (via backend) | N/A (backend handles) | Claude |
| OpenAI Whisper | Audio transcription | Optional (via backend) | N/A (backend handles) | Browser SpeechRecognition |
| Vercel | Frontend hosting | Yes | N/A | Any static host |
| Google Fonts | Typography (Playfair Display, IBM Plex Sans, IBM Plex Mono) | No (cosmetic) | N/A | System fonts |
| Web Push (VAPID) | Push notifications | No (optional feature) | N/A (backend provides key) | No notifications |
| Web SpeechRecognition API | Browser-native speech-to-text | No (optional) | N/A | Whisper via backend |

## 15. HANDOFF READINESS SCORE

- [3] /5 — **Code organization** — Clean component separation, but single CSS file, inline styles, and duplicated BASE URL hurt readability. A new developer could understand the structure within an hour.
- [2] /5 — **Documentation** — README is minimal (deployment instructions only). No CLAUDE.md. Comments exist in api.js (very helpful) and useSpeechRecognition.js (fix documentation), but most components have no JSDoc.
- [2] /5 — **Error handling** — ErrorBoundary wraps sections (good). API wrapper catches errors (good). But most components silently swallow errors with `.catch(() => {})`. No user-facing error toasts.
- [1] /5 — **Auth completeness** — No authentication whatsoever. No login, no register, no JWT, no RBAC. Critical gap.
- [3] /5 — **Deployment reliability** — Vercel config is solid with SPA rewrites and security headers. Health check exists. But no CI/CD, no automated tests, no env var validation.
- [2] /5 — **Data integrity** — Ideas are saved to backend, but chat messages are ephemeral (in-memory only). No client-side validation. No optimistic updates.
- [3] /5 — **AI reliability** — JSON fence stripping is implemented. Graceful fallback on AI parse failure. But no retry mechanism, no failover model selection on frontend, no streaming.
- [3] /5 — **UI completeness** — Loading states exist (Wave animation, loading text). Empty states exist (Library, WritingSession). Error states are minimal. No skeleton screens.
- [0] /5 — **Testing** — Zero tests. No unit tests, no integration tests, no e2e tests. No test framework configured.
- [3] /5 — **Codex compliance** — Handles #6 (schema mismatch — fixed), #8 (JSON fence stripping — implemented). Missing handling for #1 (CORS — N/A, client-side), #4 (JWT expiry — no auth), #5 ([object Object] — not observed). 3 NEW patterns discovered.

**Total: 22/50**

---

*This Platform DNA Report was extracted from the live codebase of `agentee-frontend` (37 files, 5,981 lines). The platform represents a 6-day sprint of creative AI tooling development with a focus on voice-first bilingual content creation and comic book storyboarding. Its primary unique contribution to the DEVONEERS methodology is the "&I" interactive pipeline pattern: Machine Suggests → Human Decides → Live Preview, implemented across NLP parsing, interactive configuration, and SVG wireframe generation.*
