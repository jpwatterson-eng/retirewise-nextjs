# RetireWise API Reference

Complete documentation of all database functions, API routes, and utilities.

---

## Table of Contents

- [Database Functions](#database-functions)
  - [Projects](#projects)
  - [Time Logs](#time-logs)
  - [Journal Entries](#journal-entries)
  - [Insights](#insights)
  - [Conversations](#conversations)
  - [Portfolio](#portfolio)
  - [User Profile](#user-profile)
- [API Routes](#api-routes)
- [Utility Functions](#utility-functions)
- [Hooks](#hooks)

---

## Database Functions

All database functions are accessed through `@/db/unifiedDB`. Authentication is handled automatically.

### Projects

#### `getAllProjects()`
Get all projects for the authenticated user.

```javascript
import { getAllProjects } from '@/db/unifiedDB';

const projects = await getAllProjects();
// Returns: Array<Project>
```

**Returns:**
```javascript
[
  {
    id: string,
    name: string,
    description: string,
    perspective: "builder" | "contributor" | "integrator" | "experimenter",
    status: "active" | "completed" | "paused" | "archived",
    totalHoursLogged: number,
    targetHours: number,
    color: string,
    icon: string,
    createdAt: string,
    updatedAt: string,
    lastWorkedAt: string
  }
]
```

---

#### `getActiveProjects()`
Get only active projects.

```javascript
const activeProjects = await getActiveProjects();
// Returns: Array<Project> (filtered by status === 'active')
```

---

#### `getProject(projectId)`
Get a single project by ID.

```javascript
const project = await getProject('proj_abc123');
// Returns: Project | null
```

**Parameters:**
- `projectId` (string) - The project ID

**Returns:** Project object or null if not found

---

#### `getProjectWithStats(projectId)`
Get project with calculated statistics.

```javascript
const { project, stats } = await getProjectWithStats('proj_abc123');
```

**Returns:**
```javascript
{
  project: Project,
  stats: {
    lastWeekHours: number,
    previousWeekHours: number,
    weeklyChange: number,        // Percentage change
    totalHours: number,
    targetHours: number,
    completionRate: number       // Percentage
  }
}
```

---

#### `createProject(projectData)`
Create a new project.

```javascript
const project = await createProject({
  name: "New Project",
  description: "Project description",
  perspective: "builder",
  status: "active",
  targetHours: 100,
  color: "#3B82F6",
  icon: "Code"
});
// Returns: { id: string, ...projectData }
```

**Parameters:**
```javascript
{
  name: string,              // Required
  description: string,
  perspective: string,       // Required: builder, contributor, integrator, experimenter
  status: string,            // Default: "active"
  motivation?: string,
  goals?: string[],
  tags?: string[],
  targetHours?: number,
  color?: string,
  icon?: string
}
```

---

#### `updateProject(projectId, updates)`
Update an existing project.

```javascript
await updateProject('proj_abc123', {
  status: 'completed',
  totalHoursLogged: 150
});
```

**Parameters:**
- `projectId` (string) - The project ID
- `updates` (object) - Fields to update

---

#### `deleteProject(projectId)`
Delete a project.

```javascript
await deleteProject('proj_abc123');
```

**Parameters:**
- `projectId` (string) - The project ID

---

#### `subscribeToProjects(callback)`
Subscribe to real-time project updates.

```javascript
const unsubscribe = subscribeToProjects((projects) => {
  console.log('Projects updated:', projects);
  setProjects(projects);
});

// Later, unsubscribe
unsubscribe();
```

**Parameters:**
- `callback` (function) - Called with updated projects array

**Returns:** Unsubscribe function

---

### Time Logs

#### `getAllTimeLogs()`
Get all time logs with enriched project data.

```javascript
const timeLogs = await getAllTimeLogs();
```

**Returns:**
```javascript
[
  {
    id: string,
    projectId: string,
    projectName: string,      // Enriched from project
    projectColor: string,     // Enriched from project
    projectIcon: string,      // Enriched from project
    date: string,             // ISO timestamp
    duration: number,         // Hours
    activityType: string,
    description: string,
    energy: number,           // 1-5
    productivity: number,     // 1-5
    enjoyment: number,        // 1-5
    location: string,
    mood: string,
    createdAt: string,
    updatedAt: string
  }
]
```

---

#### `getTodayTimeLogs()`
Get time logs for today only.

```javascript
const todayLogs = await getTodayTimeLogs();
// Returns: Array<TimeLog>
```

---

#### `createTimeLog(logData)`
Create a new time log.

```javascript
const log = await createTimeLog({
  projectId: 'proj_abc123',
  date: new Date().toISOString(),
  duration: 2.5,
  activityType: 'Coding',
  description: 'Implemented new feature',
  energy: 4,
  productivity: 5,
  enjoyment: 5
});
```

**Side Effects:**
- Updates project's `totalHoursLogged`
- Updates project's `lastWorkedAt`

---

#### `updateTimeLog(logId, updates)`
Update an existing time log.

```javascript
await updateTimeLog('log_abc123', {
  duration: 3.0,
  description: 'Updated description'
});
```

**Side Effects:**
- Recalculates project hours if duration or projectId changed

---

#### `deleteTimeLog(logId)`
Delete a time log.

```javascript
await deleteTimeLog('log_abc123');
```

**Side Effects:**
- Updates project's `totalHoursLogged` (subtracts deleted duration)

---

### Journal Entries

#### `getAllJournalEntries()`
Get all journal entries.

```javascript
const entries = await getAllJournalEntries();
```

**Returns:**
```javascript
[
  {
    id: string,
    title: string,
    content: string,
    entryType: "reflection" | "milestone" | "challenge" | "idea",
    projectId?: string,
    tags: string[],
    sentiment: "positive" | "neutral" | "negative",
    date: string,
    createdAt: string,
    updatedAt: string
  }
]
```

---

#### `createJournalEntry(entryData)`
Create a new journal entry.

```javascript
const entry = await createJournalEntry({
  title: "Big Breakthrough",
  content: "Today I realized...",
  entryType: "milestone",
  projectId: 'proj_abc123',
  tags: ["insight", "vision"],
  sentiment: "positive",
  date: new Date().toISOString()
});
```

---

#### `updateJournalEntry(entryId, updates)`
Update a journal entry.

```javascript
await updateJournalEntry('entry_abc123', {
  content: 'Updated content...',
  tags: ['updated', 'tags']
});
```

---

#### `deleteJournalEntry(entryId)`
Delete a journal entry.

```javascript
await deleteJournalEntry('entry_abc123');
```

---

### Insights

#### `getActiveInsights()`
Get all non-dismissed insights.

```javascript
const insights = await getActiveInsights();
```

**Returns:**
```javascript
[
  {
    id: string,
    type: "balance" | "suggestion" | "pattern" | "warning",
    title: string,
    description: string,
    confidence: number,       // 0.0-1.0
    priority: "critical" | "high" | "medium" | "low",
    actionable: boolean,
    suggestedActions: string[],
    dismissed: boolean,
    dismissedAt: string | null,
    dismissReason: string | null,
    actedOn: boolean,
    actedOnAt: string | null,
    userFeedback: string | null,
    basedOn: object,
    createdAt: string,
    lastShownAt: string,
    validUntil: string | null
  }
]
```

---

#### `dismissInsight(insightId, reason?)`
Dismiss an insight.

```javascript
await dismissInsight('insight_abc123', 'Not relevant right now');
```

**Parameters:**
- `insightId` (string) - The insight ID
- `reason` (string, optional) - Why the insight was dismissed

---

#### `markInsightActedOn(insightId)`
Mark an insight as acted upon.

```javascript
await markInsightActedOn('insight_abc123');
```

---

#### `provideFeedback(insightId, feedback)`
Provide feedback on an insight.

```javascript
await provideFeedback('insight_abc123', 'Very helpful!');
```

---

#### `generateInsights()`
Generate new insights based on current data.

```javascript
const insights = await generateInsights();
// Returns: Array<Insight>
```

**Generates insights for:**
- Portfolio balance (overconcentration, missing perspectives)
- Activity patterns
- Project engagement
- Time allocation trends

---

### Conversations

#### `getConversations()`
Get all AI chat conversations.

```javascript
const conversations = await getConversations();
```

**Returns:**
```javascript
[
  {
    id: string,
    title: string,
    conversationType: "general" | "planning" | "reflection",
    messages: Array<Message>,
    messageCount: number,
    archived: boolean,
    favorite: boolean,
    resolved: boolean,
    actionItems: string[],
    tags: string[],
    startedAt: string,
    lastMessageAt: string,
    createdAt: string,
    updatedAt: string
  }
]
```

---

#### `getConversation(conversationId)`
Get a single conversation.

```javascript
const conversation = await getConversation('conv_abc123');
// Returns: Conversation | null
```

---

#### `createConversation(conversationData)`
Create a new conversation.

```javascript
const conversationId = await createConversation({
  title: 'Portfolio Discussion',
  conversationType: 'general',
  messages: [
    {
      role: 'assistant',
      content: 'How can I help?',
      timestamp: new Date().toISOString()
    }
  ]
});
// Returns: string (conversation ID)
```

---

#### `updateConversation(conversationId, updates)`
Update a conversation.

```javascript
await updateConversation('conv_abc123', {
  messages: [...updatedMessages],
  messageCount: updatedMessages.length
});
```

---

#### `deleteConversation(conversationId)`
Delete a conversation.

```javascript
await deleteConversation('conv_abc123');
```

---

### Portfolio

#### `getPortfolio()`
Get portfolio settings and balance.

```javascript
const portfolio = await getPortfolio();
```

**Returns:**
```javascript
{
  targetBalance: {
    builder: number,
    contributor: number,
    integrator: number,
    experimenter: number
  },
  actualBalance: {
    builder: number,
    contributor: number,
    integrator: number,
    experimenter: number
  },
  balanceScore: {
    score: number,
    drift: number,
    grade: string,
    status: string
  },
  lastCalculated: string
}
```

---

#### `updatePortfolio(portfolioData)`
Update portfolio settings.

```javascript
await updatePortfolio({
  targetBalance: {
    builder: 30,
    contributor: 25,
    integrator: 25,
    experimenter: 20
  }
});
```

---

#### `calculatePortfolioBalance()`
Calculate actual balance from time logs.

```javascript
const balance = await calculatePortfolioBalance();
```

**Returns:**
```javascript
{
  actualBalance: {
    builder: number,      // Percentage
    contributor: number,
    integrator: number,
    experimenter: number
  },
  totalHours: number,
  perspectiveHours: {
    builder: number,      // Absolute hours
    contributor: number,
    integrator: number,
    experimenter: number
  },
  lastCalculated: string
}
```

---

#### `getProjectsByPerspective(perspective)`
Get all projects for a specific perspective.

```javascript
const builderProjects = await getProjectsByPerspective('builder');
// Returns: Array<Project>
```

---

#### `getPerspectiveStats()`
Get statistics for each perspective.

```javascript
const stats = await getPerspectiveStats();
```

**Returns:**
```javascript
{
  builder: {
    count: number,        // Number of projects
    hours: number         // Total hours
  },
  contributor: { ... },
  integrator: { ... },
  experimenter: { ... }
}
```

---

### User Profile

#### `getUserProfile()`
Get user profile data.

```javascript
const profile = await getUserProfile();
```

**Returns:**
```javascript
{
  email: string,
  displayName: string,
  portfolio: { ... },
  settings: { ... },
  createdAt: string,
  updatedAt: string
}
```

---

#### `updateUserProfile(updates)`
Update user profile.

```javascript
await updateUserProfile({
  displayName: 'New Name',
  settings: {
    ai: { apiKey: 'sk-ant-...' }
  }
});
```

---

#### `createUserProfile(profileData)`
Create a new user profile (called on signup).

```javascript
await createUserProfile({
  email: 'user@example.com',
  displayName: 'User Name'
});
```

---

## API Routes

### POST /api/chat

AI chat endpoint with Claude integration.

**Request:**
```javascript
POST /api/chat
Content-Type: application/json

{
  messages: [
    { role: "user", content: "How balanced is my portfolio?" }
  ],
  tools: [...],        // Optional: Agentic tools
  system: "..."        // Optional: Custom system prompt
}
```

**Response:**
```javascript
{
  model: "claude-sonnet-4-20250514",
  id: "msg_...",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "Your portfolio balance..."
    }
  ],
  stop_reason: "end_turn",
  usage: {
    input_tokens: 523,
    output_tokens: 187
  }
}
```

**Example Usage:**
```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'What should I focus on?' }
    ],
    system: portfolioAwareSystemPrompt
  })
});

const data = await response.json();
const reply = data.content[0].text;
```

---

## Utility Functions

### Balance Calculator

#### `calculateBalanceScore(actual, target)`

```javascript
import { calculateBalanceScore } from '@/lib/balance-calculator';

const score = calculateBalanceScore(
  { builder: 45, contributor: 20, integrator: 25, experimenter: 10 },
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 }
);
```

**Returns:**
```javascript
{
  score: number,          // 0-100
  drift: number,          // Percentage deviation
  grade: string,          // A, B, C, D
  status: string,         // "Excellent", "Good", etc.
  deviations: [
    {
      perspective: string,
      actual: number,
      target: number,
      deviation: number
    }
  ],
  recommendations: [
    {
      type: string,
      perspective: string,
      message: string
    }
  ]
}
```

---

### AI Prompt Generator

#### `generatePortfolioAwarePrompt(portfolioData)`

```javascript
import { generatePortfolioAwarePrompt } from '@/lib/ai-prompt-generator';

const systemPrompt = generatePortfolioAwarePrompt({
  userName: 'John',
  actualBalance: { builder: 45, ... },
  targetBalance: { builder: 25, ... },
  balanceScore: { score: 65, drift: 17.5, grade: 'C' },
  totalHours: 124,
  activeProjects: 8,
  recentActivity: [...]
});
```

**Returns:** String (system prompt for Claude)

---

## Hooks

### usePortfolioContext

Custom hook to load portfolio context for AI.

```javascript
import { usePortfolioContext } from '@/hooks/usePortfolioContext';

function MyComponent() {
  const { portfolioContext, loading, error, refresh } = usePortfolioContext();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      Balance: {portfolioContext.balanceScore.score}/100
    </div>
  );
}
```

**Returns:**
```javascript
{
  portfolioContext: {
    userName: string,
    actualBalance: object,
    targetBalance: object,
    balanceScore: object,
    totalHours: number,
    activeProjects: number,
    recentActivity: array
  },
  loading: boolean,
  error: Error | null,
  refresh: function
}
```

---

### useAuth

Authentication context hook.

```javascript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return <div>Welcome, {user.email}</div>;
}
```

**Returns:**
```javascript
{
  user: {
    uid: string,
    email: string,
    displayName: string
  } | null,
  loading: boolean
}
```

---

## Error Handling

All database functions throw errors that should be caught:

```javascript
try {
  const projects = await getAllProjects();
  setProjects(projects);
} catch (error) {
  if (error.message.includes('auth')) {
    // Redirect to login
  } else {
    // Show error message
    console.error('Failed to load:', error);
  }
}
```

**Common Error Messages:**
- `"User must be authenticated. Please log in."` - No current user
- `"Permission denied"` - Firestore security rules violation
- `"Document not found"` - Requested document doesn't exist

---

## Rate Limits

- **Firestore**: 1 write per second per document (handled automatically)
- **Claude API**: 50 requests per minute (check Anthropic docs for current limits)

---

## Best Practices

1. **Always use unifiedDB**, never direct Firestore access
2. **Handle errors** with try/catch
3. **Show loading states** during async operations
4. **Use real-time listeners** sparingly (they consume connections)
5. **Batch updates** when modifying multiple documents
6. **Cache portfolio context** during chat sessions

---

**For more information:**
- [DATABASE.md](./DATABASE.md) - Schema details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guide