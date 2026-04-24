import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Door, CpcLayout, cn } from '@vigooth/ui';
import { getAppUrl } from '@vigooth/config';

export function HomePreviewPage() {
  const navigate = useNavigate();
  const [isEntering, setIsEntering] = useState(false);

  const handlePortalDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => navigate('/home'), 800);
  };

  const handleVilockDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => {
      window.location.href = getAppUrl('vilock');
    }, 800);
  };

  const handleMooviDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => {
      window.location.href = getAppUrl('movies');
    }, 800);
  };

  const handleSteamDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => {
      window.location.href = getAppUrl('steam');
    }, 800);
  };

  const filmIcon = (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Film strip */}
      <rect
        x="4"
        y="6"
        width="36"
        height="32"
        rx="2"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2.5"
      />
      {/* Sprocket holes left */}
      <rect x="7" y="10" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="7" y="17" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="7" y="24" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="7" y="31" width="4" height="3" rx="0.5" fill="#00FF00" />
      {/* Sprocket holes right */}
      <rect x="33" y="10" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="33" y="17" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="33" y="24" width="4" height="3" rx="0.5" fill="#00FF00" />
      <rect x="33" y="31" width="4" height="3" rx="0.5" fill="#00FF00" />
      {/* Play triangle */}
      <path d="M18 15L18 29L30 22Z" fill="#00FF00" />
    </svg>
  );

  const gamepadIcon = (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Controller body */}
      <path
        d="M10 20C10 15 14 11 19 11H33C38 11 42 15 42 20V30C42 35 38 39 33 39H19C14 39 10 35 10 30V20Z"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2.5"
      />
      {/* Left grip */}
      <path
        d="M10 28L5 36C4 38 5 40 7 40H12V28H10Z"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2"
      />
      {/* Right grip */}
      <path
        d="M42 28L47 36C48 38 47 40 45 40H40V28H42Z"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2"
      />
      {/* D-pad vertical */}
      <rect x="17" y="18" width="5" height="14" rx="0.5" fill="#00FF00" />
      {/* D-pad horizontal */}
      <rect x="14" y="22" width="11" height="6" rx="0.5" fill="#00FF00" />
      {/* Buttons */}
      <circle cx="35" cy="21" r="3" fill="#00FF00" />
      <circle cx="40" cy="26" r="3" fill="#00FF00" />
      <circle cx="30" cy="26" r="3" fill="#00FF00" />
      <circle cx="35" cy="31" r="3" fill="#00FF00" />
    </svg>
  );

  return (
    <CpcLayout>
      <div className="p-2 h-full overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center">
        <div className="text-center mb-4 sm:mb-8 border-b-2 border-cpc-green-500 pb-2 sm:pb-4">
          <div className="text-cpc-yellow-500 text-lg sm:text-2xl font-bold">WELCOME TO</div>
          <div className="text-cpc-cyan-500 text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">
            VIGOOTH SYSTEM
          </div>
          <div className="text-cpc-green-500 text-xs sm:text-sm mt-1 sm:mt-2">
            v1.0 - Amstrad CPC 6128
          </div>
        </div>

        <div
          className={cn(
            'flex items-end gap-0 sm:gap-6 lg:gap-12 transition-opacity duration-700 ease-in',
            'scale-[0.42] sm:scale-[0.65] lg:scale-100',
            '-my-16 sm:-my-8 lg:my-0',
            isEntering ? 'opacity-0' : 'opacity-100',
          )}
        >
          <Door onOpen={handlePortalDoorOpen} />
          <Door onOpen={handleVilockDoorOpen} showLock />
          <Door onOpen={handleMooviDoorOpen} icon={filmIcon} />
          <Door onOpen={handleSteamDoorOpen} icon={gamepadIcon} />
        </div>

        <div className="text-center text-cpc-green-500 mt-2 sm:mt-4 animate-pulse-cpc">
          <div className="text-sm sm:text-lg">CLICK A DOOR TO ENTER</div>
        </div>

        <div className="text-center mt-4 sm:mt-8 text-cpc-cyan-500 text-xs">
          <div>Copyright 2025 - Retro Computing Experience</div>
        </div>
      </div>
    </CpcLayout>
  );
}
