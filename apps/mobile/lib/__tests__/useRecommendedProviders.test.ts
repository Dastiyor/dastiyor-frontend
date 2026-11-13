import { renderHook, waitFor } from '@testing-library/react-native';
import { api } from '@/lib/api-client';
import { useRecommendedProviders } from '../useRecommendedProviders';

const get = api.get as jest.Mock;
const card = (id: string) => ({ id, fullName: id, avatar: null, city: null, categories: [], experienceYears: null, isVerified: false, avgRating: null, reviewCount: 0, completedCount: 0, tier: null });

describe('useRecommendedProviders', () => {
  beforeEach(() => get.mockReset());

  it('loads the providers for the task', async () => {
    get.mockResolvedValueOnce({ providers: [card('a'), card('b')] });
    const { result } = renderHook(() => useRecommendedProviders('t1', true));

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(get).toHaveBeenCalledWith('/api/tasks/t1/recommended-providers');
  });

  it('does not call the API when disabled or without a task', () => {
    renderHook(() => useRecommendedProviders('t1', false));
    renderHook(() => useRecommendedProviders(undefined, true));
    expect(get).not.toHaveBeenCalled();
  });

  it('stays empty when the request fails', async () => {
    get.mockRejectedValueOnce(new Error('Forbidden'));
    const { result } = renderHook(() => useRecommendedProviders('t1', true));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('treats a body without providers as empty', async () => {
    get.mockResolvedValueOnce({});
    const { result } = renderHook(() => useRecommendedProviders('t1', true));
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('reloads when the refresh key changes, and clears when disabled', async () => {
    get.mockResolvedValueOnce({ providers: [card('a'), card('b')] }).mockResolvedValueOnce({ providers: [card('b')] });
    const { result, rerender } = renderHook(
      ({ key, on }: { key: number; on: boolean }) => useRecommendedProviders('t1', on, key),
      { initialProps: { key: 0, on: true } },
    );
    await waitFor(() => expect(result.current).toHaveLength(2));

    rerender({ key: 1, on: true });
    await waitFor(() => expect(result.current.map((p) => p.id)).toEqual(['b']));
    expect(get).toHaveBeenCalledTimes(2);

    rerender({ key: 1, on: false });
    await waitFor(() => expect(result.current).toEqual([]));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolve!: (v: unknown) => void;
    get.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const { result, unmount } = renderHook(() => useRecommendedProviders('t1', true));
    unmount();
    resolve({ providers: [card('a')] });
    await Promise.resolve();
    expect(result.current).toEqual([]);
  });

  it('ignores a failure that arrives after unmount', async () => {
    let reject!: (e: unknown) => void;
    get.mockReturnValueOnce(new Promise((_r, j) => { reject = j; }));
    const { result, unmount } = renderHook(() => useRecommendedProviders('t1', true));
    unmount();
    reject(new Error('late'));
    await Promise.resolve();
    expect(result.current).toEqual([]);
  });
});
