import { renderHook, act, waitFor } from '@testing-library/react-native';
import { api } from '@/lib/api-client';
import { useProfessionals, type ProfessionalFilters } from '../useProfessionals';

const get = api.get as jest.Mock;
const card = (id: string) => ({ id, fullName: id, avatar: null, city: null, categories: [], experienceYears: null, isVerified: false, avgRating: null, reviewCount: 0, completedCount: 0, tier: null });
const page = (ids: string[], total: number, p = 1) => ({ items: ids.map(card), total, page: p, limit: 20 });
const none: ProfessionalFilters = { q: '', category: '', city: '', sort: 'rating' };
const params = (call: number) => new URLSearchParams((get.mock.calls[call][0] as string).split('?')[1]);

describe('useProfessionals', () => {
  beforeEach(() => get.mockReset());

  it('loads the first page', async () => {
    get.mockResolvedValueOnce(page(['a', 'b'], 2));
    const { result } = renderHook(() => useProfessionals(none));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.total).toBe(2);
    expect(params(0).get('page')).toBe('1');
    expect(params(0).get('sort')).toBe('rating');
  });

  it('loads page 2 on loadMore and appends', async () => {
    get.mockResolvedValueOnce(page(['a'], 2)).mockResolvedValueOnce(page(['b'], 2, 2));
    const { result } = renderHook(() => useProfessionals(none));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => { await result.current.loadMore(); });

    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(params(1).get('page')).toBe('2');
  });

  it('stops at total', async () => {
    get.mockResolvedValueOnce(page(['a', 'b'], 2));
    const { result } = renderHook(() => useProfessionals(none));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => { await result.current.loadMore(); });

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('sends canonical filters and leaves empty ones out', async () => {
    get.mockResolvedValue(page([], 0));
    renderHook(() => useProfessionals({ q: '', category: 'Ремонт', city: '', sort: 'reviews' }));
    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(params(0).get('category')).toBe('Ремонт');
    expect(params(0).get('sort')).toBe('reviews');
    expect(params(0).has('city')).toBe(false);
    expect(params(0).has('q')).toBe(false);
  });

  it('debounces the search text', async () => {
    jest.useFakeTimers();
    get.mockResolvedValue(page([], 0));
    const { rerender } = renderHook((f: ProfessionalFilters) => useProfessionals(f), { initialProps: none });
    await act(async () => { jest.advanceTimersByTime(300); });
    get.mockClear();

    rerender({ ...none, q: 'с' });
    rerender({ ...none, q: 'сан' });
    rerender({ ...none, q: 'сантех' });
    await act(async () => { jest.advanceTimersByTime(299); });
    expect(get).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(1); });
    expect(get).toHaveBeenCalledTimes(1);
    expect(params(0).get('q')).toBe('сантех');
    jest.useRealTimers();
  });

  it('a new filter replaces the list instead of appending', async () => {
    get.mockResolvedValueOnce(page(['a'], 5)).mockResolvedValueOnce(page(['z'], 1));
    const { result, rerender } = renderHook((f: ProfessionalFilters) => useProfessionals(f), { initialProps: none });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ ...none, city: 'Худжанд' });

    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['z']));
    expect(result.current.total).toBe(1);
  });

  it('reports a load error', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useProfessionals(none));
    await waitFor(() => expect(result.current.error).toBe('offline'));
  });
});
