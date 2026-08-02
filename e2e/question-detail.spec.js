import { test, expect } from '@playwright/test';

test('question detail page shows not-found state for invalid id', async ({ page }) => {
  await page.route(/\/api\/questions\//, (route) => {
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: '问题不存在' }),
    });
  });

  await page.goto('/question/smoke-test-invalid-id');
  await expect(page.getByText('加载中...')).toBeHidden({ timeout: 10000 });
  await expect(page.getByText('问题不存在')).toBeVisible();
});
