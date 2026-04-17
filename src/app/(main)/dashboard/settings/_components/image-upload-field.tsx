"use client";

import { useRef, useState } from "react";

import { Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type UploadKind =
  | "auth_hero"
  | "logo_sidebar"
  | "logo_sidebar_dark"
  | "logo_sidebar_icon"
  | "logo_sidebar_icon_dark"
  | "logo_auth"
  | "logo_auth_dark";

type Props = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  kind: UploadKind;
  aspectRatio?: "wide" | "square";
  compact?: boolean;
};

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  kind,
  aspectRatio = "square",
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch("/api/settings/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao enviar imagem.");
        return;
      }
      toast.success("Imagem enviada.");
      onChange(data.url);
    } catch {
      toast.error("Erro ao conectar.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const key =
        kind === "auth_hero"
          ? "auth_hero_image"
          : kind === "logo_sidebar"
            ? "logo_sidebar_url"
            : kind === "logo_sidebar_dark"
              ? "logo_sidebar_url_dark"
              : kind === "logo_sidebar_icon"
                ? "logo_sidebar_icon_url"
                : kind === "logo_sidebar_icon_dark"
                  ? "logo_sidebar_icon_url_dark"
                  : kind === "logo_auth"
                    ? "logo_auth_url"
                    : "logo_auth_url_dark";
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao remover.");
        return;
      }
      const newVal = json[key] ?? "";
      onChange(newVal ?? "");
      toast.success("Imagem removida.");
    } catch {
      toast.error("Erro ao conectar.");
    } finally {
      setRemoving(false);
    }
  };

  const isLoading = uploading || removing;
  const hasValue = !!value?.trim();
  const previewUrl = hasValue ? (value.startsWith("http") ? value : undefined) : undefined;
  const previewPath = hasValue && !value.startsWith("http") ? value : undefined;

  const previewSize = compact
    ? "size-14 rounded-md"
    : aspectRatio === "wide"
      ? "h-24 w-40 rounded-lg"
      : "size-24 rounded-lg";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="text-sm font-medium leading-none">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`relative shrink-0 overflow-hidden border bg-muted ${previewSize}`}
        >
          {hasValue ? (
            <>
              {(previewUrl || previewPath) && (
                <img
                  src={previewPath ? previewPath : previewUrl}
                  alt=""
                  className="size-full object-cover"
                />
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className={compact ? "size-6" : "size-8"} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
          >
            {uploading ? "Enviando…" : "Escolher arquivo"}
          </Button>
          {hasValue && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isLoading}
              aria-label="Remover imagem"
            >
              <X className="size-4" />
              Remover
            </Button>
          )}
        </div>
      </div>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}
