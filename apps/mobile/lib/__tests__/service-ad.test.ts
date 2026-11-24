import fs from 'fs';
import path from 'path';
import { looksLikeServiceAd } from '../service-ad';

describe('looksLikeServiceAd', () => {
  it('flags a provider advertising and leaves a real task alone', () => {
    expect(looksLikeServiceAd('Ремонт квартир', 'Выполняю ремонт качественно и недорого')).toBe(true);
    expect(looksLikeServiceAd('Таъмири хона', 'Сифатнок ва арзон иҷро мекунам')).toBe(true);
    expect(looksLikeServiceAd('Нужен сантехник', 'Течёт кран на кухне, нужно заменить смеситель')).toBe(false);
  });

  // The full cases live in apps/web/lib/__tests__/service-ad.test.ts; this copy
  // must stay identical so web and app warn about the same text.
  const webFile = path.join(__dirname, '../../../web/lib/service-ad.ts');
  (fs.existsSync(webFile) ? it : it.skip)('is identical to the web copy', () => {
    expect(fs.readFileSync(path.join(__dirname, '../service-ad.ts'), 'utf8')).toBe(fs.readFileSync(webFile, 'utf8'));
  });
});
