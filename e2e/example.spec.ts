import { test, expect } from '@playwright/test';

/**
 * Example E2E test for NexBoard
 * This serves as a template for writing more comprehensive tests
 */

test.describe('NexBoard Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await expect(page).toHaveTitle(/NexBoard/);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/boards');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authentication Flow', () => {
  test('should show Google sign-in button on login page', async ({ page }) => {
    await page.goto('/login');

    // Check for Google sign-in button
    const signInButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(signInButton).toBeVisible();
  });
});

/**
 * TODO: Add more E2E tests for:
 * - Board creation and management
 * - Task CRUD operations
 * - Drag and drop functionality
 * - Comments and mentions
 * - Notifications
 * - Keyboard shortcuts
 * - Command palette
 * - API token management
 * - Theme switching
 */
