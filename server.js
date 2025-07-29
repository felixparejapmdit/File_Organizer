require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let dataStore = {
  shelves: [],
  containers: [],
  folders: [],
  documents: []
};

// Upload data endpoint
app.post('/api/upload-data', (req, res) => {
  dataStore = req.body;
  res.json({ success: true, message: "Data uploaded." });
});

// Document scan endpoint
app.get('/api/document/:qrCode', (req, res) => {
  const id = req.params.qrCode;

  const doc = dataStore.documents.find(d => d.id === id);
  if (doc) {
    const folder = dataStore.folders.find(f => f.id === doc.folderId);
    const container = folder && dataStore.containers.find(c => c.id === folder.containerId);
    const shelf = container && dataStore.shelves.find(s => s.id === container.shelfId);

    return res.json({
      type: 'document',
      id: doc.id,
      shelf: shelf?.name || null,
      container: container?.name || null,
      folder: folder?.name || null,
    });
  }

  const folder = dataStore.folders.find(f => f.id === id);
  if (folder) {
    const container = dataStore.containers.find(c => c.id === folder.containerId);
    const shelf = container && dataStore.shelves.find(s => s.id === container.shelfId);

    return res.json({
      type: 'folder',
      id: folder.id,
      shelf: shelf?.name || null,
      container: container?.name || null,
    });
  }

  const container = dataStore.containers.find(c => c.id === id);
  if (container) {
    const shelf = dataStore.shelves.find(s => s.id === container.shelfId);
    return res.json({
      type: 'container',
      id: container.id,
      shelf: shelf?.name || null,
    });
  }

  res.status(404).json({ error: 'Item not found' });
});

// View raw data
app.get('/api/data-store', (req, res) => {
  res.json(dataStore);
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// Start server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});
