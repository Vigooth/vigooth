import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveVanityUrl } from '@/lib/api/steam';

export function usePlayerSearch() {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setSearching(true);

    try {
      // If it looks like a 64-bit Steam ID, go directly
      if (/^\d{17}$/.test(trimmed)) {
        navigate(`/u/${trimmed}`);
        return;
      }

      // Extract vanity name from profile URL
      let vanity = trimmed;
      const urlMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
      if (urlMatch) {
        vanity = urlMatch[1];
      }
      const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
      if (profileMatch) {
        navigate(`/u/${profileMatch[1]}`);
        return;
      }

      const steamId = await resolveVanityUrl(vanity);
      navigate(`/u/${steamId}`);
    } catch {
      setError('User not found');
    } finally {
      setSearching(false);
    }
  };

  return { search, searching, error };
}
