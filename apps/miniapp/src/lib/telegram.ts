import {
  init,
  miniApp,
  themeParams,
  viewport,
  retrieveRawInitData,
} from '@telegram-apps/sdk-react';

let rawInitData: string | undefined;

type Theme = 'light' | 'dark';

/**
 * Фон страницы и нижней панели в каждой теме, совпадают с --bg и --surface в styles.css.
 * Нужны, чтобы шапка и края Telegram не отличались от приложения.
 */
const COLORS: Record<Theme, { bg: `#${string}`; bar: `#${string}` }> = {
  light: { bg: '#f3f4f6', bar: '#ffffff' },
  dark: { bg: '#0d0f12', bar: '#171a1f' },
};

/** Инициализирует SDK. Вне Telegram (в обычном браузере) берёт тему из настроек системы. */
export function initTelegram() {
  try {
    init();
    rawInitData = retrieveRawInitData();
  } catch {
    console.warn('Not running inside Telegram');
    followSystemTheme();
    return;
  }

  if (miniApp.mountSync.isAvailable()) {
    miniApp.mountSync();
    miniApp.ready();
  }
  if (themeParams.mountSync.isAvailable()) {
    themeParams.mountSync();
    // Цвета Telegram берём только как признак светлой или тёмной темы,
    // палитра своя: чистые цвета Telegram местами дают плохой контраст.
    applyTheme(themeParams.isDark() ? 'dark' : 'light');
    themeParams.isDark.sub((dark) => applyTheme(dark ? 'dark' : 'light'));
  } else {
    followSystemTheme();
  }
  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      if (viewport.expand.isAvailable()) viewport.expand();
    });
  }
}

function followSystemTheme() {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(media.matches ? 'dark' : 'light');
  media.addEventListener('change', (e) => applyTheme(e.matches ? 'dark' : 'light'));
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const { bg, bar } = COLORS[theme];
  if (miniApp.setHeaderColor.isAvailable()) miniApp.setHeaderColor(bg);
  if (miniApp.setBackgroundColor.isAvailable()) miniApp.setBackgroundColor(bg);
  if (miniApp.setBottomBarColor.isAvailable()) miniApp.setBottomBarColor(bar);
}

export function getInitData(): string | undefined {
  return rawInitData;
}
