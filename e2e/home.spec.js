import { test, expect } from '@playwright/test';

test('homepage loads with site title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '思辨场' })).toBeVisible();
});
