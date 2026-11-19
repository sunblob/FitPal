/** Набор простых линейных иконок 24×24, цвет берётся из currentColor. */
const PATHS = {
  diary: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M9 8h7M9 12h5" />
    </>
  ),
  scale: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M8 9a6 6 0 0 1 8 0l-2.5 3h-3z" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  forward: <path d="M9 5l7 7-7 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>
  ),
  barcode: <path d="M4 5v14M7 5v14M11 5v14M14 5v14M17 5v14M20 5v14" />,
  pencil: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </>
  ),
  flame: (
    <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5.5 1 1 1.5 2 1.5 3C12 8.5 12.5 6 12 3z" />
  ),
  steps: (
    <>
      <path d="M7 3.5c1.7 0 2.6 1.9 2.6 4.3S8.8 12 7.2 12 4.6 10.4 4.6 8.2 5.3 3.5 7 3.5z" />
      <path d="M5.2 14.5h3.8l-.3 2.2a1.8 1.8 0 0 1-3.6-.2z" />
      <path d="M17 7.5c1.7 0 2.4 3.2 2.4 5.4s-1 4.1-2.6 4.1-2.4-1.7-2.4-4 .9-5.5 2.6-5.5z" />
      <path d="M15 18.6h3.8l-.2 1.6a1.8 1.8 0 0 1-3.6.1z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  star: <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  repeat: (
    <>
      <path d="M17 2.5l3 3-3 3" />
      <path d="M4 11.5v-1a5 5 0 0 1 5-5h11" />
      <path d="M7 21.5l-3-3 3-3" />
      <path d="M20 12.5v1a5 5 0 0 1-5 5H4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon-svg"
    >
      {PATHS[name]}
    </svg>
  );
}
