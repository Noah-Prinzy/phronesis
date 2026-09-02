// frontend/src/App.tsx

import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { VoiceProvider } from './components/Voice/VoiceProvider';
import Account from './pages/Account';
import AvatarStudio from './pages/AvatarStudio';
import Diagnosis from './pages/Diagnosis';
import Home from './pages/Home';
import LoadingScreen from './pages/LoadingScreen';
import NotFound from './pages/NotFound';
import Onboarding from './pages/Onboarding';
import Solutions from './pages/Solutions';
import Welcome from './pages/Welcome';

/** Wires LoadingScreen's onComplete to real navigation for the /loading route. */
function LoadingScreenRoute() {
  const navigate = useNavigate();
  return <LoadingScreen theme="dark" onComplete={() => navigate('/welcome')} />;
}

/** Wires Welcome's onComplete to real navigation for the /welcome route. */
function WelcomeRoute() {
  const navigate = useNavigate();
  return <Welcome onComplete={() => navigate('/onboarding')} />;
}

function App() {
  return (
    <VoiceProvider>
      <Routes>
        {/* Root redirects into the entry flow. */}
        <Route path="/" element={<Navigate to="/loading" replace />} />

        {/* Entry flow: Loading -> Welcome -> Onboarding -> Home */}
        <Route path="/loading" element={<LoadingScreenRoute />} />
        <Route path="/welcome" element={<WelcomeRoute />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/account" element={<Account />} />

        <Route path="/avatar-studio" element={<AvatarStudio />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </VoiceProvider>
  );
}

export default App;
