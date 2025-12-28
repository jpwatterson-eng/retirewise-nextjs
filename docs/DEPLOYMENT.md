# RetireWise Deployment Guide

Complete guide for deploying RetireWise to production on Vercel.

---

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier works)
- ✅ Firebase project with Firestore enabled
- ✅ Anthropic API key
- ✅ Code pushed to GitHub repository

---

## Quick Deployment (5 Minutes)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js configuration

### Step 3: Configure Environment Variables

Add these in Vercel dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Important:** Enable for all environments (Production, Preview, Development)

### Step 4: Deploy

Click "Deploy" and wait ~2 minutes.

✅ **Done!** Your app is live at `your-project.vercel.app`

---

## Detailed Deployment Steps

### 1. Prepare Your Repository

#### Clean Up Development Files

Remove or gitignore:
```bash
# Add to .gitignore
.env.local
.next/
node_modules/
.vercel/
*.log
.DS_Store
```

#### Verify Build Locally

```bash
npm run build
npm start
```

Visit `http://localhost:3000` and test:
- [ ] Login/signup works
- [ ] Projects load
- [ ] Time logging works
- [ ] AI chat responds
- [ ] All pages render

---

### 2. Firebase Configuration

#### Enable Required Services

In Firebase Console:

1. **Authentication**
   - Enable Email/Password provider
   - Add authorized domain: `your-project.vercel.app`

2. **Firestore**
   - Create database (production mode)
   - Deploy security rules (see below)
   - Create indexes (auto-created on first query, or manually add)

3. **Firestore Rules**

Deploy these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents and subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
      
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

Deploy via Firebase Console → Firestore → Rules → Publish

4. **Firestore Indexes**

These will be auto-created, but you can pre-create them:

```
Collection: projects
Fields: perspective (Ascending), createdAt (Descending)

Collection: timeLogs
Fields: date (Descending)

Collection: timeLogs
Fields: projectId (Ascending), date (Descending)

Collection: insights
Fields: dismissed (Ascending), priority (Descending), createdAt (Descending)

Collection: conversations
Fields: lastMessageAt (Descending)
```

---

### 3. Vercel Configuration

#### Project Settings

```javascript
// vercel.json (optional - Vercel auto-detects Next.js)
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]  // US East (optional)
}
```

#### Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console | Public |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` | Public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your project ID | Public |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `project.appspot.com` | Public |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase | Public |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase | Public |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | `sk-ant-xxxxx` | **Keep secret!** |

**Security Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the client. The Anthropic API key will be visible in client code but should still be kept in env vars for easy rotation.

#### Build Settings

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`
- **Node Version**: 18.x (set in package.json or Vercel settings)

---

### 4. Domain Configuration (Optional)

#### Add Custom Domain

1. Go to Vercel dashboard → Project → Settings → Domains
2. Add your domain (e.g., `retirewise.com`)
3. Update DNS records:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. Wait for DNS propagation (5-30 minutes)

#### Update Firebase

Add custom domain to Firebase authorized domains:
1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `retirewise.com` and `www.retirewise.com`

---

### 5. Post-Deployment Verification

#### Smoke Tests

Test these critical paths:

1. **Authentication**
   ```
   ✓ Sign up with new email
   ✓ Sign in with existing account
   ✓ Sign out
   ✓ Password reset (if implemented)
   ```

2. **Core Features**
   ```
   ✓ Create a project
   ✓ Log time
   ✓ View portfolio dashboard
   ✓ Check analytics
   ✓ Open AI chat
   ✓ Send message to AI
   ```

3. **Data Persistence**
   ```
   ✓ Refresh page - data remains
   ✓ Close and reopen tab - still logged in
   ✓ Open in different browser - data syncs
   ```

4. **Performance**
   ```
   ✓ Initial load < 3 seconds
   ✓ Navigation is instant
   ✓ AI response < 5 seconds
   ```

#### Monitor Errors

Check Vercel dashboard → Project → Logs for:
- Build errors
- Runtime errors
- API route errors

---

## Environment-Specific Configurations

### Development
```env
# .env.local
NEXT_PUBLIC_FIREBASE_PROJECT_ID=retirewise-dev
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-dev-xxxxx
```

### Staging (Preview Deployments)
```env
# Vercel Preview environment
NEXT_PUBLIC_FIREBASE_PROJECT_ID=retirewise-staging
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-staging-xxxxx
```

### Production
```env
# Vercel Production environment
NEXT_PUBLIC_FIREBASE_PROJECT_ID=retirewise-prod
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-prod-xxxxx
```

**Best Practice:** Use separate Firebase projects for dev/staging/prod

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pushes to feature branches
- **Pull Request**: Each PR gets a preview URL

### Deployment Workflow

```
1. Developer pushes to feature branch
   ↓
2. Vercel builds preview deployment
   ↓
3. Preview URL generated (e.g., project-git-feature-username.vercel.app)
   ↓
4. Test preview deployment
   ↓
5. Merge PR to main
   ↓
6. Vercel deploys to production
   ↓
7. Live at your-project.vercel.app
```

### Build Hooks

Create a deploy hook for manual triggers:

1. Vercel → Settings → Git → Deploy Hooks
2. Create hook → Copy URL
3. Trigger deployment:

```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/...
```

---

## Performance Optimization

### Enable Caching

Vercel automatically caches:
- Static assets (images, CSS, JS)
- API routes with caching headers
- Server-rendered pages

Add caching headers to API routes:

```javascript
export async function GET(request) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

### Image Optimization

Use Next.js Image component:

```javascript
import Image from 'next/image';

<Image 
  src="/logo.png" 
  width={200} 
  height={100}
  alt="RetireWise"
/>
```

Vercel automatically optimizes images on-demand.

### Analytics

Enable Vercel Analytics:
1. Project → Analytics → Enable
2. Add `<Analytics />` to root layout (optional)

```javascript
// app/layout.js
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Monitoring & Debugging

### Vercel Logs

View logs in real-time:
```bash
vercel logs your-project.vercel.app
```

Or in Vercel dashboard → Project → Logs

### Error Tracking

Consider adding error tracking:

**Option 1: Sentry**
```bash
npm install @sentry/nextjs
```

**Option 2: LogRocket**
```bash
npm install logrocket
```

### Performance Monitoring

Use Vercel Speed Insights:
```bash
npm install @vercel/speed-insights
```

```javascript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Backup & Disaster Recovery

### Firestore Backups

#### Automated Backups

Set up scheduled exports:

1. Enable Cloud Scheduler API
2. Create export bucket:
```bash
gsutil mb gs://retirewise-backups
```

3. Schedule daily backup:
```bash
gcloud scheduler jobs create http firestore-export \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default):exportDocuments" \
  --message-body='{
    "outputUriPrefix": "gs://retirewise-backups",
    "collectionIds": []
  }'
```

#### Manual Backup

```bash
gcloud firestore export gs://retirewise-backups/manual-backup-$(date +%Y%m%d)
```

### Code Backups

- GitHub repository (primary)
- Vercel keeps deployment history (last 100 deployments)

### Rollback

Instant rollback in Vercel:
1. Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → Promote to Production

Or via CLI:
```bash
vercel rollback
```

---

## Security Best Practices

### Environment Variables
- ✅ Never commit `.env.local` to git
- ✅ Rotate API keys quarterly
- ✅ Use different keys for dev/staging/prod
- ✅ Limit API key permissions (if possible)

### Firebase Security
- ✅ Firestore rules enforce user isolation
- ✅ Enable App Check (for production)
- ✅ Monitor Firebase usage for anomalies
- ✅ Set up budget alerts

### Vercel Security
- ✅ Enable Vercel Authentication (if needed)
- ✅ Use environment-specific secrets
- ✅ Enable HTTPS only (automatic)
- ✅ Set up security headers:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

---

## Cost Optimization

### Vercel Pricing

**Hobby (Free):**
- ✓ 100 GB bandwidth/month
- ✓ Unlimited preview deployments
- ✓ 6,000 build minutes/month
- ✓ Perfect for personal projects

**Pro ($20/month):**
- Analytics
- Priority support
- Password protection
- 1TB bandwidth

### Firebase Pricing

**Spark (Free):**
- 50,000 reads/day
- 20,000 writes/day
- 1 GB storage
- Good for starting out

**Blaze (Pay-as-you-go):**
- $0.06 per 100,000 reads
- $0.18 per 100,000 writes
- $0.18/GB storage
- Typical cost: $5-20/month for small apps

### Anthropic Pricing

**Claude Sonnet 4:**
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Typical usage:**
- 1,000 messages/month ≈ $6-10
- Set spending limits in Anthropic dashboard

---

## Troubleshooting

### Build Failures

**"Module not found"**
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**"Environment variable not defined"**
- Check Vercel dashboard → Settings → Environment Variables
- Ensure all `NEXT_PUBLIC_*` vars are set
- Redeploy after adding vars

### Runtime Errors

**"Firebase permission denied"**
- Verify Firestore rules are deployed
- Check user is authenticated
- Ensure userId matches document path

**"API key invalid"**
- Verify ANTHROPIC_API_KEY is correct
- Check for extra spaces/newlines
- Regenerate key if needed

### Performance Issues

**"Slow initial load"**
- Enable Vercel Analytics to identify bottlenecks
- Consider code splitting for large components
- Optimize images with Next.js Image

**"AI responses slow"**
- Check Anthropic API status
- Consider caching common prompts
- Reduce system prompt size

---

## Advanced Configuration

### Custom Build Command

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "build:production": "NODE_ENV=production next build",
    "start": "next start -p 3000"
  }
}
```

### Edge Functions

Move API routes to Edge Runtime for lower latency:

```javascript
// app/api/chat/route.js
export const runtime = 'edge';

export async function POST(request) {
  // Your code here
}
```

### Middleware

Add global middleware:

```javascript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add custom headers, redirects, etc.
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*'
};
```

---

## Checklist: Pre-Deployment

- [ ] All features tested locally
- [ ] Build succeeds without warnings
- [ ] Environment variables documented
- [ ] Firebase rules deployed
- [ ] Security rules tested
- [ ] Performance acceptable (< 3s load)
- [ ] Mobile responsive
- [ ] Error handling in place
- [ ] Backup strategy configured
- [ ] Monitoring set up

---

## Checklist: Post-Deployment

- [ ] All critical paths tested in production
- [ ] Custom domain configured (if applicable)
- [ ] Firebase authorized domains updated
- [ ] SSL certificate active
- [ ] Logs monitored for errors
- [ ] Performance metrics checked
- [ ] Backup verified
- [ ] Team notified
- [ ] Documentation updated

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Anthropic Docs**: https://docs.anthropic.com

---

**Your app is now live!** 🎉

Monitor, iterate, and enjoy your deployed RetireWise application.