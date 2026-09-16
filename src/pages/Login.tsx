import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { 
  Eye, 
  EyeOff, 
  Zap, 
  TrendingUp, 
  Shield, 
  ArrowLeft,
  MessageSquare,
  ShoppingCart,
  Database,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

const CHANNELS = [
  { name: "WhatsApp Business", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { name: "E-commerce & Web", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { name: "TOTVS Protheus ERP", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { name: "PDV / Balcão", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
];

const FEATURES = [
  { icon: Sparkles,     text: "CRM Comercial & Funil de Oportunidades" },
  { icon: MessageSquare,text: "Atendimento & Vendas integradas ao WhatsApp" },
  { icon: ShoppingCart, text: "Sincronização com E-commerce e Marketplaces" },
  { icon: Database,     text: "Integração nativa com ERP Protheus e APIs" },
  { icon: TrendingUp,   text: "Análise de vendas, BI e metas em tempo real" },
  { icon: Shield,       text: "Controle granular de acessos e permissões RBAC" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, verify2FA } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<"login" | "forgot_password" | "2fa">("login");
  const [otp, setOtp] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha e-mail e senha.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.locked) {
        toast({ title: "Conta temporariamente bloqueada", description: `Muitas tentativas. Aguarde ${result.remainingSeconds}s.`, variant: "destructive" });
        return;
      }
      if (!result.success) {
        toast({ title: "Credenciais inválidas", description: result.error || "Verifique seu e-mail e senha inseridos.", variant: "destructive" });
        return;
      }
      if (result.requires2FA) {
        setView("2fa");
      } else {
        toast({ title: "Login realizado", description: "Bem-vindo ao Portal de Vendas & CRM!" });
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Código inválido", description: "O código deve ter 6 dígitos.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await verify2FA(otp);
      if (!result.success) {
        toast({ title: "Código inválido", description: result.error ?? "Tente novamente.", variant: "destructive" });
        return;
      }
      toast({ title: "Verificado com sucesso", description: "Bem-vindo ao Portal de Vendas & CRM!" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "E-mail de recuperação enviado", description: "Verifique sua caixa de entrada com as instruções." });
      setView("login");
    }, 800);
  };

  return (
    <div className="min-h-screen flex" role="main" aria-label="Página de login">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(222,32%,10%)] items-end p-12">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,32%,10%)] via-[hsl(222,28%,13%)] to-[hsl(235,35%,15%)]" />

          {/* Floating circles */}
          {[
            { w: 500, h: 500, top: "-10%", left: "-10%", delay: "0s",  dur: "8s",  opacity: 0.12 },
            { w: 360, h: 360, top: "40%",  left: "55%",  delay: "2s",  dur: "11s", opacity: 0.08 },
            { w: 280, h: 280, top: "70%",  left: "-5%",  delay: "4s",  dur: "9s",  opacity: 0.10 },
            { w: 200, h: 200, top: "10%",  left: "65%",  delay: "1s",  dur: "12s", opacity: 0.07 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-2xl animate-float"
              style={{
                width: c.w, height: c.h,
                top: c.top, left: c.left,
                background: "radial-gradient(circle, hsl(215,80%,55%) 0%, hsl(235,70%,55%) 100%)",
                opacity: c.opacity,
                animationDelay: c.delay,
                animationDuration: c.dur,
              }}
            />
          ))}

          {/* Diagonal lines decoration */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 text-white space-y-6 max-w-lg"
        >
          {/* Top Logo & Badge */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-900/40"
            >
              <Zap className="h-6 w-6 text-white" />
            </motion.div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Hub Omnichannel & CRM Comercial</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Portal de Vendas & CRM
              <br />
              <span className="text-blue-400">Omnichannel</span> Integrado
            </h1>
            <p className="text-white/65 leading-relaxed text-sm">
              Gestão comercial completa unificando WhatsApp, E-commerce, Loja Física e ERPs (TOTVS Protheus, APIs e canais digitais).
            </p>
          </div>

          {/* Badges dos Canais Conectados */}
          <div className="flex flex-wrap gap-2 pt-1">
            {CHANNELS.map((ch, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${ch.color} backdrop-blur-xs flex items-center gap-1.5`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                {ch.name}
              </span>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-2.5 pt-1">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                  <f.icon className="h-4 w-4 text-blue-300" />
                </div>
                <span className="text-sm text-white/80">{f.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Status indicators */}
          <div className="flex flex-wrap gap-6 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60">Canais & Conectores: <strong className="text-white/90 font-medium">Online</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-xs text-white/60">Sincronização: <strong className="text-white/90 font-medium">Ativa (WhatsApp · ERP)</strong></span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel — Login Form ── */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground block leading-tight">Portal de Vendas & CRM</span>
              <span className="text-xs text-muted-foreground">Omnichannel · WhatsApp · ERP Protheus</span>
            </div>
          </div>

          {view === "login" && (
            <>
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Acesse sua conta</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Entre com suas credenciais para continuar.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-sm">Email Corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendedor@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 transition-shadow focus:shadow-md focus:shadow-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-semibold text-sm">Senha</Label>
                    <button 
                      type="button" 
                      onClick={() => setView("forgot_password")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10 transition-shadow focus:shadow-md focus:shadow-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                    Lembrar neste dispositivo
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Entrando...
                    </span>
                  ) : "Entrar no Portal"}
                </Button>
              </form>

              {/* Demo hint */}
              <div className="rounded-lg bg-muted/60 border border-border/60 p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-1">💡 Acesso de demonstração</p>
                <p className="text-[11px] text-muted-foreground">Administrador: <span className="font-mono font-semibold text-foreground">admin@vendas.com</span> / <span className="font-mono font-semibold text-foreground">admin123</span></p>
                <p className="text-[11px] text-muted-foreground">Cliente: <span className="font-mono font-semibold text-foreground">contato@techsolutions.com.br</span> / <span className="font-mono font-semibold text-foreground">admin123</span></p>
                <p className="text-[11px] text-muted-foreground">2FA: qualquer 6 dígitos (ex: 123456)</p>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Precisa de acesso?{" "}
                <button className="text-primary hover:underline font-medium">
                  Contate o administrador
                </button>
              </p>
            </>
          )}

          {view === "forgot_password" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <button 
                onClick={() => setView("login")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o login
              </button>

              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Recuperar Senha</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Informe o e-mail associado à sua conta para receber as instruções de recuperação.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5 mt-8">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="font-semibold text-sm">Email Corporativo</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="vendedor@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 transition-shadow focus:shadow-md focus:shadow-primary/10"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Enviando...
                    </span>
                  ) : "Enviar Instruções"}
                </Button>
              </form>
            </motion.div>
          )}

          {view === "2fa" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <button 
                onClick={() => setView("login")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>

              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Verificação em 2 Etapas</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Enviamos um código de segurança para o seu dispositivo autenticador ou e-mail.
                </p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-6 mt-8 flex flex-col items-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                  </InputOTPGroup>
                </InputOTP>

                <p className="text-xs text-muted-foreground text-center">
                  Dica de demo: digite qualquer token de 6 dígitos.
                </p>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all mt-4"
                  disabled={loading || otp.length < 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Verificando...
                    </span>
                  ) : "Verificar e Entrar"}
                </Button>
                
                <button type="button" className="text-sm text-primary hover:underline font-medium">
                  Não recebi o código
                </button>
              </form>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
