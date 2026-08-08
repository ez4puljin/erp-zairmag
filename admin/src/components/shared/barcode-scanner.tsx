'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, Zap, ZapOff, SwitchCamera, Loader2, AlertCircle } from 'lucide-react';

/** Скан хийсэн код дээр дуудагдах callback. */
export type BarcodeScanFeedback = { type: 'success' | 'error'; text: string } | null;

/** Native BarcodeDetector API (TS lib дотор ороогүй тул минимал тодорхойлолт). */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

const WANTED_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'codabar',
  'qr_code',
];

/** Ижил кодыг дараалан уншсаныг үл тоох хугацаа (мс). */
const DUPLICATE_WINDOW_MS = 1500;

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

/** Богино "бип" дуу — скан амжилттай болсныг мэдэгдэнэ. */
function beep(ok: boolean) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = ok ? 1180 : 320;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.08 : 0.2));
    osc.onended = () => ctx.close();
  } catch {
    /* дуу тоглуулж чадаагүй ч скан ажиллана */
  }
  if (navigator.vibrate) navigator.vibrate(ok ? 40 : [40, 60, 40]);
}

/**
 * Камераар зураасан код (barcode) уншигч — бүтэн дэлгэцийн modal.
 *
 * Native `BarcodeDetector` API байвал түүнийг ашиглана (хурдан, нэмэлт татаж
 * авалтгүй), байхгүй бол `@zxing/browser`-г dynamic import хийж fallback болгоно.
 *
 * Камер зөвхөн secure context дээр ажиллана: `https://` эсвэл `localhost`.
 */
export function BarcodeScanner({
  open,
  onClose,
  onDetected,
  feedback,
  title = 'Зураасан код унших',
  hint = 'Кодыг хүрээн дотор байрлуулна уу',
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  /** Эцэг компонентоос ирэх үр дүнгийн мэдэгдэл (олдсон / олдсонгүй). */
  feedback?: BarcodeScanFeedback;
  title?: string;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopDecodeRef = useRef<(() => void) | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  // Callback-ийг ref-д хадгална — скан давталт хуучин closure барихаас сэргийлнэ.
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  // Камеруудын жагсаалтыг ref-д хадгална — эндээс state болговол effect дахин
  // ажиллаж камер тасралтгүй дахин эхлэх давталт үүснэ.
  const deviceIdsRef = useRef<string[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [engine, setEngine] = useState<'native' | 'zxing' | null>(null);

  const handleCode = useCallback((raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < DUPLICATE_WINDOW_MS) {
      return;
    }
    lastCodeRef.current = { code, at: now };
    beep(true);
    onDetectedRef.current(code);
  }, []);

  /** Камер + декодлогчийг зогсоож, бүх нөөцийг чөлөөлнө. */
  const teardown = useCallback(() => {
    stopDecodeRef.current?.();
    stopDecodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function start() {
      setError(null);
      setStarting(true);
      try {
        if (!window.isSecureContext) {
          throw new Error(
            'Камер ашиглахын тулд https:// эсвэл localhost хаягаар нэвтэрнэ үү. ' +
              'Сүлжээний IP (http://192.168...) дээр браузер камерыг хаадаг.'
          );
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Энэ браузер камерыг дэмжихгүй байна.');
        }

        const targetId = deviceIdsRef.current[deviceIndex];
        const stream = await navigator.mediaDevices.getUserMedia({
          video: targetId
            ? { deviceId: { exact: targetId } }
            : { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Зөвшөөрөл авсны дараа л камерын жагсаалт нэртэйгээ ирнэ.
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const ids = devices.filter((d) => d.kind === 'videoinput').map((d) => d.deviceId).filter(Boolean);
          if (!cancelled) {
            deviceIdsRef.current = ids;
            setDeviceCount(ids.length);
          }
        } catch {
          /* заавал биш */
        }

        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        if (!cancelled) setTorchSupported(Boolean(caps?.torch));

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => undefined);
        if (cancelled) return;

        const Detector = getBarcodeDetectorCtor();
        let supported: string[] = [];
        if (Detector) {
          supported = await Detector.getSupportedFormats().catch(() => [] as string[]);
        }
        const usableFormats = WANTED_FORMATS.filter((f) => supported.includes(f));

        if (Detector && usableFormats.length > 0) {
          // --- Native BarcodeDetector ---
          if (cancelled) return;
          setEngine('native');
          const detector = new Detector({ formats: usableFormats });
          let raf = 0;
          let busy = false;
          const tick = async () => {
            raf = requestAnimationFrame(tick);
            if (busy || !videoRef.current || videoRef.current.readyState < 2) return;
            busy = true;
            try {
              const results = await detector.detect(videoRef.current);
              if (results.length > 0) handleCode(results[0].rawValue);
            } catch {
              /* нэг кадр алдсан нь чухал биш */
            } finally {
              busy = false;
            }
          };
          raf = requestAnimationFrame(tick);
          stopDecodeRef.current = () => cancelAnimationFrame(raf);
        } else {
          // --- ZXing fallback ---
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          if (cancelled) return;
          setEngine('zxing');
          const reader = new BrowserMultiFormatReader(undefined, {
            delayBetweenScanAttempts: 120,
            delayBetweenScanSuccess: DUPLICATE_WINDOW_MS,
          });
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) handleCode(result.getText());
          });
          if (cancelled) {
            controls.stop();
            return;
          }
          stopDecodeRef.current = () => controls.stop();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        const msg =
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Камер ашиглах зөвшөөрөл олгогдоогүй байна. Хаягийн мөрний камерын тэмдэг дээр дарж зөвшөөрнө үү.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'Камер олдсонгүй.'
              : name === 'NotReadableError'
                ? 'Камерыг өөр програм ашиглаж байна. Түүнийг хааж дахин оролдоно уу.'
                : ((err as Error)?.message ?? 'Камер эхлүүлэхэд алдаа гарлаа.');
        setError(msg);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [open, deviceIndex, handleCode, teardown]);

  // Esc товчоор хаах
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` нь TS-ийн MediaTrackConstraintSet-д ороогүй нэмэлт боломж.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const switchCamera = () => {
    const count = deviceIdsRef.current.length;
    if (count < 2) return;
    setDeviceIndex((i) => (i + 1) % count);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-ios-fade-in">
      {/* Толгой */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-5 h-5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold truncate">{title}</p>
            <p className="text-[11px] text-white/60 truncate">
              {engine === 'zxing' ? 'ZXing' : engine === 'native' ? 'Браузерын уншигч' : 'Бэлтгэж байна…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {torchSupported && (
            <button
              onClick={toggleTorch}
              aria-label="Гэрэл"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-[0.92] transition-all"
            >
              {torchOn ? <Zap className="w-5 h-5 text-[#FFCC00]" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
          {deviceCount > 1 && (
            <button
              onClick={switchCamera}
              aria-label="Камер солих"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-[0.92] transition-all"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Хаах"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-[0.92] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Камерын дүрс */}
      <div className="flex-1 relative min-h-0 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {/* Скан хүрээ */}
        {!error && (
          <div className="relative z-10 w-[min(78vw,420px)] aspect-[3/2] rounded-2xl border-2 border-white/70 shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]">
            <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-[#34C759] animate-pulse" />
          </div>
        )}

        {starting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-white bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[14px]">Камер эхлүүлж байна…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-[#FF3B30]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1A1D26] mb-1">Камер ажиллахгүй байна</p>
              <p className="text-[13px] text-[#8C8FA3]">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 w-full min-h-11 rounded-xl text-[14px] font-semibold text-[#007AFF] bg-[#007AFF]/10 active:scale-[0.97] transition-all"
              >
                Хаах
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Хөл — үр дүнгийн мэдэгдэл */}
      <div className="flex-shrink-0 px-4 py-4 text-center">
        {feedback ? (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold max-w-full ${
              feedback.type === 'success'
                ? 'bg-[#34C759] text-white'
                : 'bg-[#FF3B30] text-white'
            }`}
          >
            <span className="truncate">{feedback.text}</span>
          </div>
        ) : (
          <p className="text-[13px] text-white/70">{hint}</p>
        )}
      </div>
    </div>
  );
}
