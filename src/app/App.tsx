import { useState } from "react";
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

const pageContent: Record<PageId, { title: string; description: string; icon: IconName }> = {
  overview: {
    title: "Обзор договоров",
    description: "Состояние договорной работы в одном рабочем пространстве.",
    icon: "overview"
  },
  contracts: {
    title: "Договоры",
    description: "Единый реестр договоров, редакций и ответственных.",
    icon: "contracts"
  },
  approvals: {
    title: "Согласования",
    description: "Маршруты проверки и решения участников.",
    icon: "approvals"
  },
  tasks: {
    title: "Задачи и сроки",
    description: "Обязательства, контрольные даты и ближайшие действия.",
    icon: "tasks"
  },
  counterparties: {
    title: "Контрагенты",
    description: "Компании и контакты, с которыми работает организация.",
    icon: "counterparties"
  },
  team: {
    title: "Участники",
    description: "Команда, роли и доступ к рабочему пространству.",
    icon: "team"
  },
  settings: {
    title: "Настройки",
    description: "Параметры организации и правила договорных процессов.",
    icon: "settings"
  }
};

const metrics: Array<{ label: string; hint: string; icon: IconName }> = [
  { label: "Всего договоров", hint: "В реестре организации", icon: "contracts" },
  { label: "На согласовании", hint: "Ожидают решения участников", icon: "approvals" },
  { label: "Ближайшие сроки", hint: "Контрольные даты и продления", icon: "calendar" },
  { label: "Мои задачи", hint: "Действия, назначенные вам", icon: "clock" }
];

function Sidebar({
  activePage,
  onNavigate
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const groups = ["Работа", "Компания"] as const;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">L</div>
        <span>legal<span className="brand-accent">flow</span></span>
      </div>

      <div className="workspace-card">
        <div className="workspace-avatar">LF</div>
        <div className="workspace-copy">
          <strong>Рабочее пространство</strong>
          <span>Организация не подключена</span>
        </div>
        <span className="workspace-menu" aria-hidden="true">···</span>
      </div>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {groups.map((group) => (
          <div className="nav-group" key={group}>
            <p className="nav-group-label">{group}</p>
            {navigation
              .filter((item) => item.group === group)
              .map((item) => (
                <button
                  className={`nav-item ${activePage === item.id ? "is-active" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={activePage === item.id ? "page" : undefined}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {item.id === "approvals" && <span className="nav-indicator" />}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className="status-dot" />
          <span>Среда разработки</span>
        </div>
        <div className="sidebar-version">LEGALFLOW · MVP FOUNDATION</div>
      </div>
    </aside>
  );
}

function MetricCard({
  label,
  hint,
  icon
}: {
  label: string;
  hint: string;
  icon: IconName;
}) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span>{label}</span>
        <span className="metric-icon"><Icon name={icon} size={17} /></span>
      </div>
      <div className="metric-value" aria-label="Пока нет данных">—</div>
      <p>{hint}</p>
    </article>
  );
}

function Overview() {
  return (
    <>
      <section className="system-banner" aria-label="Состояние подключения">
        <div className="banner-icon"><Icon name="shield" size={19} /></div>
        <div className="banner-copy">
          <div className="banner-title-row">
            <strong>
              {isSupabaseConfigured
                ? "Переменные Supabase заполнены"
                : "База данных пока не подключена"}
            </strong>
            <span className={`connection-pill ${isSupabaseConfigured ? "is-configured" : ""}`}>
              <span className="status-dot" />
              {isSupabaseConfigured ? "Настроено локально" : "Ожидает настройки"}
            </span>
          </div>
          <p>
            {isSupabaseConfigured
              ? "Адрес проекта и publishable key найдены. Проверка авторизации и запросов к базе будет добавлена следующим этапом."
              : "Сейчас интерфейс работает без серверных данных. Подключим отдельный проект Supabase до появления реальных договоров и сотрудников."}
          </p>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Показатели договорной работы">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="content-grid">
        <article className="surface-card contracts-card">
          <div className="surface-header">
            <div>
              <h2>Договорная работа</h2>
              <p>Текущий статус реестра</p>
            </div>
            <span className="subtle-tag">Обзор</span>
          </div>

          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="file" size={23} /></div>
            <h3>Реестр пока пуст</h3>
            <p>
              Здесь появятся договоры организации, текущие статусы и ответственные.
              Демонстрационные записи не используются.
            </p>
          </div>
        </article>

        <article className="surface-card tasks-card">
          <div className="surface-header">
            <div>
              <h2>Ближайшие действия</h2>
              <p>Задачи и контрольные даты</p>
            </div>
            <Icon name="calendar" size={18} />
          </div>
          <div className="compact-empty">
            <span className="compact-empty-icon"><Icon name="clock" size={18} /></span>
            <div>
              <strong>Пока нет задач</strong>
              <p>Сроки появятся вместе с договорами и маршрутами согласования.</p>
            </div>
          </div>
          <div className="task-note">
            <span className="task-note-dot" />
            <span>Напоминания будут привязаны к ответственным сотрудникам.</span>
          </div>
        </article>
      </section>

      <section className="surface-card workflow-card">
        <div className="surface-header">
          <div>
            <h2>Типовой маршрут договора</h2>
            <p>Базовая последовательность. Настраиваемые маршруты добавим отдельно.</p>
          </div>
          <span className="subtle-tag">Модель процесса</span>
        </div>
        <div className="workflow-steps">
          {[
            ["01", "Черновик"],
            ["02", "Юрист"],
            ["03", "Бухгалтер"],
            ["04", "Директор"],
            ["05", "Подписание"]
          ].map(([number, label], index) => (
            <div className="workflow-step" key={number}>
              <div className="workflow-step-number">{number}</div>
              <span>{label}</span>
              {index < 4 && <span className="workflow-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <span>LegalFlow</span>
        <span>Никаких фиктивных договоров и локального хранения документов.</span>
      </footer>
    </>
  );
}

function EmptyModule({ page }: { page: PageId }) {
  const content = pageContent[page];

  return (
    <section className="surface-card module-placeholder">
      <div className="empty-state-icon"><Icon name={content.icon} size={23} /></div>
      <span className="module-kicker">РАЗДЕЛ В РАЗРАБОТКЕ</span>
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <div className="module-divider" />
      <p className="module-footnote">
        Сначала подготовим модель данных, авторизацию и разграничение доступа.
        Затем подключим этот раздел к базе данных.
      </p>
    </section>
  );
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const currentPage = pageContent[activePage];
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-overline">LEGALFLOW / WORKSPACE</span>
            <span className="topbar-date">{dateLabel}</span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-environment">PREVIEW</span>
            <button className="icon-button" type="button" aria-label="Поиск" disabled title="Поиск появится вместе с реестром">
              <Icon name="search" size={18} />
            </button>
            <button className="icon-button" type="button" aria-label="Уведомления" disabled title="Уведомления появятся после подключения">
              <Icon name="bell" size={18} />
            </button>
            <div className="profile-chip" aria-label="Профиль LegalFlow">LF</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <span className="page-eyebrow">{activePage === "overview" ? "ГЛАВНАЯ" : "РАБОЧЕЕ ПРОСТРАНСТВО"}</span>
              <h1>{currentPage.title}</h1>
              <p>{currentPage.description}</p>
            </div>
            <button
              className="primary-button"
              type="button"
              disabled
              title="Создание договоров станет доступно после подключения базы и реализации безопасного потока данных."
            >
              <Icon name="plus" size={17} />
              Новый договор
            </button>
          </section>

          {activePage === "overview" ? <Overview /> : <EmptyModule page={activePage} />}
        </div>
      </main>
    </div>
  );
}
