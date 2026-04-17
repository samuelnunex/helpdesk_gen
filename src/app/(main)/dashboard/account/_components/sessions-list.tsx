"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { LogOut, Monitor } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Session = {
  id: string;
  userAgent: string | null;
  createdAt: string;
  expiraEm: string;
  current: boolean;
};

export function SessionsList() {
  const router = useRouter();
  const [list, setList] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions) setList(data.sessions);
      })
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/api/user/sessions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao encerrar sessão.");
        return;
      }
      toast.success("Sessão encerrada.");
      if (list.find((s) => s.id === id)?.current) {
        router.push("/auth/login");
        router.refresh();
        return;
      }
      setList((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Erro ao conectar.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="size-4" />
          Sessões ativas
        </CardTitle>
        <CardDescription>Dispositivos conectados. Encerre sessões que não reconhecer.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma sessão ativa.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">{s.userAgent ?? "Dispositivo"}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(s.createdAt).toLocaleString("pt-BR")}
                    {s.current && " · Esta sessão"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => revoke(s.id)} className="shrink-0">
                  <LogOut className="size-3.5" />
                  Encerrar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
