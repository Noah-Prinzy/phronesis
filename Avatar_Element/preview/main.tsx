// Avatar_Element/preview/main.tsx
//
// Entry point for the standalone lab. Deliberately separate from the
// Phronesis app: this mounts its own React root and touches nothing in
// frontend/src.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AvatarLab from './AvatarLab';

const container = document.getElementById('root');
if (!container) throw new Error('Avatar lab: #root missing from index.html');

createRoot(container).render(
  <StrictMode>
    <AvatarLab />
  </StrictMode>,
);
