import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Save, X } from "lucide-react";
import { type Representante } from "@/lib/types-roles";
import { type Customer } from "@/lib/mock-data";
import { customersService } from "@/lib/api";
import { toast } from "sonner";

// ─── Masks & Validation ───

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (slice: string, weights: number[]) =>
    weights.reduce((sum, w, i) => sum + Number(slice[i]) * w, 0);

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let r = calc(digits, w1) % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  if (Number(digits[12]) !== d1) return false;

  r = calc(digits, w2) % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  return Number(digits[13]) === d2;
}

interface RepresentanteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representante?: Representante | null;
  onSave: (data: RepresentanteFormData) => void;
}

export interface RepresentanteFormData {
  nome: string;
  email: string;
  telefone: string;
  cnpj: string;
  regiao: string;
  metaMensal: number;
  comissao: number;
  ativo: boolean;
  clienteIds: string[];
}

export function RepresentanteForm({ open, onOpenChange, representante, onSave }: RepresentanteFormProps) {
  const isEditing = !!representante;

  const [nome, setNome] = useState(representante?.nome ?? "");
  const [email, setEmail] = useState(representante?.email ?? "");
  const [telefone, setTelefone] = useState(representante?.telefone ?? "");
  const [cnpj, setCnpj] = useState("");
  const [regiao, setRegiao] = useState(representante?.regiao ?? "");
  const [metaMensal, setMetaMensal] = useState(representante?.metaMensal ?? 100000);
  const [comissao, setComissao] = useState(representante?.comissao ?? 5);
  const [ativo, setAtivo] = useState(representante?.ativo ?? true);
  const [clienteIds, setClienteIds] = useState<string[]>(
    representante?.carteira.map((c) => c.clienteId) ?? []
  );
  const [clienteSearch, setClienteSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    let active = true;
    customersService.getAll()
      .then((r) => { if (active) setCustomers(r?.data ?? []); })
      .catch(() => { if (active) setCustomers([]); });
    return () => { active = false; };
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = clienteSearch.toLowerCase();
    return !q || c.razaoSocial.toLowerCase().includes(q) || c.cnpj.includes(q) || c.cidade.toLowerCase().includes(q);
  });


  const toggleCliente = (id: string) => {
    setClienteIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !regiao.trim()) {
      toast.error("Preencha os campos obrigatórios: Nome, E-mail e Região.");
      return;
    }
    if (cnpj && !isValidCnpj(cnpj)) {
      toast.error("CNPJ inválido. Verifique os dígitos informados.");
      return;
    }
    if (metaMensal <= 0) {
      toast.error("A meta mensal deve ser maior que zero.");
      return;
    }
    if (comissao < 0 || comissao > 100) {
      toast.error("A comissão deve estar entre 0% e 100%.");
      return;
    }

    onSave({ nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), cnpj: cnpj.replace(/\D/g, ""), regiao: regiao.trim(), metaMensal, comissao, ativo, clienteIds });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Representante" : "Novo Representante"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do representante e sua carteira de clientes."
              : "Preencha os dados para cadastrar um novo representante."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados pessoais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rep-nome">Nome *</Label>
              <Input id="rep-nome" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-email">E-mail *</Label>
              <Input id="rep-email" type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-telefone">Telefone</Label>
              <Input id="rep-telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(maskPhone(e.target.value))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rep-cnpj">CNPJ</Label>
              <Input id="rep-cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(maskCnpj(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-regiao">Região *</Label>
              <Input id="rep-regiao" placeholder="Ex: SP Capital, RJ / ES" value={regiao} onChange={(e) => setRegiao(e.target.value)} />
            </div>
          </div>

          {/* Comercial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rep-meta">Meta Mensal (R$)</Label>
              <Input
                id="rep-meta"
                type="number"
                min={0}
                step={1000}
                value={metaMensal}
                onChange={(e) => setMetaMensal(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-comissao">Comissão (%)</Label>
              <Input
                id="rep-comissao"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={comissao}
                onChange={(e) => setComissao(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch id="rep-ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="rep-ativo" className="cursor-pointer">Ativo</Label>
            </div>
          </div>

          {/* Carteira de clientes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Carteira de Clientes</Label>
              <Badge variant="secondary" className="text-xs">{clienteIds.length} selecionado(s)</Badge>
            </div>
            <Input
              placeholder="Buscar cliente por nome, CNPJ ou cidade..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-2">
                {filteredCustomers.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={clienteIds.includes(c.id)}
                      onCheckedChange={() => toggleCliente(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.razaoSocial}</p>
                      <p className="text-[11px] text-muted-foreground">{c.cnpj} · {c.cidade}/{c.uf}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-1">
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" className="gap-1">
              <Save className="h-4 w-4" /> {isEditing ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
