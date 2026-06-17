import { test, expect } from '@playwright/test';
import fixture from './fixtures/nvl_ontology_data.json';

/**
 * NFM-228 E2E matrix M1 — render smoke.
 * Loads the canonical NVL fixture served at /data/nvl_ontology_data.json and
 * asserts the rendered Statistics panel matches counts computed from the
 * fixture (the NVL canvas itself is WebGL, so the sidebar stats panel is the
 * deterministic, DOM-queryable regression signal).
 */
const classCount = fixture.nodes.filter((n: { type: string }) => n.type === 'class').length;
const individualCount = fixture.nodes.filter((n: { type: string }) => n.type === 'individual').length;
const hierarchyCount = fixture.relationships.filter(
  (r: { type: string }) => r.type === 'SUBCLASS_OF'
).length;
const propertyCount = fixture.relationships.filter(
  (r: { type: string }) => r.type !== 'SUBCLASS_OF' && r.type !== 'INSTANCE_OF'
).length;

test.describe('M1 — render smoke (NFM-228)', () => {
  test('graph container mounts', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ontology-nvl-viewer')).toBeVisible();
  });

  test('Statistics panel reflects fixture counts', async ({ page }) => {
    await page.goto('/');

    // Wait for data load + stats render (sidebar is present in non-embed mode).
    const stats = page.locator('.stats-panel');
    await expect(stats).toBeVisible({ timeout: 20_000 });
    await expect(stats).toContainText(`Classes: ${classCount}`);
    await expect(stats).toContainText(`Individuals: ${individualCount}`);
    await expect(stats).toContainText(`Hierarchy Relations: ${hierarchyCount}`);
    await expect(stats).toContainText(`Property Relations: ${propertyCount}`);
  });

  test('no console errors during load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    // React dev-mode noise is expected; only capture true page errors.
    await page.goto('/');
    await expect(page.locator('.stats-panel')).toBeVisible({ timeout: 20_000 });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
