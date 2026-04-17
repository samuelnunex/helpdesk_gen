"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutGrid, LogIn, PanelLeft, Tags, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppSettingsValues, ThemeDefaultValue } from "@/lib/settings/types";
import { LOGO_SIZE_OPTIONS } from "@/lib/settings/logo-size";

import { CategoriasSettings } from "./categorias-settings";
import { ImageUploadField } from "./image-upload-field";
import { UsersManagement } from "./users-management";

const Schema = z.object({
  auth_hero_image: z.string().max(2000),
  theme_default: z.enum(["light", "dark", "system"]),
  app_name: z.string().min(1, "Nome é obrigatório.").max(100),
  logo_size: z.enum(["small", "medium", "large"]),
  logo_sidebar_url: z.string().max(2000),
  logo_sidebar_url_dark: z.string().max(2000),
  logo_sidebar_icon_url: z.string().max(2000),
  logo_sidebar_icon_url_dark: z.string().max(2000),
  logo_auth_url: z.string().max(2000),
  logo_auth_url_dark: z.string().max(2000),
});

type FormValues = z.infer<typeof Schema>;

const THEME_OPTIONS: { value: ThemeDefaultValue; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

export function SettingsForm({ defaultValues }: { defaultValues: AppSettingsValues }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      auth_hero_image: defaultValues.auth_hero_image ?? "",
      theme_default: defaultValues.theme_default ?? "light",
      app_name: defaultValues.app_name ?? "",
      logo_size: defaultValues.logo_size ?? "medium",
      logo_sidebar_url: defaultValues.logo_sidebar_url ?? "",
      logo_sidebar_url_dark: defaultValues.logo_sidebar_url_dark ?? "",
      logo_sidebar_icon_url: defaultValues.logo_sidebar_icon_url ?? "",
      logo_sidebar_icon_url_dark: defaultValues.logo_sidebar_icon_url_dark ?? "",
      logo_auth_url: defaultValues.logo_auth_url ?? "",
      logo_auth_url_dark: defaultValues.logo_auth_url_dark ?? "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_hero_image: data.auth_hero_image,
          theme_default: data.theme_default,
          app_name: data.app_name,
          logo_size: data.logo_size,
          logo_sidebar_url: data.logo_sidebar_url,
          logo_sidebar_url_dark: data.logo_sidebar_url_dark,
          logo_sidebar_icon_url: data.logo_sidebar_icon_url,
          logo_sidebar_icon_url_dark: data.logo_sidebar_icon_url_dark,
          logo_auth_url: data.logo_auth_url,
          logo_auth_url_dark: data.logo_auth_url_dark,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("Salvo.");
      form.reset({
        auth_hero_image: json.auth_hero_image ?? "",
        theme_default: json.theme_default ?? "light",
        app_name: json.app_name ?? "",
        logo_size: json.logo_size ?? "medium",
        logo_sidebar_url: json.logo_sidebar_url ?? "",
        logo_sidebar_url_dark: json.logo_sidebar_url_dark ?? "",
        logo_sidebar_icon_url: json.logo_sidebar_icon_url ?? "",
        logo_sidebar_icon_url_dark: json.logo_sidebar_icon_url_dark ?? "",
        logo_auth_url: json.logo_auth_url ?? "",
        logo_auth_url_dark: json.logo_auth_url_dark ?? "",
      });
    } catch {
      toast.error("Erro ao conectar.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="mb-4 h-9 w-full justify-start gap-0 rounded-lg border bg-transparent p-0">
            <TabsTrigger value="geral" className="gap-2 rounded-md px-4 data-[state=active]:bg-muted">
              <LayoutGrid className="size-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="login" className="gap-2 rounded-md px-4 data-[state=active]:bg-muted">
              <LogIn className="size-4" />
              Login
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="gap-2 rounded-md px-4 data-[state=active]:bg-muted">
              <PanelLeft className="size-4" />
              Sidebar
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2 rounded-md px-4 data-[state=active]:bg-muted">
              <Tags className="size-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-2 rounded-md px-4 data-[state=active]:bg-muted">
              <Users className="size-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-0 space-y-4">
            <FormField
              control={form.control}
              name="app_name"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Nome do app</FormLabel>
                  <FormControl>
                    <Input placeholder="Studio Admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-6">
              <FormField
                control={form.control}
                name="theme_default"
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormLabel>Tema padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {THEME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo_size"
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormLabel>Tamanho das logos</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOGO_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="login" className="mt-0 space-y-6">
            <FormField
              control={form.control}
              name="auth_hero_image"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUploadField
                      label="Foto de fundo"
                      hint="Lado do formulário de login."
                      value={field.value}
                      onChange={field.onChange}
                      kind="auth_hero"
                      aspectRatio="wide"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logo_auth_url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUploadField
                        label="Logo (claro)"
                        value={field.value}
                        onChange={field.onChange}
                        kind="logo_auth"
                        compact
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo_auth_url_dark"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUploadField
                        label="Logo (escuro)"
                        value={field.value}
                        onChange={field.onChange}
                        kind="logo_auth_dark"
                        compact
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="sidebar" className="mt-0 space-y-6">
            <div>
              <p className="mb-3 text-muted-foreground text-sm">Quando a sidebar está aberta</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="logo_sidebar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Logo (claro)"
                          value={field.value}
                          onChange={field.onChange}
                          kind="logo_sidebar"
                          compact
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logo_sidebar_url_dark"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Logo (escuro)"
                          value={field.value}
                          onChange={field.onChange}
                          kind="logo_sidebar_dark"
                          compact
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div>
              <p className="mb-3 text-muted-foreground text-sm">Quando a sidebar está fechada (só ícone)</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="logo_sidebar_icon_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Ícone (claro)"
                          hint="Se vazio, usa a logo acima."
                          value={field.value}
                          onChange={field.onChange}
                          kind="logo_sidebar_icon"
                          compact
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logo_sidebar_icon_url_dark"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          label="Ícone (escuro)"
                          value={field.value}
                          onChange={field.onChange}
                          kind="logo_sidebar_icon_dark"
                          compact
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="categorias" className="mt-0">
            <CategoriasSettings />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-0">
            <UsersManagement />
          </TabsContent>
        </Tabs>

        <div className="mt-6 border-t pt-4">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
