import { useEffect, useState } from 'react';
import type { ProfessionalCard, RecommendedProvidersResponse } from '@dastiyor/types';
import { api } from './api-client';

/**
 * Providers to suggest for the customer's own task. Loads when the task id
 * changes or `refreshKey` does (pass the response count, so a provider who
 * just responded drops out), not on the task screen's poll: each load runs
 * the directory's aggregate queries. A failed load leaves the list empty.
 */
export function useRecommendedProviders(taskId: string | undefined, enabled: boolean, refreshKey = 0) {
  const [providers, setProviders] = useState<ProfessionalCard[]>([]);

  useEffect(() => {
    if (!taskId || !enabled) {
      setProviders([]);
      return;
    }
    let live = true;
    api.get<RecommendedProvidersResponse>(`/api/tasks/${taskId}/recommended-providers`)
      .then((res) => { if (live) setProviders(res.providers ?? []); })
      .catch(() => { if (live) setProviders([]); });
    return () => { live = false; };
  }, [taskId, enabled, refreshKey]);

  return providers;
}
