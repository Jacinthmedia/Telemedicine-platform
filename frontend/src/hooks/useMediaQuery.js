import { useState, useEffect } from 'react';

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Update matches state
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener function
    const listener = (event) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Clean up
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};