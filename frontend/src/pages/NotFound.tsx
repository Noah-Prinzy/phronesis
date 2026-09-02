// frontend/src/pages/NotFound.tsx

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#050914] text-center">
      <p className="text-lg font-semibold text-[#e8eefb]">Page not found</p>
      <Link to="/" className="text-[#60a5fa] hover:underline">
        Back to start
      </Link>
    </div>
  );
}

export default NotFound;
