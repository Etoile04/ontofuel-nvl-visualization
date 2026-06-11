import React from 'react';
import OntologyNVLViewer from './components/OntologyNVLViewer';

function App() {
  const params = new URLSearchParams(window.location.search);
  const embedMode = params.get('embed') === 'true';

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <OntologyNVLViewer
        dataUrl="/data/nvl_ontology_data.json"
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
