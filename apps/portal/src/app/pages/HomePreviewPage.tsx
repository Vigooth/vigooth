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

  const handleDndDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => {
      window.location.href = getAppUrl('dnd');
    }, 800);
  };

  const handleGardenDoorOpen = () => {
    setIsEntering(true);
    setTimeout(() => {
      window.location.href = getAppUrl('garden');
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

  /**
   * A dragon's head in profile rather than the whole creature.
   *
   * A full body was tried first and failed: at this size the neck, limbs and
   * tail thin out until the silhouette reads as a bird or a lizard. A head fills
   * the frame with the two features that actually say "dragon" — swept horns and
   * a fanged open jaw — and it stays legible down to ~38px, which is where the
   * smallest breakpoint's transform puts it.
   *
   * Drawn on a 64 unit grid rather than the 44–52 the other icons use; the
   * `Door` centres the icon in a 200x300 panel with no size constraint, so there
   * is room to spend. Horns and neck are drawn before the skull so it overlaps
   * their bases, and the head and neck share one path — as two shapes they read
   * as two objects rather than one animal.
   */
  const dragonIcon = (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Swept horns, the long one overlapping the short one */}
      <path
        d="M28 16C35 7 45 4 55 5C46 8 38 12 33 19Z"
        fill="#00FF00"
        stroke="#00FF00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M20 18C23 12 28 9 32 9C27 12 24 16 23 21Z"
        fill="#00FF00"
        stroke="#00FF00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Head and neck as one continuous silhouette */}
      <path
        d="M5 28L15 22C17 20 18 19 20 18C24 15 26 15 29 16C34 17 37 18 41 20L52 16L57 24L54 43L45 45L40 36L39 33L24 32L14 30Z"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Crest spines along the neck's outer edge */}
      <path d="M44 18L46 11L49 17Z" fill="#00FF00" />
      <path d="M53 17L59 15L58 22Z" fill="#00FF00" />
      <path d="M56 30L61 31L55 37Z" fill="#00FF00" />
      {/* Lower jaw, open, kept thick at the hinge */}
      <path
        d="M38 35L15 40L8 47L21 46L31 42L39 39Z"
        fill="#1a1a1a"
        stroke="#00FF00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Chin spike */}
      <path
        d="M11 44L4 50L14 48Z"
        fill="#00FF00"
        stroke="#00FF00"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Jowl, so it reads as flesh rather than bone */}
      <path d="M27 30C31 28 35 28 38 30" stroke="#00FF00" strokeWidth="1.6" strokeLinecap="round" />
      {/* Brow ridge and slit eye */}
      <path d="M17 22L28 20" stroke="#00FF00" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 25L29 23L25 28Z" fill="#00FF00" />
      <circle cx="9" cy="26.5" r="1" fill="#00FF00" />
      {/* Fangs */}
      <path d="M10 29L12 34L14 30Z" fill="#00FF00" />
      <path d="M18 30L20 35L22 31Z" fill="#00FF00" />
      <path d="M16 39L18 34L20 39Z" fill="#00FF00" />
    </svg>
  );

  const seedlingIcon = (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pot */}
      <path d="M13 28H31L28.5 39H15.5L13 28Z" fill="#1a1a1a" stroke="#00FF00" strokeWidth="2.5" />
      {/* Soil line */}
      <path d="M12 28H32" stroke="#00FF00" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stem */}
      <path d="M22 28V12" stroke="#00FF00" strokeWidth="2.5" strokeLinecap="round" />
      {/* Lower left leaf */}
      <path d="M22 21C22 21 15 21.5 12.5 15.5C18.5 13.5 22 16 22 21Z" fill="#00FF00" />
      {/* Upper right leaf */}
      <path d="M22 15C22 15 28.5 14 31 8C25 6.5 22 10 22 15Z" fill="#00FF00" />
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
            // Six doors no longer fit on one line at any sane scale, so the row
            // became a grid that reflows: two abreast on a phone, three on a
            // tablet, all six in a line only from xl up.
            'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 place-items-end',
            'gap-0 sm:gap-6 xl:gap-4 transition-opacity duration-700 ease-in',
            // Doors are a fixed 200x300 each, so the block is still shrunk with a
            // transform. Each factor keeps the scaled width inside its
            // breakpoint's viewport, and the negative margins claw back the
            // whitespace a transform leaves behind — it does not affect layout.
            'scale-[0.6] sm:scale-[0.72] lg:scale-[0.95] xl:scale-[0.7]',
            '-my-44 sm:-my-24 lg:-my-4 xl:-my-14',
            isEntering ? 'opacity-0' : 'opacity-100',
          )}
        >
          <Door onOpen={handlePortalDoorOpen} />
          <Door onOpen={handleVilockDoorOpen} showLock />
          <Door onOpen={handleMooviDoorOpen} icon={filmIcon} />
          <Door onOpen={handleSteamDoorOpen} icon={gamepadIcon} />
          <Door onOpen={handleDndDoorOpen} icon={dragonIcon} />
          <Door onOpen={handleGardenDoorOpen} icon={seedlingIcon} />
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
