# NexBoard

A powerful, real-time collaborative Kanban board application built with Next.js 16, React 19, Firebase, and TypeScript.

![NexBoard](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-blue) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Firebase Setup](#firebase-setup)
  - [Environment Configuration](#environment-configuration)
- [Usage Guide](#usage-guide)
  - [Authentication](#authentication)
  - [Creating & Managing Boards](#creating--managing-boards)
  - [Working with Tasks](#working-with-tasks)
  - [Subtasks & Progress Tracking](#subtasks--progress-tracking)
  - [Collaboration Features](#collaboration-features)
  - [Notifications](#notifications)
  - [API Tokens](#api-tokens)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)
  - [Running Locally](#running-locally)
  - [Testing](#testing)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Tech Stack](#tech-stack)

---

## Features

### Core Functionality
- **Real-time Collaboration**: Multiple users can work simultaneously with instant updates
- **Drag & Drop Interface**: Intuitive task management with smooth drag-and-drop
- **Role-Based Permissions**: Owner, Editor, and Commenter roles with granular access control
- **Task Management**: Create, edit, delete, and organize tasks across columns
- **Subtasks**: Break down complex tasks with nested subtasks and automatic progress tracking
- **Comments & Mentions**: Discuss tasks with @mentions that trigger notifications
- **Notifications**: Stay informed about task assignments, mentions, and status changes
- **Cross-Board Task View**: See all your assigned tasks across projects in one place

### User Experience
- **Command Palette**: Quick access to all actions with Ctrl/Cmd+K
- **Keyboard Navigation**: Full keyboard support for power users (J/K, E, Delete, N, etc.)
- **Dark/Light/Auto Theme**: Choose your preferred theme or sync with system preferences
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Help Overlay**: Built-in help system (press ? to view all shortcuts)

### Security & API
- **Secure Authentication**: Google OAuth via Firebase Authentication
- **API Token System**: Generate scoped API tokens for programmatic access
- **Firestore Security Rules**: Server-side security enforced at the database level
- **PBKDF2 Token Hashing**: Industry-standard token storage with 100k iterations

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Firebase Account**: Free tier is sufficient for development
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Name your project (e.g., "my-nexboard")
   - Follow the setup wizard

2. **Enable Authentication**
   - Navigate to **Authentication** > **Sign-in method**
   - Enable **Google** provider
   - Add your domain to authorized domains

3. **Create Firestore Database**
   - Navigate to **Firestore Database**
   - Click "Create database"
   - Start in **production mode**
   - Choose a location closest to your users

4. **Deploy Security Rules**
   ```bash
   firebase login
   firebase use --add  # Select your project
   firebase deploy --only firestore:rules
   ```

5. **Deploy Firestore Indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

   Or create indexes via console as errors appear (Firebase provides direct links).

6. **Get Firebase Configuration**
   - Go to **Project Settings** (gear icon)
   - Scroll to "Your apps" section
   - Click the web icon (</>)
   - Copy the config values

### Environment Configuration

1. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

2. **Add Firebase credentials** to `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Generate API token pepper** (required for API token security):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Add to `.env.local`:
   ```env
   NEXT_PUBLIC_API_TOKEN_PEPPER=<generated-string>
   ```

4. **Optional: Google Analytics** (if you want analytics):
   ```env
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Sign in with Google

---

## Usage Guide

### Authentication

1. **Sign In**
   - Click "Sign in with Google" on the login page
   - Authorize the application
   - You'll be redirected to your boards dashboard

2. **Sign Out**
   - Click your avatar in the top-right corner
   - Select "Sign out"

### Creating & Managing Boards

#### Create a New Board
1. Click the **"+"** button or press **G B** (Go to Boards) then **N**
2. Enter a board name
3. Click "Create" or press Enter

#### View Your Boards
- From any page, press **G B** to open the boards list
- Click on a board to open it

#### Archive a Board
1. Open the board
2. Click the **"⋯"** menu in the top-right
3. Select "Archive Board"
4. Confirm the action

**Note**: Only board owners can archive boards.

#### Manage Board Members
1. Open a board
2. Click the **"Members"** button in the header
3. Enter email addresses to invite users
4. Assign roles:
   - **Owner**: Full control (transfer ownership, archive, manage members)
   - **Editor**: Create, edit, and delete tasks
   - **Commenter**: View and comment only

### Working with Tasks

#### Create a Task
- **Mouse**: Click "+" in any column
- **Keyboard**: Press **N** anywhere on the board
- Enter title, description, assignee, and due date
- Press **Ctrl/Cmd + Enter** to save

#### Edit a Task
- **Mouse**: Click the task card
- **Keyboard**:
  1. Navigate with **J** (down) / **K** (up)
  2. Press **E** to edit selected task
- Modify details in the modal
- Save with **Ctrl/Cmd + Enter**

#### Move Tasks Between Columns
- **Mouse**: Drag task cards between columns
- **Keyboard**:
  1. Select task with **J/K**
  2. Press **M** to enter move mode
  3. Use arrow keys to select target column
  4. Press **Enter** to confirm

#### Delete a Task
- **Mouse**: Click task → Delete button in modal
- **Keyboard**:
  1. Navigate to task with **J/K**
  2. Press **Delete** or **Backspace**
  3. Confirm deletion

#### Assign a Task
1. Open task details
2. Click the **"Assignee"** dropdown
3. Select a team member
4. Save changes

**Note**: Assigned users receive a notification.

### Subtasks & Progress Tracking

#### Create Subtasks
1. Open a task
2. Scroll to the **"Subtasks"** section
3. Click "Add Subtask"
4. Enter subtask details
5. Save

#### Track Progress
- Progress is calculated automatically based on completed subtasks
- Mark subtasks as complete by checking the checkbox
- Parent task shows progress percentage (e.g., "2/5 complete - 40%")
- Visual progress bar displays in task card

#### Nested Subtasks
- You can create subtasks within subtasks (multi-level nesting)
- Progress rolls up through all levels
- Navigate through subtask hierarchy in task modal

### Collaboration Features

#### Comments
1. Open a task
2. Scroll to the **"Comments"** section
3. Type your comment
4. Use **@username** to mention team members
5. Press **Ctrl/Cmd + Enter** to post

**Mentions trigger notifications** to mentioned users.

#### Real-Time Updates
- Changes made by team members appear instantly
- Task movements, edits, and comments sync in real-time
- No refresh needed - see updates as they happen

#### Activity Tracking
- All task changes are timestamped
- See who created, edited, or commented on tasks
- Comments show edit indicators if modified

### Notifications

#### View Notifications
- Click the **bell icon** in the top-right corner
- Unread count displays as a badge

#### Notification Types
- **Task Assignment**: When you're assigned to a task
- **Mentions**: When someone @mentions you in a comment
- **Status Changes**: When tasks you're involved with change status
- **Comments**: New comments on tasks you're watching

#### Mark as Read
- Click on a notification to mark it as read
- Click "Mark all as read" to clear all notifications

### API Tokens

API tokens allow programmatic access to NexBoard data.

#### Create an API Token
1. Navigate to **Settings** (click avatar → Settings)
2. Scroll to **"API Tokens"** section
3. Click **"Generate Token"**
4. Enter a label (e.g., "CI/CD Pipeline")
5. Select scopes:
   - **tasks:read**: Read task data
   - **tasks:write**: Create, update, delete tasks
6. Click "Generate"
7. **Copy the token immediately** - it's only shown once!

#### Use an API Token
```bash
# Example: Get tasks for a project
curl -H "Authorization: Bearer nex_<your-token>" \
  https://your-domain.com/api/projects/PROJECT_ID/tasks
```

#### Manage Tokens
- View all active tokens in Settings
- See token creation date and scopes
- Revoke tokens that are no longer needed
- Tokens are hashed securely and cannot be recovered

**Security Note**: Never commit tokens to version control or share them publicly.

---

## Keyboard Shortcuts

Press **?** anywhere to view the help overlay with all shortcuts.

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl/Cmd + K** | Open command palette |
| **G B** | Go to boards |
| **G M** | Go to "My Tasks" |
| **?** | Show help overlay |
| **Esc** | Close modal/dialog |

### Board Shortcuts

| Shortcut | Action |
|----------|--------|
| **N** | New task |
| **J** | Select next task (down) |
| **K** | Select previous task (up) |
| **E** | Edit selected task |
| **Delete** or **Backspace** | Delete selected task |
| **M** | Move selected task to another column |
| **/** | Focus search/filter |

### Task Modal Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl/Cmd + Enter** | Save and close |
| **Esc** | Close without saving |
| **Tab** | Navigate between fields |

### Comment Shortcuts

| Shortcut | Action |
|----------|--------|
| **@** | Mention a user |
| **Ctrl/Cmd + Enter** | Post comment |

---

## Development

### Running Locally

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

The app supports hot-reload - changes appear instantly without refresh.

### Testing

#### Firestore Security Rules Tests
```bash
# Run all rules tests
npm run test:rules

# Run specific test file
npm run test:rules:tokens
```

Tests use Firebase emulator and are located in `tests/` directory.

#### Component Tests
```bash
npm test
```

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start

# Production server runs on http://localhost:3000
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

## Project Structure

```
nexboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── boards/             # Board list and detail pages
│   │   │   └── [id]/           # Dynamic board routes
│   │   ├── login/              # Authentication page
│   │   ├── my-tasks/           # Cross-board task view
│   │   ├── settings/           # User settings & API tokens
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── globals.css         # Global styles and themes
│   │
│   ├── components/             # React components
│   │   ├── AuthProvider.tsx   # Authentication context
│   │   ├── CommandPalette.tsx # Command palette (Cmd+K)
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── KanbanBoard.tsx    # Main board component
│   │   ├── TaskCard.tsx        # Individual task cards
│   │   ├── TaskEditor.tsx      # Task creation/edit modal
│   │   ├── ThemeProvider.tsx  # Theme management
│   │   ├── ThemeToggle.tsx    # Dark/light mode toggle
│   │   ├── HelpOverlay.tsx    # Keyboard shortcuts help
│   │   └── ...                 # Other UI components
│   │
│   └── lib/                    # Core utilities
│       ├── firebase.ts         # Firebase initialization
│       ├── auth.tsx            # Authentication logic
│       ├── tasks.ts            # Task CRUD operations
│       ├── order.ts            # Fractional ordering system
│       ├── roles.ts            # Permission checks
│       ├── commands.ts         # Command palette registry
│       ├── apiTokens.ts        # API token management
│       ├── crypto.ts           # Token hashing utilities
│       ├── progress.ts         # Subtask progress calculation
│       └── analytics.ts        # Event tracking
│
├── tests/                      # Firestore rules tests
│   ├── rules.projects.test.mjs
│   ├── rules.tasks.test.mjs
│   └── rules.tokens.test.mjs
│
├── docs/                       # Documentation
│   ├── architecture.md         # System architecture
│   ├── prd.md                  # Product requirements
│   └── sprint/                 # Story specifications
│
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Required database indexes
├── firebase.json               # Firebase configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS config
└── tsconfig.json               # TypeScript configuration
```

### Key Files

- **`src/lib/firebase.ts`**: Firebase initialization and configuration
- **`firestore.rules`**: Server-side security rules (CRITICAL - review before deploy)
- **`firestore.indexes.json`**: Required indexes for queries
- **`src/lib/order.ts`**: Fractional ordering system for drag-and-drop
- **`src/lib/roles.ts`**: Permission checking functions
- **`CLAUDE.md`**: AI-friendly project documentation

---

## Troubleshooting

### Firestore Index Errors

**Error**: "The query requires an index. You can create it here: [URL]"

**Solution**:
1. Click the URL in the error message
2. Firebase Console opens with pre-filled index config
3. Click "Create Index"
4. Wait 1-2 minutes for index to build

Or deploy all indexes:
```bash
firebase deploy --only firestore:indexes
```

### Theme Toggle Shows Text Instead of Icon

**Symptom**: "brightness_auto" text appears instead of an icon

**Solution**: Material Icons font didn't load. Check:
1. Ensure `<link>` tag is in `src/app/layout.tsx` `<head>`
2. Check browser console for font loading errors
3. Clear browser cache and refresh

### Authentication Loops or Fails

**Symptoms**:
- Redirects back to login after signing in
- "Unauthorized" errors

**Solutions**:
1. **Check authorized domains** in Firebase Console:
   - Auth → Settings → Authorized domains
   - Add `localhost` for development
   - Add your production domain
2. **Verify environment variables** in `.env.local`
3. **Clear browser cookies** and try again

### Real-Time Updates Not Working

**Symptom**: Changes by other users don't appear

**Solutions**:
1. **Check Firestore rules** - ensure users have read permissions
2. **Check browser console** for WebSocket errors
3. **Verify Firebase project ID** matches `.env.local`
4. **Check network tab** - look for failed requests to Firestore

### Cannot Create or Edit Tasks

**Symptom**: Permission denied errors

**Solutions**:
1. **Check your role** on the board (Settings → Members)
   - Commenters can't edit tasks
   - Only Editors and Owners can modify
2. **Verify Firestore rules** deployed correctly:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Dev Server Won't Start

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Port 3000 is in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run dev
```

### Build Fails

**Error**: TypeScript errors during build

**Solution**:
1. Run type checking: `npx tsc --noEmit`
2. Fix reported errors
3. Retry build: `npm run build`

---

## Tech Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **React 19**: UI library with React Compiler
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **@hello-pangea/dnd**: Drag and drop library

### Backend & Database
- **Firebase Authentication**: Google OAuth
- **Firestore**: Real-time NoSQL database
- **Firestore Security Rules**: Server-side authorization

### Developer Experience
- **ESLint**: Code linting
- **React Compiler**: Automatic memoization
- **Firebase Emulator**: Local testing
- **TypeScript Strict Mode**: Enhanced type safety

### Security
- **PBKDF2**: API token hashing (100k iterations, SHA-256)
- **Firestore Rules**: Granular access control
- **Constant-time comparison**: Timing attack prevention

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use functional components with hooks
- Add comments for complex logic
- Update tests for security rules
- Run `npm run lint` before committing

---

## License

[Add your license here]

---

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review `CLAUDE.md` for technical details

---

**Built with ❤️ using Next.js, React, and Firebase**
