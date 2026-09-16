import { useEffect, useState, useRef } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function SyncStatusBar() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const activeSyncs = useRef(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SYNC_STARTED") {
        activeSyncs.current += 1;
        setIsSyncing(true);
        setSyncCompleted(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (event.data && event.data.type === "SYNC_COMPLETED") {
        activeSyncs.current = Math.max(0, activeSyncs.current - 1);
        
        if (activeSyncs.current === 0) {
          setIsSyncing(false);
          setSyncCompleted(true);
          // Ocultar a mensagem de conclusão após 3 segundos
          timeoutRef.current = setTimeout(() => {
            setSyncCompleted(false);
          }, 3000);
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  return (
    <AnimatePresence>
      {(isSyncing || syncCompleted) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-md dark:bg-white/90 dark:text-slate-900"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400 dark:text-blue-600" />
              <span>Sincronizando em segundo plano...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
              <span>Sincronização concluída.</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
