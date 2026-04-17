"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { applyThemeMode } from "@/lib/preferences/theme-utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

const MODES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeSection() {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const onChange = (value: string) => {
    if (value !== "") {
      const mode = value as "light" | "dark" | "system";
      setThemeMode(mode);
      persistPreference("theme_mode", mode);
      applyThemeMode(mode);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tema</CardTitle>
        <CardDescription>Claro, escuro ou seguir o sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <Label className="sr-only">Modo do tema</Label>
        <ToggleGroup type="single" value={themeMode} onValueChange={onChange} className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <ToggleGroupItem key={m.value} value={m.value} aria-label={m.label}>
              <m.icon className="size-4" />
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}
