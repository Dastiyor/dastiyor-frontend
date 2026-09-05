import { useState, useEffect } from 'react';
import { api } from './api-client';

interface AppConfig {
  categories: string[];
  cities: string[];
  estimatedTimes: string[];
}

const FALLBACK: AppConfig = {
  categories: [
    'Ремонт', 'Уборка', 'Доставка', 'Сантехника', 'Электрик',
    'IT и Веб', 'Обучение', 'Дизайн', 'Красота', 'Фото и видео', 'Мероприятия',
  ],
  cities: ['Душанбе', 'Худжанд', 'Бохтар', 'Кӯлоб', 'Истаравшан', 'Турсунзода', 'Онлайн'],
  // Mirrors ESTIMATED_TIMES in the web app's lib/config-fallback.ts.
  estimatedTimes: [
    'До 1 часа', '1-2 часа', '2-4 часа', 'До 1 дня', '1-2 дня', '3-5 дней', 'Более недели',
  ],
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: AppConfig | null = null;
let cacheTime = 0;

function isCacheValid() {
  return cache !== null && Date.now() - cacheTime < TTL_MS;
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(isCacheValid() ? cache! : FALLBACK);
  const [loading, setLoading] = useState(!isCacheValid());

  useEffect(() => {
    if (isCacheValid()) return;
    api.get<AppConfig>('/api/config')
      .then((data) => {
        // Merge over the fallback: an older server (or one mid-deploy) omits
        // newer keys, and reading .map() off an undefined list would crash the
        // screen using it.
        const merged = { ...FALLBACK, ...data };
        cache = merged;
        cacheTime = Date.now();
        setConfig(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
