# Activity Timer - Trello Power-Up Technical Reference

## Overview

**Activity Timer** is a sophisticated Trello Power-Up that solves time tracking and estimation challenges within Trello boards. It enables team members to track time spent on cards, set estimates, receive notifications when approaching time limits, and export comprehensive reports.

### The Problem It Solves

Traditional time tracking requires context-switching to external tools, leading to:
- Forgotten time entries
- Inaccurate time logs
- Difficulty correlating work with specific tasks
- No visibility into time vs. estimates
- Complex data export processes

Activity Timer integrates time tracking directly into Trello's UI, making it seamless and context-aware.

---

## Architecture & Technology Stack

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **UI Library**: PrimeVue (DataTable, Dropdown, DatePicker, etc.)
- **Styling**: SCSS + PrimeFlex (utility CSS)
- **TypeScript**: Full type safety throughout
- **Error Tracking**: Sentry for production error monitoring
- **Integration**: Trello Power-Up Client API

### Backend Infrastructure (AWS)
- **API Gateway HTTP**: Webhook receiver for Trello events
- **API Gateway WebSocket**: Real-time communication for auto-timer feature
- **Lambda Functions**:
  - HTTP handler for webhook processing
  - WebSocket handler for connection management
- **DynamoDB**: Stores WebSocket connection mappings (connection_id ↔ member_id)
- **CloudFront + S3**: Static asset delivery
- **Infrastructure as Code**: AWS CDK (TypeScript)

### Development Tools
- **Linting**: ESLint + Prettier
- **Type Checking**: vue-tsc
- **Local Dev**: Vite dev server with HTTPS (mkcert)

---

## Data Storage Architecture

### Trello's Plugin Data System

Activity Timer stores **ALL card data** directly in Trello's native storage using the Trello Power-Up API. This is a key architectural decision that provides:
- No external database for card data
- Data persists with the card forever
- Accessible via Trello's REST API
- Automatic sync across all clients

### Storage Keys & Data Structure

All data is stored in **shared** scope (visible to all board members) using compressed array formats to minimize storage usage.

#### 1. Time Ranges (`act-timer-ranges`)
**Purpose**: Completed time tracking sessions
**Structure**: Array of arrays `[memberId, startTimestamp, endTimestamp]`
**Location**: Card-level, shared scope
**Example**:
```typescript
[
  ["5f1a2b3c4d5e6f7a8b9c0d1e", 1633024800, 1633028400],  // 1 hour session
  ["5f1a2b3c4d5e6f7a8b9c0d1e", 1633032000, 1633035600]   // Another session
]
```

#### 2. Active Timers (`act-timer-running`)
**Purpose**: Currently running timers
**Structure**: Array of arrays `[memberId, listId, startTimestamp]`
**Location**: Card-level, shared scope
**Note**: Only one timer per member per board (automatically stops other timers)
**Example**:
```typescript
[
  ["5f1a2b3c4d5e6f7a8b9c0d1e", "5f9a8b7c6d5e4f3a2b1c0d9e", 1633040000]
]
```

#### 3. Estimates (`act-timer-estimates`)
**Purpose**: Time estimates per member
**Structure**: Array of arrays `[memberId, timeInSeconds]`
**Location**: Card-level, shared scope
**Example**:
```typescript
[
  ["5f1a2b3c4d5e6f7a8b9c0d1e", 7200],  // 2 hours
  ["6a2b3c4d5e6f7a8b9c0d1e2f", 3600]   // 1 hour
]
```

#### 4. Auto-Timer Settings (`act-timer-auto-timer`)
**Purpose**: Enable/disable auto-timer feature
**Structure**: `0` or `1`
**Location**: Board-level, shared scope

#### 5. Auto-Timer List ID (`act-timer-auto-timer-list-id`)
**Purpose**: Which list triggers auto-timer start
**Structure**: Trello list ID string
**Location**: Board-level, shared scope

#### 6. Member Settings (private scope)
**Purpose**: Per-member notification thresholds, UI visibility
**Location**: Member-level, private scope
**Note**: Not synced across members

### Data Access Patterns

**Reading Data**:
```typescript
const ranges = await t.get(cardId, 'shared', 'act-timer-ranges', []);
```

**Writing Data**:
```typescript
await t.set(cardId, 'shared', 'act-timer-ranges', serializedRanges);
```

**Storage Limits**: Trello enforces a 4KB limit per storage key. Activity Timer compresses data by:
1. Using minimal array structures (no property names)
2. Unix timestamps instead of ISO strings
3. Member IDs only (names fetched from Trello API when needed)

---

## Key Components & Their Roles

### Core Data Models

#### `Card` (`src/components/card.ts`)
Central orchestrator for all card-related operations.

**Responsibilities**:
- Fetch/calculate time spent (running timers + completed ranges)
- Start/stop time tracking
- Automatically stop timers on other cards when starting a new one
- Handle threshold validation (prevents saving very short trackings)
- Error handling for storage limit exceeded

**Key Methods**:
- `getRanges()`: Fetch completed time ranges
- `getTimers()`: Fetch active timers
- `getEstimates()`: Fetch estimates
- `startTracking(listId)`: Start timer (stops all other timers first)
- `stopTracking()`: Stop timer and save to ranges
- `getTimeSpent(memberId?)`: Calculate total time

#### `Ranges` (`src/components/ranges.ts`)
Collection class for time tracking sessions.

**Methods**:
- `timeSpent`: Sum of all range durations
- `add(range)`: Add new range
- `serialize()`: Convert to storage format
- `save()`: Persist to Trello
- `filter(fn)`: Filter ranges by predicate

#### `Timers` (`src/components/timers.ts`)
Collection class for active timers.

**Methods**:
- `getByMemberId(id)`: Find specific member's timer
- `startByMember(memberId, listId)`: Start timer for member
- `removeByMemberId(id)`: Remove timer
- `timeSpent`: Current running time for all timers

#### `Estimates` (`src/components/estimates.ts`)
Collection class for time estimates.

**Methods**:
- `getByMemberId(id)`: Get member's estimate
- `totalEstimate`: Sum of all estimates
- `removeByMemberId(id)`: Remove estimate

### Trello Integration (`src/components/trello.ts`)

**Key Functions**:
- `setTrelloInstance(t)`: Store Trello client instance
- `getTrelloInstance()`: Retrieve client for API calls
- `getMemberId()`: Get current member's Trello ID (cached)
- `getValidToken()`: Get REST API token (validates not error token)
- `isAuthorized()`: Check if user authorized REST API access
- `clearToken()`: Clear token & associated webhooks
- `prepareWriteAuth()`: Clear read-only tokens before write operations

**Authorization Pattern**:
Activity Timer uses two authorization modes:
1. **No Auth**: Basic Power-Up features (stored in Trello's plugin data)
2. **REST API Auth**: Required for:
   - Auto-timer webhooks
   - Data export features
   - Calendar view

Users can grant read-only OR read-write access. The app gracefully handles revoking read-only tokens when write access is needed.

### WebSocket System (`src/components/websocket.ts`)

**Purpose**: Real-time communication for auto-timer feature.

**Flow**:
1. User enables auto-timer and selects a list
2. Frontend establishes WebSocket connection
3. Sends `{ listen_member_id: "<memberId>" }` on connect
4. Backend stores connection in DynamoDB
5. When user moves card to configured list:
   - Trello webhook fires
   - HTTP Lambda validates board settings
   - Queries DynamoDB for member's WebSocket connection
   - Sends `{ type: 'startTimer', cardId: '...' }` message
   - Frontend auto-starts timer

**Connection Lifecycle**:
- Auto-reconnects on close (API Gateway 10-min timeout)
- Rate limited (5-second cooldown between reconnects)
- Connection removed from DynamoDB on disconnect

---

## Trello Power-Up Capabilities

Activity Timer implements all major Power-Up extension points:

### 1. Card Badges (`src/capabilities/card-badges/`)
**Displays on card fronts in board view**

Badges shown:
- Clock icon with total time spent
- Calendar icon with estimate (per member or total)
- Visual indicators for time vs estimate

### 2. Card Buttons (`src/capabilities/card-buttons/`)
**Buttons at top of card back**

Four buttons:
- **Start/Stop Timer**: Primary time tracking action
- **Manage Time**: Open time editor modal
- **Notifications**: Configure threshold alerts
- **Settings**: Member-specific settings
- **Time Spent**: View detailed breakdown by member

**Implementation Pattern**:
```typescript
callback: async (t) => {
  return t.popup({
    title: 'Popup Title',
    url: './index.html?page=page-name',
    height: 500
  });
}
```

### 3. Card Back Section (`src/capabilities/card-back-section/`)
**Persistent section at bottom of card**

Shows:
- Current timer status
- Quick actions (Start/Stop, Edit Time, Change Estimate)
- Total time spent summary
- Estimate display

**Components**:
- `view.vue`: Main display component
- `add_time_manually.vue`: Manual time entry modal
- `change_estimate.vue`: Estimate editor

### 4. Board Buttons (`src/capabilities/board-buttons/`)
**Buttons in board menu**

Three buttons:
- **Enable Notifications**: Request browser notification permission
- **Calendar View**: Week calendar with all trackings
- **Settings**: Auto-timer, data export, member preferences

**Premium Features** (requires subscription):
- Data export (Time Tracking & Estimates to CSV)
- Advanced filtering
- Calendar view

### 5. Show Settings (`src/capabilities/show-settings/`)
**Settings menu integration**

Displays:
- Current settings
- Authorization status
- Premium feature access

---

## Backend Infrastructure Details

### HTTP Lambda (`src/api/http/index.js`)

**Purpose**: Webhook receiver for Trello card movement events.

**Security**: Validates webhooks using HMAC-SHA1 signature:
```javascript
const signature = crypto.createHmac('sha1', TRELLO_SECRET)
  .update(body + callbackURL)
  .digest('base64');
```

**Event Flow**:
1. Receive POST from Trello webhook
2. Verify signature (return 410 to de-register if invalid)
3. Check if action is `updateCard` with list change
4. Fetch board's plugin data via Trello API
5. Validate auto-timer is enabled and list matches
6. Query DynamoDB for member's WebSocket connection
7. Send message to connection via API Gateway Management API
8. Handle dead connections (remove from DynamoDB)

**Error Handling**:
- Returns 410 to de-register webhook on persistent errors
- Cleans up stale WebSocket connections
- Validates plugin data to prevent unnecessary processing

### WebSocket Lambda (`src/api/websocket/index.js`)

**Routes**:
- `$connect`: Accept connection
- `$default`: Handle incoming messages (stores member_id mapping)
- `$disconnect`: Clean up DynamoDB entry

**DynamoDB Schema**:
```
connection_id (Partition Key) | member_id | api_id | region | stage
GSI: MemberIdIndex on member_id
```

### Infrastructure Stack (`infrastructure/lib/infrastructure-stack.ts`)

**CDK Stack Creates**:
1. **S3 Bucket**: Static assets
2. **CloudFront Distribution**:
   - CDN for global delivery
   - Security headers injection (CSP, HSTS, X-Content-Type-Options)
   - Custom viewer response function
3. **HTTP API**: Webhook endpoint
4. **WebSocket API**: Real-time communication
5. **DynamoDB Table**: Connection mappings with GSI
6. **Lambda Functions**: HTTP & WebSocket handlers
7. **IAM Roles**: Least-privilege access

**Security Headers** (Required by Trello):
- `Content-Security-Policy`: Restricts resource loading
- `Strict-Transport-Security`: Enforces HTTPS
- `X-Content-Type-Options`: Prevents MIME sniffing

---

## Routing & Pages

### Router (`src/Router.vue`)

**Route Determination**:
1. Check URL query param: `?page=<name>`
2. Check Trello iframe args: `t.args[0].page`

**Available Pages**:
- `card-back-section`: Main card display
- `change-estimate`: Estimate editor
- `add-time-manually`: Manual time entry
- `member-settings`: Personal settings
- `notification-settings`: Alert thresholds
- `settings`: Board-level settings
- `calendar`: Week calendar view (premium)
- `time`: Time tracking data exporter (premium)
- `estimates`: Estimates data exporter (premium)
- `datetime`: Date/time picker component
- `enable-notifications`: Trigger browser permission request

**Theme Support**:
Dynamically loads PrimeVue light/dark theme based on Trello's theme.

---

## Challenges & Solutions

### 1. Storage Limitations
**Challenge**: Trello's 4KB limit per storage key
**Solution**:
- Minimal array structures (no JSON objects with keys)
- Timestamps as Unix integers
- Only store IDs, fetch names on-demand
- Alert users when limit approached

### 2. Cross-Card Timer Management
**Challenge**: Only one timer should run per member
**Solution**: When starting timer, iterate all cards and stop any running timers

### 3. Incognito Mode
**Challenge**: localStorage unavailable in incognito
**Solution**:
```typescript
let incognito = false;
try {
  window.localStorage.getItem('incognito-test');
} catch (e) {
  incognito = true;
}
// Initialize Trello without auth if incognito
```

### 4. Token Authorization Modes
**Challenge**: Users can grant read-only access, but webhooks need write
**Solution**: `prepareWriteAuth()` detects read-only tokens and clears them before write operations

### 5. Dead WebSocket Connections
**Challenge**: Connections persist in DynamoDB after client disconnects unexpectedly
**Solution**:
- Try to send message
- Catch API Gateway error
- Delete connection from DynamoDB

### 6. Webhook Security
**Challenge**: Prevent unauthorized webhook calls
**Solution**: Validate HMAC signature on every request, de-register webhook on failure

### 7. Very Short Time Trackings
**Challenge**: Accidental clicks create 1-second trackings
**Solution**: Threshold setting (default 5 seconds) prevents saving short sessions

### 8. Plugin Disabled Error
**Challenge**: Sentry flooded with "PluginDisabled" errors
**Solution**: Filter these errors in `beforeSend` hook

---

## Development Patterns & Best Practices

### Logging
**Memory**: Logs use `console.debug()` level so they're stripped in production. Only output locally or when debugging.

### Cache Tags
**Memory**: Avoid cache tags due to memory leaks.

### Error Handling
All Trello API calls should be wrapped in try-catch. Card operations that can exceed storage limits should show user-friendly alerts:
```typescript
try {
  await ranges.save();
} catch (e) {
  if ((e + '').includes('4096 characters exceeded')) {
    t.alert({ message: 'Too many time trackings...', duration: 6 });
  }
}
```

### Type Safety
Trello types in `src/types/trello.d.ts` provide full IntelliSense for Power-Up API.

---

## Where to Find Things

### Time Tracking Logic
- **Start/Stop**: `src/components/card.ts` (`startTracking`, `stopTracking`)
- **Timer Display**: `src/capabilities/card-buttons/callbacks/TimeSpent.ts`
- **Manual Entry**: `src/capabilities/card-back-section/add_time_manually.vue`

### Estimation Features
- **Model**: `src/components/estimate.ts`, `src/components/estimates.ts`
- **UI**: `src/capabilities/card-back-section/change_estimate.vue`
- **Badge Display**: `src/capabilities/card-badges/index.ts`

### Notifications
- **Config**: `src/pages/NotificationSettings.vue`
- **Trigger**: `src/utils/notifications.ts`
- **Permission**: `src/Router.vue` (enable-notifications page)

### Auto-Timer
- **Settings**: `src/utils/auto-timer.ts`
- **WebSocket**: `src/components/websocket.ts`
- **Backend Webhook**: `src/api/http/index.js`
- **Backend WebSocket**: `src/api/websocket/index.js`

### Data Export
- **Time Tracking**: `src/pages/DataExporter/TimeTracking/index.vue`
- **Estimates**: `src/pages/DataExporter/Estimates/index.vue`
- **Premium Check**: Look for subscription validation

### Calendar View
- **Implementation**: `src/pages/WeekCalendar/index.vue`
- **Features**: Week navigation, member filtering, visual timeline

### Settings & Configuration
- **Board Settings**: `src/pages/Settings.vue`
- **Member Settings**: `src/pages/MemberSettings.vue`
- **Settings Model**: `src/components/settings.ts`
- **Local Storage**: `src/utils/local-storage.ts`

### UI Components
- **Icon System**: `src/components/UIIcon/`
- **Date Picker**: `src/components/DatetimePicker.vue`
- **Loader**: `src/components/UILoader.vue`

### Infrastructure
- **CDK Stack**: `infrastructure/lib/infrastructure-stack.ts`
- **Deployment**: GitHub Actions (`.github/workflows/`)
- **Environment Vars**: `.env` (local), CDK env vars (production)

---

## Common Tasks

### Adding a New Capability
1. Create directory in `src/capabilities/<capability-name>/`
2. Create `index.ts` with capability function
3. Register in `src/main.ts` initialization
4. Add UI components if needed

### Adding a New Page
1. Create Vue component in `src/pages/`
2. Add route case in `src/Router.vue`
3. Create callback in appropriate capability

### Modifying Data Structure
1. Update model in `src/components/` (e.g., `range.ts`)
2. Update collection class (e.g., `ranges.ts`)
3. Update serialization methods
4. Consider backwards compatibility

### Adding Backend Logic
1. Modify Lambda in `src/api/http/` or `src/api/websocket/`
2. Test locally (requires AWS setup)
3. Update CDK stack if infrastructure changes needed
4. Deploy via `ACT_ENV=dev yarn cdk deploy`

### Debugging Storage Issues
1. Check browser console for storage errors
2. Use Trello's API Explorer: `https://trello.com/power-ups/admin`
3. Inspect card data: `GET /1/cards/{cardId}/pluginData`
4. Check compressed size of serialized data

---

## Environment Variables

### Frontend (`.env`)
```bash
VITE_APP_NAME="Activity timer"           # App name in auth dialogs
VITE_APP_KEY="<trello-api-key>"          # From https://trello.com/app-key
VITE_WEBSOCKET="wss://..."               # WebSocket API endpoint
VITE_API_HOST="..."                      # HTTP API host
VITE_POWERUP_ID="..."                    # Power-Up ID (optional)
VITE_MAILCHIMP_LINK="..."                # Enables Sentry if present
```

### Backend (CDK)
```bash
ACT_ENV=dev|prod                         # Environment
TRELLO_SECRET="<oauth-secret>"           # From https://trello.com/app-key
AWS_REGION="eu-west-1"                   # AWS region
```

---

## Testing & Deployment

### Local Development
```bash
npm install
npm run dev  # Starts Vite on https://localhost:3001
```

**Setup Requirements**:
1. Create Trello team
2. Create Power-Up at https://trello.com/power-ups/admin
3. Set iframe URL to `https://localhost:3001/`
4. Enable capabilities: Board buttons, Card badges, Card buttons, Card back section, Show settings
5. Accept self-signed certificate in browser

### Deployment
**Frontend**: GitHub Actions builds and CDK deploys to S3+CloudFront
**Backend**: CDK synth + deploy creates Lambda functions and APIs

### Code Quality
```bash
npm run lint           # ESLint
npm run lint:fix       # Auto-fix
npm run analyze        # TypeScript checking
npm run build          # Production build
```

---

## Glossary

- **Power-Up**: Trello's term for browser extensions/integrations
- **Capability**: Extension point provided by Trello (e.g., card-badges)
- **Shared Storage**: Data visible to all board members
- **Private Storage**: Data visible only to the member who saved it
- **Range**: Completed time tracking session (start + end time)
- **Timer**: Currently running time tracker (start time only)
- **Estimate**: Expected time for a card (set by each member)
- **Auto-Timer**: Feature that auto-starts timer when card moved to specific list
- **Threshold**: Minimum time required to save a tracking (prevents accidental short entries)
- **Webhook**: HTTP callback from Trello when events occur (card moved, etc.)

---

## Key Insights for AI Assistants

1. **Data is in Trello**: Never suggest external databases for card data. Everything is stored in Trello's plugin data system.

2. **Storage is Limited**: Always consider the 4KB limit. Suggest compression techniques.

3. **Member Context**: Most operations need `memberId`. It's cached in `trello.ts`.

4. **One Timer Rule**: Starting a timer must stop all other timers for that member.

5. **Authorization Modes**: Users can be unauthorized (basic features), read-only (exports), or read-write (webhooks).

6. **WebSocket is Optional**: Auto-timer feature requires WebSocket + webhook setup. Core features work without it.

7. **Premium Features**: Export and calendar are gated. Check for subscription in code.

8. **Incognito Support**: App must work in incognito (no localStorage, no auth).

9. **Theme-Aware**: UI adapts to Trello's light/dark theme dynamically.

10. **Error Recovery**: Storage errors should show helpful alerts, not crash the app.

---

## Related Resources

- **Trello Power-Up Docs**: https://developer.atlassian.com/cloud/trello/power-ups/
- **Trello API Reference**: https://developer.atlassian.com/cloud/trello/rest/
- **AWS CDK Docs**: https://docs.aws.amazon.com/cdk/
- **PrimeVue Docs**: https://primevue.org/

---

*This document is maintained by the Activity Timer team. Last updated: 2025-10-01*

