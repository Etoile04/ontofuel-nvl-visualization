import { test, expect } from '@playwright/test';

/**
 * NFM-228 E2E matrix M4 — embed mode regression (NFM-49).
 * ?embed=true must hide the toolbar (search / layout / export) and the sidebar,
 * while keeping the graph container mounted.
 */
test.describe('M4 — embed mode (NFM-228 / NFM-49)', () => {
  test('?embed=true hides toolbar + sidebar, keeps graph', async ({ page }) => {
    await page.goto('/?embed=true');

    await expect(page.locator('.ontology-nvl-viewer')).toBeVisible({ timeout: 20_000 });

    // Toolbar elements absent
    await expect(page.getByPlaceholder('Search nodes...')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export/ })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Select graph layout' })).toHaveCount(0);

    // Sidebar (incl. stats panel) absent
    await expect(page.locator('.sidebar')).toHaveCount(0);
    await expect(page.locator('.stats-panel')).toHaveCount(0);
  });
});
