import { TopNavbar } from "@/components/TopNavbar";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Outlet } from "react-router-dom";
import { useEffect } from "react";

function safeInspect(obj: any, label: string) {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'bigint') return value.toString() + 'n';
      return value;
    }, 2);
    console.log(`[MainLayout Trace - ${label}] Success:`, json?.slice(0, 300));
  } catch (err: any) {
    console.error(`[MainLayout Trace - ${label}] ERROR converting to primitive value:`, err);
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        try {
          JSON.stringify(obj[k]);
        } catch (subErr) {
          console.error(`[MainLayout Trace] Faulty key -> "${k}":`, obj[k], subErr);
        }
      }
    }
  }
}

export function MainLayout(props: any) {
  useEffect(() => {
    safeInspect(props, 'MainLayout Props');
  }, [props]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <TopNavbar />
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}

