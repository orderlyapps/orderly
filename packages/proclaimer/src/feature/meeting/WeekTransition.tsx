import { useEffect, useRef, useState, type ReactNode } from "react";

const TRANSITION_MS = 320;
const EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const TRANSITION_CSS = `
@keyframes week-transition-in-forward {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes week-transition-out-forward {
  from { transform: translateX(0); }
  to { transform: translateX(-32%); }
}
@keyframes week-transition-in-back {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes week-transition-out-back {
  from { transform: translateX(0); }
  to { transform: translateX(32%); }
}
`;

interface OutgoingPanel {
  node: ReactNode;
  direction: 1 | -1;
}

export interface WeekTransitionProps {
  weekId: string;
  children: ReactNode;
}

/**
 * Slides week content horizontally when `weekId` changes: the incoming week
 * slides over the outgoing one, which parallaxes away in the travel direction.
 * The outgoing panel reuses the previous render's element tree, so it keeps
 * showing the old week's data while the new week loads beneath it.
 */
export function WeekTransition({ weekId, children }: WeekTransitionProps) {
  const [outgoing, setOutgoing] = useState<OutgoingPanel | null>(null);
  const current = useRef({ weekId, node: children });

  if (current.current.weekId !== weekId) {
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      setOutgoing({
        node: current.current.node,
        direction: weekId > current.current.weekId ? 1 : -1,
      });
    }
    current.current = { weekId, node: children };
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
            animation: `week-transition-out-${direction} ${TRANSITION_MS}ms ${EASING} forwards`,
          }}
        >
          {outgoing.node}
        </div>
      )}
      <div
        key={weekId}
        style={{
          background: "var(--ion-background-color)",
          ...(outgoing
            ? { animation: `week-transition-in-${direction} ${TRANSITION_MS}ms ${EASING}` }
            : null),
        }}
      >
        {children}
      </div>
    </div>
  );
}
