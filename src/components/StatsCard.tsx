import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "gold" | "success";
  loading?: boolean;
}

export function StatsCard({ title, value, subtitle, icon: Icon, variant = "default", loading }: StatsCardProps) {
  const variants = {
    default: "border-border/50",
    gold: "border-primary/30 gold-glow",
    success: "border-success/30",
  };

  return (
    <div className={`glass-card p-6 gradient-border ${variants[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-secondary/50 animate-pulse rounded mt-2" />
          ) : (
            <p className={`text-2xl font-display font-bold mt-1 ${variant === "gold" ? "text-gradient-gold" : "text-foreground"}`}>
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${variant === "gold" ? "bg-primary/10" : "bg-secondary/50"}`}>
          <Icon className={`h-6 w-6 ${variant === "gold" ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
    </div>
  );
}
