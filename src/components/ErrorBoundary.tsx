import React, { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, RotateCcw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  description?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
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

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;
  private isUnmounted = false;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
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
    console.warn("[ErrorBoundary] Application error caught:", errMessage, errorInfo?.componentStack);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      this.props.onReset?.();
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    try {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      // safe fallback
    }
  };

  handleResetStorage = () => {
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
        window.location.reload();
      }
    } catch {
      // safe fallback
    }
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleCopyError = async () => {
    try {
      const errorText = `${this.state.error?.name || "Error"}: ${this.state.error?.message || ""}\n\nStack:\n${this.state.error?.stack || ""}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ""}`;
      const success = await copyToClipboard(errorText);
      if (success && !this.isUnmounted) {
        this.setState({ copied: true });
        if (this.copyTimeout) clearTimeout(this.copyTimeout);
        this.copyTimeout = setTimeout(() => {
          if (!this.isUnmounted) {
            this.setState({ copied: false });
          }
        }, 2000);
      }
    } catch {
      // ignore
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Ocorreu um erro inesperado na aplicação.";
      const title = this.props.title || "Algo deu errado";
      const description =
        this.props.description ||
        "Um erro inesperado ocorreu nesta seção. Tente recarregar a página. Se o problema persistir, você pode redefinir os dados em cache local.";

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center p-8 max-w-xl mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2 w-full">
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

            <div className="mt-4 text-left w-full border rounded-xl p-3 bg-muted/40">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {this.state.showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span>Detalhes do erro</span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleCopyError}
                  className="h-6 text-[11px] gap-1 px-2"
                >
                  {this.state.copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {this.state.copied ? "Copiado" : "Copiar erro"}
                </Button>
              </div>

              {this.state.showDetails && (
                <pre className="mt-2 text-xs bg-muted/90 border rounded-lg p-3 overflow-auto max-h-40 text-destructive font-mono break-words whitespace-pre-wrap">
                  {errorMessage}
                  {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                </pre>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recarregar página
            </Button>
            <Button variant="outline" onClick={this.handleResetStorage} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Redefinir dados locais
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
