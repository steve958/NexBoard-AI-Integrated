# Testing Guide for NexBoard

This document provides an overview of the testing infrastructure and how to run tests.

## Test Suites

### 1. Firestore Security Rules Tests

Comprehensive test coverage for all Firestore collections and security rules.

**Test Files:**
- `tests/rules.projects.test.mjs` - Project creation, membership, ownership
- `tests/rules.users.test.mjs` - User profile security and privacy
- `tests/rules.columns.test.mjs` - Column permissions by role (owner/editor/commenter)
- `tests/rules.notifications.test.mjs` - Notification privacy and access control
- `tests/rules.roles.test.mjs` - Role-based permissions across resources
- `tests/rules.api-tokens.test.mjs` - API token security and ownership
- `tests/rules.nonmember-deny.test.mjs` - Access denial for non-members

**Running Rules Tests:**

```bash
# Run all rules tests
npm run test:rules:all

# Run individual test suites
npm run test:rules:projects
npm run test:rules:users
npm run test:rules:columns
npm run test:rules:notifications
npm run test:rules:roles
npm run test:rules:tokens
npm run test:rules
```

**Requirements:**
- Firebase CLI installed: `npm install -g firebase-tools`
- Firestore emulator automatically starts for each test run

### 2. E2E Tests (Playwright)

End-to-end tests for user workflows and UI interactions.

**Running E2E Tests:**

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

**First Time Setup:**

```bash
# Install Playwright browsers
npx playwright install
```

**Test Configuration:**
- Config file: `playwright.config.ts`
- Test files: `e2e/**/*.spec.ts`
- Runs on multiple browsers: Chrome, Firefox, Safari, Mobile
- Screenshots captured on failure
- Full traces on retry

### 3. Linting

```bash
npm run lint
```

## Continuous Integration

All tests run automatically on GitHub Actions for:
- Push to `main`, `master`, or `develop` branches
- Pull requests to these branches

**CI Jobs:**
1. **Lint and Build** - ESLint + Next.js build
2. **Firestore Rules Tests** - All security rules tests
3. **E2E Tests** - Full Playwright suite with artifacts

View workflow: `.github/workflows/ci.yml`

## Firestore Indexes

Composite indexes are defined in `firestore.indexes.json`:

- **tasks**: `columnId+order`, `assigneeId+order`, `parentTaskId+order`
- **comments**: `taskId+createdAt`
- **notifications**: `userId+createdAt`
- **apiTokens**: `userId+createdAt`, `tokenPrefix+revokedAt`

Deploy indexes: `firebase deploy --only firestore:indexes`

## Writing Tests

### Security Rules Tests

Use Firebase Rules Unit Testing library:

```javascript
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const testEnv = await initializeTestEnvironment({
  projectId: 'demo-test',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});

const alice = testEnv.authenticatedContext('alice');
await assertSucceeds(alice.firestore().collection('users').doc('alice').get());
```

### E2E Tests

Use Playwright test framework:

```typescript
import { test, expect } from '@playwright/test';

test('should create a new board', async ({ page }) => {
  await page.goto('/boards');
  await page.getByRole('button', { name: /create board/i }).click();
  // ... assertions
});
```

## Best Practices

1. **Rules Tests**: Test both success and failure cases for each rule
2. **E2E Tests**: Use data-testid attributes for stable selectors
3. **Cleanup**: Always cleanup test data in `afterEach` or similar
4. **Isolation**: Tests should be independent and runnable in any order
5. **CI-Ready**: Tests should work in CI environment without manual setup

## Troubleshooting

**Firebase Emulator Issues:**
- Ensure port 8080 is available
- Check `firebase.json` for emulator configuration

**Playwright Issues:**
- Run `npx playwright install` to update browsers
- Check `playwright.config.ts` for base URL configuration
- Use `--debug` flag to step through tests

**CI Failures:**
- Check GitHub Secrets for Firebase environment variables
- Review Playwright report artifacts in Actions tab
- Ensure `package-lock.json` is committed
