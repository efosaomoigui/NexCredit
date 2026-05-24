"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    // Keep visible long enough to be noticeable; cap to avoid "stuck" feel.
    const minTimer = setTimeout(() => setActive(false), 900);
    const maxTimer = setTimeout(() => setActive(false), 6000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [pathname, searchParams]);

  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="h-0.5 w-full bg-slate-800">
        <div className="h-0.5 w-1/3 animate-pulse bg-blue-500" />
      </div>
    </div>
  );
}
