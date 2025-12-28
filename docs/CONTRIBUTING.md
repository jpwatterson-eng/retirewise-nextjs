# Contributing to RetireWise

Thank you for your interest in contributing to RetireWise! This guide will help you get started with development, coding standards, and the contribution workflow.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Feature Development](#feature-development)

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Firebase account (for testing)
- Anthropic API key (for AI features)
- Code editor (VS Code recommended)

### Initial Setup

1. **Fork and clone**
   ```bash
   git clone https://github.com/yourusername/retirewise.git
   cd retirewise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   - Open http://localhost:3000
   - Sign up with test account
   - Create a project
   - Log some time
   - Test AI chat

---

## Development Workflow

### Branch Strategy

```
main (production)
  └── develop (integration)
      ├── feature/your-feature
      ├── bugfix/issue-123
      └── enhancement/improve-x
```

### Creating a Branch

```bash
# For new features
git checkout -b feature/portfolio-goals-ui

# For bug fixes
git checkout -b bugfix/fix-scroll-issue

# For enhancements
git checkout -b enhancement/improve-balance-calc
```

### Commit Messages

Follow conventional commits format:

```bash
# Features
git commit -m "feat: add portfolio goal setting UI"
git commit -m "feat(ai): enhance system prompt with targets"

# Fixes
git commit -m "fix: scroll to bottom on chat load"
git commit -m "fix(db): handle missing user profile gracefully"

# Refactoring
git commit -m "refactor: extract balance calculation to utility"

# Documentation
git commit -m "docs: update API reference for new functions"

# Chores
git commit -m "chore: update dependencies"
```

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

---

## Code Standards

### JavaScript/React

#### File Naming
```
Components:     PascalCase.js     (e.g., PortfolioDashboard.js)
Utilities:      camelCase.js      (e.g., balanceCalculator.js)
Hooks:          use*.js           (e.g., usePortfolioContext.js)
API Routes:     route.js          (Next.js convention)
```

#### Component Structure

```javascript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { Icon } from 'lucide-react';
import { someFunction } from '@/lib/utils';

// 2. Component definition
export default function ComponentName({ prop1, prop2 }) {
  // 3. Hooks
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 4. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 5. Helper functions
  const helperFunction = () => {
    // Logic
  };
  
  // 6. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

#### Naming Conventions

```javascript
// Variables and functions: camelCase
const projectList = [];
const calculateBalance = () => {};

// Components: PascalCase
function ProjectCard() {}

// Constants: UPPER_SNAKE_CASE
const MAX_PROJECTS = 50;
const API_ENDPOINT = '/api/chat';

// Private functions: _prefixed (optional)
const _internalHelper = () => {};

// Boolean variables: is/has prefix
const isActive = true;
const hasProjects = false;
```

#### Code Style

```javascript
// ✅ Good
const projects = await getAllProjects();
const activeProjects = projects.filter(p => p.status === 'active');

// ❌ Avoid
const p = await getAllProjects();
const ap = p.filter(x => x.status === 'active');

// ✅ Good - Early returns
function getProjectStatus(project) {
  if (!project) return 'unknown';
  if (project.status === 'completed') return 'done';
  return 'in progress';
}

// ❌ Avoid - Nested conditions
function getProjectStatus(project) {
  if (project) {
    if (project.status === 'completed') {
      return 'done';
    } else {
      return 'in progress';
    }
  } else {
    return 'unknown';
  }
}
```

### CSS/Tailwind

```javascript
// ✅ Good - Organized classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">

// ✅ Good - Conditional classes
<div className={`
  px-4 py-2 rounded-lg
  ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}
`}>

// ❌ Avoid - Inline styles (unless dynamic)
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

### Database Operations

```javascript
// ✅ Good - Always use unifiedDB
import { getAllProjects } from '@/db/unifiedDB';
const projects = await getAllProjects();

// ❌ Never - Direct Firestore access in components
import { collection, getDocs } from 'firebase/firestore';
const ref = collection(db, 'users', userId, 'projects');

// ✅ Good - Error handling
try {
  const project = await getProject(projectId);
  setProject(project);
} catch (error) {
  console.error('Failed to load project:', error);
  setError('Could not load project');
}

// ❌ Avoid - No error handling
const project = await getProject(projectId);
setProject(project);
```

---

## Architecture Guidelines

### Layer Separation

```
Component Layer
  ↓ (imports from)
unifiedDB Layer
  ↓ (imports from)
firestoreDB Layer
  ↓ (uses)
Firestore SDK
```

**Rules:**
1. Components NEVER import firestoreDB directly
2. Components NEVER pass userId (unifiedDB handles it)
3. unifiedDB functions ALWAYS call requireAuth()
4. Business logic lives in unifiedDB
5. Raw operations live in firestoreDB

### Adding a New Database Function

**Step 1:** Add to firestoreDB.js
```javascript
// src/db/firestore/firestoreDB.js
export const getSomething = async (userId) => {
  const ref = collection(db, `users/${userId}/something`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

**Step 2:** Add to unifiedDB.js
```javascript
// src/db/unifiedDB.js
export const getSomething = async () => {
  const userId = requireAuth();
  return await firestoreDB.getSomething(userId);
};

// Add to default export
export default {
  // ...
  getSomething,
};
```

**Step 3:** Use in component
```javascript
// Component
import { getSomething } from '@/db/unifiedDB';

const data = await getSomething();
```

### Adding a New Component

1. Create component file in appropriate directory
2. Follow component structure (see above)
3. Add `'use client'` if using hooks
4. Export as default
5. Document props with comments
6. Add to relevant page

```javascript
// src/components/NewComponent.js
'use client';

import React, { useState } from 'react';

/**
 * NewComponent - Description of what it does
 * 
 * @param {string} prop1 - Description
 * @param {number} prop2 - Description
 */
export default function NewComponent({ prop1, prop2 }) {
  // Implementation
}
```

---

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

**Authentication:**
- [ ] Can sign up
- [ ] Can sign in
- [ ] Can sign out
- [ ] Redirect to login when not authenticated

**Core Features:**
- [ ] Can create projects
- [ ] Can log time
- [ ] Can view analytics
- [ ] Can use AI chat
- [ ] Balance calculates correctly

**Data Persistence:**
- [ ] Data saves to Firestore
- [ ] Data loads on refresh
- [ ] Real-time sync works (test in two tabs)

**Responsive Design:**
- [ ] Works on mobile (375px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1920px width)

**Edge Cases:**
- [ ] Empty states display correctly
- [ ] Error messages are clear
- [ ] Loading states show
- [ ] Network errors handled gracefully

### Testing New Features

When adding a feature:

1. **Test happy path**
   - Feature works as expected
   - Data saves correctly
   - UI updates properly

2. **Test error cases**
   - What if API fails?
   - What if data is missing?
   - What if user is not authenticated?

3. **Test edge cases**
   - Empty data
   - Large datasets
   - Slow network
   - Offline mode

4. **Test integration**
   - Does it affect existing features?
   - Does navigation still work?
   - Do other components still load?

---

## Pull Request Process

### Before Opening a PR

1. **Pull latest changes**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Test thoroughly**
   - Run manual tests (see above)
   - Verify no console errors
   - Check responsive design

3. **Clean up code**
   - Remove console.logs
   - Remove commented code
   - Fix formatting
   - Add comments for complex logic

4. **Update documentation**
   - Update README if needed
   - Update API_REFERENCE if added functions
   - Add code comments

### Opening a PR

1. **Push your branch**
   ```bash
   git push origin feature/your-feature
   ```

2. **Create PR on GitHub**
   - Use descriptive title
   - Fill out PR template
   - Link related issues
   - Add screenshots for UI changes

3. **PR Template**

   ```markdown
   ## Description
   Brief description of what this PR does.
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Changes Made
   - List specific changes
   - Include technical details
   - Mention affected files
   
   ## Testing
   - [ ] Tested locally
   - [ ] Tested on mobile
   - [ ] Tested error cases
   - [ ] Tested integration
   
   ## Screenshots (if UI changes)
   ![Before](url)
   ![After](url)
   
   ## Related Issues
   Closes #123
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] No console errors
   - [ ] Mobile responsive
   ```

### Review Process

1. Maintainer reviews code
2. Feedback addressed
3. Approval granted
4. PR merged to main
5. Automatic deployment to Vercel

---

## Feature Development

### Planning a Feature

1. **Create an issue** describing the feature
2. **Discuss approach** in comments
3. **Break down into tasks** (if large)
4. **Estimate effort** (S/M/L)
5. **Get approval** before starting

### Implementing a Feature

1. **Create branch** from main
2. **Implement in small commits**
3. **Test frequently**
4. **Document as you go**
5. **Open PR when ready**

### Example: Adding Portfolio Goals UI

**Step 1: Create Component**
```javascript
// src/components/PortfolioGoalSetter.js
'use client';

export default function PortfolioGoalSetter() {
  // Implementation
}
```

**Step 2: Add Database Functions** (if needed)
```javascript
// Already exists: getPortfolio(), updatePortfolio()
```

**Step 3: Create Page**
```javascript
// src/app/portfolio/goals/page.js
import PortfolioGoalSetter from '@/components/PortfolioGoalSetter';

export default function GoalsPage() {
  return <PortfolioGoalSetter />;
}
```

**Step 4: Add Navigation**
```javascript
// Update navigation component
{ label: 'Goals', href: '/portfolio/goals', icon: Target }
```

**Step 5: Test**
- Can set target percentages?
- Does validation work (must sum to 100%)?
- Does it save to Firestore?
- Does dashboard reflect new targets?

**Step 6: Document**
- Add to README feature list
- Update API_REFERENCE if new functions
- Add code comments

---

## Code Review Guidelines

### As a Reviewer

**Check for:**
- [ ] Code follows style guidelines
- [ ] No security vulnerabilities
- [ ] Proper error handling
- [ ] Clear variable names
- [ ] Comments for complex logic
- [ ] No console.logs in production code
- [ ] Mobile responsive
- [ ] Database operations use unifiedDB
- [ ] No breaking changes (or clearly marked)

**Provide:**
- Constructive feedback
- Specific suggestions
- Examples of improvements
- Praise for good code

### As a Contributor

**Respond to:**
- All review comments
- Implement requested changes
- Ask questions if unclear
- Push updates
- Request re-review

---

## Common Patterns

### Fetching Data

```javascript
// Pattern: Fetch on mount
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getSomething();
      setData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch:', err);
      setError('Could not load data');
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

### Forms

```javascript
// Pattern: Controlled form
const [formData, setFormData] = useState({
  name: '',
  description: ''
});

const handleChange = (e) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await createSomething(formData);
    setFormData({ name: '', description: '' });
    // Show success
  } catch (error) {
    // Show error
  }
};
```

### Conditional Rendering

```javascript
// Pattern: Loading, error, data
if (loading) return <Loader />;
if (error) return <Error message={error} />;
if (!data) return <Empty />;

return <DataDisplay data={data} />;
```

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Firebase Docs](https://firebase.google.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

### Project Docs
- [README.md](../README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DATABASE.md](./DATABASE.md) - Database schema
- [API_REFERENCE.md](./API_REFERENCE.md) - API documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

### Tools
- [VS Code](https://code.visualstudio.com/) - Recommended editor
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)

---

## Getting Help

- **Issues:** Check existing issues or create a new one
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** Read the docs first
- **Code Examples:** Look at existing components

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to RetireWise!** 🎉