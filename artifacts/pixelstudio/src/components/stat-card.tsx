import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-display font-bold tracking-tight text-foreground">{value}</h3>
              {trend && (
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", 
                  trend.value >= 0 ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"
                )}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground pt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
            <Icon className="h-6 w-6 opacity-80" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
