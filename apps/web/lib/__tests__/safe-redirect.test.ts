import { safeRedirect, withRedirect } from '../safe-redirect';

describe('safeRedirect', () => {
    it.each(['/create-task', '/tasks/abc123', '/tasks?category=%D0%A3', '/customer', '/provider/task-feed'])(
        'keeps a path on this site: %s',
        (path) => expect(safeRedirect(path)).toBe(path),
    );

    it.each([
        'https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'evil.com',
        'javascript:alert(1)', '/x?u=https://evil.com', '', null, undefined, 5,
    ])('refuses %p', (value) => expect(safeRedirect(value)).toBe(''));

    it.each(['/login', '/login?redirect=/x', '/register', '/api/auth/logout'])(
        'refuses a loop or an API route: %s',
        (path) => expect(safeRedirect(path)).toBe(''),
    );
});

describe('withRedirect', () => {
    it('adds the target as one encoded parameter', () => {
        expect(withRedirect('/register', '/tasks?city=x&page=2')).toBe('/register?redirect=%2Ftasks%3Fcity%3Dx%26page%3D2');
        expect(withRedirect('/register?type=customer', '/create-task')).toBe('/register?type=customer&redirect=%2Fcreate-task');
    });
    it('leaves the link alone without a target', () => expect(withRedirect('/register', '')).toBe('/register'));
});
