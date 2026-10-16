import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginatedResult, ProfessionalCard, ProfessionalSort } from '@dastiyor/types';
import { api } from './api-client';

export interface ProfessionalFilters {
  q: string;
  category: string; // canonical Russian, '' = all
  city: string; // canonical Russian, '' = all
  sort: ProfessionalSort;
}

const LIMIT = 20;
const DEBOUNCE_MS = 300;

/** Paged provider search for the Professionals tab. The text query is debounced; filters apply at once. */
export function useProfessionals(filters: ProfessionalFilters) {
  const [items, setItems] = useState<ProfessionalCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(filters.q);
  const page = useRef(1);
  const request = useRef(0); // drops responses from a superseded search

  useEffect(() => {
    const id = setTimeout(() => setQ(filters.q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [filters.q]);

  const fetchPage = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT), sort: filters.sort });
    if (q) params.set('q', q);
    if (filters.category) params.set('category', filters.category);
    if (filters.city) params.set('city', filters.city);
    return api.get<PaginatedResult<ProfessionalCard>>(`/api/professionals?${params}`);
  }, [q, filters.category, filters.city, filters.sort]);

  const load = useCallback(async () => {
    const mine = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPage(1);
      if (mine !== request.current) return;
      page.current = 1;
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      if (mine === request.current) setError((e as Error).message);
    } finally {
      if (mine === request.current) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || items.length >= total) return;
    const mine = request.current;
    setLoadingMore(true);
    try {
      const res = await fetchPage(page.current + 1);
      if (mine !== request.current) return;
      page.current += 1;
      setItems((list) => [...list, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, items.length, total, fetchPage]);

  return { items, total, loading, loadingMore, error, loadMore, refresh: load };
}
