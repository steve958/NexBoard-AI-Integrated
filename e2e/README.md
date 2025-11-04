# E2E Testing with Playwright

This directory contains end-to-end tests for NexBoard using Playwright.

## Setup

Install Playwright and browsers:

```bash
npm install -D @playwright/test
npx playwright install
```

## Running Tests

Run all tests:
```bash
npm run test:e2e
```

Run tests in headed mode (see browser):
```bash
npm run test:e2e:headed
```

Run tests in UI mode (interactive):
```bash
npm run test:e2e:ui
```

Generate test code using codegen:
```bash
npx playwright codegen http://localhost:3000
```

## Test Structure

- `example.spec.ts` - Template and basic smoke tests
- Future test files should follow the pattern: `feature-name.spec.ts`

## Writing Tests

Key testing areas:
1. **Authentication** - Login, logout, session persistence
2. **Board Management** - Create, edit, delete boards
3. **Task Operations** - CRUD operations, drag-and-drop
4. **Subtasks** - Creation, progress rollup
5. **Comments** - Add, edit, delete, mentions
6. **Notifications** - Real-time updates, mark as read
7. **Keyboard Shortcuts** - All defined shortcuts work
8. **Command Palette** - Search and execute commands
9. **API Tokens** - Create, revoke, test API access
10. **Responsive Design** - Mobile viewports

## CI Integration

E2E tests run automatically on GitHub Actions for all PRs and commits to main branches.

## Best Practices

- Use data-testid attributes for stable selectors
- Mock external services when possible
- Keep tests independent and idempotent
- Use page object pattern for complex workflows
- Take screenshots on failures (automatic)
- Use Playwright's auto-waiting features
