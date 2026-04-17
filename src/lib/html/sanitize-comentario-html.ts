import DOMPurify from "isomorphic-dompurify";

const PURIFY = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "h2",
    "h3",
    "pre",
    "code",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
};

/** HTML seguro para armazenar e exibir comentários (sem scripts, iframes, etc.). */
export function sanitizeComentarioHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? "", PURIFY);
}

/** Comprimento aproximado do texto visível (para limites de API). */
export function plainTextLengthComentario(html: string): number {
  const safe = sanitizeComentarioHtml(html);
  return safe
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}
