import { useMemo, useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { isSupabaseConfigured } from "../lib/supabase/client";

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
type ContractStatus = "Черновик" | "На согласовании" | "Подписан";
type Contract = { id: string; title: string; counterparty: string; amount: string; status: ContractStatus; updated: string };

const pageContent: Record<PageId, { title: string; description: string; icon: IconName }> = {
  overview: { title: "Обзор договоров", description: "Состояние договорной работы в одном рабочем пространстве.", icon: "overview" },
  contracts: { title: "Договоры", description: "Единый реестр договоров, редакций и ответственных.", icon: "contracts" },
  approvals: { title: "Согласования", description: "Маршруты проверки и решения участников.", icon: "approvals" },
  tasks: { title: "Задачи и сроки", description: "Обязательства, контрольные даты и ближайшие действия.", icon: "tasks" },
  counterparties: { title: "Контрагенты", description: "Компании и контакты, с которыми работает организация.", icon: "counterparties" },
  team: { title: "Участники", description: "Команда, роли и доступ к рабочему пространству.", icon: "team" },
  settings: { title: "Настройки", description: "Параметры организации и правила договорных процессов.", icon: "settings" }
};

function Sidebar({ activePage, onNavigate }: { activePage: PageId; onNavigate: (page: PageId) => void }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark" aria-hidden="true">L</div><span>legal<span className="brand-accent">flow</span></span></div>
    <div className="workspace-card"><div className="workspace-avatar">LF</div><div className="workspace-copy"><strong>Рабочее пространство</strong><span>Демо-режим</span></div><span className="workspace-menu" aria-hidden="true">···</span></div>
    <nav className="sidebar-nav" aria-label="Основная навигация">
      {(["Работа", "Компания"] as const).map(group => <div className="nav-group" key={group}>
        <p className="nav-group-label">{group}</p>
        {navigation.filter(item => item.group === group).map(item => <button className={`nav-item ${activePage === item.id ? "is-active" : ""}`} type="button" key={item.id} onClick={() => onNavigate(item.id)} aria-current={activePage === item.id ? "page" : undefined}><Icon name={item.icon} size={18}/><span>{item.label}</span>{item.id === "approvals" && <span className="nav-indicator"/>}</button>)}
      </div>)}
    </nav>
    <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot"/><span>Локальный просмотр</span></div><div className="sidebar-version">LEGALFLOW · MVP</div></div>
  </aside>;
}

function MetricCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: IconName }) {
  return <article className="metric-card"><div className="metric-topline"><span>{label}</span><span className="metric-icon"><Icon name={icon} size={17}/></span></div><div className="metric-value">{value}</div><p>{hint}</p></article>;
}

function ContractRegister({ contracts, onCreate }: { contracts: Contract[]; onCreate: (contract: Omit<Contract, "id" | "updated">) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Все статусы");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => contracts.filter(contract => {
    const matchesQuery = `${contract.title} ${contract.counterparty}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru"));
    return matchesQuery && (filter === "Все статусы" || contract.status === filter);
  }), [contracts, query, filter]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const counterparty = String(form.get("counterparty") || "").trim();
    if (!title || !counterparty) return;
    onCreate({ title, counterparty, amount: String(form.get("amount") || "").trim() || "—", status: "Черновик" });
    setModalOpen(false);
  }

  return <section className="register-section">
    <div className="register-toolbar">
      <label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск по договору или контрагенту" aria-label="Поиск договоров"/></label>
      <select className="filter-select" value={filter} onChange={event => setFilter(event.target.value)} aria-label="Фильтр по статусу"><option>Все статусы</option><option>Черновик</option><option>На согласовании</option><option>Подписан</option></select>
      <button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Icon name="plus" size={17}/>Новый договор</button>
    </div>
    <div className="table-card">
      <div className="table-heading"><div><h2>Реестр договоров</h2><p>{filtered.length} {filtered.length === 1 ? "договор" : "договоров"}</p></div><span className="subtle-tag">Текущий список</span></div>
      {filtered.length ? <div className="table-scroll"><table className="contracts-table"><thead><tr><th>Название</th><th>Контрагент</th><th>Сумма</th><th>Статус</th><th>Изменён</th></tr></thead><tbody>{filtered.map(contract => <tr key={contract.id}><td><strong>{contract.title}</strong><small>№ {contract.id.slice(-6)}</small></td><td>{contract.counterparty}</td><td>{contract.amount}</td><td><span className={`status-badge ${contract.status === "Подписан" ? "is-signed" : contract.status === "На согласовании" ? "is-review" : "is-draft"}`}>{contract.status}</span></td><td>{contract.updated}</td></tr>)}</tbody></table></div> : <div className="register-empty"><div className="empty-state-icon"><Icon name="file" size={23}/></div><h3>{query || filter !== "Все статусы" ? "Ничего не найдено" : "Добавьте первый договор"}</h3><p>{query || filter !== "Все статусы" ? "Измените поисковый запрос или фильтр." : "Создайте карточку, чтобы начать вести реестр договоров."}</p>{!query && filter === "Все статусы" && <button className="secondary-button" type="button" onClick={() => setModalOpen(true)}><Icon name="plus" size={16}/>Создать договор</button>}</div>}
    </div>
    {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="contract-modal" role="dialog" aria-modal="true" aria-labelledby="new-contract-title"><div className="modal-heading"><div><span className="page-eyebrow">РЕЕСТР ДОГОВОРОВ</span><h2 id="new-contract-title">Новый договор</h2></div><button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Закрыть">×</button></div><form onSubmit={submit}><label>Название договора<input name="title" required autoFocus placeholder="Например, Договор оказания услуг"/></label><label>Контрагент<input name="counterparty" required placeholder="Название компании"/></label><label>Сумма / валюта<input name="amount" placeholder="Например, 250 000 ₽"/></label><div className="modal-note"><Icon name="info" size={16}/>Демо-режим: запись существует только до перезагрузки страницы. Для сохранения подключим защищённую базу данных.</div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Отмена</button><button className="primary-button" type="submit">Создать карточку</button></div></form></section></div>}
  </section>;
}

function Overview({ contracts, onNavigate }: { contracts: Contract[]; onNavigate: (page: PageId) => void }) {
  const reviewCount = contracts.filter(item => item.status === "На согласовании").length;
  return <>
    <section className="system-banner"><div className="banner-icon"><Icon name="shield" size={19}/></div><div className="banner-copy"><div className="banner-title-row"><strong>{isSupabaseConfigured ? "Supabase настроен — серверная интеграция ещё не включена" : "Работаем в ознакомительном режиме"}</strong><span className="connection-pill"><span className="status-dot"/>Без серверного сохранения</span></div><p>Созданные сейчас карточки временные и не отправляются на сервер. Подключение базы данных и авторизации — следующий этап.</p></div></section>
    <section className="metrics-grid"><MetricCard label="Всего договоров" value={String(contracts.length)} hint="В текущем сеансе" icon="contracts"/><MetricCard label="На согласовании" value={String(reviewCount)} hint="Ожидают решения" icon="approvals"/><MetricCard label="Ближайшие сроки" value="—" hint="Появятся после настройки дат" icon="calendar"/><MetricCard label="Мои задачи" value="—" hint="Назначение задач — следующий этап" icon="clock"/></section>
    <section className="content-grid"><article className="surface-card contracts-card"><div className="surface-header"><div><h2>Договорная работа</h2><p>Последние карточки в реестре</p></div><button className="text-button" type="button" onClick={() => onNavigate("contracts")}>Открыть реестр →</button></div>{contracts.length ? <div className="recent-list">{contracts.slice(0,4).map(item => <div className="recent-row" key={item.id}><span className="recent-file"><Icon name="file" size={17}/></span><span className="recent-copy"><strong>{item.title}</strong><small>{item.counterparty}</small></span><span className="status-badge is-draft">{item.status}</span></div>)}</div> : <div className="empty-state"><div className="empty-state-icon"><Icon name="file" size={23}/></div><h3>Реестр пока пуст</h3><p>Создайте первую карточку договора — она появится в реестре текущего сеанса.</p><button className="secondary-button" type="button" onClick={() => onNavigate("contracts")}>Перейти к договорам</button></div>}</article><article className="surface-card tasks-card"><div className="surface-header"><div><h2>Следующие этапы</h2><p>Что появится в рабочем процессе</p></div><Icon name="calendar" size={18}/></div><div className="milestone-list"><div><span>01</span><section><strong>Авторизация и организация</strong><p>Защищённый вход и рабочее пространство компании.</p></section></div><div><span>02</span><section><strong>Документы и версии</strong><p>Приватное хранилище и история изменений.</p></section></div><div><span>03</span><section><strong>Согласования</strong><p>Маршруты, решения и журнал действий.</p></section></div></div></article></section>
  </>;
}

function Placeholder({ page }: { page: PageId }) { const item = pageContent[page]; return <section className="surface-card module-placeholder"><div className="empty-state-icon"><Icon name={item.icon} size={23}/></div><span className="module-kicker">СЛЕДУЮЩИЙ ЭТАП MVP</span><h2>{item.title}</h2><p>{item.description}</p><div className="module-divider"/><p className="module-footnote">Этот раздел подключим к реальным данным после настройки авторизации, организации и безопасного доступа.</p></section>; }

export function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const currentPage = pageContent[activePage];
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  function addContract(input: Omit<Contract, "id" | "updated">) { setContracts(previous => [{ ...input, id: crypto.randomUUID(), updated: new Intl.DateTimeFormat("ru-RU").format(new Date()) }, ...previous]); }
  return <div className="app-layout"><Sidebar activePage={activePage} onNavigate={setActivePage}/><main className="main-area"><header className="topbar"><div className="topbar-context"><span className="topbar-overline">LEGALFLOW / WORKSPACE</span><span className="topbar-date">{dateLabel}</span></div><div className="topbar-actions"><span className="topbar-environment">DEMO</span><div className="profile-chip" aria-label="Профиль LegalFlow">LF</div></div></header><div className="page-content"><section className="page-heading"><div><span className="page-eyebrow">{activePage === "overview" ? "ГЛАВНАЯ" : "РАБОЧЕЕ ПРОСТРАНСТВО"}</span><h1>{currentPage.title}</h1><p>{currentPage.description}</p></div>{activePage === "contracts" && <button className="primary-button" type="button" onClick={() => document.querySelector<HTMLButtonElement>(".register-toolbar .primary-button")?.click()}><Icon name="plus" size={17}/>Новый договор</button>}</section>{activePage === "overview" ? <Overview contracts={contracts} onNavigate={setActivePage}/> : activePage === "contracts" ? <ContractRegister contracts={contracts} onCreate={addContract}/> : <Placeholder page={activePage}/>}</div></main></div>;
}
