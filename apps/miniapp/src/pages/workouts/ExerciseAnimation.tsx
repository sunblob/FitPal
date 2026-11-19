import { useEffect, useState } from 'react';

/**
 * Переключает кадры «начало / конец движения», получается простая анимация.
 * Кадры лежат стопкой, и видны все до текущего включительно: новый кадр проявляется
 * поверх непрозрачного предыдущего. При обычном кроссфейде оба кадра на мгновение
 * полупрозрачны, сквозь них проступает белый фон и картинка «вспыхивает».
 */
export function ExerciseAnimation({
  images,
  alt,
  size = 'large',
}: {
  images: string[];
  alt: string;
  size?: 'small' | 'large';
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % images.length), 900);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return <div className={`wk-anim wk-anim-${size} wk-anim-empty`}>🏋️</div>;
  return (
    <div className={`wk-anim wk-anim-${size}`}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          decoding="async"
          style={{ opacity: i <= frame ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
