import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { safeString } from "@/lib/utils";

interface PrivateRouteProps {
  module: string;
  children?: React.ReactNode;
}

export function PrivateRoute({ module, children }: PrivateRouteProps) {
  const { isAuthenticated, hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const safeModule = safeString(module);

  // DEBUG: Log authentication and permission state
  console.debug("[PrivateRoute] Check:", {
    module: safeModule,
    isAuthenticated,
    user: user ? { id: user.id, email: user.email, role: user.role, ativo: user.ativo } : null,
    hasPermission: hasPermission(safeModule, "view"),
    timestamp: new Date().toISOString()
  });

  let hasAccess = false;
  try {
    hasAccess = Boolean(isAuthenticated && hasPermission(safeModule, "view"));
  } catch {
    hasAccess = false;
  }

  const denied = Boolean(isAuthenticated && !hasAccess);
  const toastShown = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      console.warn("[PrivateRoute] Not authenticated, redirecting to /login");
      navigate("/login", { replace: true });
      return;
    }

    if (denied) {
      console.warn("[PrivateRoute] Access denied for module:", safeModule);
      if (!toastShown.current) {
        toastShown.current = true;
        toast.error("Acesso negado", {
          description: "Você não tem permissão para acessar este módulo.",
        });
      }
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, denied, navigate, safeModule]);

  if (!isAuthenticated || denied) {
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
}
