import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../index.css';
import { trackVisit } from '@vigooth/config';

const container = document.getElementById('root');
if (!container) throw new Error('Root element missing');

trackVisit('garden');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
