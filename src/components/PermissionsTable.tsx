import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Permission, ActionType } from "@/lib/types-roles";

const ALL_ACTIONS: ActionType[] = ["view", "create", "edit", "delete", "approve"];

const ACTION_LABELS: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  approve: "Aprovar",
};

export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  produtos: "Produtos & Preços",
  orcamentos: "Orçamentos",
  pedidos: "Pedidos",
  aprovacoes: "Aprovações",
  representantes: "Representantes",
  usuarios: "Usuários",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  auditoria: "Auditoria",
  producao: "Produção",
  "integracao-erp": "Integração ERP",
};

interface PermissionsTableProps {
  permissions: Permission[];
  disabled?: boolean;
  onToggle?: (module: string, action: ActionType) => void;
}

export default function PermissionsTable({ permissions, disabled = false, onToggle }: PermissionsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px] text-xs">Módulo</TableHead>
            {ALL_ACTIONS.map((a) => (
              <TableHead key={a} className="text-center text-[10px] w-[64px] px-1">
                {ACTION_LABELS[a]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.keys(MODULE_LABELS).map((mod) => {
            const perm = permissions.find((p) => p.module === mod);
            return (
              <TableRow key={mod}>
                <TableCell className="text-xs font-medium py-1.5">{MODULE_LABELS[mod]}</TableCell>
                {ALL_ACTIONS.map((action) => (
                  <TableCell key={action} className="text-center py-1.5">
                    <Checkbox
                      checked={perm?.actions.includes(action) ?? false}
                      disabled={disabled}
                      onCheckedChange={() => onToggle?.(mod, action)}
                      className="mx-auto"
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
