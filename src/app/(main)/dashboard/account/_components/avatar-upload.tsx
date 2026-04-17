"use client";

import { useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

type Props = {
  displayName: string;
  fotoPerfil: string | null;
};

export function AvatarUpload({ displayName, fotoPerfil }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao enviar foto.");
        return;
      }
      toast.success("Foto atualizada.");
      router.refresh();
    } catch {
      toast.error("Erro ao conectar.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao remover foto.");
        return;
      }
      toast.success("Foto removida.");
      router.refresh();
    } catch {
      toast.error("Erro ao conectar.");
    } finally {
      setUploading(false);
    }
  };

  const avatarSrc = fotoPerfil ?? undefined;

  const avatarEl = (
    <Avatar className="size-20 rounded-xl" key={fotoPerfil ?? "no-photo"}>
      <AvatarImage
        src={avatarSrc}
        alt={displayName}
        referrerPolicy="no-referrer"
        className="object-cover"
      />
      <AvatarFallback className="rounded-xl text-2xl">{getInitials(displayName)}</AvatarFallback>
    </Avatar>
  );

  return (
    <div className="relative inline-block">
      {fotoPerfil ? (
        <Link href={fotoPerfil} target="_blank" rel="noopener noreferrer" className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          {avatarEl}
        </Link>
      ) : (
        avatarEl
      )}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 right-0 flex gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          size="icon"
          className="size-8 rounded-lg"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Alterar foto"
        >
          <Camera className="size-4" />
        </Button>
        {fotoPerfil && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-8 rounded-lg"
            onClick={removePhoto}
            disabled={uploading}
            aria-label="Remover foto"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
