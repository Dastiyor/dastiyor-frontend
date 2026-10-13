import path from "node:path";
import type { GoldieConfig } from "goldie";

// Store screenshots. See goldie/README.md for how to run this: the builds named
// here talk to a local demo server, never to production.
const APP_ROOT = path.resolve(import.meta.dirname, "..");

const config: GoldieConfig = {
  appRoot: APP_ROOT,
  appPath: path.join(APP_ROOT, "ios/build/dd/Build/Products/Release-iphonesimulator/Dastiyor.app"),
  bundleId: "com.dastiyor.ios",

  devices: ["iphone-6.9"],
  locales: ["ru"],
  appearance: "light",

  frame: { variant: "17-pro-silver" },

  theme: {
    background: "linear-gradient(165deg, #1D4ED8 0%, #2563EB 45%, #4F46E5 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#DBE6FF",
    fontFamily: "Montserrat",
    copyHeightRatio: 0.24,
    deviceWidthRatio: 0.84,
    layout: "classic",
  },

  store: {
    name: "Dastiyor",
    subtitle: { ru: "Мастера и услуги Таджикистана" },
    developer: "Dastiyor",
    category: "Lifestyle",
    rating: 4.8,
    ratingCount: "Новое",
    ageRating: "4+",
    price: "Бесплатно",
    description: {
      ru: "Dastiyor — маркетплейс услуг Таджикистана. Разместите задание, получите предложения от мастеров с ценой и сроками и выберите лучшего.\n\nРемонт, уборка, доставка, сантехника, электрика, IT и десятки других категорий. Общайтесь с исполнителем напрямую в чате, без посредников и скрытых комиссий.\n\nРеальные отзывы и рейтинги помогают выбрать надёжного мастера.",
    },
  },

  scenes: [
    // Customer screens first, then the provider's, then back to the customer:
    // the preview that follows is recorded in whatever session the last one leaves.
    {
      kind: "screenshot",
      id: "home",
      flow: "store-01-home",
      headline: { ru: "Мастер на любое дело" },
      subhead: { ru: "Ремонт, уборка, доставка и десятки других услуг рядом с вами." },
    },
    {
      kind: "screenshot",
      id: "offers",
      flow: "store-02-offers",
      headline: { ru: "Мастера сами предложат цену" },
      subhead: { ru: "Разместите задание и сравните отклики с ценой и сроками." },
    },
    {
      kind: "screenshot",
      id: "chat",
      flow: "store-03-chat",
      headline: { ru: "Договоритесь напрямую" },
      subhead: { ru: "Чат с исполнителем без посредников и комиссий." },
    },
    {
      kind: "screenshot",
      id: "provider",
      flow: "store-04-provider",
      headline: { ru: "Выбирайте по отзывам" },
      subhead: { ru: "Рейтинг, выполненные задания и отзывы реальных заказчиков." },
    },
    {
      kind: "screenshot",
      id: "create",
      flow: "store-05-create",
      headline: { ru: "Задание за минуту" },
      subhead: { ru: "Опишите, что нужно сделать, и укажите бюджет." },
    },
    {
      kind: "screenshot",
      id: "my-tasks",
      flow: "store-06-my-tasks",
      headline: { ru: "Все задания под рукой" },
      subhead: { ru: "Следите за статусом: открыто, в работе, завершено." },
    },
    {
      kind: "screenshot",
      id: "feed",
      flow: "store-07-feed",
      headline: { ru: "Мастерам — новые заказы" },
      subhead: { ru: "Находите задания по категории и городу." },
    },
    {
      kind: "screenshot",
      id: "respond",
      flow: "store-08-respond",
      headline: { ru: "Откликайтесь в два касания" },
      subhead: { ru: "Назовите свою цену и срок." },
    },
    {
      kind: "screenshot",
      id: "responses",
      flow: "store-09-responses",
      headline: { ru: "Следите за откликами" },
      subhead: { ru: "Статус каждого предложения в одном списке." },
    },
    {
      kind: "screenshot",
      id: "settings",
      flow: "store-10-settings",
      headline: { ru: "На вашем языке" },
      subhead: { ru: "Русский, тоҷикӣ и English, светлая и тёмная тема." },
    },
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "home", flow: "store-preview-01-home" },
        { id: "offers", flow: "store-preview-02-offers" },
        { id: "provider", flow: "store-preview-03-provider" },
        { id: "chat", flow: "store-preview-04-chat", holdSeconds: 2 },
      ],
    },
  ],
};

export default config;
