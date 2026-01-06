
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Versioned Cache Clearing Logic - LOCKED SAVEPOINT 1.1
// This ensures that the UI structure is preserved and consistent
const APP_VERSION = '1.1.0'; 
const lastVersion = localStorage.getItem('app_data_version');
if (lastVersion !== APP_VERSION) {
  console.log(`System version updated to ${APP_VERSION}. Preserving core UI layout.`);
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('app_data_version', APP_VERSION);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
