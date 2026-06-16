/**
 * App-level embed wiring (NFM-49, AC#2 / Task 3 Step 2).
 *
 * Verifies App reads ?embed=true from the URL and forwards embedMode to
 * OntologyNVLViewer. The viewer is mocked so we assert the prop in isolation
 * (no NVL canvas, no fetch). The full ?embed=true -> hidden toolbar path is
 * also covered end-to-end by e2e/embed.spec.ts (M4).
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import App from './App';

// jest.mock factories may only reference `mock`-prefixed out-of-scope vars.
const mockViewer = jest.fn(() => <div data-testid="viewer-mock" />);

jest.mock('./components/OntologyNVLViewer', () => ({
  __esModule: true,
  default: (props: any) => mockViewer(props)
}));

const realLocation = window.location;

function setLocationSearch(search: string): void {
  // jsdom's window.location is read-only; override just the fields App reads.
  Object.defineProperty(window, 'location', {
    value: { ...realLocation, search },
    writable: true,
    configurable: true
  });
}

function restoreLocation(): void {
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true
  });
}

describe('App embed wiring (NFM-49)', () => {
  beforeEach(() => mockViewer.mockClear());
  afterEach(() => {
    cleanup();
    restoreLocation();
  });

  test('passes embedMode=false by default (no query param)', () => {
    setLocationSearch('');
    render(<App />);
    expect(mockViewer).toHaveBeenCalledTimes(1);
    expect(mockViewer.mock.calls[0][0].embedMode).toBe(false);
  });

  test('passes embedMode=true when ?embed=true is present', () => {
    setLocationSearch('?embed=true');
    render(<App />);
    expect(mockViewer.mock.calls[0][0].embedMode).toBe(true);
  });
});
