import React, { Component, ReactNode, ErrorInfo, useState, useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface RouteErrorBoundaryProps {
  children: ReactNode;
}

function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(() => resolve(fallbackCopyText(text)));
    } else {
      resolve(fallbackCopyText(text));
    }
  });
}

function fallbackCopyText(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

function clearAppStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith("vendasprotheus_") || key.startsWith("protheus_"))) {
          keysToRemove.push(key);
        }
      }
      const defaultKeys = [
        "vendasprotheus_db_opportunities",
        "vendasprotheus_db_products",
        "vendasprotheus_db_customers",
        "vendasprotheus_db_orders",
        "vendasprotheus_db_quotes",
        "vendasprotheus_product_images_temp",
        "vendasprotheus_product_images",
      ];
      defaultKeys.forEach((k) => {
        if (!keysToRemove.includes(k)) keysToRemove.push(k);
      });

      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent("local-db-change"));
      window.dispatchEvent(new CustomEvent("mockDataChanged"));
      try {
        window.location.reload();
      } catch {
        // safe fallback for restricted iframe sandbox
      }
    }
  } catch {
    // ignore
  }
}

export function RouteErrorDisplay({
  error,
  onNavigateBack,
  onRetry,
  onResetDefaults,
}: {
  error: Error | null;
  onNavigateBack: () => void;
  onRetry: () => void;
  onResetDefaults: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const errorMessage = error?.message || "Ocorreu um erro ao carregar esta página.";

  const handleCopyError = async () => {
    try {
      const errorText = `${error?.name || "Error"}: ${error?.message || ""}\n\nStack:\n${error?.stack || ""}`;
      const success = await copyToClipboard(errorText);
      if (success) {
        setCopied(true);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center p-8 max-w-lg mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
        <AlertTriangle className="h-7 w-7 text-amber-600" />
      </div>

      <div className="space-y-1.5 w-full">
        <h2 className="text-lg font-bold text-foreground">Erro na página</h2>
        <p className="text-sm text-muted-foreground">
          Ocorreu um problema ao renderizar esta seção. Tente recarregar ou voltar à página anterior.
        </p>

        <div className="mt-3 text-left w-full border rounded-xl p-3 bg-muted/40">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span>Detalhes do erro</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyError}
              className="h-6 text-[11px] gap-1 px-2"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado" : "Copiar erro"}
            </Button>
          </div>

          {showDetails && (
            <pre className="mt-2 text-xs bg-muted/90 border rounded-lg p-2.5 overflow-auto max-h-36 text-destructive font-mono break-words whitespace-pre-wrap">
              {errorMessage}
              {error?.stack && `\n\n${error.stack}`}
            </pre>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button variant="outline" onClick={onNavigateBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onRetry} className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Tentar novamente
        </Button>
        <Button variant="ghost" size="sm" onClick={onResetDefaults} className="text-xs text-muted-foreground">
          Redefinir dados
        </Button>
      </div>
    </div>
  );
}

interface BaseProps {
  children: ReactNode;
  locationKey: string;
  onNavigateBack: () => void;
}

interface BaseState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RouteErrorBoundaryBase extends Component<BaseProps, BaseState> {
  constructor(props: BaseProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<BaseState> {
    let errorMsg = "Erro desconhecido";
    if (error instanceof Error) {
      return { hasError: true, error };
    }
    try {
      errorMsg = String(error || "Erro desconhecido");
    } catch {
      errorMsg = "Erro desconhecido (não foi possível converter o erro para texto)";
    }
    return { hasError: true, error: new Error(errorMsg) };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    let errMessage = "Erro desconhecido";
    if (error instanceof Error) {
      errMessage = error.message;
    } else {
      try {
        errMessage = String(error);
      } catch {
        errMessage = "Erro desconhecido (não foi possível converter o erro para texto)";
      }
    }
    console.warn("[RouteErrorBoundary] Caught error on route:", errMessage, errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: BaseProps) {
    if (prevProps.locationKey !== this.props.locationKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      window.dispatchEvent(new CustomEvent("local-db-change"));
      window.dispatchEvent(new CustomEvent("mockDataChanged"));
    } catch {
      // ignore
    }
  };

  handleResetDefaults = () => {
    clearAppStorage();
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <RouteErrorDisplay
          error={this.state.error}
          onNavigateBack={this.props.onNavigateBack}
          onRetry={this.handleRetry}
          onResetDefaults={this.handleResetDefaults}
        />
      );
    }
    return this.props.children;
  }
}

function RouteErrorBoundaryWithRouter({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigateBack = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/dashboard");
      }
    } catch {
      navigate("/dashboard");
    }
  };

  const routeKey = `${location.pathname}${location.search}`;

  return (
    <RouteErrorBoundaryBase
      locationKey={routeKey}
      onNavigateBack={handleNavigateBack}
    >
      {children}
    </RouteErrorBoundaryBase>
  );
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return <RouteErrorBoundaryWithRouter>{children}</RouteErrorBoundaryWithRouter>;
  }

  return (
    <RouteErrorBoundaryBase
      locationKey="no-router"
      onNavigateBack={() => {
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }}
    >
      {children}
    </RouteErrorBoundaryBase>
  );
}

export default RouteErrorBoundary;
