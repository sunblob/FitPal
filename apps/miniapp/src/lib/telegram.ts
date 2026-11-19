import {
  init,
  miniApp,
  themeParams,
  viewport,
  retrieveRawInitData,
} from '@telegram-apps/sdk-react';

let rawInitData: string | undefined;

/** Инициализирует SDK. Вне Telegram (в обычном браузере) просто ничего не делает. */
export function initTelegram() {
  try {
    init();
    rawInitData = retrieveRawInitData();
  } catch {
    console.warn('Not running inside Telegram');
    return;
  }

  if (miniApp.mountSync.isAvailable()) {
    miniApp.mountSync();
    miniApp.ready();
  }
  if (themeParams.mountSync.isAvailable()) {
    themeParams.mountSync();
    themeParams.bindCssVars();
  }
  if (viewport.mount.isAvailable()) {
    void viewport.mount().then(() => {
      if (viewport.expand.isAvailable()) viewport.expand();
    });
  }
}

export function getInitData(): string | undefined {
  return rawInitData;
}
