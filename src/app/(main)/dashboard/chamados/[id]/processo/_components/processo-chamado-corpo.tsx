import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessoChamadoPayload } from "@/lib/chamados/processo-chamado";
import { labelTipoChamado } from "@/lib/chamados/tipo-chamado";

import { StatusBadge } from "../../../_components/StatusBadge";

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_progresso: "Em progresso",
  fechado: "Fechado",
  cancelado: "Cancelado",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const TIPO_EVENTO_LABEL: Record<string, string> = {
  abertura: "Abertura",
  acompanhador: "Acompanhamento",
  anexo: "Anexo",
  comentario: "Interação",
  sla_primeira_resposta: "SLA",
  fechamento: "Encerramento",
};

function fmtDataHora(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function ProcessoChamadoCorpo({ data }: { data: ProcessoChamadoPayload }) {
  const { chamado, situacaoResumo, metricas, eventos } = data;

  return (
    <>
      <div>
        <p className="mb-1 font-mono text-muted-foreground text-xs">#{chamado.numero}</p>
        <h1 className="font-semibold text-2xl tracking-tight">Processo do chamado</h1>
        <p className="mt-1 text-muted-foreground text-sm">{chamado.titulo}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Situação atual</CardTitle>
          <CardDescription className="text-pretty">{situacaoResumo}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <StatusBadge status={chamado.status} />
          <span className="text-muted-foreground text-sm">
            {PRIORIDADE_LABEL[chamado.prioridade] ?? chamado.prioridade} · {labelTipoChamado(chamado.tipoChamado)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tempos e respostas</CardTitle>
          <CardDescription>Medidos a partir da abertura do chamado ({fmtDataHora(chamado.criadoEm)}).</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Até a 1ª interação</dt>
              <dd className="font-medium">{metricas.atePrimeiraInteracao ?? "—"}</dd>
              <p className="mt-0.5 text-muted-foreground text-xs">Primeiro comentário ou anexo registrado.</p>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Até a 1ª resposta da equipe</dt>
              <dd className="font-medium">{metricas.atePrimeiraRespostaEquipe ?? "—"}</dd>
              <p className="mt-0.5 text-muted-foreground text-xs">Primeiro comentário de quem não é o requerente.</p>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Até 1ª resposta (SLA)</dt>
              <dd className="font-medium">{metricas.atePrimeiraRespostaSla ?? "—"}</dd>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Quando o sistema registrou a primeira resposta para SLA.
              </p>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Tempo até encerramento</dt>
              <dd className="font-medium">{metricas.tempoAteResolucao ?? "—"}</dd>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Só aparece quando o chamado já foi fechado ou cancelado.
              </p>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linha do tempo</CardTitle>
          <CardDescription>
            Abertura, interações, anexos, acompanhadores e encerramento em ordem cronológica. O sistema não guarda
            histórico de cada mudança de status; o status atual aparece no quadro acima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative ms-2 border-border border-s ps-6">
            {eventos.map((ev) => (
              <li key={ev.id} className="pb-8 last:pb-0">
                <span className="-start-[calc(0.5rem+1px)] absolute mt-1.5 flex size-3 items-center justify-center rounded-full border border-primary bg-background text-primary">
                  <Circle className="size-2 fill-current" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-muted-foreground text-xs tabular-nums">{fmtDataHora(ev.quandoIso)}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                      {TIPO_EVENTO_LABEL[ev.tipo] ?? ev.tipo}
                    </span>
                  </div>
                  <p className="font-medium leading-snug">{ev.titulo}</p>
                  {ev.usuarioNome ? <p className="text-muted-foreground text-xs">Quem: {ev.usuarioNome}</p> : null}
                  {ev.detalhe ? <p className="text-muted-foreground text-sm leading-snug">{ev.detalhe}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Requerente:</span>{" "}
            <span className="font-medium">{chamado.criadorNome ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Responsável técnico:</span>{" "}
            <span className="font-medium">{chamado.atribuidoNome ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Setor / categoria:</span>{" "}
            <span className="font-medium">
              {chamado.setorNome ?? "—"} · {chamado.categoriaNome ?? "—"}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Status no registro:</span>{" "}
            <span className="font-medium">{STATUS_LABEL[chamado.status] ?? chamado.status}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Última atualização do registro: {fmtDataHora(chamado.atualizadoEm)}
            {chamado.fechadoEm ? ` · Encerrado em: ${fmtDataHora(chamado.fechadoEm)}` : null}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
