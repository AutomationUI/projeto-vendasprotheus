import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChangeObject {
  value: number | string;
  period?: string;
  isPositive?: boolean;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  change?: string | ChangeObject;
  positive?: boolean;
  icon: LucideIcon;
  gradient?: "brand" | "success" | "warning" | "destructive";
  className?: string;
  delay?: number;
}

const gradientMap = {
  brand:       "from-blue-600 to-indigo-600",
  success:     "from-emerald-500 to-teal-600",
  warning:     "from-amber-500 to-orange-500",
  destructive: "from-red-500 to-rose-600",
};

const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function KpiCard({
  title,
  value,
  change,
  positive,
  icon: Icon,
  gradient = "brand",
  className,
  delay = 0,
}: KpiCardProps) {
  const grad = gradientMap[gradient];

  let changeText = "";
  let periodText = "vs mês anterior";
  let isPos = positive ?? true;

  if (typeof change === "string" || typeof change === "number") {
    changeText = String(change);
    if (positive === undefined) {
      isPos = !changeText.startsWith("-");
    }
  } else if (change && typeof change === "object") {
    const val = (change as ChangeObject).value;
    if (typeof val === "number") {
      changeText = `${val > 0 ? "+" : ""}${val}%`;
    } else if (val !== null && val !== undefined) {
      changeText = String(val);
    }
    if ((change as ChangeObject).period) {
      periodText = String((change as ChangeObject).period);
    }
    if ((change as ChangeObject).isPositive !== undefined) {
      isPos = Boolean((change as ChangeObject).isPositive);
    } else if (typeof val === "number") {
      isPos = val >= 0;
    }
  }

  const safeChange = typeof changeText === "string" ? changeText : "";
  const safePeriod = typeof periodText === "string" ? periodText : "";

  return (
    <motion.div
      variants={itemVariants}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className={cn("card-premium overflow-hidden border-0 bg-card", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate">
                {title}
              </p>
              <AnimatedValue value={value} />
            </div>
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                grad
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>

          {safeChange ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs flex-wrap">
              {isPos ? (
                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {safeChange}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-rose-500 dark:text-rose-400 font-medium">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  {safeChange}
                </span>
              )}
              {safePeriod && <span className="text-muted-foreground">{safePeriod}</span>}
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">{safePeriod}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Animated numeric count-up effect */
function AnimatedValue({ value }: { value: string | number }) {
  const strVal = String(value);
  const [displayed, setDisplayed] = useState(strVal);
  const prevRef = useRef(strVal);

  useEffect(() => {
    if (prevRef.current !== strVal) {
      prevRef.current = strVal;
      setDisplayed(strVal);
    }
  }, [strVal]);

  return (
    <motion.p
      key={displayed}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="text-2xl font-bold tracking-tight text-foreground"
    >
      {displayed}
    </motion.p>
  );
}
