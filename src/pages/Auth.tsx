import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Database, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (err) {
          if ((err as { status?: number }).status === 422 || /already (registered|exists)/i.test(err.message)) {
            setError("An account with this email already exists — please sign in.");
          } else {
            setError(err.message);
          }
          return;
        }
        // Auto-confirm is on: a session means we are in.
        if (!data.session) {
          setError("Sign-up did not return a session. Please try signing in.");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(/invalid login credentials/i.test(err.message)
            ? "Incorrect email or password."
            : err.message);
          return;
        }
      }
      navigate("/dashboard", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <img src="/brand/veritas-mark.png" alt="Veritas Vector Garden" className="h-8 w-8 rounded-md object-cover" />
            <div>
              <div className="font-heading text-lg font-semibold text-foreground leading-tight">Veritas Vector Garden</div>
              <div className="text-[11px] tracking-widest text-accent uppercase">Knowledge Base + AI Chat</div>
            </div>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border border-border bg-card">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-heading text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in to your knowledge workspace, or create an account — no email verification needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md px-3 py-2" role="alert">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </Tabs>

            <p className="text-xs text-muted-foreground text-center mt-6">
              © 2026 Veritas Global AI
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
