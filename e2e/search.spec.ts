import { test, expect } from '@playwright/test';
import fixture from './fixtures/nvl_ontology_data.json';

/**
 * NFM-228 E2E matrix M2 — search filter regression (NFM-50).
 *
 * The NVL canvas is WebGL, so visible node count is not DOM-queryable. Instead
 * the export menu's live "Filtered (N)" label (derived from the same
 * filteredNodes the canvas uses) plus the "No nodes match your search" hint are
 * the deterministic DOM signals. Expected counts are computed from the fixture
 * by replicating the component's filter (name/label/type, case-insensitive).
 */
type NvlNode = { id: string; type?: string; name?: string; label?: string };

const total = fixture.nodes.length;

const matches = (term: string): number =>
  fixture.nodes.filter((n: NvlNode) => {
    const name = (n.name ?? '').toLowerCase();
    const label = (n.label ?? '').toLowerCase();
    const type = (n.type ?? '').toLowerCase();
    return name.includes(term) || label.includes(term) || type.includes(term);
  }).length;

const sampleNode = fixture.nodes.find((n: NvlNode) => n.type === 'class');
const term = (sampleNode?.name ?? sampleNode?.id ?? 'class').toLowerCase();
const expectedForTerm = matches(term);

test.describe('M2 — search filter (NFM-228 / NFM-50)', () => {
  test('search narrows filtered node count and clears restore it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.stats-panel')).toBeVisible({ timeout: 20_000 });

    // Open the export menu to read the live "Filtered (N)" count.
    await page.getByRole('button', { name: /Export/ }).click();
    const filteredLabel = page.locator('.export-scope-options').getByText(/Filtered/);

    // No search yet: Filtered reflects all nodes.
    await expect(filteredLabel).toContainText(`Filtered (${total})`);

    // Real term: count drops to the matched subset.
    await page.getByPlaceholder('Search nodes...').fill(term);
    await expect(filteredLabel).toContainText(`Filtered (${expectedForTerm})`);
    expect(expectedForTerm, `term "${term}"`).toBeGreaterThan(0);
    expect(expectedForTerm).toBeLessThan(total);

    // Nonsense term: zero matches + no-results hint.
    await page.getByPlaceholder('Search nodes...').fill('zzzqqqnomatchxyz');
    await expect(filteredLabel).toContainText('Filtered (0)');
    await expect(page.getByText('No nodes match your search')).toBeVisible();

    // Clear: restores full set and hides the hint.
    await page.getByPlaceholder('Search nodes...').fill('');
    await expect(filteredLabel).toContainText(`Filtered (${total})`);
    await expect(page.getByText('No nodes match your search')).toHaveCount(0);
  });
});
