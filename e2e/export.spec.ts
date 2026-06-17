import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * NFM-228 E2E matrix M3 — multi-format export non-empty files (NFM-49).
 * Triggers each export format and asserts a non-empty file downloads with the
 * expected extension.
 */
const cases: ReadonlyArray<readonly [string, RegExp]> = [
  ['Export as JSON', /\.json$/],
  ['Export Relationships as CSV', /relationships\.csv$/],
  ['Export as GraphML', /\.graphml$/],
  ['Export as Markdown Report', /_report\.md$/]
];

test.describe('M3 — multi-format export (NFM-228 / NFM-49)', () => {
  for (const [label, ext] of cases) {
    test(`exports non-empty ${label} file`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.stats-panel')).toBeVisible({ timeout: 20_000 });

      // Open the export menu and trigger this format.
      await page.getByRole('button', { name: /Export/ }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('menuitem', { name: new RegExp(label) }).click()
      ]);

      expect(download.suggestedFilename()).toMatch(ext);

      const path = await download.path();
      expect(path, 'download saved to disk').toBeTruthy();
      const size = fs.statSync(path as string).size;
      expect(size, `${label} file is non-empty`).toBeGreaterThan(0);
    });
  }
});
