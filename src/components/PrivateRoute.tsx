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
  const { isAuthenticated, hasPermission } = useAuth();
  const navigate = useNavigate();
  const safeModule = safeString(module);
  
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
      navigate("/login", { replace: true });
      return;
    }

    if (denied) {
      if (!toastShown.current) {
        toastShown.current = true;
        toast.error("Acesso negado", {
          description: "Você não tem permissão para acessar este módulo.",
        });
      }
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, denied, navigate]);

  if (!isAuthenticated || denied) {
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
}
