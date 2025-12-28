
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DataProvider } from './context/DataContext';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <DataProvider>
          <App />
        </DataProvider>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("App Render Error:", err);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">App failed to start. Check console for details.</div>`;
  }
} else {
  console.error("Critical: Root element not found");
}
