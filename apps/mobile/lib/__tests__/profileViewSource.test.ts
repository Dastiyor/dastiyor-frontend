import { profileQuery, sourceParams } from '../profileViewSource';

describe('profileViewSource', () => {
  it('sourceParams keeps only the keys with a value', () => {
    expect(sourceParams(undefined)).toEqual({});
    expect(sourceParams({ src: 'directory', category: '', city: 'Худжанд' })).toEqual({ src: 'directory', city: 'Худжанд' });
    expect(sourceParams({ src: 'task', taskId: 't1' })).toEqual({ src: 'task', taskId: 't1' });
  });

  it('profileQuery builds the request query, ignoring empty and array params', () => {
    expect(profileQuery({})).toBe('');
    expect(profileQuery({ src: 'task', taskId: 't1', city: ['a', 'b'], category: '' })).toBe('?src=task&taskId=t1');
    expect(profileQuery({ src: 'directory', category: 'Ремонт' })).toBe(`?src=directory&category=${encodeURIComponent('Ремонт')}`);
  });
});
