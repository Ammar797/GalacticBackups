import React, { useRef, useState, useEffect } from 'react';

if (typeof window !== 'undefined') {
  window.audioManagerState = {
    isMuted: true,
    handleGalaxyHover: null,
    handleGalaxyHoverEnd: null
  };
}

const AudioManager = ({ isMapExpanded, onChange }) => {
  const backgroundMusicRef = useRef(null);
  const galaxyHoverSoundRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const activeGalaxyHoverRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize audio objects
    backgroundMusicRef.current = new Audio('/audio/background.mp3');
    backgroundMusicRef.current.loop = true;
    galaxyHoverSoundRef.current = new Audio('/audio/glow2.mp3');
    
    // Set initial volumes and properties
    backgroundMusicRef.current.volume = 0.8;
    galaxyHoverSoundRef.current.volume = 0.2;
    galaxyHoverSoundRef.current.loop = true;

    // Update the global handlers
    window.audioManagerState.handleGalaxyHover = (galaxyId) => handleGalaxyHover(galaxyId);
    window.audioManagerState.handleGalaxyHoverEnd = handleGalaxyHoverEnd;

    return () => {
      backgroundMusicRef.current?.pause();
      galaxyHoverSoundRef.current?.pause();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    window.audioManagerState.isMuted = isMuted;
  }, [isMuted]);

  const handleGalaxyHover = (galaxyId, delay = 200) => {
    if (window.audioManagerState.isMuted) {
      return;
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      if (activeGalaxyHoverRef.current !== galaxyId) {
        activeGalaxyHoverRef.current = galaxyId;
        if (galaxyHoverSoundRef.current) {
          galaxyHoverSoundRef.current.currentTime = 0;
          galaxyHoverSoundRef.current.play().catch(err => {
            console.error('Failed to play hover sound:', err);
            if (err.name === 'NotAllowedError') {
              const handleInteraction = () => {
                galaxyHoverSoundRef.current?.play();
                document.removeEventListener('click', handleInteraction);
              };
              document.addEventListener('click', handleInteraction);
            }
          });
        }
      }
    }, delay);
  };

  const handleGalaxyHoverEnd = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    activeGalaxyHoverRef.current = null;
    if (galaxyHoverSoundRef.current) {
      galaxyHoverSoundRef.current.pause();
      galaxyHoverSoundRef.current.currentTime = 0;
    }
  };

  const handleClick = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    onChange?.(newMutedState);

    if (newMutedState) {
      backgroundMusicRef.current?.pause();
      galaxyHoverSoundRef.current?.pause();
    } else {
      try {
        await backgroundMusicRef.current?.play();
      } catch (error) {
        console.error('Audio playback failed:', error);
        setIsMuted(true);
        onChange?.(true);
      }
    }
  };

  const expanded = Boolean(isMapExpanded);

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: '20px',
        top: expanded ? '230px' : '90px',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.3)',
        color: isHovered ? '#24D2FB' : 'white',
        border: `1px solid ${isHovered ? '#24D2FB' : 'rgba(255, 255, 255, 0.2)'}`,
        borderRadius: '50px',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        transition: 'all 0.4s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '55px',
        height: '55px',
        zIndex: 1,
      }}
    >
      <i 
        className={isMuted ? "ri-volume-mute-line" : "ri-volume-up-line"}
        style={{ fontSize: '1.2em' }}
      />
    </button>
  );
};

if (typeof window !== 'undefined') {
  window.AudioManager = {
    handleGalaxyHover: (galaxyId) => {
      window.audioManagerState.handleGalaxyHover?.(galaxyId);
    },
    handleGalaxyHoverEnd: () => {
      window.audioManagerState.handleGalaxyHoverEnd?.();
    }
  };
}

export default AudioManager;