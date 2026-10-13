/**
 * Верхний уровень справочника категорий. Цвета зафиксированы в ТЗ (раздел 5):
 * у категории один и тот же цвет на всех графиках и экранах.
 */
export const HC_CATEGORY_KEYS = [
  'groceries',
  'marketplaces',
  'cafe',
  'health',
  'home',
  'other',
] as const;

export type CategoryKey = (typeof HC_CATEGORY_KEYS)[number];

export interface CategoryMeta {
  name: string;
  /** Основной цвет: полоски, столбики, точки на графиках. */
  color: string;
  /** Светлый фон кружка с иконкой. */
  container: string;
  /** Цвет иконки на светлом фоне — темнее основного ради контраста. */
  onContainer: string;
}

export const HC_CATEGORIES: Record<CategoryKey, CategoryMeta> = {
  groceries: { name: 'Продукты', color: '#2E6BD8', container: '#DCE6FF', onContainer: '#1F4FA8' },
  marketplaces: {
    name: 'Маркетплейсы',
    color: '#E0782F',
    container: '#FFE2CC',
    onContainer: '#A6501A',
  },
  cafe: { name: 'Кафе и кофе', color: '#8A56D6', container: '#EEE0FF', onContainer: '#6A3BB0' },
  health: { name: 'Здоровье', color: '#12907F', container: '#CCF2EC', onContainer: '#0B6B5E' },
  home: { name: 'Дом и химия', color: '#B8901A', container: '#FBEFC4', onContainer: '#7D5F00' },
  other: { name: 'Другое', color: '#9AA0A8', container: '#E6E8EB', onContainer: '#4B5563' },
};
