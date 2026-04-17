"use client";

import { useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type RelatorioGeral = {
  porStatus: Record<string, number>;
  porPrioridade: Record<string, number>;
  tempoMedioResolucaoHoras: number;
  porSetor: { setorId: string; setorNome: string | null; total: number }[];
};

type RelatorioSetor = {
  setor: { nome: string };
  porStatus: Record<string, number>;
  porPrioridade: Record<string, number>;
  tempoMedioResolucaoHoras: number;
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "#3b82f6",
  em_progresso: "#f59e0b",
  fechado: "#22c55e",
  cancelado: "#ef4444",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "#22c55e",
  media: "#3b82f6",
  alta: "#f59e0b",
  urgente: "#ef4444",
};

export function DashboardRelatorios({
  tipoConta,
  setorGestorId,
}: {
  tipoConta: string;
  setorGestorId: string | null;
}) {
  const [dados, setDados] = useState<RelatorioGeral | RelatorioSetor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url =
      tipoConta === "gestor_setor" && setorGestorId
        ? `/api/relatorios/setor/${setorGestorId}`
        : "/api/relatorios/geral";

    fetch(url)
      .then((r) => r.json())
      .then((d) => { setDados(d); setLoading(false); });
  }, [tipoConta, setorGestorId]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!dados) return <p className="text-muted-foreground">Sem dados disponíveis.</p>;

  const statusData = Object.entries(dados.porStatus).map(([name, value]) => ({
    name: name === "em_progresso" ? "Em Progresso" : name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: STATUS_COLORS[name] ?? "#8884d8",
  }));

  const prioridadeData = Object.entries(dados.porPrioridade).map(([name, value]) => ({
    name: name === "media" ? "Média" : name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: PRIORIDADE_COLORS[name] ?? "#8884d8",
  }));

  const total = Object.values(dados.porStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* KPI Cards */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total de Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{dados.porStatus.aberto ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">Fechados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{dados.porStatus.fechado ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tempo Médio de Resolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{dados.tempoMedioResolucaoHoras}h</p>
        </CardContent>
      </Card>

      {/* Status Chart */}
      <Card className="sm:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Chamados por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Chart */}
      <Card className="sm:col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Chamados por Prioridade</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prioridadeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Chamados" radius={[4, 4, 0, 0]}>
                {prioridadeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Por setor - apenas para admin/diretor */}
      {"porSetor" in dados && (dados as RelatorioGeral).porSetor.length > 0 && (
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-base">Chamados por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(dados as RelatorioGeral).porSetor.map((s) => ({ name: s.setorNome ?? "Sem nome", total: s.total }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Chamados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
