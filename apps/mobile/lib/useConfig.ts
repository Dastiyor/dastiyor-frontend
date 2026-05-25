import { useState, useEffect } from 'react';
import { api } from './api-client';

interface AppConfig {
  categories: string[];
  cities: string[];
}

const FALLBACK: AppConfig = {
  categories: [
    'Ремонт', 'Уборка', 'Доставка', 'Сантехника', 'Электрик',
    'IT и Веб', 'Обучение', 'Дизайн', 'Красота', 'Фото и видео', 'Мероприятия',
  ],
  cities: ['Душанбе', 'Худжанд', 'Бохтар', 'Кӯлоб', 'Истаравшан', 'Турсунзода', 'Онлайн'],
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
        cache = data;
        cacheTime = Date.now();
        setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
