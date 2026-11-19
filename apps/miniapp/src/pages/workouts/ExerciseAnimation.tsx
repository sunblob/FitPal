import { useEffect, useState } from 'react';

/** Переключает кадры «начало / конец движения», получается простая анимация. */
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
          loading="lazy"
          style={{ opacity: i === frame ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
