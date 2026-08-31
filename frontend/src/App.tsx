// frontend/src/App.tsx

import { Route, Routes } from 'react-router-dom';
import AvatarStudio from './pages/AvatarStudio';

function App() {
  return (
    <Routes>
      <Route path="/avatar-studio" element={<AvatarStudio />} />

      {/* Main app routes (added later) */}
      <Route
        path="/"
        element={
          <div className="flex h-screen w-screen items-center justify-center bg-white text-blue-900">
            Coming soon...
          </div>
        }
      />
    </Routes>
  );
}

export default App;
