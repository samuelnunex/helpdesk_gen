"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Schema = z.object({
  name: z.string().max(200).optional(),
  username: z
    .string()
    .min(2, "Mínimo 2 caracteres.")
    .max(50)
    .regex(/^[a-zA-Z0-9_]*$/, "Apenas letras, números e _.")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof Schema>;

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: { name: string | null; username: string | null; bio: string | null };
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: defaultValues.name ?? "",
      username: defaultValues.username ?? "",
      bio: defaultValues.bio ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name || null,
          username: data.username ? data.username : null,
          bio: data.bio || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("Perfil atualizado.");
    } catch {
      toast.error("Erro ao conectar.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input placeholder="Seu nome" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="usuario" {...field} />
              </FormControl>
              <p className="text-muted-foreground text-xs">Exibido como @{field.value || "usuario"}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio / descrição curta</FormLabel>
              <FormControl>
                <Textarea placeholder="Uma frase sobre você..." className="min-h-20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Salvar perfil
        </Button>
      </form>
    </Form>
  );
}
