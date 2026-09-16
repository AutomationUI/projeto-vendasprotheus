import { useLocation, Link } from "react-router-dom";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mx-auto">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">
            Página não encontrada
          </p>
          <p className="text-sm text-muted-foreground/70">
            O caminho <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> não existe.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
