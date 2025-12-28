# RetireWise Database Schema

## Overview

RetireWise uses Firebase Firestore as its primary database with a user-centric document structure. All user data is isolated under `users/{userId}/` for security and scalability.

---

## Database Structure

```
firestore/
└── users/
    └── {userId}/                    # User document (root)
        ├── portfolio: object        # Portfolio settings and balance
        ├── settings: object         # User preferences
        ├── createdAt: timestamp
        ├── updatedAt: timestamp
        │
        ├── projects/                # Projects subcollection
        │   └── {projectId}
        │
        ├── timeLogs/                # Time logs subcollection
        │   └── {logId}
        │
        ├── journalEntries/          # Journal entries subcollection
        │   └── {entryId}
        │
        ├── insights/                # AI-generated insights
        │   └── {insightId}
        │
        └── conversations/           # AI chat conversations
            └── {conversationId}
```

---

## User Document

**Path**: `users/{userId}`

### Fields

```javascript
{
  // Identity
  email: string,                    // User email
  displayName: string,              // User display name
  
  // Portfolio
  portfolio: {
    targetBalance: {
      builder: number,              // Target % for Builder (0-100)
      contributor: number,          // Target % for Contributor
      integrator: number,           // Target % for Integrator
      experimenter: number          // Target % for Experimenter
    },
    actualBalance: {
      builder: number,              // Calculated actual %
      contributor: number,
      integrator: number,
      experimenter: number
    },
    balanceScore: {
      score: number,                // 0-100 balance score
      drift: number,                // % deviation from target
      grade: string,                // A, B, C, or D
      status: string               // "Excellent", "Good", etc.
    },
    lastCalculated: string          // ISO timestamp
  },
  
  // Settings
  settings: {
    ai: {
      apiKey: string,               // Anthropic API key
      model: string                 // Claude model version
    },
    notifications: {
      enabled: boolean,
      frequency: string             // "realtime", "daily", "weekly"
    },
    display: {
      theme: string,                // "light" or "dark"
      compactMode: boolean
    }
  },
  
  // Timestamps
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Indexes
- `email` (for authentication)
- `createdAt` (for user queries)

---

## Projects Collection

**Path**: `users/{userId}/projects/{projectId}`

### Fields

```javascript
{
  // Basic Info
  name: string,                     // Project name
  description: string,              // Project description
  perspective: string,              // "builder", "contributor", "integrator", "experimenter"
  
  // Status
  status: string,                   // "active", "completed", "paused", "archived"
  
  // Details
  motivation: string,               // Why this project matters
  goals: string[],                  // Array of project goals
  tags: string[],                   // Custom tags
  
  // Metrics
  totalHoursLogged: number,         // Total hours spent
  targetHours: number,              // Target hours to complete
  
  // Visual
  color: string,                    // Hex color code
  icon: string,                     // Icon name (Lucide)
  
  // Timestamps
  createdAt: timestamp,
  updatedAt: timestamp,
  lastWorkedAt: timestamp           // Last time log entry
}
```

### Indexes
- `perspective` (for filtering)
- `status` (for active/completed queries)
- `lastWorkedAt` (for sorting by recency)
- `createdAt` (for chronological order)

### Example Document
```javascript
{
  name: "RetireWise Development",
  description: "Building an AI-powered portfolio management app",
  perspective: "builder",
  status: "active",
  motivation: "Create tool to help retirees find balance",
  goals: ["Launch MVP", "Get 100 users", "Add AI features"],
  tags: ["coding", "ai", "retirement"],
  totalHoursLogged: 124.5,
  targetHours: 200,
  color: "#3B82F6",
  icon: "Code",
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-12-28T14:30:00Z",
  lastWorkedAt: "2024-12-28T14:30:00Z"
}
```

---

## Time Logs Collection

**Path**: `users/{userId}/timeLogs/{logId}`

### Fields

```javascript
{
  // Reference
  projectId: string,                // Reference to project
  
  // Time
  date: string,                     // ISO date string
  duration: number,                 // Hours (can be decimal)
  
  // Activity
  activityType: string,             // Type of activity
  description: string,              // What was accomplished
  
  // Metrics
  energy: number,                   // 1-5 rating
  productivity: number,             // 1-5 rating
  enjoyment: number,                // 1-5 rating
  
  // Context
  location: string,                 // Where the work happened
  mood: string,                     // Emotional state
  
  // Timestamps
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Indexes
- `projectId` (for project-specific queries)
- `date` (descending, for chronological queries)
- Composite: `projectId + date` (for project timeline)

### Example Document
```javascript
{
  projectId: "proj_abc123",
  date: "2024-12-28T14:00:00Z",
  duration: 2.5,
  activityType: "Coding",
  description: "Implemented AI portfolio context features",
  energy: 4,
  productivity: 5,
  enjoyment: 5,
  location: "Home office",
  mood: "Focused",
  createdAt: "2024-12-28T16:30:00Z",
  updatedAt: "2024-12-28T16:30:00Z"
}
```

---

## Journal Entries Collection

**Path**: `users/{userId}/journalEntries/{entryId}`

### Fields

```javascript
{
  // Content
  title: string,                    // Entry title
  content: string,                  // Full entry text
  
  // Type
  entryType: string,                // "reflection", "milestone", "challenge", "idea"
  
  // References
  projectId: string,                // Associated project (optional)
  tags: string[],                   // Custom tags
  
  // Analysis
  sentiment: string,                // "positive", "neutral", "negative"
  
  // Timestamps
  date: string,                     // Entry date (ISO)
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Indexes
- `date` (descending, for chronological order)
- `projectId` (for project-specific entries)
- `entryType` (for filtering by type)
- `tags` (array contains, for tag searches)

### Example Document
```javascript
{
  title: "Breakthrough with AI Integration",
  content: "Today I realized RetireWise could be the central hub...",
  entryType: "milestone",
  projectId: "proj_abc123",
  tags: ["ai", "vision", "breakthrough"],
  sentiment: "positive",
  date: "2024-12-28T20:00:00Z",
  createdAt: "2024-12-28T20:15:00Z",
  updatedAt: "2024-12-28T20:15:00Z"
}
```

---

## Insights Collection

**Path**: `users/{userId}/insights/{insightId}`

### Fields

```javascript
{
  // Content
  type: string,                     // "balance", "suggestion", "pattern", etc.
  title: string,                    // Insight headline
  description: string,              // Detailed explanation
  
  // Metadata
  confidence: number,               // 0.0-1.0 confidence score
  priority: string,                 // "critical", "high", "medium", "low"
  
  // Actions
  actionable: boolean,              // Can user act on this?
  suggestedActions: string[],       // List of suggested actions
  
  // State
  dismissed: boolean,               // Has user dismissed?
  dismissedAt: string,              // When dismissed (ISO)
  dismissReason: string,            // Why dismissed
  actedOn: boolean,                 // Has user acted?
  actedOnAt: string,                // When acted on
  
  // Feedback
  userFeedback: string,             // User's feedback
  
  // Context
  basedOn: object,                  // Data used to generate insight
  
  // Timestamps
  createdAt: timestamp,             // When generated
  lastShownAt: timestamp,           // Last time shown to user
  validUntil: string                // When insight expires (optional)
}
```

### Indexes
- `dismissed` (for active insights queries)
- `priority` (for sorting by importance)
- `createdAt` (descending, for recent insights)

### Example Document
```javascript
{
  type: "balance",
  title: "Portfolio Heavily Weighted Toward Builder",
  description: "You're spending 45% of your time on Builder projects...",
  confidence: 0.85,
  priority: "medium",
  actionable: true,
  suggestedActions: [
    "Review your portfolio balance",
    "Start a project in an underrepresented perspective"
  ],
  dismissed: false,
  dismissedAt: null,
  dismissReason: null,
  actedOn: false,
  actedOnAt: null,
  userFeedback: null,
  basedOn: {
    perspective: "builder",
    percentage: 45,
    totalHours: 124
  },
  createdAt: "2024-12-28T10:00:00Z",
  lastShownAt: "2024-12-28T10:00:00Z",
  validUntil: "2025-01-04T10:00:00Z"
}
```

---

## Conversations Collection

**Path**: `users/{userId}/conversations/{conversationId}`

### Fields

```javascript
{
  // Metadata
  title: string,                    // Conversation title
  conversationType: string,         // "general", "planning", "reflection"
  
  // Messages
  messages: array,                  // Array of message objects
  messageCount: number,             // Total messages
  
  // State
  archived: boolean,
  favorite: boolean,
  resolved: boolean,
  
  // Context
  actionItems: string[],            // Extracted action items
  tags: string[],                   // Topic tags
  
  // Timestamps
  startedAt: timestamp,
  lastMessageAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Message Object Structure
```javascript
{
  role: string,                     // "user" or "assistant"
  content: string,                  // Message text
  timestamp: string,                // ISO timestamp
  contextUsed: object,              // Context that informed response
  toolsUsed: string[]               // Tools AI used for this response
}
```

### Indexes
- `lastMessageAt` (descending, for recent conversations)
- `archived` (for filtering)
- `favorite` (for starred conversations)

### Example Document
```javascript
{
  title: "Portfolio Balance Discussion",
  conversationType: "general",
  messages: [
    {
      role: "user",
      content: "How balanced is my portfolio?",
      timestamp: "2024-12-28T15:00:00Z",
      contextUsed: null
    },
    {
      role: "assistant",
      content: "Your current balance score is 65/100...",
      timestamp: "2024-12-28T15:00:15Z",
      contextUsed: {
        balanceScore: 65,
        grade: "C"
      },
      toolsUsed: ["analyze_patterns"]
    }
  ],
  messageCount: 2,
  archived: false,
  favorite: false,
  resolved: false,
  actionItems: ["Reduce Builder time", "Increase Experimenter activities"],
  tags: ["balance", "planning"],
  startedAt: "2024-12-28T15:00:00Z",
  lastMessageAt: "2024-12-28T15:00:15Z",
  createdAt: "2024-12-28T15:00:00Z",
  updatedAt: "2024-12-28T15:00:15Z"
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents and all subcollections
    match /users/{userId} {
      // User can only access their own data
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
      // Apply to all subcollections
      match /{document=**} {
        allow read, write: if request.auth != null 
                           && request.auth.uid == userId;
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Data Relationships

```
User (1) ─────── (*) Projects
               │
               └─ (1) Project ────── (*) TimeLogs
                                   │
                                   └─ (*) JournalEntries
                                   │
                                   └─ Referenced in Insights
                                   │
                                   └─ Referenced in Conversations

User (1) ─────── (*) Insights
User (1) ─────── (*) Conversations
```

### Relationship Types
- **One-to-Many**: User → Projects, TimeLogs, etc.
- **Soft References**: projectId fields link documents
- **No Foreign Key Enforcement**: Application-level integrity
- **Denormalization**: Project names stored in time logs for performance

---

## Calculated Fields

### Portfolio Balance
**Calculated from**: Time logs grouped by project perspective
**Stored in**: `users/{userId}/portfolio.actualBalance`
**Recalculated**: On demand via `calculatePortfolioBalance()`

```javascript
actualBalance: {
  builder: (builderHours / totalHours) * 100,
  contributor: (contributorHours / totalHours) * 100,
  integrator: (integratorHours / totalHours) * 100,
  experimenter: (experimenterHours / totalHours) * 100
}
```

### Balance Score
**Calculated from**: Deviation between actual and target balance
**Formula**: Graduated penalty system based on drift percentage

```javascript
drift = sum(|actual - target|) / 2
score = 100 - penalties(drift)
grade = scoreToGrade(score)
```

---

## Data Migration Scripts

### Initialize New User
```javascript
async function initializeUser(userId, email, displayName) {
  await setDoc(doc(db, 'users', userId), {
    email,
    displayName,
    portfolio: {
      targetBalance: {
        builder: 25,
        contributor: 25,
        integrator: 25,
        experimenter: 25
      },
      actualBalance: {
        builder: 0,
        contributor: 0,
        integrator: 0,
        experimenter: 0
      },
      balanceScore: {
        score: 100,
        drift: 0,
        grade: 'A',
        status: 'Excellent Balance'
      },
      lastCalculated: new Date().toISOString()
    },
    settings: {
      ai: { apiKey: '', model: 'claude-sonnet-4-20250514' },
      notifications: { enabled: true, frequency: 'daily' },
      display: { theme: 'light', compactMode: false }
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
```

### Recalculate All Balances
```javascript
async function recalculateAllBalances(userId) {
  const balance = await calculatePortfolioBalance(userId);
  await updatePortfolio(userId, {
    actualBalance: balance.actualBalance,
    lastCalculated: new Date().toISOString()
  });
}
```

---

## Backup Strategy

### Firestore Automatic Backups
- Daily exports to Cloud Storage
- 30-day retention
- Region: Same as Firestore (multi-region)

### Manual Backup
```bash
# Export to JSON
gcloud firestore export gs://[BUCKET_NAME]

# Import from JSON
gcloud firestore import gs://[BUCKET_NAME]/[EXPORT_FOLDER]
```

---

## Performance Optimization

### Indexes Required
```javascript
// Projects
collection: projects
fields: [perspective ASC, createdAt DESC]

// Time Logs
collection: timeLogs
fields: [projectId ASC, date DESC]
fields: [date DESC]

// Insights
collection: insights
fields: [dismissed ASC, priority DESC, createdAt DESC]

// Conversations
collection: conversations
fields: [lastMessageAt DESC]
```

### Query Optimization Tips
- Use `limit()` for large collections
- Order by indexed fields
- Use `where()` before `orderBy()`
- Enable offline persistence
- Use real-time listeners sparingly

---

## Data Retention Policy

- **Time Logs**: Keep indefinitely (user history)
- **Journal Entries**: Keep indefinitely
- **Insights**: Delete after 90 days if dismissed
- **Conversations**: Keep last 50, archive older
- **Projects**: Keep even when completed (for analysis)

---

**For implementation details, see:**
- [API_REFERENCE.md](./API_REFERENCE.md) - Database function documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines