import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ChevronLeft, ChevronRight, Zap, Monitor, ShoppingCart, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

import loginAsset from "@/assets/demo-video-login.mp4.asset.json";
import dashboardAsset from "@/assets/demo-video-dashboard.mp4.asset.json";
import ordersAsset from "@/assets/demo-video-orders.mp4.asset.json";

const scenes = [
  {
    id: "login",
    title: "Acesso Seguro",
    description: "Login com autenticação em 2 etapas, controle de tentativas e sessão segura.",
    icon: Monitor,
    src: loginAsset.url,
    accent: "from-blue-500 to-indigo-600",
  },
  {
    id: "dashboard",
    title: "Dashboard Analítico",
    description: "KPIs em tempo real, gráficos interativos de vendas por região, categoria e evolução mensal.",
    icon: BarChart3,
    src: dashboardAsset.url,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "orders",
    title: "Gestão de Pedidos",
    description: "Controle completo de pedidos com filtros, status, aprovações e integração ERP Protheus.",
    icon: ShoppingCart,
    src: ordersAsset.url,
    accent: "from-amber-500 to-orange-600",
  },
];

export default function Demo() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const scene = scenes[current];

  const goTo = (idx: number) => {
    setCurrent(idx);
    setPlaying(true);
  };

  const next = () => goTo((current + 1) % scenes.length);
  const prev = () => goTo((current - 1 + scenes.length) % scenes.length);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">Vendas</span>
            <span className="text-lg font-light text-white/50 ml-1.5">Protheus</span>
          </div>
        </div>
        <span className="text-xs text-white/30 font-medium tracking-widest uppercase">Demonstração do Produto — Ambiente de Demonstração Interativa</span>
      </header>

      {/* Main content */}
      <main className="relative px-8 pb-12">
        <div className="max-w-7xl mx-auto">

          {/* Video player */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 bg-black">
            {/* Top bar mimicking a window frame */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-white/40 font-mono">vendas-protheus.app</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="relative aspect-video"
              >
                <video
                  ref={videoRef}
                  key={scene.src}
                  src={scene.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />

                {/* Overlay controls */}
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={prev}
                    className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white"
                  >
                    {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={next}
                    className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 hover:text-white"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Scene info + selector */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scenes.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === current;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`relative text-left rounded-xl p-5 border transition-all duration-300 ${
                    isActive
                      ? "bg-white/[0.06] border-white/15 shadow-lg"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-scene"
                      className="absolute inset-0 rounded-xl border-2 border-blue-500/30"
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br ${s.accent} mb-3`}>
                      <Icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
                    <p className="text-xs text-white/45 leading-relaxed">{s.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 bg-blue-500" : "w-1.5 bg-white/20 hover:bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
