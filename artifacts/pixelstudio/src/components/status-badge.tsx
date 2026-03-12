import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "Paid" | "Pending" | "Active" | "Inactive" | "Softcopy" | "Hardcopy" | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = "bg-slate-100 text-slate-800 border-slate-200"; // default fallback

  if (["Paid", "Active", "Softcopy"].includes(status)) {
    colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
  } else if (["Pending", "Inactive"].includes(status)) {
    colorClass = "bg-amber-100 text-amber-800 border-amber-200";
  } else if (["Hardcopy"].includes(status)) {
    colorClass = "bg-purple-100 text-purple-800 border-purple-200";
  } else if (status === "Inactive") {
    colorClass = "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <Badge variant="outline" className={cn("rounded-full px-3 py-0.5 font-medium border", colorClass, className)}>
      {status}
    </Badge>
  );
}
