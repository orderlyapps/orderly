import { useEffect, useRef, useState, type ReactNode } from "react";

const TRANSITION_MS = 320;
const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const TRANSITION_CSS = `
@keyframes slide-transition-in-forward {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slide-transition-out-forward {
  from { transform: translateX(0); }
  to { transform: translateX(-32%); }
}
@keyframes slide-transition-in-back {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes slide-transition-out-back {
  from { transform: translateX(0); }
  to { transform: translateX(32%); }
}
`;

interface OutgoingPanel {
  node: ReactNode;
  direction: 1 | -1;
}

export interface SlideTransitionProps {
  /** Identifies the visible period (e.g. a week or month id); its ordering sets the slide direction. */
  transitionKey: string;
  children: ReactNode;
}

/**
 * Slides content horizontally when `transitionKey` changes: the incoming panel
 * slides over the outgoing one, which parallaxes away in the travel direction.
 * The outgoing panel reuses the previous render's element tree, so it keeps
 * showing the old period's data while the new period loads beneath it.
 */
export function SlideTransition({ transitionKey, children }: SlideTransitionProps) {
  const [outgoing, setOutgoing] = useState<OutgoingPanel | null>(null);
  const current = useRef({ transitionKey, node: children });

  if (current.current.transitionKey !== transitionKey) {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      setOutgoing({
        node: current.current.node,
        direction: transitionKey > current.current.transitionKey ? 1 : -1,
      });
    }
    current.current = { transitionKey, node: children };
  } else {
    current.current.node = children;
  }

  useEffect(() => {
    if (!outgoing) {
      return;
    }
    const timer = setTimeout(
      () => setOutgoing((latest) => (latest === outgoing ? null : latest)),
      TRANSITION_MS,
    );
    return () => clearTimeout(timer);
  }, [outgoing]);

  const direction = outgoing?.direction === 1 ? "forward" : "back";

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <style>{TRANSITION_CSS}</style>
      {outgoing && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: "none",
            animation: `slide-transition-out-${direction} ${TRANSITION_MS}ms ${EASING} forwards`,
          }}
        >
          {outgoing.node}
        </div>
      )}
      <div
        key={transitionKey}
        style={{
          background: "var(--ion-background-color)",
          ...(outgoing
            ? { animation: `slide-transition-in-${direction} ${TRANSITION_MS}ms ${EASING}` }
            : null),
        }}
      >
        {children}
      </div>
    </div>
  );
}
