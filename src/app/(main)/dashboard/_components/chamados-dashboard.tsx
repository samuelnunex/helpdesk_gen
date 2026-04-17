"use client";

import { useState } from "react";

import Link from "next/link";

import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDot,
  Flame,
  Inbox,
  Layers,
  type LucideIcon,
  Ticket,
  Timer,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Rectangle, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChamadosDashboardStats, FaixasTempoBucket } from "@/lib/chamados/get-chamados-dashboard-stats";

const ESCOPO_UMA_LINHA: Record<ChamadosDashboardStats["escopo"], string> = {
  todos: "Você enxerga todos os chamados do sistema (igual à listagem).",
  setor: "Você enxerga apenas os chamados do seu setor.",
  meus_e_acompanhados: "Você enxerga chamados em que participa como requerente ou acompanhador.",
  vazio: "Sem setor vinculado como gestor — não há chamados listados.",
};

const semanalConfig = {
  criados: { label: "Criados", color: "var(--chart-1)" },
  encerrados: { label: "Encerrados", color: "var(--chart-2)" },
} satisfies ChartConfig;

const faixaConfig = {
  quantidade: { label: "Chamados", color: "var(--chart-3)" },
} satisfies ChartConfig;

function formatHorasLegivel(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 72) return `${Math.round(h)} h`;
  return `${Math.round((h / 24) * 10) / 10} d`;
}

function bucketsToBarData(f: FaixasTempoBucket) {
  return [
    { faixa: "Até 24 h", quantidade: f.ate24h },
    { faixa: "1 a 3 dias", quantidade: f.de24a72h },
    { faixa: "3 a 7 dias", quantidade: f.de72a168h },
    { faixa: "Mais de 7 dias", quantidade: f.acima168h },
  ];
}

function Kpi({
  title,
  value,
  hint,
  icon: Icon,
  emphasis,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  emphasis?: boolean;
}) {
  return (
    <Card className={emphasis ? "border-primary/25 bg-primary/5" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-muted-foreground text-xs">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-bold text-2xl tabular-nums tracking-tight">{value}</p>
        {hint ? <p className="text-muted-foreground text-xs leading-snug">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ChamadosDashboard({ stats }: { stats: ChamadosDashboardStats }) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(true);

  if (stats.escopo === "vazio") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl tracking-tight">Chamados</h1>
            <p className="max-w-xl text-muted-foreground text-sm">{ESCOPO_UMA_LINHA.vazio}</p>
          </div>
          <Button asChild variant="outline" className="shrink-0 gap-2 self-start sm:self-auto">
            <Link href="/dashboard/chamados">
              Ir para listagem
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-start gap-3 pb-2">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500" />
            <div>
              <CardTitle className="text-base">Nada para mostrar ainda</CardTitle>
              <CardDescription className="text-pretty">
                Associe um setor ao seu usuário como gestor ou use um perfil com visão global para ver chamados aqui.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sla = stats.slaEncerrados90d;
  const idade = stats.idadeChamadosAtivos;
  const semanal = stats.serieSemanal8Semanas;
  const slaBars = bucketsToBarData(sla.faixas);
  const idadeBars = bucketsToBarData(idade.faixas);
  const temSemanal = semanal.some((r) => r.criados > 0 || r.encerrados > 0);
  const temSla = sla.amostra > 0;
  const temIdade = idade.total > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-tight">Chamados</h1>
          <p className="max-w-xl text-muted-foreground text-sm">{ESCOPO_UMA_LINHA[stats.escopo]}</p>
        </div>
        <Button asChild className="shrink-0 gap-2 self-start sm:self-auto">
          <Link href="/dashboard/chamados">
            Ver listagem
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="visao" className="flex flex-col gap-4">
        <TabsList className="flex h-auto w-full max-w-3xl flex-wrap gap-1 rounded-lg bg-muted p-1 sm:flex-nowrap">
          <TabsTrigger value="visao" className="min-w-[calc(50%-4px)] flex-1 gap-1.5 text-xs sm:min-w-0 sm:text-sm">
            <Inbox className="size-3.5 opacity-70 sm:size-4" />
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="min-w-[calc(50%-4px)] flex-1 gap-1.5 text-xs sm:min-w-0 sm:text-sm">
            <BarChart3 className="size-3.5 opacity-70 sm:size-4" />
            Tendência
          </TabsTrigger>
          <TabsTrigger value="sla" className="min-w-[calc(50%-4px)] flex-1 gap-1.5 text-xs sm:min-w-0 sm:text-sm">
            <Timer className="size-3.5 opacity-70 sm:size-4" />
            SLA
          </TabsTrigger>
          <TabsTrigger value="fila" className="min-w-[calc(50%-4px)] flex-1 gap-1.5 text-xs sm:min-w-0 sm:text-sm">
            <CircleDot className="size-3.5 opacity-70 sm:size-4" />
            Fila ativa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi title="Total no escopo" value={stats.total} icon={Layers} />
            <Kpi
              title="Em atendimento"
              value={stats.ativos}
              hint={`${stats.aberto} abertos · ${stats.emProgresso} em progresso`}
              icon={Ticket}
              emphasis
            />
            <Kpi title="Alta ou urgente" value={stats.altaUrgenteEmAtivos} hint="Ainda ativos" icon={Flame} />
          </div>

          <p className="rounded-md border bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
            <span className="font-medium text-foreground">Últimos 7 dias:</span>{" "}
            <span className="tabular-nums">{stats.criadosUltimos7Dias}</span> novos ·{" "}
            <span className="tabular-nums">{stats.encerradosUltimos7Dias}</span> encerrados
          </p>

          <Collapsible open={detalhesAbertos} onOpenChange={setDetalhesAbertos}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full max-w-md justify-between gap-2 px-3 font-normal"
              >
                <span>Detalhe por status</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${detalhesAbertos ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground text-xs">Aberto</p>
                  <p className="font-semibold text-lg tabular-nums">{stats.aberto}</p>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground text-xs">Em progresso</p>
                  <p className="font-semibold text-lg tabular-nums">{stats.emProgresso}</p>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground text-xs">Fechado</p>
                  <p className="font-semibold text-lg tabular-nums">{stats.fechado}</p>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <p className="text-muted-foreground text-xs">Cancelado</p>
                  <p className="font-semibold text-lg tabular-nums">{stats.cancelado}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value="tendencia" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criados e encerrados por semana</CardTitle>
              <CardDescription>
                Últimas semanas com movimento no seu escopo (início da semana em segunda).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {temSemanal ? (
                <ChartContainer config={semanalConfig} className="aspect-[21/10] min-h-[240px] w-full max-w-4xl">
                  <BarChart accessibilityLayer data={semanal} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="criados" fill="var(--color-criados)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="encerrados" fill="var(--color-encerrados)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-10 text-center text-muted-foreground text-sm">
                  Ainda não há dados de tendência nas últimas semanas.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tempo até encerrar</CardTitle>
              <CardDescription>
                Chamados fechados ou cancelados nos últimos 90 dias — tempo entre abertura e encerramento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Mediana</p>
                  <p className="font-bold text-xl tabular-nums">
                    {temSla ? formatHorasLegivel(sla.medianaHoras) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Média</p>
                  <p className="font-bold text-xl tabular-nums">{temSla ? formatHorasLegivel(sla.mediaHoras) : "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Encerrados em até 48 h</p>
                  <p className="font-bold text-xl tabular-nums">{temSla ? `${sla.percentualAte48h}%` : "—"}</p>
                </div>
              </div>
              {temSla ? <p className="text-muted-foreground text-xs">Amostra: {sla.amostra} chamados.</p> : null}
              {temSla ? (
                <ChartContainer config={faixaConfig} className="aspect-[16/10] min-h-[200px] w-full max-w-2xl">
                  <BarChart accessibilityLayer data={slaBars} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="faixa" width={100} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      cursor={<Rectangle fill="var(--muted)" opacity={0.15} />}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantidade" name="Chamados" fill="var(--color-quantidade)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-8 text-center text-muted-foreground text-sm">Sem encerramentos nos últimos 90 dias.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fila" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Há quanto tempo estão abertos</CardTitle>
              <CardDescription>
                Chamados em aberto ou em progresso ({idade.total} no escopo) — ajuda a ver fila antiga.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {temIdade ? (
                <ChartContainer config={faixaConfig} className="aspect-[16/10] min-h-[220px] w-full max-w-2xl">
                  <BarChart accessibilityLayer data={idadeBars} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="faixa" width={100} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      cursor={<Rectangle fill="var(--muted)" opacity={0.15} />}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="quantidade" name="Chamados" fill="var(--color-quantidade)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="py-10 text-center text-muted-foreground text-sm">Nenhum chamado ativo neste escopo.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
