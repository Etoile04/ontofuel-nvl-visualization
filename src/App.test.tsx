/**
 * App.test.tsx — NFM-228 AC#2
 * Locks the ?embed=true -> embedMode wiring (NFM-49 embed mode) at the App level.
 * The full iframe surface is also covered by the Playwright embed spec (e2e/embed.spec.ts).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import App from './App';

// Mock @neo4j-nvl/react (same as OntologyNVLViewer.test.tsx): the real NVL
// renderer requires a canvas/WebGL context and cannot run under jsdom. The mock
// exposes the node/relationship counts that the E2E render spec also relies on.
jest.mock('@neo4j-nvl/react', () => ({
  InteractiveNvlWrapper: ({ nodes, rels, mouseEventCallbacks }: any) => (
    <div data-testid="nvl-wrapper">
      <div data-testid="node-count">{nodes.length} nodes</div>
      <div data-testid="rel-count">{rels.length} relationships</div>
      {nodes.map((node: any) => (
        <div
          key={node.id}
          data-testid={`node-${node.id}`}
          onClick={() => mouseEventCallbacks?.onNodeClick?.(node)}
        >
          {node.name || node.id}
        </div>
      ))}
    </div>
  )
}));

const mockNvl = {
  schema_version: '1.0',
  generated_at: '2026-06-17T00:00:00+00:00',
  source_ontology: 'data/material_ontology_enhanced.json',
  source_digest: 'abc123def456',
  stats: { nodes: 1, relationships: 0, classes: 1, individuals: 0 },
  nodes: [{ id: 'n1', type: 'class', name: 'Material', label: 'Material' }],
  relationships: []
};

describe('App embed wiring (NFM-49)', () => {
  const originalLocation = window.location;

  function setLocation(search: string): void {
    // jsdom's window.location is otherwise read-only; replace it with a URL
    // instance that carries the query string App reads via URLSearchParams.
    delete (window as any).location;
    (window as any).location = new URL(`http://localhost/${search}`);
  }

  afterEach(() => {
    (window as any).location = originalLocation;
    (global.fetch as jest.Mock).mockClear();
  });

  test('?embed=true 透传 embedMode 给 viewer（工具栏隐藏）', async () => {
    setLocation('?embed=true');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNvl
    });

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.toolbar')).not.toBeInTheDocument();
    });
  });

  test('无 embed 参数时默认渲染工具栏（非 embed）', async () => {
    setLocation('');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNvl
    });

    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
    });
  });
});
