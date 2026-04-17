/**
 * Código puro para tamanho da logo. Pode ser importado em Client Components
 * (não depende de db ou Node).
 */

export type LogoSizeValue = "small" | "medium" | "large";

export const LOGO_SIZE_OPTIONS: { value: LogoSizeValue; label: string }[] = [
  { value: "small", label: "Pequeno (24px)" },
  { value: "medium", label: "Médio (32px)" },
  { value: "large", label: "Grande (60px)" },
];

const LOGO_SIZE_CLASSES: Record<
  LogoSizeValue,
  { container: string; img: string; icon: string; authMaxWidth: string }
> = {
  small: { container: "h-6", img: "h-6 max-h-6", icon: "size-5", authMaxWidth: "max-w-[80px]" },
  medium: { container: "h-8", img: "h-8 max-h-8", icon: "size-6", authMaxWidth: "max-w-[120px]" },
  large: { container: "h-12", img: "h-12 max-h-12", icon: "size-10", authMaxWidth: "max-w-[200px]" },
};

export function getLogoSizeClasses(size: LogoSizeValue) {
  return LOGO_SIZE_CLASSES[size] ?? LOGO_SIZE_CLASSES.medium;
}
