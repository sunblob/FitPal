import { useEffect, useRef, useState } from 'react';
import { L } from '../i18n';
import { detectBarcode, isValidBarcode } from '../lib/barcode';
import { Icon } from './Icon';

const SCAN_INTERVAL_MS = 250;

/**
 * Сканер штрихкода: живое видео с камеры, а если камера недоступна
 * (например, во встроенном браузере Telegram на части устройств),
 * то фото штрихкода или ручной ввод цифр.
 */
export function BarcodeScanner(props: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const onDetected = useRef(props.onDetected);
  onDetected.current = props.onDetected;

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(L.scanner.noCameraApi);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch {
        setCameraError(L.scanner.noCameraAccess);
        return;
      }
      const video = videoRef.current;
      if (!video || stopped) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      tick();
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const code = await detectBarcode(video).catch(() => null);
        if (code && isValidBarcode(code) && !stopped) {
          stopped = true;
          navigator.vibrate?.(50);
          onDetected.current(code);
          return;
        }
      }
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    }

    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    const bitmap = await createImageBitmap(file);
    const code = await detectBarcode(bitmap).catch(() => null);
    bitmap.close();
    if (code && isValidBarcode(code)) props.onDetected(code);
    else setPhotoError(L.scanner.readFailed);
  }

  return (
    <div className="sheet-body">
      {!cameraError ? (
        <div className="scanner">
          <video ref={videoRef} playsInline muted />
          <div className="scanner-frame" />
        </div>
      ) : (
        <p className="muted">
          {cameraError} {L.scanner.fallback}
        </p>
      )}

      <label className="file-button">
        <Icon name="camera" />
        {L.scanner.photo}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void onPhoto(e.target.files?.[0])}
        />
      </label>
      {photoError && <p className="error-text">{photoError}</p>}

      <div className="inline">
        <input
          inputMode="numeric"
          placeholder={L.scanner.digits}
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
        />
        <button
          className="primary btn-inline"
          disabled={!isValidBarcode(manual)}
          onClick={() => props.onDetected(manual)}
        >
          {L.scanner.find}
        </button>
      </div>
    </div>
  );
}
