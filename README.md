# RetireWise 🎯

> AI-powered retirement portfolio management app that helps retirees balance their time across four perspectives of fulfillment: Builder, Contributor, Integrator, and Experimenter.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10-orange)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)

## 🌟 Features

### Core Functionality
- **Portfolio Management** - Track projects across four perspectives of retirement fulfillment
- **Time Logging** - Record hours spent on each project with detailed metrics
- **Balance Tracking** - Real-time calculation of time allocation across perspectives
- **AI Advisor** - Claude-powered chat with portfolio context awareness
- **Journal Integration** - Reflect on projects and track insights
- **Analytics Dashboard** - Visualize patterns and trends in your retirement activities

### AI Capabilities
- **Portfolio-Aware Responses** - AI knows your balance score, targets, and recent activity
- **Agentic Tools** - AI can search your journal, analyze patterns, and retrieve project details
- **Smart Insights** - Automated suggestions based on balance deviations and activity patterns
- **Personalized Recommendations** - Context-aware advice for rebalancing and focus areas

### Technical Features
- **Offline Support** - Firestore persistent cache for offline access
- **Real-time Sync** - Automatic synchronization across devices
- **PWA Ready** - Progressive Web App with service worker
- **Responsive Design** - Mobile-first, works on all screen sizes
- **Type-Safe** - Consistent database operations with validation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Firebase project with Firestore enabled
- Anthropic API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/retirewise.git
   cd retirewise
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local`:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Anthropic AI
   NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```

4. **Set up Firebase**
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Configure Firestore rules (see `DATABASE.md`)
   - Enable offline persistence

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

---

## 📖 Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Application structure and design patterns
- **[DATABASE.md](./docs/DATABASE.md)** - Firestore schema and data models
- **[API_REFERENCE.md](./docs/API_REFERENCE.md)** - API routes and database functions
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide for Vercel
- **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** - Development guidelines

---

## 🏗️ Project Structure

```
retirewise/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── page.js            # Landing page
│   │   ├── chat/              # AI chat interface
│   │   ├── portfolio/         # Portfolio dashboard
│   │   ├── analytics/         # Analytics views
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── AIChat.js         # AI chat component
│   │   ├── PortfolioDashboard.js
│   │   ├── InsightsPanel.js
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   └── AuthContext.js    # Authentication state
│   ├── hooks/                 # Custom hooks
│   │   └── usePortfolioContext.js
│   ├── db/                    # Database layer
│   │   ├── firestore/        # Firestore operations
│   │   │   └── firestoreDB.js
│   │   └── unifiedDB.js      # Unified database API
│   ├── lib/                   # Utilities
│   │   └── ai-prompt-generator.js
│   ├── services/              # External services
│   │   └── aiService.js      # Claude AI integration
│   └── config/                # Configuration
│       └── firebase.js       # Firebase setup
├── public/                    # Static assets
├── docs/                      # Documentation
└── package.json
```

---

## 🎯 The Four Perspectives

RetireWise is built around four modes of retirement engagement:

### 🔨 Builder
Creating new things from scratch - entrepreneurship, writing, building projects, starting businesses.

### 🤝 Contributor
Adding value to existing systems - teaching, mentoring, volunteering, consulting, helping others.

### 🔄 Integrator
Connecting ideas and people - facilitating collaboration, curating content, synthesis, networking.

### 🧪 Experimenter
Trying new things without pressure - learning, exploration, hobbies, travel, creative play.

---

## 🔧 Key Technologies

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Functions
- **Database**: Firebase Firestore with offline persistence
- **Authentication**: Firebase Authentication
- **AI**: Anthropic Claude (Sonnet 4) via API
- **Deployment**: Vercel with edge functions
- **Icons**: Lucide React
- **Date Handling**: date-fns

---

## 📊 Database Schema

### Collections Structure
```
users/{userId}
  ├── portfolio: { targetBalance, actualBalance, balanceScore }
  ├── settings: { ai, notifications, display }
  ├── projects/
  │   └── {projectId}: { name, perspective, status, ... }
  ├── timeLogs/
  │   └── {logId}: { projectId, duration, date, ... }
  ├── journalEntries/
  │   └── {entryId}: { content, date, tags, ... }
  ├── insights/
  │   └── {insightId}: { type, title, dismissed, ... }
  └── conversations/
      └── {conversationId}: { messages, title, ... }
```

See [DATABASE.md](./docs/DATABASE.md) for complete schema details.

---

## 🤖 AI Integration

### Portfolio-Aware System Prompts

The AI receives enriched context about your portfolio:

```javascript
Balance Score: 65/100 (Grade: C - Needs Attention)
Portfolio Drift: 17.5% from target allocation
Total Time Tracked: 124 hours
Active Projects: 8

Perspective Breakdown:
  • Builder: 45% current vs 25% target (+20% overweight)
  • Contributor: 20% current vs 25% target (-5% underweight)
  • Integrator: 25% current vs 25% target (on target)
  • Experimenter: 10% current vs 25% target (-15% underweight)
```

### Agentic Tools

Claude has access to tools that query your data:
- `get_recent_activity` - Retrieve time logs from past N days
- `search_journal` - Search journal entries by keywords
- `analyze_patterns` - Calculate perspective distribution and trends
- `get_project_details` - Get comprehensive project information

---

## 🔐 Security

### Authentication
- Firebase Authentication with email/password
- Forced login required for all app features
- Secure token-based API authentication

### Data Privacy
- User data isolated by userId
- Firestore security rules enforce data ownership
- No cross-user data access
- API keys stored in environment variables

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 📈 Performance

- **Offline-First**: Firestore persistent cache enables offline access
- **Optimistic Updates**: UI updates immediately, syncs in background
- **Efficient Queries**: Indexed queries for fast data retrieval
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component for optimized loading
- **Edge Functions**: API routes deployed to Vercel edge network

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] User can sign up and log in
- [ ] Projects can be created with perspectives
- [ ] Time logs save and appear in analytics
- [ ] Portfolio balance calculates correctly
- [ ] AI chat responds with portfolio context
- [ ] Insights generate based on balance
- [ ] Offline mode works (disable network)
- [ ] Real-time sync works (multiple tabs)

### Test Accounts
Create test users with different balance scenarios:
- Balanced (25/25/25/25)
- Builder-heavy (60/15/15/10)
- Missing perspectives (0% in one area)

---

## 🐛 Troubleshooting

### Common Issues

**Firebase "Permission Denied"**
- Check Firestore rules are deployed
- Verify user is authenticated
- Ensure userId matches document path

**AI Chat Not Working**
- Verify ANTHROPIC_API_KEY in `.env.local`
- Check browser console for errors
- Ensure portfolio context is loading (check console logs)

**Offline Sync Issues**
- Clear browser cache and reload
- Check Firestore offline persistence is enabled
- Verify internet connection for initial sync

**Build Errors**
- Run `npm install` to ensure dependencies
- Check Node.js version (18+)
- Clear `.next` folder and rebuild

---

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Import repository in Vercel dashboard
   - Configure environment variables
   - Deploy

3. **Configure Environment**
   - Add all Firebase config variables
   - Add ANTHROPIC_API_KEY
   - Enable for Production, Preview, Development

4. **Custom Domain** (optional)
   - Add custom domain in Vercel settings
   - Update Firebase authorized domains

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Code style guidelines
- Development workflow
- Pull request process
- Testing requirements

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Your Name** - *Initial work* - [GitHub](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- **Anthropic Claude** - AI capabilities
- **Firebase** - Backend infrastructure
- **Vercel** - Hosting and deployment
- **Next.js Team** - Framework and tools
- **Community** - Inspiration and feedback

---

## 📞 Support

- **Documentation**: [/docs](./docs)
- **Issues**: [GitHub Issues](https://github.com/yourusername/retirewise/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/retirewise/discussions)

---

## 🗺️ Roadmap

### Completed ✅
- Phase 1: Foundation (Next.js, Firebase, Authentication)
- Phase 2: Core Features (Projects, Time Logging, Analytics)
- Phase 3: Portfolio Management (Balance Tracking, Insights)
- Phase 4: AI Enhancement (Portfolio-Aware AI, Agentic Tools)

### Planned 🚧
- Phase 5: Goal Setting UI (Visual target configuration)
- Phase 6: Enhanced Dashboard (Advanced visualizations)
- Phase 7: Historical Analytics (Trends over time)
- Phase 8: Notifications (Email digests, milestone alerts)
- Phase 9: Social Features (Community, sharing)
- Phase 10: Mobile App (Native iOS/Android)

---

**Built with ❤️ for meaningful retirement living**