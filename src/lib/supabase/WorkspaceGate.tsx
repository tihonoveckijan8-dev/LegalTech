import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { App } from "../../app/App";
import { supabase } from "./client";
import "./WorkspaceGate.css";

type Organization = {
  id: string;
  name: string;
  country_code: string;
  default_currency: string;
};

type Membership = {
  organization_id: string;
  role: string;
};

export function WorkspaceGate({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);

  const loadOrganizations = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("organization_id, role")
        .eq("user_id", session.user.id)
        .eq("status", "active");
      if (membershipError) throw membershipError;

      const activeMemberships = (memberships ?? []) as Membership[];
      if (activeMemberships.length === 0) {
        setOrganizations([]);
        setSelectedId("");
        return;
      }

      const ids = activeMemberships.map((membership) => membership.organization_id);
      const { data, error: organizationsError } = await supabase
        .from("organizations")
        .select("id, name, country_code, default_currency")
        .in("id", ids)
        .order("name");
      if (organizationsError) throw organizationsError;

      const nextOrganizations = (data ?? []) as Organization[];
      setOrganizations(nextOrganizations);
      setSelectedId((current) =>
        nextOrganizations.some((organization) => organization.id === current)
          ? current
          : nextOrganizations.length === 1
            ? nextOrganizations[0].id
            : ""
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить рабочие пространства.");
    } finally {
      setLoading(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const name = organizationName.trim();
    if (name.length < 2 || name.length > 180) {
      setError("Название должно содержать от 2 до 180 символов.");
      return;
    }

    setCreating(true);
    setError("");
    setNotice("");
    try {
      const { data, error: createError } = await supabase.rpc("create_organization", {
        organization_name: name,
        organization_country_code: "BY",
        organization_currency: "BYN"
      });
      if (createError) throw createError;
      const newId = String(data);
      await loadOrganizations();
      setSelectedId(newId);
      setOrganizationName("");
      setNotice("Рабочее пространство создано. Оно сохранено в базе данных.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать рабочее пространство.");
    } finally {
      setCreating(false);
    }
  }

  const selectedOrganization = organizations.find((organization) => organization.id === selectedId);

  if (activeOrganization) return <App organizationId={activeOrganization.id} organizationName={activeOrganization.name} currency={activeOrganization.default_currency} />;

  return (
    <main className="workspace-screen">
      <header className="workspace-topbar">
        <a className="workspace-brand" href="./" aria-label="LegalFlow">
          <span className="workspace-brand-mark">L</span>
          <span>legal<span>flow</span></span>
        </a>
        <div className="workspace-account">
          <span>{session.user.email}</span>
          <button type="button" onClick={onSignOut}>Выйти</button>
        </div>
      </header>

      <section className="workspace-content">
        <div className="workspace-kicker">LEGALFLOW / РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <h1>Начнём с вашей организации</h1>
        <p className="workspace-lead">
          Договоры, согласования и документы будут храниться внутри выбранной организации.
          Доступ к данным ограничивается участием в рабочем пространстве.
        </p>

        {loading ? (
          <div className="workspace-loading"><span className="workspace-spinner" />Загружаем ваши организации…</div>
        ) : organizations.length > 0 ? (
          <section className="workspace-panel" aria-labelledby="workspace-list-title">
            <div className="workspace-panel-heading">
              <div><span className="workspace-kicker">ВАШИ ДОСТУПЫ</span><h2 id="workspace-list-title">Выберите организацию</h2></div>
              <span className="workspace-count">{organizations.length}</span>
            </div>
            <div className="workspace-list">
              {organizations.map((organization) => (
                <button
                  className={`workspace-option ${selectedId === organization.id ? "is-selected" : ""}`}
                  key={organization.id}
                  type="button"
                  onClick={() => { setSelectedId(organization.id); setNotice(""); }}
                >
                  <span className="workspace-option-mark">{organization.name.slice(0, 1).toUpperCase()}</span>
                  <span className="workspace-option-copy"><strong>{organization.name}</strong><small>{organization.country_code} · {organization.default_currency}</small></span>
                  <span className="workspace-option-check" aria-hidden="true">{selectedId === organization.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            {selectedOrganization && (
              <div className="workspace-selected-note" role="status">
                Выбрано: <strong>{selectedOrganization.name}</strong>. Данные будут загружаться из защищённой базы этой организации.
              </div>
              <button className="workspace-primary" type="button" onClick={() => setActiveOrganization(selectedOrganization)}>Открыть рабочее пространство</button>
              <button className="workspace-primary" type="button" onClick={() => setActiveOrganization(selectedOrganization)}>Открыть рабочее пространство</button>
            )}
          </section>
        ) : (
          <section className="workspace-panel workspace-create-panel">
            <div className="workspace-panel-heading">
              <div><span className="workspace-kicker">ПЕРВЫЙ ШАГ</span><h2>Создать организацию</h2></div>
              <span className="workspace-count">01</span>
            </div>
            <p className="workspace-panel-copy">Создайте рабочее пространство вашей компании. Вы автоматически получите роль владельца.</p>
            <form className="workspace-create-form" onSubmit={createOrganization}>
              <label htmlFor="organization-name">Название организации</label>
              <input
                id="organization-name"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                minLength={2}
                maxLength={180}
                placeholder="Например, ООО «Вектор»"
                required
              />
              <button className="workspace-primary" type="submit" disabled={creating || organizationName.trim().length < 2}>
                {creating ? "Создаём…" : "Создать рабочее пространство"}
              </button>
            </form>
          </section>
        )}

        {error && <div className="workspace-feedback is-error" role="alert">{error}</div>}
        {notice && <div className="workspace-feedback is-success" role="status">{notice}</div>}
        <div className="workspace-footnote"><span />Данные организаций изолированы на уровне базы данных с помощью Row Level Security.</div>
      </section>
      <footer className="workspace-footer">LEGALFLOW · ДОГОВОРНОЙ ЦИКЛ ПОД КОНТРОЛЕМ</footer>
    </main>
  );
}
