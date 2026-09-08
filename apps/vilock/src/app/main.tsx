import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../index.css';
import '../lib/i18n';
import { trackVisit } from '@vigooth/config';

trackVisit('vilock');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
