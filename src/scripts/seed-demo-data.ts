/**
 * Popula o banco com setores, categorias e ~40 chamados fictícios para demonstração.
 * Remove chamados anteriores do seed (títulos que começam com "[Demo]") antes de inserir.
 *
 * Uso: `npm run db:seed:demo` (requer DATABASE_URL no .env ou no ambiente).
 */

import { subDays, subHours } from "date-fns";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { hashPassword } from "../lib/auth/password";
import * as schema from "../lib/db/schema";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SETORES = ["Comercial", "Financeiro", "R.H", "Importação", "Logística", "Jurídico", "Controladoria"] as const;

const CATEGORIAS = ["SAP", "SysGeN", "Câmeras", "Automações", "E-mail"] as const;

const DEMO_USER_EMAILS = ["demo.solicitante@exemplo.local", "demo.atendente@exemplo.local"] as const;
const DEMO_PASSWORD = "Demo@123456";

function loadEnvFromDotEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

type StatusChamado = "aberto" | "em_progresso" | "fechado" | "cancelado";
type PrioridadeChamado = "baixa" | "media" | "alta" | "urgente";

const STATUS_CYCLE: StatusChamado[] = ["aberto", "em_progresso", "fechado", "cancelado"];
const PRIORIDADE_CYCLE: PrioridadeChamado[] = ["baixa", "media", "alta", "urgente"];

const TITULOS_BASE: { titulo: string; trecho: string }[] = [
  { titulo: "Falha ao lançar pedido no SAP", trecho: "Mensagem BAPI return 99 ao gravar." },
  { titulo: "Relatório ZSD001 com timeout", trecho: "Execução após 120s sem retorno." },
  { titulo: "Acesso negado transação MB52", trecho: "Perfil ausente na role Z_LOG_MM." },
  { titulo: "Integração SysGeN — NF-e duplicada", trecho: "Mesmo número na fila de reprocessamento." },
  { titulo: "SysGeN: cadastro de cliente travando", trecho: "Campo CEP com máscara inconsistente." },
  { titulo: "Câmera entrada doca 3 offline", trecho: "Ping OK, stream RTSP não responde." },
  { titulo: "Gravação DVR setor A incompleta", trecho: "Lacunas entre 02h e 04h." },
  { titulo: "Automação portão refeitório não fecha", trecho: "Sensor de fim de curso intermitente." },
  { titulo: "Script agendamento backup e-mail falhou", trecho: "SMTP auth error 535." },
  { titulo: "Caixa compartilhada financeiro@ não recebe", trecho: "Regra de transporte redirecionando." },
  { titulo: "SAP: impressora Zebra etiqueta desalinhada", trecho: "Layout Smartforms deslocado 2mm." },
  { titulo: "Workflow aprovação compras travado", trecho: "Substituto não definido para gestor." },
  { titulo: "SysGeN — estoque negativo item 88421", trecho: "Movimento 311 sem estorno." },
  { titulo: "Câmera estacionamento sem IR noturno", trecho: "Após última atualização de firmware." },
  { titulo: "Automação iluminação corredor acende sozinha", trecho: "Possível interferência sensor PIR." },
  { titulo: "E-mail externo caindo em spam interno", trecho: "Domínio fornecedor sem SPF alinhado." },
  { titulo: "SAP CO: rateio centro de custo incorreto", trecho: "Chave estatística errada no período 03." },
  { titulo: "Portal SysGeN lento no horário de pico", trecho: "CPU serviço app em 95%." },
  { titulo: "Solicitação nova câmera área carga", trecho: "Cobertura cega entre pilares 4 e 5." },
  { titulo: "Automação climatização sala reuniões", trecho: "Setpoint não respeitado após 14h." },
  { titulo: "Distribuição lista interna RH", trecho: "Inclusão de novos estagiários Q2." },
  { titulo: "SAP FI: conciliação bancária diferença 0,02", trecho: "Centenas de linhas pendentes." },
  { titulo: "SysGeN relatório de comissões divergente", trecho: "Comparado à planilha comercial." },
  { titulo: "Câmeras: upgrade firmware planejado", trecho: "Janela domingo 22h–02h." },
  { titulo: "Integração robô paletizador erro 47", trecho: "PLC perde sessão Modbus." },
  { titulo: "E-mail: aumento quota caixas projeto X", trecho: "Anexos grandes de especificações." },
  { titulo: "SAP MM: pedido bloqueado estratégica liberação", trecho: "Documento 4500128877." },
  { titulo: "SysGeN — homologação ambiente QA", trecho: "Cópia parcial de tabelas fiscais." },
  { titulo: "Câmera cofre sem gravação contínua", trecho: "Somente movimento ativado." },
  { titulo: "Automação irrigação jardim disparando chuva", trecho: "Sensor pluviômetro calibrar." },
  { titulo: "Fila e-mail atrasada 20 minutos", trecho: "Filtro antispam em análise heurística." },
  { titulo: "SAP SD: condição de preço ZPRB errada", trecho: "Cliente contrato anual 2026." },
  { titulo: "SysGeN exportação XML lenta", trecho: "Volume 15k notas mês." },
  { titulo: "Solicitação máscara privacidade câmera RH", trecho: "Conformidade LGPD." },
  { titulo: "Automação elevador carga modo manual", trecho: "Chave bloqueio não retorna auto." },
  { titulo: "E-mail phishing reportado usuário", trecho: "Remetente spoof domínio interno." },
  { titulo: "SAP BASIS: job cancelado SM37", trecho: "Variante inexistente após transporte." },
  { titulo: "SysGeN app mobile não sincroniza", trecho: "iOS 18 cache tokens." },
  { titulo: "Câmera perímetro norte imagem esbranquiçada", trecho: "Possível exposição automática." },
  { titulo: "Automação envasadora parada segurança", trecho: "Cortina de luz acionada sem obstáculo." },
];

async function ensureSetor(
  db: ReturnType<typeof drizzle<typeof schema>>,
  nome: string,
  gestorId: string | null,
): Promise<string> {
  const found = await db.select().from(schema.setores).where(eq(schema.setores.nome, nome)).limit(1);
  if (found[0]) return found[0].id;
  const [row] = await db
    .insert(schema.setores)
    .values({
      nome,
      descricao: `Setor de demonstração: ${nome}.`,
      gestorId,
    })
    .returning({ id: schema.setores.id });
  return row.id;
}

async function ensureCategoria(db: ReturnType<typeof drizzle<typeof schema>>, nome: string): Promise<string> {
  const found = await db.select().from(schema.categorias).where(eq(schema.categorias.nome, nome)).limit(1);
  if (found[0]) return found[0].id;
  const [row] = await db
    .insert(schema.categorias)
    .values({ nome, ativo: true })
    .returning({ id: schema.categorias.id });
  return row.id;
}

async function ensureDemoUsers(
  db: ReturnType<typeof drizzle<typeof schema>>,
): Promise<{ solicitanteId: string; atendenteId: string }> {
  const hash = await hashPassword(DEMO_PASSWORD);
  const out: { solicitanteId: string; atendenteId: string } = {
    solicitanteId: "",
    atendenteId: "",
  };

  for (let i = 0; i < DEMO_USER_EMAILS.length; i++) {
    const email = DEMO_USER_EMAILS[i];
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing[0]) {
      if (i === 0) out.solicitanteId = existing[0].id;
      else out.atendenteId = existing[0].id;
      continue;
    }
    const [u] = await db
      .insert(schema.users)
      .values({
        email,
        passwordHash: hash,
        name: i === 0 ? "Maria Demo (solicitante)" : "Carlos Demo (atendente)",
        tipoConta: i === 0 ? "usuario_final" : "ti",
        status: "ativo",
      })
      .returning({ id: schema.users.id });
    if (i === 0) out.solicitanteId = u.id;
    else out.atendenteId = u.id;
  }

  if (!out.solicitanteId || !out.atendenteId) {
    const anyUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(5);
    if (anyUsers.length >= 2) {
      out.solicitanteId = anyUsers[0].id;
      out.atendenteId = anyUsers[1].id;
    } else if (anyUsers.length === 1) {
      out.solicitanteId = anyUsers[0].id;
      out.atendenteId = anyUsers[0].id;
    }
  }

  if (!out.solicitanteId || !out.atendenteId) {
    throw new Error(
      "Não foi possível obter dois usuários para criador/atribuído. Crie usuários manualmente ou verifique o seed.",
    );
  }

  return out;
}

async function main(): Promise<void> {
  loadEnvFromDotEnvFile();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida. Configure .env ou exporte a variável.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  try {
    await db.execute(
      sql`DELETE FROM chamado_comentarios WHERE chamado_id IN (SELECT id FROM chamados WHERE titulo LIKE '[Demo]%')`,
    );
    await db.execute(
      sql`DELETE FROM chamado_acompanhadores WHERE chamado_id IN (SELECT id FROM chamados WHERE titulo LIKE '[Demo]%')`,
    );
    await db.execute(
      sql`DELETE FROM chamado_leitura_comentarios WHERE chamado_id IN (SELECT id FROM chamados WHERE titulo LIKE '[Demo]%')`,
    );
    await db.execute(
      sql`DELETE FROM chamado_anexos WHERE chamado_id IN (SELECT id FROM chamados WHERE titulo LIKE '[Demo]%')`,
    );
    await db.execute(
      sql`DELETE FROM notificacoes WHERE chamado_id IN (SELECT id FROM chamados WHERE titulo LIKE '[Demo]%')`,
    );
    await db.execute(sql`DELETE FROM chamados WHERE titulo LIKE '[Demo]%'`);

    const { solicitanteId, atendenteId } = await ensureDemoUsers(db);

    const gestorId = atendenteId;
    const setorIds: string[] = [];
    for (const nome of SETORES) {
      setorIds.push(await ensureSetor(db, nome, gestorId));
    }

    const categoriaIds: string[] = [];
    for (const nome of CATEGORIAS) {
      categoriaIds.push(await ensureCategoria(db, nome));
    }

    const now = new Date();
    const rows: (typeof schema.chamados.$inferInsert)[] = [];

    for (let i = 0; i < 40; i++) {
      const base = TITULOS_BASE[i % TITULOS_BASE.length];
      const setorId = setorIds[i % setorIds.length];
      const categoriaId = categoriaIds[i % categoriaIds.length];
      const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
      const prioridade = PRIORIDADE_CYCLE[i % PRIORIDADE_CYCLE.length];
      const criadoEm = subHours(subDays(now, (i % 45) + 1), i % 12);
      const fechadoEm = status === "fechado" || status === "cancelado" ? subHours(criadoEm, -(4 + (i % 20))) : null;
      const criadorId = i % 3 === 0 ? atendenteId : solicitanteId;
      const atribuido = i % 2 === 0 ? atendenteId : solicitanteId;

      rows.push({
        titulo: `[Demo] ${base.titulo} #${i + 1}`,
        descricao: `${base.trecho}\n\nTicket fictício para ambiente de demonstração (seed). Categoria e setor variados para testes de lista e filtros.`,
        status,
        prioridade,
        setorId,
        categoriaId,
        criadorId,
        atribuidoA: atribuido,
        criadoEm,
        atualizadoEm: fechadoEm ?? criadoEm,
        fechadoEm,
      });
    }

    await db.insert(schema.chamados).values(rows);

    console.log("Seed concluído:");
    console.log(`  Setores: ${SETORES.length} (garantidos por nome)`);
    console.log(`  Categorias: ${CATEGORIAS.length} (garantidas por nome)`);
    console.log(`  Chamados demo: ${rows.length}`);
    console.log(`  Usuários demo: ${DEMO_USER_EMAILS.join(", ")} (senha: ${DEMO_PASSWORD})`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
