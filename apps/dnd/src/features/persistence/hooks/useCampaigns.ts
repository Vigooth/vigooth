import { useCallback, useEffect, useState } from 'react';
import type { Campaign, CampaignMeta } from '@/types/campaign';
import {
  deleteCampaign,
  getUsageBytes,
  listCampaigns,
  loadCampaign,
  migrateLegacyMaps,
  renameCampaign,
  saveCampaign,
} from '../api/campaigns';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>(() => {
    migrateLegacyMaps();
    return listCampaigns();
  });
  const [usage, setUsage] = useState(() => getUsageBytes());

  const refresh = useCallback(() => {
    setCampaigns(listCampaigns());
    setUsage(getUsageBytes());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('dnd:campaigns:')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const save = useCallback(
    (campaign: Campaign) => {
      const meta = saveCampaign(campaign);
      refresh();
      return meta;
    },
    [refresh],
  );

  const load = useCallback((id: string): Campaign | null => loadCampaign(id), []);

  const remove = useCallback(
    (id: string) => {
      deleteCampaign(id);
      refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const meta = renameCampaign(id, name);
      refresh();
      return meta;
    },
    [refresh],
  );

  return { campaigns, usage, save, load, remove, rename, refresh };
}
