import fs from 'fs';
import path from 'path';
import { translateServerError } from '../serverErrors';

describe('translateServerError', () => {
    it('leaves Russian alone', () => {
        expect(translateServerError('Задание не найдено', 'ru')).toBe('Задание не найдено');
    });

    it('translates a known error', () => {
        expect(translateServerError('Задание не найдено', 'en')).toBe('Task not found');
        expect(translateServerError('Задание не найдено', 'tj')).toBe('Супориш ёфт нашуд');
    });

    it('passes unknown text through unchanged', () => {
        // A newly added server error must still show something, not a blank
        expect(translateServerError('Совершенно новая ошибка', 'en')).toBe('Совершенно новая ошибка');
    });

    it('translates validation errors joined by the server', () => {
        expect(translateServerError('Выберите категорию, Укажите город', 'en'))
            .toBe('Choose a category, Enter a city');
        expect(translateServerError('Добавьте заглавную букву. Добавьте цифру', 'en'))
            .toBe('Add an uppercase letter. Add a number');
    });

    it('leaves a partly-unknown joined message alone rather than half-translating it', () => {
        expect(translateServerError('Выберите категорию, Неизвестно что', 'en'))
            .toBe('Выберите категорию, Неизвестно что');
    });
});

/**
 * The Russian text is the lookup key, so a reworded server error silently stops
 * translating. This catches that at test time instead of in a Tajik user's
 * dialog. Skipped when the web app is not checked out alongside.
 */
describe('keys still match the API', () => {
    const webDir = path.join(__dirname, '../../../web');

    /** Messages the server builds from a template, so the literal is not in its source. */
    const TEMPLATED = [
        'Этот аккаунт использует вход через Google. Нажмите кнопку ниже.',
        'Этот аккаунт использует вход через Apple. Нажмите кнопку ниже.',
        'Этот аккаунт использует вход через OAuth. Нажмите кнопку ниже.',
    ];

    function readTs(dir: string): string {
        if (!fs.existsSync(dir)) return '';
        return fs.readdirSync(dir, { withFileTypes: true })
            .map((entry) => {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) return readTs(full);
                return entry.name.endsWith('.ts') ? fs.readFileSync(full, 'utf8') : '';
            })
            .join('\n');
    }

    (fs.existsSync(webDir) ? it : it.skip)('every translated string still appears in the source it came from', () => {
        const source = [
            readTs(path.join(webDir, 'app/api')),
            readTs(path.join(webDir, 'lib')),
            fs.readFileSync(path.join(__dirname, '../api-client.ts'), 'utf8'),
        ].join('\n');

        const table = fs.readFileSync(path.join(__dirname, '../serverErrors.ts'), 'utf8');
        const keys = [...table.matchAll(/^ {4}'([^']+)': \[/gm)].map((m) => m[1]);
        expect(keys.length).toBeGreaterThan(100);

        const orphaned = keys.filter((key) => !TEMPLATED.includes(key) && !source.includes(key));
        expect(orphaned).toEqual([]);
    });
});
