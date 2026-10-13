import type { GoldieConfig } from "goldie";
import base from "../goldie.config.ts";

// The same five screens and video with the app switched to Tajik. Its own
// folder so the output (goldie/tj/out) sits beside the Russian set, not over it.
// Neither store has a Tajik listing language; these go under whichever listing
// the Tajik audience sees.
const config: GoldieConfig = {
  ...base,
  locales: ["tg"],
  store: {
    ...base.store,
    subtitle: { tg: "Хизматрасониҳои Тоҷикистон" },
    ratingCount: "Нав",
    price: "Ройгон",
    description: {
      tg: "Dastiyor — бозори хизматрасонии Тоҷикистон. Супориш гузоред — устоҳо бо нарх ва мӯҳлат худашон менависанд.\n\nТаъмир, тозакорӣ, расонидан, IT ва даҳҳо категорияи дигар. Чат бо иҷрокунанда бе миёнарав ва комиссияи пинҳон.\n\nШарҳҳои воқеӣ, рейтингҳо ва профилҳои санҷидашуда.",
    },
  },
  scenes: [
    {
      kind: "screenshot",
      id: "home",
      flow: "store-tj-01-home",
      headline: { tg: "Усто барои ҳар кор" },
      subhead: { tg: "Таъмир, тозакорӣ, расонидан ва даҳҳо хизмати дигар." },
    },
    {
      kind: "screenshot",
      id: "offers",
      flow: "store-tj-02-offers",
      headline: { tg: "Устоҳо худашон нарх мегӯянд" },
      subhead: { tg: "Супориш гузоред ва посухҳоро бо нарх ва мӯҳлат муқоиса кунед." },
    },
    {
      kind: "screenshot",
      id: "chat",
      flow: "store-tj-03-chat",
      headline: { tg: "Мустақим муошират кунед" },
      subhead: { tg: "Чат бо иҷрокунанда бе миёнарав ва комиссияи пинҳон." },
    },
    {
      kind: "screenshot",
      id: "provider",
      flow: "store-tj-04-provider",
      headline: { tg: "Аз рӯи шарҳҳо интихоб кунед" },
      subhead: { tg: "Шарҳҳои воқеӣ, рейтингҳо ва профилҳои санҷидашуда." },
    },
    {
      kind: "screenshot",
      id: "create",
      flow: "store-tj-05-create",
      headline: { tg: "Супориш дар як дақиқа" },
      subhead: { tg: "Нависед, ки чӣ кор лозим аст, ва буҷетро нишон диҳед." },
    },
    {
      kind: "screenshot",
      id: "my-tasks",
      flow: "store-tj-06-my-tasks",
      headline: { tg: "Ҳамаи супоришҳо дар як ҷо" },
      subhead: { tg: "Ҳолати ҳар супоришро пайгирӣ кунед." },
    },
    {
      kind: "screenshot",
      id: "feed",
      flow: "store-tj-07-feed",
      headline: { tg: "Барои устоҳо — супоришҳои нав" },
      subhead: { tg: "Супоришҳоро аз рӯи категория ва шаҳр ёбед." },
    },
    {
      kind: "screenshot",
      id: "respond",
      flow: "store-tj-08-respond",
      headline: { tg: "Бо ду ламс посух диҳед" },
      subhead: { tg: "Нарх ва мӯҳлати худро нишон диҳед." },
    },
    {
      kind: "screenshot",
      id: "responses",
      flow: "store-tj-09-responses",
      headline: { tg: "Посухҳои худро пайгирӣ кунед" },
      subhead: { tg: "Ҳолати ҳар пешниҳод дар як рӯйхат." },
    },
    {
      kind: "screenshot",
      id: "settings",
      flow: "store-tj-10-settings",
      headline: { tg: "Бо забони шумо" },
      subhead: { tg: "Русский, тоҷикӣ ва English, мавзӯи равшан ва торик." },
    },
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "home", flow: "store-tj-preview-01-home" },
        { id: "offers", flow: "store-tj-preview-02-offers" },
        { id: "provider", flow: "store-tj-preview-03-provider" },
        { id: "chat", flow: "store-tj-preview-04-chat", holdSeconds: 2 },
      ],
    },
  ],
};

export default config;
