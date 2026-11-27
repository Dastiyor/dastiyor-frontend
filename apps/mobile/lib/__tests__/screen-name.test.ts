import { screenName } from '@/lib/screen-name';

describe('screenName', () => {
  it.each([
    [[], 'splash'],
    [['(tabs)'], 'home'],
    [['(tabs)', 'tasks'], 'tasks'],
    [['(onboarding)'], 'onboarding'],
    [['(auth)', 'login'], 'login'],
    [['task', '[id]'], 'task/[id]'],
  ])('%j is %s', (segments, name) => {
    expect(screenName(segments)).toBe(name);
  });
});
