# RetireWise Architecture

## Overview

RetireWise is built on a modern, serverless architecture using Next.js 15 with the App Router, Firebase for backend services, and Anthropic Claude for AI capabilities.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router                                       │
│  ├── Pages (app/)                                            │
│  ├── Components (React 18)                                   │
│  ├── Contexts (AuthContext)                                  │
│  └── Hooks (usePortfolioContext)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Database Abstraction (db/)                                  │
│  ├── unifiedDB.js (Authentication + Routing)                │
│  │   ├── requireAuth()                                       │
│  │   └── Exports: getAllProjects(), createTimeLog(), etc.   │
│  └── firestore/                                              │
│      └── firestoreDB.js (Direct Firestore Operations)       │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  ├── API Routes (app/api/)                                   │
│  │   └── /api/chat (Claude AI integration)                  │
│  ├── AI Service (services/aiService.js)                     │
│  │   ├── Agentic tools                                       │
│  │   └── Portfolio context generation                       │
│  └── Libraries (lib/)                                        │
│      └── ai-prompt-generator.js                             │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│  ├── Firebase Authentication                                 │
│  ├── Firestore Database                                      │
│  │   ├── users/{userId}                                      │
│  │   ├── projects/                                           │
│  │   ├── timeLogs/                                           │
│  │   └── conversations/                                      │
│  └── Anthropic Claude API                                    │
│      └── claude-sonnet-4-20250514                           │
└─────────────────────────────────────────────────────────────┘
                            ↓↑
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Vercel Platform                                             │
│  ├── Edge Functions (API routes)                            │
│  ├── Static Assets (CDN)                                     │
│  └── Automatic HTTPS                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### 1. **Offline-First Architecture**
- Firestore persistent cache enabled
- Local-first data mutations
- Background synchronization
- Conflict-free merges

### 2. **Authentication-First Design**
- All operations require authentication
- User ID injected at database layer
- No direct userId passing in components
- Automatic data isolation

### 3. **Layered Abstraction**
```
Components → unifiedDB → firestoreDB → Firestore
```
- Components never access Firestore directly
- unifiedDB provides authentication layer
- firestoreDB handles raw operations
- Clean separation of concerns

### 4. **Portfolio-Centric AI**
- AI system prompts enriched with portfolio context
- Real-time balance calculation
- Agentic tools for data retrieval
- Context-aware recommendations

---

## Data Flow

### Read Operation Flow
```
1. User opens Portfolio Dashboard
   ↓
2. Component calls: getAllProjects()
   ↓
3. unifiedDB.getAllProjects()
   - Calls requireAuth() → gets userId
   - Calls firestoreDB.getProjects(userId)
   ↓
4. firestoreDB.getProjects(userId)
   - Queries: users/{userId}/projects
   - Returns: Array of project documents
   ↓
5. Data flows back to component
   - Component updates state
   - UI re-renders with data
```

### Write Operation Flow
```
1. User creates a project
   ↓
2. Component calls: createProject(projectData)
   ↓
3. unifiedDB.createProject(projectData)
   - Calls requireAuth() → gets userId
   - Calls firestoreDB.createProject(userId, projectData)
   ↓
4. firestoreDB.createProject(userId, projectData)
   - Adds to: users/{userId}/projects
   - Returns: Generated document ID
   ↓
5. Real-time listener notifies other tabs
   ↓
6. UI updates automatically
```

### AI Chat Flow with Portfolio Context
```
1. User opens AI Chat
   ↓
2. usePortfolioContext hook loads:
   - Portfolio settings
   - Time logs
   - Projects
   - Balance calculation
   ↓
3. User sends message
   ↓
4. generatePortfolioAwarePrompt(portfolioContext)
   - Creates enriched system prompt
   - Includes balance score, targets, recent activity
   ↓
5. sendMessage(userInput, history, systemPrompt)
   - Sends to /api/chat
   - API forwards to Claude with context
   ↓
6. Claude may use agentic tools:
   - get_recent_activity
   - search_journal
   - analyze_patterns
   - get_project_details
   ↓
7. Response includes portfolio-aware advice
   ↓
8. Conversation saved to Firestore
```

---

## Component Architecture

### Component Hierarchy
```
App Layout (app/layout.js)
├── AuthProvider (AuthContext)
│   ├── Navigation
│   └── Page Content
│       ├── Dashboard (portfolio/page.js)
│       │   ├── PortfolioDashboard
│       │   ├── InsightsPanel
│       │   └── ProjectsList
│       ├── AI Chat (chat/page.js)
│       │   └── AIChat
│       │       └── usePortfolioContext
│       ├── Analytics (analytics/page.js)
│       │   └── AnalyticsDashboard
│       └── Projects (projects/[id]/page.js)
│           └── ProjectDetails
```

### Key Components

#### **PortfolioDashboard**
- Displays balance across 4 perspectives
- Shows balance score and grade
- Provides filtering by perspective
- Real-time updates via Firestore listeners

#### **AIChat**
- Manages conversation state
- Integrates portfolio context
- Handles message sending/receiving
- Displays tool usage indicators
- Persists conversations to Firestore

#### **InsightsPanel**
- Fetches active insights
- Groups by priority
- Handles dismiss actions
- Triggers insight generation

#### **ProjectDetails**
- Shows project information
- Displays time logs
- Tracks progress toward goals
- Allows editing and updates

---

## Database Layer Architecture

### Three-Tier Design

#### **Tier 1: Components**
```javascript
// Components only import unifiedDB
import { getAllProjects, createProject } from '@/db/unifiedDB';

// Never pass userId - it's handled automatically
const projects = await getAllProjects();
```

#### **Tier 2: unifiedDB.js**
```javascript
// Authentication layer
export const getAllProjects = async () => {
  const userId = requireAuth();  // Get userId from context
  return await firestoreDB.getProjects(userId);
};

// Business logic layer
export const createTimeLog = async (logData) => {
  const userId = requireAuth();
  const id = await firestoreDB.createTimeLog(userId, logData);
  
  // Update project hours (business logic)
  const project = await getProject(logData.projectId);
  if (project) {
    await updateProject(logData.projectId, {
      totalHoursLogged: project.totalHoursLogged + logData.duration
    });
  }
  
  return { id, ...logData };
};
```

#### **Tier 3: firestoreDB.js**
```javascript
// Raw Firestore operations
export const getProjects = async (userId) => {
  const ref = collection(db, `users/${userId}/projects`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

### Benefits of This Architecture
- ✅ Authentication enforced automatically
- ✅ Business logic centralized
- ✅ Components stay clean and simple
- ✅ Easy to swap database implementations
- ✅ Consistent error handling

---

## AI Integration Architecture

### System Prompt Generation

```javascript
// Portfolio context fetched once on mount
const portfolioContext = {
  userName: "User",
  actualBalance: { builder: 45, contributor: 20, ... },
  targetBalance: { builder: 25, contributor: 25, ... },
  balanceScore: { score: 65, drift: 17.5, grade: 'C' },
  totalHours: 124,
  activeProjects: 8,
  recentActivity: [...]
};

// Transformed into rich system prompt
const systemPrompt = `
You are RetireWise AI...

Balance Score: 65/100 (Grade: C - Needs Attention)
Portfolio Drift: 17.5% from target

Perspective Breakdown:
  • Builder: 45% vs 25% target (+20% overweight)
  • Contributor: 20% vs 25% target (-5% underweight)
  ...
`;
```

### Agentic Tool Architecture

```javascript
// Tools defined in aiService.js
const AGENTIC_TOOLS = [
  {
    name: 'get_recent_activity',
    description: 'Get user activity from past N days',
    input_schema: { days: 'number' }
  },
  // ... other tools
];

// Tool execution
const executeToolFunction = async (toolName, input) => {
  switch (toolName) {
    case 'get_recent_activity':
      const timeLogs = await getAllTimeLogs();
      return filterAndAggregate(timeLogs, input.days);
    // ... other tools
  }
};

// Two-step AI flow
1. User message → Claude → Requests tool use
2. Execute tools → Results → Claude → Final response
```

---

## State Management

### React Context Pattern

```javascript
// AuthContext provides authentication state
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setCurrentUser(user.uid); // Set in unifiedDB
      }
    });
    return unsubscribe;
  }, []);
  
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Custom Hooks Pattern

```javascript
// usePortfolioContext - Fetches portfolio data
export function usePortfolioContext() {
  const [portfolioContext, setPortfolioContext] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPortfolioContext();
  }, []);
  
  async function loadPortfolioContext() {
    const data = await fetchAllPortfolioData();
    setPortfolioContext(data);
    setLoading(false);
  }
  
  return { portfolioContext, loading };
}
```

---

## Security Architecture

### Authentication Flow
```
1. User visits app
   ↓
2. useAuth() checks Firebase auth state
   ↓
3. If not authenticated:
   - Redirect to /login
   - Show authentication UI
   ↓
4. User logs in with email/password
   ↓
5. Firebase returns auth token
   ↓
6. setCurrentUser(userId) called
   ↓
7. All subsequent DB calls include userId
   ↓
8. Firestore rules verify: request.auth.uid == userId
```

### Data Isolation
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Only authenticated user can access their data
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
      // Applies to all subcollections
      match /{document=**} {
        allow read, write: if request.auth != null 
                           && request.auth.uid == userId;
      }
    }
  }
}
```

### API Security
```javascript
// API routes don't need separate authentication
// Firestore rules enforce security at data layer
export async function POST(request) {
  const body = await request.json();
  
  // API is stateless
  // Security enforced by Firestore rules
  // User must be authenticated to call unifiedDB functions
  
  return NextResponse.json(result);
}
```

---

## Performance Optimization

### Firestore Optimization
```javascript
// Indexed queries for fast retrieval
const q = query(
  collection(db, 'users', userId, 'timeLogs'),
  orderBy('date', 'desc'),
  limit(50)
);

// Offline persistence
enableIndexedDbPersistence(db);

// Real-time listeners for live updates
const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
  updateUI(snapshot.docs);
});
```

### Code Splitting
```javascript
// Next.js automatic code splitting
import dynamic from 'next/dynamic';

// Lazy load heavy components
const AnalyticsDashboard = dynamic(
  () => import('@/components/AnalyticsDashboard'),
  { loading: () => <Loader /> }
);
```

### Caching Strategy
```javascript
// Portfolio context cached during chat session
const { portfolioContext, loading } = usePortfolioContext();
// Fetched once on mount, reused for all messages
```

---

## Error Handling

### Layered Error Handling

```javascript
// Component Level
try {
  const projects = await getAllProjects();
  setProjects(projects);
} catch (error) {
  console.error('Failed to load projects:', error);
  setError('Could not load projects. Please try again.');
}

// unifiedDB Level
export const getAllProjects = async () => {
  try {
    const userId = requireAuth();
    return await firestoreDB.getProjects(userId);
  } catch (error) {
    if (error.message.includes('auth')) {
      throw new Error('Please log in to access projects');
    }
    throw error;
  }
};

// firestoreDB Level
export const getProjects = async (userId) => {
  try {
    const ref = collection(db, `users/${userId}/projects`);
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({...}));
  } catch (error) {
    console.error('Firestore error:', error);
    throw new Error('Database error: ' + error.message);
  }
};
```

---

## Deployment Architecture

### Vercel Edge Network
```
User Request
    ↓
Vercel Edge (closest region)
    ↓
├─ Static Assets (CDN cached)
├─ Server Components (rendered)
└─ API Routes (edge functions)
    ↓
Firebase Services (multi-region)
    ↓
Anthropic API (us-east)
```

### Environment Configuration
- **Production**: Vercel environment variables
- **Preview**: Branch-specific env vars
- **Development**: `.env.local` file
- **CI/CD**: GitHub Actions with secrets

---

## Design Patterns Used

### 1. **Repository Pattern**
- unifiedDB acts as repository
- Abstracts data source
- Provides consistent interface

### 2. **Provider Pattern**
- AuthContext provides auth state
- Wraps entire app
- Single source of truth

### 3. **Hook Pattern**
- usePortfolioContext encapsulates logic
- Reusable across components
- Manages own state

### 4. **Strategy Pattern**
- Different balance calculation strategies
- Pluggable insight generators
- Configurable AI tools

### 5. **Observer Pattern**
- Firestore real-time listeners
- React state updates
- Cross-tab synchronization

---

## Testing Strategy

### Unit Testing
```javascript
// Test database functions
test('getAllProjects returns user projects', async () => {
  const projects = await getAllProjects();
  expect(projects).toBeInstanceOf(Array);
});

// Test balance calculation
test('calculateBalanceScore returns correct grade', () => {
  const score = calculateBalanceScore(actual, target);
  expect(score.grade).toBe('B');
});
```

### Integration Testing
```javascript
// Test full flow
test('Creating project updates portfolio', async () => {
  const project = await createProject(data);
  const portfolio = await calculatePortfolioBalance();
  expect(portfolio.perspectiveHours.builder).toBeGreaterThan(0);
});
```

### E2E Testing (Future)
- Cypress for user flows
- Test authentication
- Test data persistence
- Test real-time sync

---

## Scalability Considerations

### Current Architecture Supports
- **Users**: 100,000+ (Firestore limit is much higher)
- **Documents per user**: Unlimited
- **Concurrent operations**: Firestore auto-scales
- **API calls**: Vercel edge functions scale automatically

### Future Scaling Needs
- **Pagination**: Implement for large datasets
- **Caching**: Add Redis for frequently accessed data
- **Background Jobs**: Cloud Functions for batch processing
- **Analytics**: BigQuery export for complex analysis

---

## Migration Path

### From Dexie to Firestore (Completed)
```
Phase 1: Add Firestore alongside Dexie
Phase 2: Implement dual-write to both
Phase 3: Read from Firestore, fall back to Dexie
Phase 4: Remove Dexie completely ✅
```

### Future Database Considerations
- Current: Firestore (document-based)
- Possible: PostgreSQL (relational, if complex queries needed)
- Possible: Prisma ORM (type-safe queries)
- Migration path: Keep abstraction layer (unifiedDB)

---

## Architecture Decisions Log

### Why Next.js App Router?
- Server Components for better performance
- Built-in API routes
- File-based routing
- Excellent TypeScript support

### Why Firestore?
- Real-time synchronization
- Offline support built-in
- Auto-scaling
- Pay-per-use pricing
- Firebase Authentication integration

### Why Claude AI?
- Best-in-class reasoning
- Tool use (agentic capabilities)
- Large context window (200k tokens)
- API simplicity

### Why Vercel?
- Seamless Next.js deployment
- Edge functions for low latency
- Automatic HTTPS and CDN
- Preview deployments
- Zero configuration

---

**For more details, see:**
- [DATABASE.md](./DATABASE.md) - Schema details
- [API_REFERENCE.md](./API_REFERENCE.md) - Function documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide