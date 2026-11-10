import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { WorkspaceGate } from "./WorkspaceGate";
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

  const client = supabase;

  useEffect(() => {
    if (!client) { setChecking(false); return; }
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

  // WHY: never present in-memory demo records as a real authenticated workspace.
  // No unpersisted demo workspace is shown as if it were production data.
  if (!isSupabaseConfigured || !client) {
    return <main className="auth-screen"><section className="auth-card auth-setup-card"><a className="auth-brand" href="./" aria-label="LegalFlow"><span className="auth-brand-mark">L</span><span>legal<span>flow</span></span></a><div className="auth-eyebrow">ТРЕБУЕТСЯ НАСТРОЙКА</div><h1>Подключите рабочую базу</h1><p className="auth-subtitle">LegalFlow опубликован, но серверная база данных ещё не настроена. Чтобы включить регистрацию, вход и сохранение договоров, подключите отдельный Supabase-проект.</p><div className="auth-setup-steps"><div><strong>01</strong><span>Создайте отдельный Supabase project для LegalTech.</span></div><div><strong>02</strong><span>Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в GitHub Actions Variables.</span></div><div><strong>03</strong><span>Примените SQL-миграции по инструкции в docs/SUPABASE_SETUP.md.</span></div></div><p className="auth-setup-note">Не добавляйте service_role или secret key в настройки фронтенда.</p></section><footer className="auth-footer">LEGALFLOW · ЗАЩИЩЁННОЕ РАБОЧЕЕ ПРОСТРАНСТВО</footer></main>;
  }
  const authClient = client;

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
        const { error: authError } = await authClient.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      } else if (mode === "signup") {
        const { data, error: authError } = await authClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (authError) throw authError;
        if (!data.session) setMessage("Проверьте почту и подтвердите адрес. После подтверждения вернитесь сюда и войдите.");
      } else {
        const { error: authError } = await authClient.auth.resetPasswordForEmail(email, {
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

  if (session) return <WorkspaceGate session={session} onSignOut={() => { void authClient.auth.signOut(); }} />;

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
