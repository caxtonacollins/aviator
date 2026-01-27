import { useEffect, useRef, useState } from "react";
import { RoundData } from "@/types/game";
import { PlaneState } from "@/types/game";

// Mirror backend implementation so client can predict/smooth locally
export function calculatePlanePosition(elapsedMs: number): {
  x: number;
  y: number;
} {
  const progress = Math.min(elapsedMs / 10000, 1);
  const x = 10 + progress * 70;
  const y = 80 - Math.sin(progress * Math.PI * 0.8) * 50;
  return { x, y };
}

export default function usePlaneAnimation(roundData: RoundData | null) {
  const [position, setPosition] = useState({ x: 10, y: 80 });
  const [angle, setAngle] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef<PlaneState>({ x: 10, y: 80, ts: Date.now() });
  const crashRef = useRef<{ start?: number }>({});

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (!roundData) {
      stop();
      setPosition({ x: 10, y: 80 });
      setAngle(0);
      setOpacity(1);
      return;
    }

    // BEDTTING PHASE: Dive & Hover Animation
    if (roundData.phase === "BETTING") {
      if (!crashRef.current.start) {
        crashRef.current.start = Date.now();
      }

      const animateBetting = () => {
        const now = Date.now();
        const elapsed = now - (crashRef.current.start || now);

        let tx = 50; // Center X
        let ty = 0;
        let ta = 0;

        // 1. Dive (0s - 1s)
        if (elapsed < 1000) {
          const t = elapsed / 1000;
          // Ease in-out
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          ty = -10 + ease * 100; // Start slightly off-screen (-10) to bottom (90)
          ta = 90; // Pointing down
        }
        // 2. Ascent to Hover (1s - 2.5s)
        else if (elapsed < 2500) {
          const t = (elapsed - 1000) / 1500;
          // Ease out
          const ease = 1 - Math.pow(1 - t, 3);
          ty = 90 - ease * 70; // From 90 up to 20
          ta = -15 * (1 - t); // Slight tilt up
        }
        // 3. Hover (2.5s+)
        else {
          const t = (elapsed - 2500) / 1000;
          ty = 20 + Math.sin(t * 2) * 3; // Bobbing around 20
          ta = Math.sin(t * 2) * 5; // Slight rocking
        }

        setPosition({ x: tx, y: ty });
        setAngle(ta);
        setOpacity(1);

        rafRef.current = requestAnimationFrame(animateBetting);
      };

      rafRef.current = requestAnimationFrame(animateBetting);
      return () => stop();
    }

    // If flying, run RAF-based prediction (client-side authoritative prediction)
    if (roundData.phase === "FLYING") {
      crashRef.current = {};
      const flyStart = Number(roundData.flyStartTime || Date.now());

      const animate = () => {
        const now = Date.now();
        const elapsed = Math.max(0, now - flyStart);
        const predicted = calculatePlanePosition(elapsed);

        // compute small derivative for angle
        const dt = Math.max(1, now - prevRef.current.ts);
        const dx = predicted.x - prevRef.current.x;
        const dy = predicted.y - prevRef.current.y;

        // angle in degrees, clamp to avoid extreme tilts
        const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const clamped = Math.max(-30, Math.min(30, rawAngle));

        // smooth towards predicted to avoid jumps (lerp)
        const smoothFactor = 0.16; // tuned for mobile-first smoothness
        const nx =
          prevRef.current.x + (predicted.x - prevRef.current.x) * smoothFactor;
        const ny =
          prevRef.current.y + (predicted.y - prevRef.current.y) * smoothFactor;
        const nang = prevRef.current
          ? prevRef.current["angle"] || 0
          : clamped;
        const na = nang + (clamped - nang) * 0.12;

        prevRef.current = { x: nx, y: ny, ts: now } as any;
        (prevRef.current as any).angle = na;

        setPosition({ x: nx, y: ny });
        setAngle(na);
        setOpacity(1);

        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
      return () => stop();
    }

    // If crashed, run an exit/fall animation
    if (roundData.phase === "CRASHED") {
      stop();
      const crashStart = Date.now();
      crashRef.current.start = crashStart;

      const startPos = roundData.planePosition || { x: 70, y: 40 };
      const startAngle = angle; // whatever current

      const duration = 800; // ms

      const tick = () => {
        const now = Date.now();
        const t = Math.min(1, (now - crashStart) / duration);

        // fall down and rotate
        const y = startPos.y + t * (120 - startPos.y); // move past bottom
        const ang = startAngle + t * 90; // rotate to 90deg
        const op = 1 - t;

        setPosition({ x: startPos.x, y });
        setAngle(ang);
        setOpacity(op);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => stop();
    }

    return undefined;
  }, [roundData]);

  // If server reports an authoritative planePosition that differs noticeably, nudge local prediction
  useEffect(() => {
    if (!roundData || !roundData.planePosition) return;
    const sv = roundData.planePosition;
    const cur = prevRef.current;
    const dx = sv.x - cur.x;
    const dy = sv.y - cur.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 6) {
      // nudge towards server value lightly to avoid jumps
      prevRef.current.x = cur.x + dx * 0.2;
      prevRef.current.y = cur.y + dy * 0.2;
      setPosition({ x: prevRef.current.x, y: prevRef.current.y });
    }
  }, [roundData?.planePosition?.x, roundData?.planePosition?.y]);

  return { position, angle, opacity };
}
