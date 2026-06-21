"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface Alert {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  count: number;
  items: any[];
  total_amount?: number;
}

const severityColor = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
};

const severityIcon = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: Clock,
  low: CheckCircle2,
};

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => get("/alerts"),
  });

  if (isLoading) {
    return (
      <>
        <TopBar title="Alerts Center" version="v1.8.12" />
        <div className="p-6">Loading alerts...</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Alerts Center" version="v1.8.12" />
      <main className="p-6 space-y-6">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              All clear! No active alerts.
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => {
            const Icon = severityIcon[alert.severity];
            return (
              <Card key={alert.type} className={`border ${severityColor[alert.severity]}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="capitalize">
                        {alert.type.replace(/_/g, " ")}
                      </CardTitle>
                    </div>
                    <Badge variant="outline">{alert.count}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alert.items.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-start justify-between p-3 bg-white/50 rounded border border-current/10">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.title || item.invoice_number || item.name || "Item"}
                        </p>
                        {item.due_date && (
                          <p className="text-xs text-gray-600">Due: {item.due_date}</p>
                        )}
                        {item.amount && (
                          <p className="text-xs text-gray-600">${item.amount}</p>
                        )}
                      </div>
                      {item.priority && (
                        <Badge className="ml-2" variant="secondary">
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {alert.items.length > 10 && (
                    <p className="text-xs text-gray-500">
                      +{alert.items.length - 10} more items
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </>
  );
}
