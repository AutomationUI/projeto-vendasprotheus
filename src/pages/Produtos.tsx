import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  AlertTriangle,
  LayoutGrid,
  LayoutList,
  Package,
  Tag,
  TrendingDown,
  Box,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Database,
  RotateCcw,
  Link2,
  Lock,
  CheckCircle2,
  Download,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ProductImageWithSkeleton } from "@/components/products/ProductImageWithSkeleton";
import { type Product } from "@/lib/mock-data";
import { productsService } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { localDB } from "@/lib/local-db";
import {
  getSettings,
  subscribeSettings,
  isERPProductSyncActive,
  updateSettings,
  type AppSettings,
} from "@/lib/settings-store";
import { cn } from "@/lib/utils";
import { ProductImagesManager } from "@/components/products/ProductImagesManager";
import {
  createUploadSession,
  cancelUploadSession,
  promoteSessionImages,
  getProductImages,
} from "@/lib/product-images-service";
import {
  type ProductUploadSession,
  type ProductImageEditorItem,
} from "@/types/product-images";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Category colors for cards
const catColors: Record<string, string> = {
  "Hardware":    "from-blue-500 to-indigo-600",
  "Software":    "from-violet-500 to-purple-600",
  "Redes":       "from-sky-500 to-cyan-600",
  "Periféricos": "from-amber-500 to-orange-500",
  "Serviços":    "from-emerald-500 to-teal-600",
  "Informática": "from-indigo-500 to-blue-600",
  "Eletrônicos": "from-cyan-500 to-blue-600",
  "Acessórios":  "from-pink-500 to-rose-500",
};
const defaultGrad = "from-slate-500 to-slate-600";

const DEFAULT_CATEGORIES = [
  "Informática",
  "Periféricos",
  "Eletrônicos",
  "Acessórios",
  "Hardware",
  "Software",
  "Redes",
  "Serviços",
];

const DEFAULT_UNITS = ["UN", "CX", "PC", "KG", "MT", "LT", "PAR"];

function getStockStatus(estoque: number, estoqueMinimo: number) {
  if (estoque === 0)            return { label: "Esgotado",    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800",    dot: "bg-rose-500"    };
  if (estoque <= estoqueMinimo) return { label: "Estoque Baixo", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" };
  return                               { label: "Disponível",  color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" };
}

export default function ProdutosPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const debouncedSearch = useDebounce(search, 300);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [customCat, setCustomCat] = useState("");

  // Supabase Two-Stage Image Upload State
  const [uploadSession, setUploadSession] = useState<ProductUploadSession | null>(null);
  const [editorImages, setEditorImages] = useState<ProductImageEditorItem[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productPrimaryUrlMap, setProductPrimaryUrlMap] = useState<Record<string, string>>({});
  const [productImagesCountMap, setProductImagesCountMap] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    return subscribeSettings(() => {
      setSettings(getSettings());
    });
  }, []);

  const isERPActive = isERPProductSyncActive(settings);
  // Manual product management is allowed ONLY when user has permission AND there is NO ERP API consumption
  const canManageProducts = user?.role !== "cliente" && !isERPActive;

  useEffect(() => {
    if (location.pathname === "/produtos/new" && canManageProducts) {
      const nextCodeNum = products.length + 1;
      setEditingProduct({
        codigo: `PRD-${String(nextCodeNum).padStart(3, "0")}`,
        nome: "",
        categoria: "Informática",
        preco: 0,
        custo: 0,
        estoque: 10,
        estoqueMinimo: 5,
        unidade: "UN",
        tags: [],
        ativo: true,
      });
      setTagsInput("");
      setCustomCat("");
      setFormOpen(true);
    }
  }, [location.pathname, canManageProducts, products.length]);

  const fetchProducts = useCallback(async () => {
    try {
      const r = await productsService.getAll();
      const list: Product[] = r?.data ?? [];
      setProducts(list);

      // Carregar URLs das imagens principais e contagem para cada produto
      const urlMap: Record<string, string> = {};
      const countMap: Record<string, number> = {};

      for (const prod of list) {
        try {
          const imgs = await getProductImages(prod.id);
          countMap[prod.id] = imgs.length;
          const primary = imgs.find((i) => i.isPrimary) || imgs[0];
          if (primary?.url) {
            urlMap[prod.id] = primary.url;
          }
        } catch {
          // Ignorar erros individuais de carregamento de imagem
        }
      }

      setProductPrimaryUrlMap(urlMap);
      setProductImagesCountMap(countMap);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const handleSync = () => fetchProducts();
    window.addEventListener("mockDataChanged", handleSync);
    return () => window.removeEventListener("mockDataChanged", handleSync);
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const list = [...new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.categoria)])];
    return list.filter(Boolean);
  }, [products]);

  const totalValue = useMemo(() => products.reduce((s, p) => s + p.preco * p.estoque, 0), [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.estoque <= p.estoqueMinimo).length, [products]);
  const avgPrice = useMemo(() => products.length ? products.reduce((s, p) => s + p.preco, 0) / products.length : 0, [products]);

  const isLowStockFilter = searchParams.get("filter") === "low-stock";

  const filtered = products.filter((p) => {
    const matchSearch =
      (p.nome || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (p.codigo || "").toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCat = catFilter === "all" || p.categoria === catFilter;
    const matchLowStock = !isLowStockFilter || p.estoque <= p.estoqueMinimo;
    return matchSearch && matchCat && matchLowStock;
  });

  const exportToExcel = () => {
    const headers = [
      "Código",
      "Nome",
      "Categoria",
      "Preço de Venda (R$)",
      "Custo (R$)",
      "Estoque Atual",
      "Estoque Mínimo",
      "Unidade",
      "Média Venda Mensal"
    ];

    const rows = filtered.map((p) => [
      p.codigo,
      p.nome,
      p.categoria,
      p.preco,
      p.custo,
      p.estoque,
      p.estoqueMinimo,
      p.unidade,
      p.mediaVendaMensal
    ]);

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo de Produtos");
    XLSX.writeFile(wb, `catalogo_produtos_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Sucesso!",
      description: `Exportados ${filtered.length} produtos em formato Excel (.xlsx).`,
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Codigo",
      "Nome",
      "Categoria",
      "Preco de Venda",
      "Custo",
      "Estoque Atual",
      "Estoque Minimo",
      "Unidade",
      "Media Venda Mensal"
    ];

    const rows = filtered.map((p) => [
      p.codigo,
      p.nome,
      p.categoria,
      p.preco,
      p.custo,
      p.estoque,
      p.estoqueMinimo,
      p.unidade,
      p.mediaVendaMensal
    ]);

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `catalogo_produtos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sucesso!",
      description: `Exportados ${filtered.length} produtos em formato CSV.`,
    });
  };

  const openNewProduct = async () => {
    const nextCodeNum = products.length + 1;
    setEditingProduct({
      codigo: `PRD-${String(nextCodeNum).padStart(3, "0")}`,
      nome: "",
      categoria: "Informática",
      preco: 0,
      custo: 0,
      estoque: 10,
      estoqueMinimo: 5,
      unidade: "UN",
      tags: [],
      mediaVendaMensal: 0,
    });
    setTagsInput("");
    setCustomCat("");
    setEditorImages([]);

    // Criar Sessão Temporária de Upload (Estágio 1)
    try {
      const session = await createUploadSession(user?.id || "admin");
      setUploadSession(session);
    } catch (err) {
      console.warn("[Produtos] Falha ao iniciar sessão de upload:", err);
    }

    setFormOpen(true);
  };

  const openEditProduct = async (p: Product) => {
    setEditingProduct({ ...p });
    setTagsInput((p.tags || []).join(", "));
    setCustomCat("");

    // Carregar imagens persistidas e criar sessão de upload
    try {
      const session = await createUploadSession(user?.id || "admin");
      setUploadSession(session);

      const existingImages = await getProductImages(p.id);
      const editorList: ProductImageEditorItem[] = existingImages.map((img) => ({
        id: img.id,
        isPersisted: true,
        persistedId: img.id,
        bucketId: img.bucketId,
        storagePath: img.storagePath,
        filename: img.filename,
        mimeType: img.mimeType,
        fileSize: img.fileSize,
        width: img.width,
        height: img.height,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
        source: img.source,
        status: "UPLOADED",
        previewUrl: img.url || "",
      }));

      setEditorImages(editorList);
    } catch (err) {
      console.warn("[Produtos] Falha ao preparar edição de produto:", err);
      setEditorImages([]);
    }

    setFormOpen(true);
  };

  const handleCloseFormModal = async () => {
    // Se a sessão estiver ativa e o usuário cancelou, cancelar sessão e liberar temporários
    if (uploadSession && uploadSession.status === "ACTIVE") {
      cancelUploadSession(uploadSession.id).catch(() => {});
    }
    setFormOpen(false);
    setEditingProduct(null);
    setUploadSession(null);
    setEditorImages([]);
  };

  const confirmDeleteProduct = (p: Product) => {
    setProductToDelete(p);
    setDeleteConfirmOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct?.nome?.trim()) {
      toast({ title: "Erro de validação", description: "O nome do produto é obrigatório.", variant: "destructive" });
      return;
    }
    if ((editingProduct.preco ?? 0) <= 0) {
      toast({ title: "Erro de validação", description: "O preço deve ser maior que zero.", variant: "destructive" });
      return;
    }

    setIsSavingProduct(true);

    const categoriaFinal = customCat.trim() || editingProduct.categoria || "Geral";
    const tagsArray = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const payload: Omit<Product, "id"> = {
      codigo: editingProduct.codigo?.trim() || `PRD-${Date.now().toString(36).toUpperCase()}`,
      nome: editingProduct.nome.trim(),
      categoria: categoriaFinal,
      preco: Number(editingProduct.preco) || 0,
      custo: Number(editingProduct.custo) || 0,
      estoque: Math.max(0, Number(editingProduct.estoque) || 0),
      estoqueMinimo: Math.max(0, Number(editingProduct.estoqueMinimo) || 0),
      unidade: editingProduct.unidade?.trim() || "UN",
      tags: tagsArray,
      mediaVendaMensal: Number(editingProduct.mediaVendaMensal) || 0,
      sugestoes: editingProduct.sugestoes || [],
    };

    try {
      let savedProductId = editingProduct.id;

      if (editingProduct.id) {
        await productsService.update(editingProduct.id, payload);
      } else {
        const created = await productsService.create(payload);
        savedProductId = created?.data?.id || `local_${Date.now()}`;
      }

      // ─── ESTÁGIO 2: Persistência e Promoção Definitiva no Supabase Storage ───
      if (uploadSession && savedProductId) {
        const tempImagesToPromote = editorImages
          .filter((it) => !it.isPersisted && !it.markedForDeletion)
          .map((it) => ({
            tempImageId: it.tempId || it.id,
            sortOrder: it.sortOrder,
            isPrimary: it.isPrimary,
            source: it.source,
          }));

        const deletedPersistedImageIds = editorImages
          .filter((it) => it.isPersisted && it.markedForDeletion)
          .map((it) => it.id);

        const persistedImageOrders = editorImages
          .filter((it) => it.isPersisted && !it.markedForDeletion)
          .map((it) => ({
            id: it.id,
            sortOrder: it.sortOrder,
            isPrimary: it.isPrimary,
          }));

        const primaryImageId = editorImages.find((it) => it.isPrimary && !it.markedForDeletion)?.id;

        await promoteSessionImages({
          sessionId: uploadSession.id,
          productId: savedProductId,
          userId: user?.id || "admin",
          tempImages: tempImagesToPromote,
          primaryImageId,
          deletedPersistedImageIds,
          persistedImageOrders,
        });
      }

      toast({
        title: editingProduct.id ? "Produto atualizado" : "Produto cadastrado",
        description: `"${payload.nome}" e suas imagens foram persistidas com sucesso.`,
      });

      setFormOpen(false);
      setEditingProduct(null);
      setUploadSession(null);
      setEditorImages([]);
      await fetchProducts();
    } catch (err: any) {
      console.error("[Produtos] Erro ao salvar produto:", err);
      toast({
        title: "Erro ao salvar",
        description: err.message || "Não foi possível salvar o produto e suas imagens.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await productsService.remove(productToDelete.id);
      toast({ title: "Produto removido", description: `"${productToDelete.nome}" foi excluído com sucesso.` });
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch {
      toast({ title: "Erro", description: "Não foi possível excluir o produto.", variant: "destructive" });
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Deseja restaurar os produtos padrão do sistema? Seus dados salvos serão resetados.")) {
      localDB.resetToDefaults();
      fetchProducts();
      toast({ title: "Catálogo restaurado", description: "Produtos restaurados para os valores padrão." });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Catálogo de Produtos"
        subtitle={
          isERPActive
            ? "Catálogo sincronizado via API Restful do Protheus — Master Data gerenciado no ERP"
            : "Gerencie seu portfólio de produtos e controle de estoque integrado ao banco de dados próprio (Sem consumo de API externa)"
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isERPActive ? (
              <Badge variant="outline" className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                <Link2 className="h-3.5 w-3.5 text-amber-600" />
                <span>API Protheus Ativa (Somente Leitura)</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Database className="h-3.5 w-3.5" />
                <span>Banco Próprio Ativo (Sem consumo de API)</span>
              </Badge>
            )}

            {!isERPActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                title="Restaurar dados padrão"
                className="text-xs text-muted-foreground hover:text-foreground h-9"
              >
                <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Restaurar Padrão</span>
              </Button>
            )}

            {isERPActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Cadastro de Produtos Bloqueado",
                    description: "O cadastro só fica ativo quando NÃO houver consumo de dados por API do Protheus ou de outro ERP. Atualmente os produtos são sincronizados do ERP.",
                    variant: "destructive",
                  });
                }}
                className="gap-2 opacity-80 cursor-not-allowed h-9 bg-muted/40 border-amber-200 text-amber-900 dark:text-amber-200"
              >
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden sm:inline">Novo Produto (Bloqueado por API)</span>
                <span className="sm:hidden">Bloqueado</span>
              </Button>
            ) : (
              canManageProducts && (
                <Button
                  onClick={openNewProduct}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm h-9"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Produto</span>
                </Button>
              )
            )}
          </div>
        }
      />

      {/* Regra de Negócio: Banner explicativo sobre o status do cadastro */}
      {isERPActive ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/25 p-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 flex-1 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Cadastro de Produtos Bloqueado — Consumo de API Protheus/ERP Ativo
                </h3>
                <Badge variant="outline" className="bg-amber-200/50 text-amber-900 border-amber-300 text-[11px] font-semibold">
                  Master Data no ERP
                </Badge>
              </div>
              <p className="text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                Este ambiente está configurado para consumir os produtos diretamente da API do Protheus (tabelas SB1/SB2/DA1).
                Para evitar divergências de estoque, cadastros duplicados e conflitos fiscais, <strong>o cadastro, edição de preços e exclusão direta no portal estão desativados</strong>.
              </p>
              <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-amber-200/60 dark:border-amber-900/60">
                <p className="text-amber-950 dark:text-amber-200 font-medium">
                  💡 <strong>Quando o cadastro fica ativo?</strong> Ele só estará ativo quando <u>não houver consumo de dados por API do Protheus ou de outro ERP</u> (Modo Banco Próprio).
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1.5 bg-amber-200/80 hover:bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:hover:bg-amber-900 dark:text-amber-100 font-medium"
                  onClick={() => {
                    updateSettings({ erpConfig: { origemProdutos: "proprio", ativo: false } });
                    toast({
                      title: "Modo Banco Próprio Ativado",
                      description: "Consumo de API desativado. Cadastro manual de produtos 100% liberado!",
                    });
                  }}
                >
                  <Database className="h-3.5 w-3.5" />
                  Alternar para Banco Próprio (Liberar Cadastro)
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Cadastro de Produtos 100% Ativo (Sem consumo de API do Protheus/ERP)
                </p>
                <p className="text-emerald-700 dark:text-emerald-300/80">
                  Como não há consumo de API externa configurado, o portal opera com banco de dados próprio. Você pode criar, editar e excluir produtos livremente.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
                Cadastro Liberado
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  updateSettings({ erpConfig: { origemProdutos: "erp", ativo: true } });
                  toast({
                    title: "Consumo via API ERP Ativado",
                    description: "Produtos agora sincronizados com o Protheus. Cadastro manual bloqueado.",
                  });
                }}
              >
                <Link2 className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden md:inline">Simular Consumo API ERP</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total de Produtos"  value={products.length.toString()}  icon={Package}      gradient="brand"   change={`${products.length} cadastrados`}  positive={true}  delay={0}    />
        <KpiCard title="Valor em Estoque"   value={`R$ ${(totalValue/1000).toFixed(0)}k`} icon={Box} gradient="success" change="+5%"    positive={true}  delay={0.07} />
        <KpiCard title="Preço Médio"        value={fmt(avgPrice)}               icon={Tag}          gradient="warning" change="Estável"       positive={true}  delay={0.14} />
        <KpiCard title="Estoque Crítico"    value={lowStockCount.toString()}    icon={TrendingDown} gradient="brand"   change="Requer atenção" positive={false} delay={0.21} />
      </div>

      {/* Filters + toggle */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Export options */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 px-3">
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Exportar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={exportToExcel}
                    className="justify-start text-xs h-8 text-slate-700 dark:text-slate-300 font-normal hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                    Excel (.xlsx)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={exportToCSV}
                    className="justify-start text-xs h-8 text-slate-700 dark:text-slate-300 font-normal hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    CSV (.csv)
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden h-9 shrink-0">
              <button onClick={() => setView("cards")} className={cn("px-3 flex items-center gap-1.5 text-xs font-medium transition-colors", view === "cards" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </button>
              <button onClick={() => setView("table")} className={cn("px-3 flex items-center gap-1.5 text-xs font-medium transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
                <LayoutList className="h-3.5 w-3.5" /> Lista
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className={view === "table" ? "px-0 pt-0" : ""}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <AnimatePresence mode="wait">
            {view === "cards" ? (
              <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p, i) => {
                  const stock = getStockStatus(p.estoque, p.estoqueMinimo);
                  const grad = catColors[p.categoria] || defaultGrad;
                  const stockPct = Math.min(100, Math.round((p.estoque / (Math.max(p.estoqueMinimo, 1) * 3)) * 100));
                  const primaryImageUrl = productPrimaryUrlMap[p.id] || p.primaryImageUrl;
                  const imagesCount = productImagesCountMap[p.id] || 0;

                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -2 }}
                      className="group rounded-xl border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
                      <div>
                        {/* Image / Header Banner */}
                        {primaryImageUrl ? (
                          <ProductImageWithSkeleton
                            src={primaryImageUrl}
                            alt={p.nome}
                            aspectRatio="video"
                            containerClassName="border-b border-border/40"
                            className="group-hover:scale-105"
                            imagesCount={imagesCount}
                            showOverlayGradient
                            isLoadingParent={loading}
                          />
                        ) : (
                          <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
                        )}

                        <div className="p-4 space-y-3">
                          {/* Category + stock badge */}
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="text-[11px]">{p.categoria}</Badge>
                            <Badge variant="outline" className={cn("text-[11px] font-medium border px-2 py-0.5 rounded-full shrink-0", stock.color)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block", stock.dot)} />
                              {stock.label}
                            </Badge>
                          </div>
                          {/* Code + Name */}
                          <div>
                            <p className="text-[11px] font-mono text-muted-foreground">{p.codigo}</p>
                            <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{p.nome}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Unidade: {p.unidade || "UN"}</p>
                          </div>
                          {/* Stock bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Estoque</span>
                              <span className={cn("font-bold", p.estoque <= p.estoqueMinimo ? "text-amber-600" : "text-foreground")}>
                                {p.estoque} {p.unidade || "un."}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", stockPct > 50 ? "bg-emerald-500" : stockPct > 20 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${stockPct}%` }} />
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-md border border-slate-100 dark:border-slate-800 mt-1">
                              <div className="flex gap-1 flex-wrap">
                                  {p.tags?.slice(0, 2).map(t => (
                                    <Badge key={t} className="text-[9px] px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100">{t}</Badge>
                                  ))}
                              </div>
                              <span className="text-[9px] font-mono text-muted-foreground shrink-0">Min: {p.estoqueMinimo}</span>
                            </div>
                          </div>
                          {/* Price & Cost */}
                          <div className="pt-2 border-t border-border/60 flex items-baseline justify-between">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Preço de Venda</p>
                              <p className="text-base font-bold text-foreground">{fmt(p.preco)}</p>
                            </div>
                            {p.custo > 0 && (
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Custo</p>
                                <p className="text-xs font-medium text-muted-foreground">{fmt(p.custo)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card actions / status */}
                      {isERPActive ? (
                        <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 border-t flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                          <span className="flex items-center gap-1 font-medium">
                            <Link2 className="h-3 w-3" />
                            Origem: Protheus SB1
                          </span>
                          <span className="text-[10px] bg-amber-100/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            Somente Leitura
                          </span>
                        </div>
                      ) : (
                        canManageProducts && (
                          <div className="px-4 py-2 bg-muted/20 border-t flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditProduct(p)}
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeleteProduct(p)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      )}
                    </motion.div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                    Nenhum produto encontrado
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Foto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageProducts ? (
                        <TableHead className="text-right">Ações</TableHead>
                      ) : isERPActive ? (
                        <TableHead className="text-right">Origem</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const stock = getStockStatus(p.estoque, p.estoqueMinimo);
                      const primaryImageUrl = productPrimaryUrlMap[p.id] || p.primaryImageUrl;

                      return (
                        <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-2">
                            <ProductImageWithSkeleton
                              src={primaryImageUrl}
                              alt={p.nome}
                              aspectRatio="thumb"
                              containerClassName="w-10 h-10 rounded-lg border border-border/60"
                              isLoadingParent={loading}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{p.codigo}</TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <span>{p.nome}</span>
                              {p.tags && p.tags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {p.tags.map(t => (
                                    <Badge key={t} variant="outline" className="text-[9px] px-1 py-0">{t}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{p.categoria}</Badge></TableCell>
                          <TableCell className="text-right font-bold">{fmt(p.preco)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{p.custo ? fmt(p.custo) : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.estoque <= p.estoqueMinimo && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                              <span className={cn("font-medium", p.estoque <= p.estoqueMinimo ? "text-amber-600 font-bold" : "")}>
                                {p.estoque} {p.unidade || "UN"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[11px] font-medium border px-2 py-0.5 rounded-full", stock.color)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block", stock.dot)} />
                              {stock.label}
                            </Badge>
                          </TableCell>
                          {canManageProducts ? (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditProduct(p)}
                                  title="Editar Produto"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                                  onClick={() => confirmDeleteProduct(p)}
                                  title="Excluir Produto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          ) : isERPActive ? (
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-[10px] text-amber-800 bg-amber-50 dark:bg-amber-950/40 border-amber-300">
                                Protheus API
                              </Badge>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={canManageProducts || isERPActive ? 9 : 8} className="text-center text-muted-foreground py-10">Nenhum produto encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog Form: Cadastro / Edição de Produto ── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) handleCloseFormModal(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingProduct?.id ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              Cadastre as informações comerciais e adicione fotos do produto com o ciclo de upload em 2 estágios do Supabase.
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-6 py-2">
              {/* Seção 1: Dados Cadastrais */}
              <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/60">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Informações Gerais do Produto
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="prod-codigo" className="text-xs">Código / SKU</Label>
                    <Input
                      id="prod-codigo"
                      value={editingProduct.codigo || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, codigo: e.target.value })}
                      placeholder="Ex: PRD-013"
                      className="h-9 mt-1 font-mono text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="prod-nome" className="text-xs font-semibold">Nome do Produto *</Label>
                    <Input
                      id="prod-nome"
                      value={editingProduct.nome || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, nome: e.target.value })}
                      placeholder="Ex: Teclado Mecânico RGB Pro"
                      className="h-9 mt-1 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Categoria</Label>
                    <Select
                      value={editingProduct.categoria || "Informática"}
                      onValueChange={(val) => setEditingProduct({ ...editingProduct, categoria: val })}
                    >
                      <SelectTrigger className="h-9 mt-1 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prod-custom-cat" className="text-xs">Ou Nova Categoria</Label>
                    <Input
                      id="prod-custom-cat"
                      value={customCat}
                      onChange={(e) => setCustomCat(e.target.value)}
                      placeholder="Nova categoria personalizada"
                      className="h-9 mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="prod-preco" className="text-xs font-semibold">Preço Venda (R$) *</Label>
                    <Input
                      id="prod-preco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.preco ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, preco: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-9 mt-1 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-custo" className="text-xs">Custo Compra (R$)</Label>
                    <Input
                      id="prod-custo"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct.custo ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, custo: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-9 mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-estoque" className="text-xs">Estoque Atual</Label>
                    <Input
                      id="prod-estoque"
                      type="number"
                      min="0"
                      value={editingProduct.estoque ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, estoque: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="h-9 mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prod-min" className="text-xs">Estoque Mínimo</Label>
                    <Input
                      id="prod-min"
                      type="number"
                      min="0"
                      value={editingProduct.estoqueMinimo ?? ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, estoqueMinimo: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="h-9 mt-1 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Unidade</Label>
                    <Select
                      value={editingProduct.unidade || "UN"}
                      onValueChange={(val) => setEditingProduct({ ...editingProduct, unidade: val })}
                    >
                      <SelectTrigger className="h-9 mt-1 text-xs">
                        <SelectValue placeholder="UN" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_UNITS.map((u) => (
                          <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="prod-tags" className="text-xs">Tags / Destaques</Label>
                    <Input
                      id="prod-tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="Ex: Mais Vendido, Promoção, Premium (separadas por vírgula)"
                      className="h-9 mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Gerenciador de Imagens Supabase (Dois Estágios) */}
              <div className="space-y-2">
                <ProductImagesManager
                  uploadSession={uploadSession}
                  userId={user?.id || "admin"}
                  items={editorImages}
                  onItemsChange={setEditorImages}
                  disabled={isSavingProduct}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button
              variant="outline"
              onClick={handleCloseFormModal}
              disabled={isSavingProduct}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isSavingProduct}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {isSavingProduct ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando e Promovendo Fotos...
                </>
              ) : (
                "Salvar Produto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirm Delete ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Excluir Produto
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o produto <strong>{productToDelete?.nome}</strong> ({productToDelete?.codigo}) do catálogo local?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

