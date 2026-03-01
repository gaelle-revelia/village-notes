import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TAB_ORDER = ["/timeline", "/selena", "/outils", "/explorer"];
const MIN_SWIPE_X = 50;
const MAX_DRIFT_Y = 100;

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = Math.abs(t.clientY - touchStart.current.y);
      touchStart.current = null;

      if (Math.abs(dx) < MIN_SWIPE_X || dy > MAX_DRIFT_Y) return;

      const currentIndex = TAB_ORDER.indexOf(location.pathname);
      if (currentIndex === -1) return;

      // Swipe left → next tab, swipe right → previous tab
      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= 0 && nextIndex < TAB_ORDER.length) {
        navigate(TAB_ORDER[nextIndex]);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [location.pathname, navigate]);
}
