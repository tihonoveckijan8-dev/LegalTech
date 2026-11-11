import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { isSupabaseConfigured, supabase } from "../lib/supabase/client";

const navigation = [
  { id: "overview", label: "Обзор", icon: "overview", group: "Работа" },
  { id: "contracts", label: "Договоры", icon: "contracts", group: "Работа" },
  { id: "approvals", label: "Согласования", icon: "approvals", group: "Работа" },
  { id: "tasks", label: "Задачи и сроки", icon: "tasks", group: "Работа" },
  { id: "counterparties", label: "Контрагенты", icon: "counterparties", group: "Компания" },
  { id: "team", label: "Участники", icon: "team", group: "Компания" },
  { id: "settings", label: "Настройки", icon: "settings", group: "Компания" }
] as const;
type PageId = (typeof navigation)[number]["id"];
type ContractStatus = "Черновик" | "На согласовании" | "Подписан" | "Отклонён" | "В архиве";
type Contract = { id: string; title: string; counterparty: string; amount: string; amountValue: string; contractNumber: string; effectiveDate: string; expirationDate: string; description: string; status: ContractStatus; updated: string };
type ContractForm = { title: string; counterparty: string; amount: string; contractNumber: string; effectiveDate: string; expirationDate: string; description: string };

const pageContent: Record<PageId, { title: string; description: string; icon: IconName }> = {
  overview: { title: "Обзор договоров", description: "Состояние договорной работы в одном рабочем пространстве.", icon: "overview" },
  contracts: { title: "Договоры", description: "Единый реестр договоров, редакций и ответственных.", icon: "contracts" },
  approvals: { title: "Согласования", description: "Маршруты проверки и решения участников.", icon: "approvals" },
  tasks: { title: "Задачи и сроки", description: "Обязательства, контрольные даты и ближайшие действия.", icon: "tasks" },
  counterparties: { title: "Контрагенты", description: "Компании и контакты, с которыми работает организация.", icon: "counterparties" },
  team: { title: "Участники", description: "Команда, роли и доступ к рабочему пространству.", icon: "team" },
  settings: { title: "Настройки", description: "Параметры организации и правила договорных процессов.", icon: "settings" }
};

function Sidebar({ activePage, onNavigate, organizationName }: { activePage: PageId; onNavigate: (page: PageId) => void; organizationName: string }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark" aria-hidden="true">L</div><span>legal<span className="brand-accent">flow</span></span></div>
    <div className="workspace-card"><div className="workspace-avatar">LF</div><div className="workspace-copy"><strong>{organizationName}</strong><span>Подключённая организация</span></div><span className="workspace-menu" aria-hidden="true">···</span></div>
    <nav className="sidebar-nav" aria-label="Основная навигация">
      {(["Работа", "Компания"] as const).map(group => <div className="nav-group" key={group}>
        <p className="nav-group-label">{group}</p>
        {navigation.filter(item => item.group === group).map(item => <button className={`nav-item ${activePage === item.id ? "is-active" : ""}`} type="button" key={item.id} onClick={() => onNavigate(item.id)} aria-current={activePage === item.id ? "page" : undefined}><Icon name={item.icon} size={18}/><span>{item.label}</span>{item.id === "approvals" && <span className="nav-indicator"/>}</button>)}
      </div>)}
    </nav>
    <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot"/><span>Серверное хранилище</span></div><div className="sidebar-version">LEGALFLOW · MVP</div></div>
  </aside>;
}

function MetricCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: IconName }) {
  return <article className="metric-card"><div className="metric-topline"><span>{label}</span><span className="metric-icon"><Icon name={icon} size={17}/></span></div><div className="metric-value">{value}</div><p>{hint}</p></article>;
}

function ContractRegister({ contracts, onCreate, onUpdate, loading, error, currency }: { contracts: Contract[]; onCreate: (contract: ContractForm) => Promise<void>; onUpdate: (id: string, contract: ContractForm) => Promise<void>; loading: boolean; error: string; currency: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Все статусы");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => contracts.filter(contract => {
    const matchesQuery = `${contract.title} ${contract.counterparty}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru"));
    return matchesQuery && (filter === "Все статусы" || contract.status === filter);
  }), [contracts, query, filter]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const counterparty = String(form.get("counterparty") || "").trim();
    const amount = String(form.get("amount") || "").trim();
    const contractNumber = String(form.get("contractNumber") || "").trim();
    const effectiveDate = String(form.get("effectiveDate") || "");
    const expirationDate = String(form.get("expirationDate") || "");
    const description = String(form.get("description") || "").trim();
    if (title.length < 2 || title.length > 240 || !counterparty || counterparty.length > 240) {
      setSubmitError("Название должно содержать 2–240 символов, а контрагент — не более 240 символов.");
      return;
    }
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      setSubmitError("Укажите корректную неотрицательную сумму.");
      return;
    }
    if (effectiveDate && expirationDate && expirationDate < effectiveDate) {
      setSubmitError("Дата окончания не может быть раньше даты начала.");
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const payload = { title, counterparty, amount, contractNumber, effectiveDate, expirationDate, description };
      if (editingContract) await onUpdate(editingContract.id, payload);
      else await onCreate(payload);
      setModalOpen(false);
      setEditingContract(null);
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Не удалось сохранить договор.");
    } finally { setSaving(false); }
  }

  return <section className="register-section">
    <div className="register-toolbar">
      <label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по договору или контрагенту" aria-label="Поиск договоров"/></label>
      <select className="filter-select" value={filter} onChange={event => setFilter(event.target.value)} aria-label="Фильтр по статусу"><option>Все статусы</option><option>Черновик</option><option>На согласовании</option><option>Подписан</option></select>
      <button className="primary-button" type="button" onClick={() => { setEditingContract(null); setSubmitError(""); setModalOpen(true); }}><Icon name="plus" size={17}/>Новый договор</button>
    </div>
    <div className="table-card">
      <div className="table-heading"><div><h2>Реестр договоров</h2><p>{loading ? "Загружаем из базы…" : `${filtered.length} ${filtered.length === 1 ? "договор" : "договоров"}`}</p></div><span className="subtle-tag">Текущий список</span></div>
      {error && <div className="register-error" role="alert">{error}</div>}{loading ? <div className="register-empty"><p>Получаем договоры из базы данных…</p></div> : filtered.length ? <div className="table-scroll"><table className="contracts-table"><thead><tr><th>Название</th><th>Контрагент</th><th>Сумма</th><th>Статус</th><th>Изменён</th><th></th></tr></thead><tbody>{filtered.map(contract => <tr key={contract.id}><td><strong>{contract.title}</strong><small>{contract.contractNumber ? `№ ${contract.contractNumber}` : `ID ${contract.id.slice(-6)}`}</small></td><td>{contract.counterparty}</td><td>{contract.amount}</td><td><span className={`status-badge ${contract.status === "Подписан" ? "is-signed" : contract.status === "На согласовании" ? "is-review" : "is-draft"}`}>{contract.status}</span></td><td>{contract.updated}</td><td><button className="text-button" type="button" onClick={() => { setEditingContract(contract); setSubmitError(""); setModalOpen(true); }}>Изменить</button></td></tr>)}</tbody></table></div> : <div className="register-empty"><div className="empty-state-icon"><Icon name="file" size={23}/></div><h3>{query || filter !== "Все статусы" ? "Ничего не найдено" : "Добавьте первый договор"}</h3><p>{query || filter !== "Все статусы" ? "Измените поисковый запрос или фильтр." : "Создайте карточку, чтобы начать вести реестр договоров."}</p>{!query && filter === "Все статусы" && <button className="secondary-button" type="button" onClick={() => setModalOpen(true)}><Icon name="plus" size={16}/>Создать договор</button>}</div>}
    </div>
    {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) { setModalOpen(false); setEditingContract(null); } }}><section className="contract-modal" role="dialog" aria-modal="true" aria-labelledby="contract-modal-title"><div className="modal-heading"><div><span className="page-eyebrow">РЕЕСТР ДОГОВОРОВ</span><h2 id="contract-modal-title">{editingContract ? "Изменить договор" : "Новый договор"}</h2></div><button className="modal-close" type="button" onClick={() => { setModalOpen(false); setEditingContract(null); }} aria-label="Закрыть">×</button></div><form onSubmit={submit}><label>Название договора<input name="title" required minLength={2} maxLength={240} autoFocus defaultValue={editingContract?.title ?? ""} placeholder="Например, Договор оказания услуг"/></label><label>Контрагент<input name="counterparty" required maxLength={240} defaultValue={editingContract?.counterparty === "—" ? "" : editingContract?.counterparty ?? ""} placeholder="Название компании"/></label><label>Номер договора<input name="contractNumber" maxLength={100} defaultValue={editingContract?.contractNumber ?? ""} placeholder="Например, 15/2026"/></label><label>Сумма ({currency})<input name="amount" type="number" min="0" step="0.01" defaultValue={editingContract?.amountValue ?? ""} placeholder="Например, 250000"/></label><div className="contract-date-grid"><label>Дата начала<input name="effectiveDate" type="date" defaultValue={editingContract?.effectiveDate ?? ""}/></label><label>Дата окончания<input name="expirationDate" type="date" defaultValue={editingContract?.expirationDate ?? ""}/></label></div><label>Описание<textarea name="description" rows={3} maxLength={5000} defaultValue={editingContract?.description ?? ""} placeholder="Предмет договора, важные условия…"/></label>{(submitError || error) && <div className="register-error" role="alert">{submitError || error}</div>}<div className="modal-note"><Icon name="shield" size={16}/>{editingContract ? "Изменения сохраняются в выбранной организации. Статус согласования меняется отдельно." : "Карточка будет сохранена в базе выбранной организации и защищена правилами доступа."}</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => { setModalOpen(false); setEditingContract(null); }} disabled={saving}>Отмена</button><button className="primary-button" type="submit" disabled={saving || loading}>{saving ? "Сохраняем…" : editingContract ? "Сохранить изменения" : "Создать договор"}</button></div></form></section></div>}
  </section>;
}

function Overview({ contracts, onNavigate }: { contracts: Contract[]; onNavigate: (page: PageId) => void }) {
  const reviewCount = contracts.filter(item => item.status === "На согласовании").length;
  return <>
    <section className="system-banner"><div className="banner-icon"><Icon name="shield" size={19}/></div><div className="banner-copy"><div className="banner-title-row"><strong>{isSupabaseConfigured ? "Подключённая база данных организации" : "Демонстрационный режим"}</strong><span className="connection-pill"><span className="status-dot"/>Серверное хранение</span></div><p>Договоры загружаются из PostgreSQL. Доступ ограничен активным участием в выбранной организации.</p></div></section>
    <section className="metrics-grid"><MetricCard label="Всего договоров" value={String(contracts.length)} hint="В организации" icon="contracts"/><MetricCard label="На согласовании" value={String(reviewCount)} hint="Ожидают решения" icon="approvals"/><MetricCard label="Ближайшие сроки" value="—" hint="Появятся после настройки дат" icon="calendar"/><MetricCard label="Мои задачи" value="—" hint="Назначение задач — следующий этап" icon="clock"/></section>
    <section className="content-grid"><article className="surface-card contracts-card"><div className="surface-header"><div><h2>Договорная работа</h2><p>Последние карточки в реестре</p></div><button className="text-button" type="button" onClick={() => onNavigate("contracts")}>Открыть реестр →</button></div>{contracts.length ? <div className="recent-list">{contracts.slice(0,4).map(item => <div className="recent-row" key={item.id}><span className="recent-file"><Icon name="file" size={17}/></span><span className="recent-copy"><strong>{item.title}</strong><small>{item.counterparty}</small></span><span className="status-badge is-draft">{item.status}</span></div>)}</div> : <div className="empty-state"><div className="empty-state-icon"><Icon name="file" size={23}/></div><h3>Реестр пока пуст</h3><p>Создайте первую карточку договора — она сохранится в базе организации.</p><button className="secondary-button" type="button" onClick={() => onNavigate("contracts")}>Перейти к договорам</button></div>}</article><article className="surface-card tasks-card"><div className="surface-header"><div><h2>Следующие этапы</h2><p>Что появится в рабочем процессе</p></div><Icon name="calendar" size={18}/></div><div className="milestone-list"><div><span>01</span><section><strong>Авторизация и организация</strong><p>Защищённый вход и рабочее пространство компании.</p></section></div><div><span>02</span><section><strong>Документы и версии</strong><p>Приватное хранилище и история изменений.</p></section></div><div><span>03</span><section><strong>Согласования</strong><p>Маршруты, решения и журнал действий.</p></section></div></div></article></section>
  </>;
}

function Placeholder({ page }: { page: PageId }) { const item = pageContent[page]; return <section className="surface-card module-placeholder"><div className="empty-state-icon"><Icon name={item.icon} size={23}/></div><span className="module-kicker">СЛЕДУЮЩИЙ ЭТАП MVP</span><h2>{item.title}</h2><p>{item.description}</p><div className="module-divider"/><p className="module-footnote">Этот раздел подключим к реальным данным после настройки авторизации, организации и безопасного доступа.</p></section>; }

export function App({ organizationId, organizationName, currency = "BYN" }: { organizationId: string; organizationName: string; currency?: string }) {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [contractError, setContractError] = useState("");
  const currentPage = pageContent[activePage];
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const loadContracts = useCallback(async () => {
    if (!supabase) { setContractError("Supabase не настроен. Нельзя загрузить реальные договоры."); setLoadingContracts(false); return; }
    setLoadingContracts(true);
    setContractError("");
    try {
      const { data: rows, error: queryError } = await supabase
        .from("contracts")
        .select("id, title, contract_number, status, amount, currency, updated_at, counterparty_id, effective_date, expiration_date, description")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false });
      if (queryError) throw queryError;
      const counterpartyIds = [...new Set((rows ?? []).map(row => row.counterparty_id).filter((id): id is string => Boolean(id)))];
      let counterpartyNames = new Map<string, string>();
      if (counterpartyIds.length) {
        const { data: counterparties, error: counterpartiesError } = await supabase
          .from("counterparties").select("id, name").eq("organization_id", organizationId).in("id", counterpartyIds);
        if (counterpartiesError) throw counterpartiesError;
        counterpartyNames = new Map((counterparties ?? []).map(item => [item.id, item.name]));
      }
      const statusLabels: Record<string, ContractStatus> = {
        draft: "Черновик", legal_review: "На согласовании", manager_revision: "На согласовании",
        accounting_review: "На согласовании", director_approval: "На согласовании",
        approved: "На согласовании", signed: "Подписан", rejected: "Отклонён", archived: "В архиве"
      };
      setContracts((rows ?? []).map(row => ({
        id: row.id,
        title: row.title,
        counterparty: row.counterparty_id ? counterpartyNames.get(row.counterparty_id) ?? "Контрагент" : "—",
        amount: row.amount == null ? "—" : `${Number(row.amount).toLocaleString("ru-RU")} ${row.currency}`,
        amountValue: row.amount == null ? "" : String(row.amount),
        contractNumber: row.contract_number ?? "",
        effectiveDate: row.effective_date ?? "",
        expirationDate: row.expiration_date ?? "",
        description: row.description ?? "",
        status: statusLabels[row.status] ?? "Черновик",
        updated: new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(row.updated_at))
      })));
    } catch (caught) {
      setContractError(caught instanceof Error ? caught.message : "Не удалось загрузить договоры.");
    } finally { setLoadingContracts(false); }
  }, [organizationId]);

  useEffect(() => { void loadContracts(); }, [loadContracts]);

  async function resolveCounterpartyId(name: string, userId: string) {
    if (!supabase) throw new Error("Supabase не настроен.");
    const { data: existing, error: lookupError } = await supabase
      .from("counterparties").select("id").eq("organization_id", organizationId)
      .ilike("name", name).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) return existing.id;
    const { data: created, error: createError } = await supabase
      .from("counterparties")
      .insert({ organization_id: organizationId, name, created_by: userId })
      .select("id").single();
    if (createError) throw createError;
    return created.id;
  }

  async function addContract(input: ContractForm) {
    if (!supabase) throw new Error("Supabase не настроен.");
    setContractError("");
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) throw userError ?? new Error("Сессия истекла. Войдите снова.");

    const counterpartyId = await resolveCounterpartyId(input.counterparty, userResult.user.id);
    const amount = input.amount.trim() ? Number(input.amount) : null;
    const { error: insertError } = await supabase.from("contracts").insert({
      organization_id: organizationId,
      title: input.title,
      contract_type: "other",
      counterparty_id: counterpartyId,
      contract_number: input.contractNumber || null,
      amount,
      currency,
      effective_date: input.effectiveDate || null,
      expiration_date: input.expirationDate || null,
      description: input.description || null,
      status: "draft",
      owner_user_id: userResult.user.id,
      created_by: userResult.user.id
    });
    if (insertError) throw insertError;
    await loadContracts();
  }

  async function updateContract(id: string, input: ContractForm) {
    if (!supabase) throw new Error("Supabase не настроен.");
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) throw userError ?? new Error("Сессия истекла. Войдите снова.");
    const counterpartyId = await resolveCounterpartyId(input.counterparty, userResult.user.id);
    const amount = input.amount.trim() ? Number(input.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error("Укажите корректную неотрицательную сумму.");

    // WHY: organization_id is included even with RLS, so every write is explicitly scoped to this workspace.
    const { error: updateError } = await supabase.from("contracts").update({
      title: input.title,
      counterparty_id: counterpartyId,
      contract_number: input.contractNumber || null,
      amount,
      currency,
      effective_date: input.effectiveDate || null,
      expiration_date: input.expirationDate || null,
      description: input.description || null
    }).eq("id", id).eq("organization_id", organizationId);
    if (updateError) throw updateError;
    await loadContracts();
  }
  return <div className="app-layout"><Sidebar activePage={activePage} onNavigate={setActivePage} organizationName={organizationName}/><main className="main-area"><header className="topbar"><div className="topbar-context"><span className="topbar-overline">LEGALFLOW / WORKSPACE</span><span className="topbar-date">{dateLabel}</span></div><div className="topbar-actions"><span className="topbar-environment">LIVE DATA</span><div className="profile-chip" aria-label="Профиль LegalFlow">LF</div></div></header><div className="page-content"><section className="page-heading"><div><span className="page-eyebrow">{activePage === "overview" ? "ГЛАВНАЯ" : "РАБОЧЕЕ ПРОСТРАНСТВО"}</span><h1>{currentPage.title}</h1><p>{currentPage.description}</p></div>{activePage === "contracts" && <button className="primary-button" type="button" onClick={() => document.querySelector<HTMLButtonElement>(".register-toolbar .primary-button")?.click()}><Icon name="plus" size={17}/>Новый договор</button>}</section>{activePage === "overview" ? <Overview contracts={contracts} onNavigate={setActivePage}/> : activePage === "contracts" ? <ContractRegister contracts={contracts} onCreate={addContract} onUpdate={updateContract} loading={loadingContracts} error={contractError} currency={currency}/> : <Placeholder page={activePage}/>}</div></main></div>;
}
