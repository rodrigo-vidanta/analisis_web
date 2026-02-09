import { useState, useEffect } from 'react';
import { analysisSupabase } from '../config/analysisSupabase';

interface ReleaseNoteCategory {
  type: string;
  items: string[];
}

interface VersionHistoryEntry {
  version: string;
  release_notes: ReleaseNoteCategory[];
  message: string | null;
  deployed_at: string;
}

export type { VersionHistoryEntry };

interface UseVersionHistoryResult {
  versions: VersionHistoryEntry[];
  isLoading: boolean;
}

export const useVersionHistory = (): UseVersionHistoryResult => {
  const [versions, setVersions] = useState<VersionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await analysisSupabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', 'version_history')
          .eq('is_active', true)
          .single();

        if (error || !data) {
          console.debug('[useVersionHistory] Error:', error?.message);
          return;
        }

        const entries = data.config_value;
        if (Array.isArray(entries)) {
          setVersions(entries.map((entry: Record<string, unknown>) => ({
            version: (entry.version as string) || '',
            release_notes: Array.isArray(entry.release_notes) ? entry.release_notes as ReleaseNoteCategory[] : [],
            message: (entry.message as string) || null,
            deployed_at: (entry.deployed_at as string) || '',
          })));
        }
      } catch (err) {
        console.debug('[useVersionHistory] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return { versions, isLoading };
};
