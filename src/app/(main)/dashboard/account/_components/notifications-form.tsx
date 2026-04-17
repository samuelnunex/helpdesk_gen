"use client";

import { useEffect, useState } from "react";

import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function NotificationsForm() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [sms, setSms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setEmail(data.user.notifEmail ?? true);
          setPush(data.user.notifPush ?? false);
          setSms(data.user.notifSms ?? false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const update = async (key: "email" | "push" | "sms", value: boolean) => {
    const payload =
      key === "email"
        ? { email: value, push, sms }
        : key === "push"
          ? { email, push: value, sms }
          : { email, push, sms: value };
    try {
      const res = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Erro ao salvar.");
        return;
      }
      if (key === "email") setEmail(value);
      if (key === "push") setPush(value);
      if (key === "sms") setSms(value);
      toast.success("Preferências salvas.");
    } catch {
      toast.error("Erro ao conectar.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Notificações
        </CardTitle>
        <CardDescription>Escolha como deseja receber notificações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-email">E-mail</Label>
              <Switch id="notif-email" checked={email} onCheckedChange={(v) => update("email", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-push">Push</Label>
              <Switch id="notif-push" checked={push} onCheckedChange={(v) => update("push", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-sms">SMS</Label>
              <Switch id="notif-sms" checked={sms} onCheckedChange={(v) => update("sms", v)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
