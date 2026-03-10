import React from 'react';
import OntologyNVLViewer from './components/OntologyNVLViewer';

function App() {
  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <OntologyNVLViewer
        dataUrl="/data/nvl_ontology_data.json"
        initialLayout="forceDirected"
        height="100vh"
        width="100%"
        onNodeClick={(node) => console.log('Node clicked:', node)}
      />
    </div>
  );
}

export default App;
