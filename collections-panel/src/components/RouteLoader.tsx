"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 450);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]">
      <div className="h-0.5 w-full bg-slate-200">
        <div className="h-0.5 w-1/3 animate-pulse bg-blue-600" />
      </div>
    </div>
  );
}

