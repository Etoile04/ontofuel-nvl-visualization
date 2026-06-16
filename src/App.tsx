import React from 'react';
import OntologyNVLViewer from './components/OntologyNVLViewer';
import { resolveDataUrl } from './utils/resolveDataUrl';

function App() {
  const params = new URLSearchParams(window.location.search);
  const embedMode = params.get('embed') === 'true';

  // Resolve the NVL data source at runtime (NFM-229 / NFM-226 D4):
  // ?data= > ?corpus= (reserved) > REACT_APP_DATA_URL > props > default.
  // With no param/env set this resolves to the default URL, so default
  // loading behaviour is unchanged (zero-break).
  const { url: dataUrl } = resolveDataUrl(
    params,
    process.env as Record<string, string | undefined>
  );

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <OntologyNVLViewer
        dataUrl={dataUrl}
        initialLayout="forceDirected"
        height="100vh"
        width="100%"
        embedMode={embedMode}
        onNodeClick={(node) => console.log('Node clicked:', node)}
      />
    </div>
  );
}

export default App;
