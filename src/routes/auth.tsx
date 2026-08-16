import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no LeadHunter — Prospecção de empresas locais" },
      {
        name: "description",
        content:
          "Acesse sua conta LeadHunter para gerenciar leads de empresas locais com potencial para landing pages.",
      },
      { property: "og:title", content: "Entrar no LeadHunter" },
      {
        property: "og:description",
        content: "Acesse sua conta e gerencie seus leads de prospecção local.",
      },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  async function handleSubmit(mode: "signIn" | "signUp") {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        await router.navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu e-mail para confirmar o acesso.");
      }
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      return;
    }
    if (result.redirected) return;
    await router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand">
            <Radar className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-xl font-semibold">LeadHunter</span>
        </Link>

        <Card className="shadow-raised">
          <CardHeader>
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Gerencie seus leads de empresas locais em um só lugar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signIn">
              <TabsList className="w-full">
                <TabsTrigger value="signIn" className="flex-1">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signUp" className="flex-1">
                  Criar conta
                </TabsTrigger>
              </TabsList>

              {(["signIn", "signUp"] as const).map((mode) => (
                <TabsContent key={mode} value={mode} className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-email`}>E-mail</Label>
                    <Input
                      id={`${mode}-email`}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="voce@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${mode}-password`}>Senha</Label>
                    <Input
                      id={`${mode}-password`}
                      type="password"
                      autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => void handleSubmit(mode)}
                  >
                    {mode === "signIn" ? "Entrar" : "Criar conta"}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">ou</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => void handleGoogle()}
            >
              Continuar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
