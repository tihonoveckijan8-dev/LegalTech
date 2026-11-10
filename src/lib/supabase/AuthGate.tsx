import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { App } from "../../app/App";
import { isSupabaseConfigured, supabase } from "./client";
import "./AuthGate.css";

type Mode = "signin" | "signup" | "reset";

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Keep the existing preview usable until a dedicated Supabase project is configured.
  if (!isSupabaseConfigured || !supabase) return <App />;

  const client = supabase;

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setChecking(false);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setChecking(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [client]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "signin") {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (authError) throw authError;
        if (!data.session) setMessage("Проверьте почту и подтвердите адрес. После подтверждения вернитесь сюда и войдите.");
      } else {
        const { error: authError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname
        });
        if (authError) throw authError;
        setMessage("Если аккаунт с таким адресом существует, мы отправили письмо для сброса пароля.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить запрос. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <main className="auth-screen"><div className="auth-loading"><span className="auth-spinner"/>Проверяем защищённую сессию…</div></main>;

  if (session) return <><div className="session-toolbar"><span>{session.user.email}</span><button type="button" onClick={() => client.auth.signOut()}>Выйти</button></div><App /></>;

  const title = mode === "signin" ? "С возвращением" : mode === "signup" ? "Создать аккаунт" : "Восстановить пароль";
  const subtitle = mode === "signin" ? "Войдите, чтобы продолжить работу с договорами." : mode === "signup" ? "Создайте защищённый доступ к LegalFlow." : "Укажите рабочую почту — отправим ссылку для восстановления.";

  return <main className="auth-screen">
    <section className="auth-card">
      <a className="auth-brand" href="./" aria-label="LegalFlow"><span className="auth-brand-mark">L</span><span>legal<span>flow</span></span></a>
      <div className="auth-eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <h1>{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
      <form className="auth-form" onSubmit={submit}>
        <label>Рабочая почта<input name="email" type="email" autoComplete="email" placeholder="name@company.com" required/></label>
        {mode !== "reset" && <label>Пароль<input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} placeholder="Не менее 8 символов" required/></label>}
        {error && <div className="auth-message is-error" role="alert">{error}</div>}
        {message && <div className="auth-message is-success" role="status">{message}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Подождите…" : mode === "signin" ? "Войти" : mode === "signup" ? "Создать аккаунт" : "Отправить ссылку"}</button>
      </form>
      <div className="auth-links">
        {mode === "signin" && <><button type="button" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Забыли пароль?</button><span>Нет аккаунта? <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }}>Зарегистрироваться</button></span></>}
        {mode !== "signin" && <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>← Вернуться ко входу</button>}
      </div>
      <div className="auth-security"><span/>Соединение защищено Supabase Auth</div>
    </section>
    <footer className="auth-footer">LEGALFLOW · УПРАВЛЕНИЕ ДОГОВОРНЫМ ЦИКЛОМ</footer>
  </main>;
}
