import React from 'react';
import OntologyNVLViewer from './components/OntologyNVLViewer';
import { resolveDataUrl } from './utils/resolveDataUrl';

function App() {
  const params = new URLSearchParams(window.location.search);
  const embedMode = params.get('embed') === 'true';
  // Runtime-configurable data source (NFM-231 / NFM-229 D1):
  //   ?data=<URL> > ?corpus=<id> (reserved) > REACT_APP_DATA_URL > default
  // Default behavior is unchanged from the legacy hardcoded value.
  const resolved = resolveDataUrl(params, {
    REACT_APP_DATA_URL: process.env.REACT_APP_DATA_URL,
  });

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <OntologyNVLViewer
        dataUrl={resolved.url}
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
