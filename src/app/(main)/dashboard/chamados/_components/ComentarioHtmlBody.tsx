import { sanitizeComentarioHtml } from "@/lib/html/sanitize-comentario-html";
import { cn } from "@/lib/utils";

const COMENTARIO_HTML_CLASS =
  "comentario-html rounded-md bg-muted/50 p-3 text-sm [&_a]:text-primary [&_blockquote]:border-border [&_blockquote]:border-l [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h2]:font-semibold [&_h2]:text-base [&_h3]:font-semibold [&_h3]:text-sm [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5";

/** Bloco de HTML de comentário (TipTap) já restrito pelo sanitize; mesmo padrão visual da ficha do chamado. */
export function ComentarioHtmlBody({ html, className }: { html: string; className?: string }) {
  const safe = sanitizeComentarioHtml(html);
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML passa por sanitizeComentarioHtml (DOMPurify).
    <div className={cn(COMENTARIO_HTML_CLASS, className)} dangerouslySetInnerHTML={{ __html: safe }} />
  );
}
