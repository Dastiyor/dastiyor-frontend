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

let cache: AppConfig | null = null;

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(cache ?? FALLBACK);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    if (cache !== null) return;
    api.get<AppConfig>('/api/config')
      .then((data) => {
        cache = data;
        setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
