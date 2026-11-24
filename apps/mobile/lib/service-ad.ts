/**
 * Does a task read like a provider advertising their own services instead of
 * a customer asking for help? ("Выполняю ремонт квартир качественно и недорого,
 * звоните".) Providers who signed up as customers post these, and they clutter
 * the feed for the real providers.
 *
 * Used to WARN before publishing, never to block: the poster can always go on.
 * Copied verbatim between apps/web/lib and apps/mobile/lib; a mobile test fails when the
 * two files differ, so edit both together.
 */

/** Phrases that on their own say "I am selling a service". */
const STRONG: RegExp[] = [
    /предлага(ю|ем)\s+(сво[иьй]\S*\s+|наш\S*\s+)?услуг/,
    /оказыва(ю|ем)\s+(\S+\s+)?услуг/,
    /наши\s+услуги/,
    /(принима(ю|ем)|бер(у|ём|ем))\s+заказ/,
    /ищу\s+(работу|подработку|заказ|клиент)/,
    /мы\s+(предлагаем|выполняем|делаем|оказываем)/,
    /хизмат\S*\s+(\S+\s+)?пешниҳод\s+мекун(ам|ем)/,
    /фармоиш\S*\s+қабул\s+мекун(ам|ем)/,
    /кор\s+меҷӯ(ям|ем)/,
];

/** Phrases typical of an ad, but which a customer might also write. */
const WEAK: RegExp[] = [
    /(^|[^а-яё])(выполняю|выполню|выполним|делаю|сделаю|сделаем|ремонтирую|отремонтирую|устанавливаю|установлю)([^а-яё]|$)/,
    /недорог/,
    /качественн/,
    /опыт\s+работы/,
    /гаранти/,
    /(звоните|обращайтесь|пишите\s+в)/,
    /(whatsapp|ватсап|вотсап|telegram|телеграм)/,
    /прайс/,
    /иҷро\s+мекун(ам|ем)/,
    /занг\s+занед/,
    /сифатнок/,
    /арзон/,
    /таҷриба/,
];

/** Phrases that say "I need someone", which is what a task should say. */
const NEED: RegExp[] = [
    /(^|[^а-яё])(нужен|нужна|нужно|нужны|требуется|требуются)([^а-яё]|$)/,
    /ищу\s+(мастер|специалист|исполнител|сантехник|электрик|грузчик|водител|няню|репетитор)/,
    /лозим/,
    /даркор/,
    /меҷӯям\s+(усто|мутахассис)/,
];

export function looksLikeServiceAd(title: string, description: string): boolean {
    const text = `${title}\n${description}`.toLowerCase().replace(/ё/g, 'е');
    const hits = (list: RegExp[]) => list.filter((re) => re.test(text)).length;

    const score = hits(STRONG) * 2 + hits(WEAK) - (hits(NEED) > 0 ? 2 : 0);
    return score >= 2;
}
