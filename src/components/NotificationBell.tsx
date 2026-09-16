import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X, ShoppingCart, Factory, ClipboardCheck, Package, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useNotifications, TYPE_CONFIG, type NotificationType } from "@/hooks/use-notifications";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  pedido: ShoppingCart,
  producao: Factory,
  aprovacao: ClipboardCheck,
  estoque: Package,
  sistema: Monitor,
  mensagem: Monitor,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  pedido: "bg-blue-500/10 text-blue-600",
  producao: "bg-amber-500/10 text-amber-600",
  aprovacao: "bg-violet-500/10 text-violet-600",
  estoque: "bg-red-500/10 text-red-600",
  sistema: "bg-slate-500/10 text-slate-600",
  mensagem: "bg-emerald-500/10 text-emerald-600",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring" as const, stiffness: 500, damping: 15 }}
              >
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 p-0 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {unreadCount} nova{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type];
                const colorClass = TYPE_COLORS[notif.type];

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notif.read ? "bg-primary/[0.03]" : ""
                      }`}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          navigate(notif.link);
                          setOpen(false);
                        }
                      }}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!notif.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {timeAgo(notif.timestamp)}
                            </span>
                            {!notif.read && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1.5 border-border">
                          {TYPE_CONFIG[notif.type].label}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!notif.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                            className="p-1 rounded hover:bg-muted transition-colors"
                            title="Marcar como lida"
                          >
                            <Check className="h-3 w-3 text-muted-foreground" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Remover"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <Separator />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
