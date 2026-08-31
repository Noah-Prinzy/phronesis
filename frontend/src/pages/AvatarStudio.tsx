// frontend/src/pages/AvatarStudio.tsx

import React, { useState } from 'react';
import Avatar from '../components/Avatar/Avatar';

export const AvatarStudio: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <Avatar size="large" isLoading={isLoading} />

      {/* Hidden input for keyboard shortcut */}
      <input
        autoFocus
        type="text"
        style={{ position: 'absolute', left: '-9999px' }}
        onKeyDown={(e) => {
          if (e.key === 'l' || e.key === 'L') {
            setIsLoading(!isLoading);
          }
        }}
      />
    </div>
  );
};

export default AvatarStudio;
