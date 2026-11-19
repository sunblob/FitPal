import { useState } from 'react';

/** Иконки групп встроенного справочника (см. data/generic-foods/build.mjs). */
const CATEGORY_EMOJI: Record<string, string> = {
  grains: '🌾',
  bread: '🍞',
  dairy: '🥛',
  meat: '🍗',
  sausages: '🌭',
  fish: '🐟',
  legumes: '🫘',
  nuts: '🥜',
  vegetables: '🥦',
  fruits: '🍎',
  fats: '🫒',
  sweets: '🍫',
  drinks: '🥤',
  spices: '🧂',
  dishes: '🍲',
};

/** Миниатюра продукта: фото из Open Food Facts, иначе иконка группы. */
export function FoodThumb(props: {
  imageUrl: string | null;
  category: string | null;
  size?: 'small' | 'large';
}) {
  const [broken, setBroken] = useState(false);
  const cls = `food-thumb food-thumb-${props.size ?? 'small'}`;
  if (props.imageUrl && !broken) {
    return (
      <span className={`${cls} food-thumb-photo`}>
        <img
          src={props.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden="true">
      {(props.category && CATEGORY_EMOJI[props.category]) ?? '🍽️'}
    </span>
  );
}
