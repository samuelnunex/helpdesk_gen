"use client";

import { useEffect, useState } from "react";

import { History } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Entry = { id: string; ip: string | null; userAgent: string | null; createdAt: string };

export function LoginHistoryList() {
  const [list, setList] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/login-history?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setList(data.history);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" />
          Histórico de login
        </CardTitle>
        <CardDescription>Últimos acessos à sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString("pt-BR")}</span>
                <span className="font-mono text-xs">{entry.ip ?? "—"}</span>
                <span className="w-full truncate text-xs text-muted-foreground">{entry.userAgent ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
