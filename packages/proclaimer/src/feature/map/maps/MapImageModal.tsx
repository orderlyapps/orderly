import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { IonButton, IonContent, IonIcon, IonModal } from "@ionic/react";
import { closeOutline, downloadOutline, printOutline, shareOutline } from "ionicons/icons";

export interface MapImageModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  url: string | null;
  title?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SCALE = 2.5;
const TAP_SLOP_PX = 12;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

const actionButtonStyle = {
  margin: 0,
  "--background": "rgba(0, 0, 0, 0.45)",
  "--color": "#fff",
} as CSSProperties;

interface Point {
  x: number;
  y: number;
}

function imageFilename(title: string | undefined, blob: Blob, url: string | undefined): string {
  const base = (title?.trim() || "map").replace(/[^\w.-]+/g, "_");
  let extension: string | undefined = MIME_EXTENSIONS[blob.type];
  if (!extension && url) {
    // Strip the query first — signed URL tokens can end in a short dotted
    // segment that would be mistaken for an extension.
    extension = /\.([a-z0-9]{1,5})$/i.exec(url.split(/[?#]/)[0])?.[1]?.toLowerCase();
  }
  return `${base}.${extension ?? "bin"}`;
}

export function MapImageModal({ isOpen, onDidDismiss, url, title }: MapImageModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const zoom = useRef({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const panAnchor = useRef<Point | null>(null);
  const pinchDistance = useRef<number | null>(null);
  const tapDown = useRef<(Point & { time: number }) | null>(null);
  const lastTap = useRef<(Point & { time: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  // Keep showing the last image while the dismiss animation plays.
  const [shown, setShown] = useState<{ url: string; title?: string } | null>(null);
  const imageBlob = useRef<{ url: string; promise: Promise<Blob> } | null>(null);

  useEffect(() => {
    if (url) {
      setShown({ url, title });
    }
  }, [url, title]);

  // The same fetched blob backs share, download, and print, so it is cached
  // per URL after the first use. It is also prefetched when the modal opens.
  const fetchImageBlob = (src: string) => {
    if (imageBlob.current?.url !== src) {
      imageBlob.current = {
        url: src,
        promise: fetch(src)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to load map image (${res.status})`);
            }
            return res.blob();
          })
          .catch((err: unknown) => {
            if (imageBlob.current?.url === src) {
              imageBlob.current = null;
            }
            throw err;
          }),
      };
    }
    return imageBlob.current.promise;
  };

  const applyZoom = () => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) {
      return;
    }
    const z = zoom.current;
    z.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, z.scale));
    const maxX = Math.max(0, (z.scale * image.offsetWidth - container.clientWidth) / 2);
    const maxY = Math.max(0, (z.scale * image.offsetHeight - container.clientHeight) / 2);
    z.x = Math.min(maxX, Math.max(-maxX, z.x));
    z.y = Math.min(maxY, Math.max(-maxY, z.y));
    image.style.transform = `translate(${z.x}px, ${z.y}px) scale(${z.scale})`;
  };

  // Keeps the image point under (clientX, clientY) fixed while scaling, so
  // pinch, wheel, and double-tap zoom stay anchored to the gesture position.
  const zoomAt = (clientX: number, clientY: number, target: number) => {
    const image = imageRef.current;
    if (!image) {
      return;
    }
    const z = zoom.current;
    const rect = image.getBoundingClientRect();
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, target));
    const anchorX = (clientX - (rect.left + rect.width / 2)) / z.scale;
    const anchorY = (clientY - (rect.top + rect.height / 2)) / z.scale;
    z.x += (z.scale - next) * anchorX;
    z.y += (z.scale - next) * anchorY;
    z.scale = next;
    applyZoom();
  };

  const resetZoom = () => {
    zoom.current = { scale: 1, x: 0, y: 0 };
    pointers.current.clear();
    panAnchor.current = null;
    pinchDistance.current = null;
    tapDown.current = null;
    lastTap.current = null;
    applyZoom();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      panAnchor.current = point;
      tapDown.current = { ...point, time: event.timeStamp };
    } else {
      panAnchor.current = null;
      tapDown.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) {
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current && pinchDistance.current > 0) {
        zoomAt(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          zoom.current.scale * (distance / pinchDistance.current),
        );
      }
      pinchDistance.current = distance;
    } else if (panAnchor.current) {
      zoom.current.x += event.clientX - panAnchor.current.x;
      zoom.current.y += event.clientY - panAnchor.current.y;
      panAnchor.current = { x: event.clientX, y: event.clientY };
      applyZoom();
    }
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = null;
    const remaining = pointers.current.values().next().value;
    panAnchor.current = pointers.current.size === 1 && remaining ? { ...remaining } : null;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const down = tapDown.current;
    if (
      down &&
      event.timeStamp - down.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) < TAP_SLOP_PX
    ) {
      const previous = lastTap.current;
      const isDoubleTap =
        previous !== null &&
        event.timeStamp - previous.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 2 * TAP_SLOP_PX;
      if (isDoubleTap) {
        lastTap.current = null;
        zoomAt(
          event.clientX,
          event.clientY,
          zoom.current.scale > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE,
        );
      } else {
        lastTap.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      }
    }
    tapDown.current = null;
    endPointer(event);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    // deltaMode 1 reports lines instead of pixels (e.g. wheel mice in Firefox).
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    zoomAt(event.clientX, event.clientY, zoom.current.scale * Math.exp(-delta * 0.002));
  };

  // Resolving the blob when the modal opens keeps navigator.share inside the
  // tap's transient user-activation window on browsers where it expires fast.
  const handleDidPresent = () => {
    resetZoom();
    if (url) {
      void fetchImageBlob(url).catch(() => {
        // Fetch errors surface when an action button is used.
      });
    }
  };

  const handleShare = async () => {
    const target = shown;
    if (!target) {
      return;
    }
    setBusy(true);
    try {
      const blob = await fetchImageBlob(target.url);
      const file = new File([blob], imageFilename(target.title, blob, target.url), {
        type: blob.type,
      });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: target.title });
      } else {
        await navigator.share({ title: target.title, url: target.url });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.warn("Failed to share map image", err);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    const target = shown;
    if (!target) {
      return;
    }
    setBusy(true);
    try {
      const blob = await fetchImageBlob(target.url);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = imageFilename(target.title, blob, target.url);
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 0);
    } catch (err) {
      console.warn("Failed to download map image", err);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    const target = shown;
    if (!target) {
      return;
    }
    setBusy(true);
    try {
      const blob = await fetchImageBlob(target.url);
      const objectUrl = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      const cleanup = () => {
        iframe.remove();
        URL.revokeObjectURL(objectUrl);
      };
      iframe.onload = () => {
        const frameWindow = iframe.contentWindow;
        if (frameWindow) {
          frameWindow.onafterprint = cleanup;
          frameWindow.focus();
          frameWindow.print();
        }
      };
      iframe.onerror = () => {
        console.warn("Failed to print map image: unable to load image frame");
        cleanup();
      };
      document.body.appendChild(iframe);
      iframe.src = objectUrl;
      // Fallback cleanup if onload/afterprint never fire (e.g. the browser
      // refuses to render the blob in a frame or the dialog is cancelled).
      setTimeout(cleanup, 60_000);
    } catch (err) {
      console.warn("Failed to print map image", err);
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <IonModal isOpen={isOpen} onDidPresent={handleDidPresent} onDidDismiss={onDidDismiss}>
      <IonContent scrollY={false}>
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={endPointer}
          onWheel={handleWheel}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            touchAction: "none",
          }}
        >
          {shown ? (
            <img
              ref={imageRef}
              src={shown.url}
              alt={shown.title ?? "Map"}
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                transformOrigin: "center center",
                userSelect: "none",
                willChange: "transform",
              }}
            />
          ) : null}
          <div
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(var(--ion-safe-area-top, 0px) + 8px)",
              right: "calc(var(--ion-safe-area-right, 0px) + 8px)",
              display: "flex",
              gap: 4,
              zIndex: 1,
            }}
          >
            {canShare ? (
              <IonButton
                shape="round"
                aria-label="Share"
                disabled={busy}
                onClick={() => void handleShare()}
                style={actionButtonStyle}
              >
                <IonIcon slot="icon-only" icon={shareOutline} />
              </IonButton>
            ) : null}
            <IonButton
              shape="round"
              aria-label="Download"
              disabled={busy}
              onClick={() => void handleDownload()}
              style={actionButtonStyle}
            >
              <IonIcon slot="icon-only" icon={downloadOutline} />
            </IonButton>
            <IonButton
              shape="round"
              aria-label="Print"
              disabled={busy}
              onClick={() => void handlePrint()}
              style={actionButtonStyle}
            >
              <IonIcon slot="icon-only" icon={printOutline} />
            </IonButton>
            <IonButton
              shape="round"
              aria-label="Close"
              onClick={onDidDismiss}
              style={actionButtonStyle}
            >
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
}
