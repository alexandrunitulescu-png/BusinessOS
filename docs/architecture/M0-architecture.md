# M0 — Product & System Architecture

**Product**: BusinessPuls — multi-tenant SaaS ERP simplu pentru PFA / II / IF / SRL / profesii liberale din România.
**Status**: aprobat și implementat integral. M1–M10 livrate, verificate și deployate în producție (Vercel) — vezi §18. Excepție cunoscută: M7 a livrat doar jumătatea neutră (pipeline country-agnostic); provider-ul real ANAF/SPV rămâne de construit pe baza documentației oficiale (§10).

---

## 1. Architecture Overview

```
                            ┌─────────────────────────────┐
                            │        Next.js App           │
                            │  (App Router, TS strict)      │
                            │                               │
                            │  UI (Server + Client Comp.)   │
                            │  ───────────────────────────  │
                            │  Domain modules (server-only) │
                            │   auth · organizations · crm  │
                            │   catalog · invoicing         │
                            │   efactura · expenses         │
                            │   payments · projects         │
                            │   documents · employees       │
                            │   reports · notifications     │
                            │   integrations · billing      │
                            └───────────┬──────────┬────────┘
                                        │          │
                     user-scoped JWT    │          │  service-role
                     (RLS enforced)     │          │  (server jobs only)
                                        ▼          ▼
                            ┌─────────────────────────────┐
                            │        Supabase              │
                            │  Postgres + Row Level Security│
                            │  Auth (JWT)                   │
                            │  Storage (private buckets)    │
                            └───────────┬───────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────────┐
                            │  Country Tax Module (plug-in) │
                            │  RomaniaModule                │
                            │   └─ EInvoiceProvider          │
                            │       └─ RomanianANAFProvider  │
                            │           (test env first)     │
                            └─────────────────────────────┘
```

Principii:

- **API-first**: toată logica de business trăiește în module server-side (`lib/<domain>`), consumate de UI prin server actions / route handlers `/api/v1/*`. UI nu conține reguli de business.
- **Multi-tenant din prima zi**: fiecare entitate business are `organization_id`; izolarea se aplică la nivel de bază de date (RLS), nu doar în cod aplicație.
- **Separare netă**: Core BusinessPuls vs. Romania Tax Module (secțiunea 11), Invoice (obiect de business) vs. PDF (reprezentare) vs. UBL/XML e-Factura (reprezentare fiscală) (secțiunea 10).
- **Event-driven intern, minimal**: acțiuni de business emit evenimente de domeniu (`invoice.issued`, `payment.registered` etc.) consumate de notificări, audit log și (viitor) webhooks — fără automation builder în MVP.

---

## 2. Domain Model

Bounded contexts (module foldere, secțiunea 13):

| Modul | Responsabilitate |
|---|---|
| `auth` | sesiune utilizator, onboarding, invitații |
| `organizations` | tenant, membri, roluri, setări companie, conturi bancare |
| `crm` | clients, suppliers |
| `catalog` | products & services |
| `projects` | proiecte (opțional) |
| `invoicing` | invoices, invoice_lines, serii, PDF |
| `efactura` | mapare UBL, provider ANAF, submissions, audit |
| `expenses` | cheltuieli, documente asociate |
| `payments` | încasări/plăți, reconciliere facturi/cheltuieli |
| `documents` | document management generic (polimorfic) |
| `employees` | evidență minimă angajați (fără payroll) |
| `reports` | agregări read-only peste celelalte module |
| `notifications` | in-app + email, engine generic |
| `integrations` | webhooks, (viitor) API public, n8n |
| `billing` | plans, subscriptions, entitlements, feature flags, usage |

Fluxul principal (secțiunea 39):

```
Client → Proiect/Serviciu → Factură → PDF → RO e-Factura → Validare ANAF → Trimitere client → Încasare → Plătită
```

Flux secundar (secțiunea 40):

```
Furnizor → Cheltuială → Document → Plată → Cheltuială plătită
```

Ambele actualizează KPI-urile din Dashboard prin citire directă din DB (fără cache hardcodat).

---

## 3. Database ER Diagram

Diagrama completă (Mermaid, interactivă) este publicată separat ca artifact vizual — vezi link-ul trimis în chat. Rezumat relații cheie:

- `organizations 1—N organization_users N—1 profiles (auth.users)`
- `organizations 1—N organization_bank_accounts`
- `organizations 1—N clients / suppliers / products_services / projects / employees`
- `organizations 1—N invoice_series 1—N invoices`
- `clients 1—N invoices`, `projects 1—N invoices` (opțional)
- `invoices 1—N invoice_lines`, `invoices 1—N payments`, `invoices 1—1..N einvoice_submissions`
- `suppliers 1—N expenses`, `expenses 1—N payments`
- `invoices/expenses/clients/suppliers/projects 1—N documents` (polimorfic prin `entity_type` + `entity_id`)
- `organizations 1—N tax_integrations`
- `einvoice_submissions 1—N einvoice_submission_events`
- `organizations 1—1 subscriptions N—1 plans`
- `organizations 1—N feature_flags`, `organizations 1—N usage_tracking`
- `organizations 1—N webhook_endpoints 1—N webhook_deliveries`
- `organizations 1—N audit_logs`, `organizations 1—N notifications`

---

## 4. Proposed PostgreSQL Schema

> Propunere de schemă (nu migration finală). Tipuri monetare = `numeric(14,2)` (niciodată float). Toate tabelele de business au `organization_id uuid not null references organizations(id)`. Enum-urile de mai jos se implementează ca `text` + `check constraint` sau `enum` types — decizie de implementare la M1, nu afectează design-ul.

```sql
-- ============ PLATFORM ============

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  entity_type text not null check (entity_type in ('PFA','II','IF','SRL','SA','LIBERAL_PROFESSION','OTHER')),
  cui text not null,
  registration_number text,
  vat_registered boolean not null default false,
  vat_code text,
  address_line text,
  city text,
  county text,
  postal_code text,
  country text not null default 'RO',
  email text,
  phone text,
  website text,
  logo_storage_path text,
  default_currency text not null default 'RON',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country, cui)
);

create table organization_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  iban text not null,
  bank_name text,
  currency text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- mirrors auth.users; created via trigger on signup
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','ACCOUNTANT','EMPLOYEE','READ_ONLY')),
  status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','SUSPENDED')),
  invited_email text,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ============ CRM ============

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PERSON','COMPANY')),
  company_name text,
  cui text,
  registration_number text,
  first_name text,
  last_name text,
  contact_person text,
  email text,
  phone text,
  address_line text,
  city text,
  county text,
  country text default 'RO',
  iban text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PERSON','COMPANY')),
  company_name text,
  cui text,
  registration_number text,
  contact_person text,
  email text,
  phone text,
  address_line text,
  city text,
  county text,
  country text default 'RO',
  iban text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ CATALOG ============

create table products_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('PRODUCT','SERVICE')),
  name text not null,
  description text,
  sku text,
  unit text not null default 'buc',
  price numeric(14,2) not null,
  currency text not null,
  vat_rate numeric(5,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ PROJECTS ============

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'PLANNED' check (status in ('PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED')),
  start_date date,
  deadline date,
  budget numeric(14,2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ INVOICING ============

create table invoice_series (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  series text not null,
  next_number integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, series)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id),
  project_id uuid references projects(id) on delete set null,
  series_id uuid not null references invoice_series(id),
  series text not null,       -- captured at issue time, immutable
  number integer not null,    -- captured at issue time, immutable
  issue_date date not null,
  due_date date,
  currency text not null,
  exchange_rate numeric(12,6),
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  payment_terms text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ISSUED','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
  einvoice_status text not null default 'NOT_REQUIRED' check (einvoice_status in ('NOT_REQUIRED','NOT_SENT','QUEUED','SUBMITTED','PROCESSING','VALIDATED','REJECTED')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, series, number)
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  product_service_id uuid references products_services(id) on delete set null,
  description text not null,
  quantity numeric(14,4) not null default 1,
  unit text not null default 'buc',
  unit_price numeric(14,2) not null,
  vat_rate numeric(5,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  line_total numeric(14,2) not null,
  sort_order integer not null default 0
);

-- ============ E-FACTURA ============

create table tax_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null,                 -- e.g. 'ANAF_EFACTURA'
  status text not null default 'NOT_CONNECTED' check (status in ('NOT_CONNECTED','PENDING','CONNECTED','EXPIRED','REVOKED')),
  connected_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}',   -- encrypted secret REFERENCE only, never raw tokens
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table einvoice_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  provider text not null,
  upload_id text,
  status text not null check (status in ('NOT_REQUIRED','NOT_SENT','QUEUED','SUBMITTED','PROCESSING','VALIDATED','REJECTED')),
  submitted_at timestamptz,
  last_checked_at timestamptz,
  validated_at timestamptz,
  error_code text,
  error_message text,
  response_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table einvoice_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references einvoice_submissions(id) on delete cascade,
  event_type text not null,
  status_before text,
  status_after text,
  payload jsonb,
  occurred_at timestamptz not null default now()
);

-- ============ EXPENSES / PAYMENTS ============

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  expense_date date not null,
  category text,
  description text,
  amount numeric(14,2) not null,
  vat_amount numeric(14,2) not null default 0,
  currency text not null,
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID','PARTIALLY_PAID','PAID')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  expense_id uuid references expenses(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null,
  payment_date date not null,
  payment_method text not null check (payment_method in ('BANK_TRANSFER','CASH','CARD','OTHER')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  check (
    (invoice_id is not null and expense_id is null) or
    (invoice_id is null and expense_id is not null)
  )
);

-- ============ DOCUMENTS ============

create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('INVOICE','EXPENSE','CLIENT','SUPPLIER','PROJECT','OTHER')),
  entity_id uuid,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============ EMPLOYEES (structura minima) ============

create table employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  job_title text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  hire_date date,
  created_at timestamptz not null default now()
);

-- ============ NOTIFICATIONS / AUDIT ============

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade, -- null = broadcast org-wide
  type text not null,          -- invoice_due, invoice_overdue, einvoice_rejected, ...
  channel text not null check (channel in ('IN_APP','EMAIL')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,        -- invoice.issued, client.deleted, ...
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
-- append-only: no UPDATE/DELETE grants for any application role

-- ============ BILLING / ENTITLEMENTS ============

create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('FREE','STARTER','PRO','BUSINESS')),
  name text not null,
  price numeric(10,2),
  currency text default 'RON',
  limits jsonb not null default '{}',     -- { "users": 3, "invoices_per_month": 50, "storage_mb": 500 }
  features jsonb not null default '{}',   -- { "PROJECTS": true, "EFACTURA": true, ... }
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'TRIAL' check (status in ('TRIAL','ACTIVE','PAST_DUE','CANCELLED')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,                   -- e.g. 'stripe', null while unintegrated
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  unique (organization_id)
);

create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  metric text not null,             -- 'invoices_created', 'storage_bytes', 'active_users'
  period_start date not null,
  period_end date not null,
  value numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (organization_id, metric, period_start)
);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  feature_key text not null check (feature_key in ('CRM','PROJECTS','EXPENSES','EMPLOYEES','EFACTURA','DOCUMENTS','AUTOMATIONS')),
  enabled boolean not null default true,
  source text not null default 'PLAN' check (source in ('PLAN','OVERRIDE')),
  created_at timestamptz not null default now(),
  unique (organization_id, feature_key)
);

-- ============ INTEGRATIONS ============

create table webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  secret text not null,             -- stored encrypted; used to sign payloads (HMAC)
  event_types text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','SUCCESS','FAILED')),
  response_code integer,
  attempt_count integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
```

Note de design:

- **`documents` unifică** ceea ce specificația enumera separat (`documents` + `expense_documents`) printr-un model polimorfic (`entity_type` + `entity_id`). Evită duplicarea logicii de upload/storage pentru fiecare tip de entitate — normalizare justificată explicit de cerința "nu construi tabele inutil de complexe".
- **`invoice_series` este tabel dedicat** (nu doar 2 coloane pe `organizations`) pentru a permite alocare atomică de numere (`SELECT ... FOR UPDATE`) și multiple serii per organizație din prima zi, fără migrare dureroasă ulterioară — cerință critică pentru corectitudinea numerotării fiscale.
- **`einvoice_submissions` nu se suprascrie**: fiecare re-verificare de status face `UPDATE` pe rândul curent + `INSERT` în `einvoice_submission_events` pentru istoric complet (audit fiscal).
- Toate sumele bănești: `numeric(14,2)` / `numeric(5,2)` pentru procente — niciodată `float`/`double`.

---

## 5. Multi-Tenancy Strategy

- **Model**: shared database, shared schema, izolare prin coloană `organization_id` + RLS. Nu multi-schema, nu multi-DB per tenant (cost operațional prea mare pentru target-ul "sute/mii de firme mici"; RLS e suficient și e strategia recomandată de Supabase).
- **Entitate centrală**: `organizations`. Orice tabel nou de business trebuie să aibă `organization_id not null` din prima migrare.
- **Context organizație în request**: utilizatorul selectează organizația activă în UI (organization switcher). Server-ul primește `organization_id` din payload/route, dar **nu are încredere în el** — validează mereu apartenența (`organization_users`) înainte de orice query, iar RLS este linia finală de apărare independent de bug-uri în codul aplicației.
- **Cross-tenant prin design**: nu există niciun query "fără organization_id" pe tabelele de business — nici măcar pentru rapoarte admin interne (acelea folosesc service-role, separat, cu audit).

---

## 6. RLS Strategy

Funcții helper `SECURITY DEFINER STABLE` (evită repetarea subquery-urilor și permit index scan eficient pe `organization_users(user_id, organization_id)`):

```sql
create or replace function is_org_member(target_org uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organization_users
    where organization_id = target_org
      and user_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

create or replace function has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organization_users
    where organization_id = target_org
      and user_id = auth.uid()
      and status = 'ACTIVE'
      and role = any(allowed_roles)
  );
$$;
```

Policy pattern aplicat pe **fiecare** tabel de business (exemplu `clients`):

```sql
alter table clients enable row level security;

create policy clients_select on clients for select
  using (is_org_member(organization_id));

create policy clients_insert on clients for insert
  with check (is_org_member(organization_id));

create policy clients_update on clients for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy clients_delete on clients for delete
  using (has_org_role(organization_id, array['OWNER','ADMIN']));
```

Reguli suplimentare:

- `audit_logs`, `einvoice_submission_events`: **doar INSERT + SELECT** (via `is_org_member`); niciun rol de aplicație nu are grant de `UPDATE`/`DELETE` — enforcement dublu (RLS + GRANT) pentru imutabilitate.
- `tax_integrations.metadata` (secrete/token-uri): SELECT restricționat suplimentar la `has_org_role(org, ['OWNER','ADMIN'])`; valorile sensibile propriu-zise nu stau în plaintext (vezi secțiunea 10).
- Supabase Storage: politici echivalente pe `storage.objects`, verificând primul segment din `path` (`{organization_id}/...`) contra `is_org_member`.
- **Service role** (bypassează RLS) e folosit exclusiv server-side pentru joburi de fundal (polling ANAF, procesare webhook, agregare `usage_tracking`) — niciodată expus către client, niciodată pe un path direct accesibil din request-uri de utilizator fără verificare explicită de business logic înainte.
- Teste automate obligatorii (secțiunea 15/25 mai jos): suite dedicată ce creează 2 organizații + 2 useri și verifică SELECT/INSERT/UPDATE/Storage cross-tenant → trebuie să eșueze.

---

## 7. Authentication Architecture

- **Supabase Auth** (email/parolă; magic link opțional ulterior). JWT conține `sub` (user id); nu conține `organization_id` (userul poate aparține la N organizații — nu vrem claim static care devine stale).
- **Session boundary**: Next.js server components/route handlers citesc sesiunea din cookie-uri httpOnly (Supabase SSR helpers) — clientul din browser nu ține niciodată service-role key sau secrete.
- **Doi clienți Supabase pe server**:
  1. *user-scoped client* (folosește JWT-ul userului, respectă RLS) — folosit pentru 99% din operații.
  2. *service-role client* — folosit **doar** în: joburi cron (polling status ANAF), procesare webhook outbound, task-uri de billing/sync. Rulează exclusiv în cod server, niciodată importat în componente client.
- **Organization switcher**: schimbarea organizației active e stocată server-side (cookie/sesiune), re-validată la fiecare acțiune sensibilă contra `organization_users`.
- **Invitații**: `organization_users` cu `status = INVITED` + `invited_email`; acceptarea leagă `user_id` la primul login cu emailul respectiv.

---

## 8. RBAC Architecture

Roluri (secțiunea 4): `OWNER > ADMIN > ACCOUNTANT / EMPLOYEE / READ_ONLY` (ultimele trei nu sunt ierarhice între ele, ci de tip acces pe domenii diferite).

- **Sursă unică de adevăr**: modul `lib/auth/rbac.ts` — o matrice `role → { resource: action[] }`, consultată de:
  1. UI (ascunde/dezactivează controale),
  2. server actions / route handlers (**check autoritar**, înainte de orice query),
  3. RLS (`has_org_role`) — ultimă linie de apărare, independentă de bug-uri în (1)/(2).
- Matrice inițială (MVP, indicativ — nu regulă fiscală):

  | Resursă | OWNER | ADMIN | ACCOUNTANT | EMPLOYEE | READ_ONLY |
  |---|---|---|---|---|---|
  | Facturi/Cheltuieli/Plăți/Rapoarte | RW | RW | RW | – | R |
  | Clienți/Furnizori/Proiecte | RW | RW | R | RW | R |
  | Setări organizație/Useri/Billing | RW | RW | – | – | – |
  | Catalog/Documente | RW | RW | R | RW | R |

- **Extensibilitate pentru permisiuni granulare**: matricea e date de configurare (JSON/tabel), nu `if role == X` împrăștiat prin cod. Un `organization_role_overrides` (per-user, per-resursă) poate fi adăugat ulterior fără schimbarea contractului `hasPermission(user, org, resource, action)`.

---

## 9. File Storage Architecture

- **Supabase Storage**, buckets private (excepție: logo-uri, bucket public separat, fără date sensibile).
- **Convenție path**: `org-files/{organization_id}/{entity_type}/{entity_id}/{uuid}-{filename}` — primul segment e mereu `organization_id`, folosit direct de politica RLS pe `storage.objects`.
- **Metadata în DB** (`documents`), fișierul fizic doar în Storage — DB nu conține niciodată blob-uri.
- **Acces**: exclusiv prin URL semnate (`createSignedUrl`, TTL scurt, ex. 5 min), generate server-side după verificarea RBAC/RLS — niciun link public permanent către documente fiscale.
- **Validare upload**: whitelist MIME (`pdf, jpg, png`), limită de dimensiune per plan (`plans.limits.storage_mb`), scanare antivirus rămâne post-MVP (notă în roadmap, nu blocking pentru M0).

---

## 10. Romanian e-Factura Integration Architecture

Pipeline modular, complet izolat de restul aplicației prin abstracția `EInvoiceProvider`:

```
Invoice (obiect business, DB)
   │
   ▼
EInvoiceMapper           -- Invoice -> model intermediar neutru
   │
   ▼
UBL/XML Generator        -- model intermediar -> XML UBL (RO_CIUS)
   │
   ▼
Validator                -- validare structurală (schema/schematron)
   │
   ▼
EInvoiceProvider (interfață)
   │
   ▼
RomanianANAFEInvoiceProvider  -- implementare M7, DOAR pe baza docs oficiale ANAF/MF
   │
   ├─ authenticate()
   ├─ submit(xml) -> upload_id
   ├─ getStatus(upload_id) -> status
   └─ downloadResponse(upload_id) -> response payload
   │
   ▼
einvoice_submissions (status curent) + einvoice_submission_events (istoric append-only)
   │
   ▼
Archive: XML original + răspuns ANAF -> Storage, referențiate din `documents`
```

Reguli obligatorii:

- **Nimic din structura request/response ANAF nu se implementează din memorie** — la M7 se lucrează exclusiv cu documentația oficială curentă furnizată explicit în task-ul respectiv.
- Statusul comercial al facturii (`invoices.status`: DRAFT/ISSUED/SENT/PARTIALLY_PAID/PAID/OVERDUE/CANCELLED) e **complet separat** de `invoices.einvoice_status` (NOT_REQUIRED/NOT_SENT/QUEUED/SUBMITTED/PROCESSING/VALIDATED/REJECTED) — o factură poate fi `PAID` comercial și `REJECTED` fiscal (necesită corecție).
- Credențialele/token-urile ANAF (`tax_integrations.metadata`) nu ajung niciodată în frontend; toate apelurile către provider se fac din server (route handler / background job), autorizate prin service-role sau context server, nu prin sesiunea userului din browser.
- Environment: se pornește exclusiv pe mediul oficial de test ANAF; activarea producției e un pas separat, explicit, per organizație (câmp `tax_integrations.status`/`metadata`, nu un switch global).
- **Per-organizație**: `tax_integrations` are `unique(organization_id, provider)` — fiecare firmă își conectează propriul CUI/credențiale; nu există presupunerea unui singur tenant fiscal.

---

## 11. Country Module Architecture

```
interface CountryModule {
  code: string                                  // 'RO'
  validateTaxId(cui: string): ValidationResult  // validare formală (checksum), nu apel extern hardcodat
  getEInvoiceProvider(): EInvoiceProvider | null
  getInvoiceLegalFields(): FieldRequirement[]    // câmpuri obligatorii pe factură/PDF pt. țara respectivă
}

class RomaniaModule implements CountryModule { ... }
```

- Toată logica specifică CUI/TVA/RO e-Factura/reguli de factură din România trăiește **exclusiv** în `RomaniaModule` (folder `lib/country/romania/`), nu împrăștiată prin `invoicing`/`efactura` generic.
- Core-ul (`clients, suppliers, invoices, expenses, payments, projects, documents`) nu importă niciodată direct cod specific României — doar prin interfața `CountryModule`, rezolvată din `organizations.country`.
- Cotele de TVA **nu sunt hardcodate în logică** — sunt date de configurare (`products_services.vat_rate`, `invoice_lines.vat_rate`), introduse/validate de utilizator; `RomaniaModule` poate oferi valori implicite sugerate, dar acestea trebuie confirmate contra surselor fiscale oficiale înainte de a fi folosite ca default în seed data (nu se inventează acum).
- Extensibilitate: adăugarea Ungaria/Germania/Italia = o nouă clasă `CountryModule`, fără a rescrie invoicing/expenses/payments.

---

## 12. Subscription / Entitlement Architecture

```
EntitlementsService
  .canUseFeature(organizationId, featureKey): boolean
      -> feature_flags (override) ?? plans.features[featureKey] (default din planul curent)
  .canPerformAction(organizationId, metric): { allowed, remaining }
      -> usage_tracking[metric] vs plans.limits[metric]
```

- **Punct central unic** — niciun `if (plan === 'PRO')` împrăștiat prin module; toate verificările de feature/limită trec prin `EntitlementsService` (folder `lib/billing/`).
- `subscriptions` leagă organizația de un `plan`; `feature_flags` permite override per-organizație (ex. beta feature activată manual pentru un client, indiferent de plan).
- `usage_tracking` se actualizează din evenimentele de domeniu (`invoice.created`, `document.uploaded` etc.) — nu se calculează la citire prin `COUNT(*)` costisitor pe tabele mari.
- **Stripe nu e integrat în M0/M1** — dar schema (`subscriptions.provider`, `provider_subscription_id`) e pregătită să primească un provider real fără migrare de schemă.

---

## 13. Folder Structure

```
app/
  (auth)/                     # login, signup, invite accept
  (onboarding)/                # wizard 5 pași
  (dashboard)/
    dashboard/
    clients/
    suppliers/
    catalog/
    projects/
    invoices/
    expenses/
    payments/
    documents/
    employees/
    reports/
    settings/
    integrations/
  api/v1/
    clients/
    suppliers/
    invoices/
    expenses/
    payments/
    projects/
    ...

lib/
  auth/                       # session helpers, rbac.ts
  organizations/              # org CRUD, membership, bank accounts
  crm/                        # clients, suppliers (query/mutation/schema)
  catalog/
  projects/
  invoicing/                  # invoices, lines, series, PDF generation
  efactura/
    provider.ts               # interface EInvoiceProvider
    mapper.ts
    ubl-generator.ts
    validator.ts
  country/
    romania/                  # RomaniaModule, RomanianANAFEInvoiceProvider
  expenses/
  payments/
  documents/
  employees/
  reports/
  notifications/
  integrations/               # webhooks
  billing/                    # plans, subscriptions, entitlements, feature flags

  supabase/
    server-client.ts          # user-scoped
    service-client.ts         # service-role, server-only, import restricted

  domain-events/              # emit/subscribe intern (outbox pattern simplu)

components/                   # UI reutilizabil, fără business logic
supabase/
  migrations/
  seed.sql
```

Regulă: **niciun `lib/services/` monolitic** — fiecare domeniu are propriile `queries.ts`, `mutations.ts`, `schemas.ts` (Zod), `types.ts`.

---

## 14. API Conventions

- Prefix: `/api/v1/<resource>` (plural), REST-ish: `GET /clients`, `GET /clients/:id`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`.
- Body/response validate cu **Zod**, schema colocată în modulul de domeniu (`lib/<domain>/schemas.ts`), reutilizată și de React Hook Form pe UI.
- Envelope răspuns: `{ data }` pe succes, `{ error: { code, message } }` pe eroare — coduri stabile (`VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`).
- Paginare: `?page=&limit=` (cursor-based rezervat pentru liste foarte mari, post-MVP).
- Autorizare: sesiune Supabase din cookie; `organization_id` explicit în path/query pentru rutele scoped-pe-organizație, validat mereu server-side contra membership înainte de query (RLS ca linie secundară).
- Rate limiting: la nivel de middleware (per user + per IP), mai strict pe `/auth/*` și pe endpoint-urile de submit e-Factura.
- API public extern (secțiunea 24): aceleași convenții `/api/v1/*`, dar cu autentificare API key per organizație — **nu se expune în MVP**, doar arhitectura permite activarea ulterioară fără schimbare de contract.

---

## 15. Security Threat Analysis

| Amenințare | Vector | Mitigare |
|---|---|---|
| Cross-tenant data leakage | query fără filtru org, bug în cod | RLS pe fiecare tabel (linie finală), `organization_id` obligatoriu, teste automate dedicate |
| IDOR (acces la resursă din altă organizație prin ID direct) | URL/param manipulat | RLS + verificare explicită membership înainte de orice mutație server-side |
| Escaladare privilegii | user își modifică propriul rol | update pe `organization_users.role` permis doar `OWNER`/`ADMIN` (RLS + RBAC), audit log obligatoriu |
| Scurgere secrete (service-role, token ANAF) | expunere în bundle client / env greșit | secrete doar în env server (fără prefix `NEXT_PUBLIC_`), service-role client izolat în fișier separat cu import restricționat, token-uri ANAF nu în plaintext |
| Upload fișiere malițioase | fișier deghizat, payload mare | whitelist MIME + validare extensie, limită dimensiune per plan, bucket privat, (post-MVP: scanare AV) |
| Acces neautorizat la documente | link public/predictibil | doar signed URL cu TTL scurt, path izolat per organizație, RLS pe `storage.objects` |
| Injecție SQL | input neescapat | Supabase client parametrizat / query builder, Zod validation la intrare, fără SQL string-concat |
| Sesiune/JWT furat | XSS, cookie theft | cookies httpOnly + secure, expirare scurtă + refresh rotation, CSP |
| Falsificare `organization_id` din browser | request manipulat de client | server nu are încredere în valoarea primită — re-validează membership la fiecare cerere |
| Alterare audit log | user cu acces DB direct/bug aplicație | fără GRANT de UPDATE/DELETE pe `audit_logs`/`einvoice_submission_events`, doar INSERT+SELECT |
| Abuz rate/DoS pe endpoint-uri sensibile | brute-force login, spam submit e-Factura | rate limiting middleware per user/IP |
| Webhook payload falsificat la ieșire | endpoint extern compromis | payload semnat HMAC cu `webhook_endpoints.secret` |

Teste de securitate obligatorii (nu opționale): suite automate care demonstrează
exact cele 4 cazuri din cerință (SELECT/INSERT/UPDATE/Storage cross-tenant
refuzate). **Livrat în M10** — `scripts/test-rls-isolation.mjs` (`npm run
test:rls`), 23/23, cu teardown automat; acoperă în plus DELETE cross-tenant și
imutabilitatea `audit_logs`.

---

## 16. MVP Scope

**BUSINESS**: Clients · Suppliers · Products & Services · Projects
**MONEY**: Invoices · Expenses · Payments
**ROMANIA**: RO e-Factura (mediu de test)
**CONTROL**: Dashboard · Documents · Reports (basic)
**PLATFORM**: Organizations · Users & Roles · arhitectură pregătită pentru Subscriptions (fără billing provider live)

---

## 17. Features Explicitly Postponed

Full accounting / partidă dublă · Payroll · Revisal/REGES · Pontaj complex · Inventory/warehouse management · POS · Integrare bancară PSD2 · AI accounting · Aplicație mobilă nativă · Automation/workflow builder vizual · Marketplace · HR complet · Scanare antivirus la upload · API public expus extern · Elasticsearch (Postgres full-text e suficient în MVP) · Permisiuni granulare per-resursă (dincolo de RBAC pe rol).

---

## 18. Implementation Milestones

Proces respectat la fiecare milestone: lint, typecheck, teste, build de producție, sumar modificări, listă migrări DB, implicații de securitate → **STOP**, aștept aprobare.

| # | Milestone | Scop | Status | Commit(uri) |
|---|---|---|---|---|
| M1 | Foundation + Auth + Organizations + RLS | schema completă, RLS pe toate tabelele, onboarding, organization switcher | ✅ livrat | `bca3f7e` |
| M2 | App Shell + Dashboard | layout, sidebar, KPI din DB | ✅ livrat | `ccf606b` |
| M3 | Clients + Suppliers + Catalog | CRM + produse/servicii | ✅ livrat | `c669584` |
| M4 | Projects | proiecte opționale, legare la clienți | ✅ livrat | `b5d01c2` |
| M5 | Invoices + PDF | engine facturare, calcule deterministe, PDF | ✅ livrat | `1e5627d`, `a13658a` |
| M6 | Expenses + Payments | cheltuieli, reconciliere plăți parțiale | ✅ livrat | `70f96ce` |
| M7 | Romania e-Factura (TEST) | provider ANAF, doar pe baza docs oficiale, mediu de test | ⚠️ parțial — doar jumătatea neutră (pipeline country-agnostic, `EInvoiceProvider` + stub, UBL 2.1 cu `TODO(ANAF)`); provider-ul real SPV rămâne de construit cu docs oficiale (§10) | `62d926b` |
| M8 | Documents + Reports | document management, rapoarte MVP | ✅ livrat | `0a0440f` |
| M9 | Subscriptions/Entitlements | plans, feature flags, EntitlementsService | ✅ livrat | `60a4ade` |
| M10 | Security + Testing + Production hardening | teste RLS cross-tenant, audit, rate limiting, build de producție | ✅ livrat | `05464bc` |

### Status final (2026-08-27)

Planul M1–M10 este implementat. Aplicația rulează în producție pe Vercel
(`businesspuls.vercel.app`), pe Supabase (proiect `npnybekbxbotqxbmvwdj`),
cu toate migrările aplicate.

**M10 — ce a livrat concret:**
- **Suită automată de izolare cross-tenant** (`scripts/test-rls-isolation.mjs`,
  `npm run test:rls`): 2 organizații throwaway, dovedește că SELECT / INSERT /
  UPDATE / DELETE / Storage cross-tenant sunt toate refuzate + `audit_logs`
  append-only. Cerința obligatorie din §6/§15.
- **Rate limiting** Postgres (serverless-safe): funcția `check_rate_limit()` +
  `rate_limit_hits` (migrare `20260827000007`). Aplicat pe sign-in (5/5min),
  sign-up (3/h), e-Factura prepare (30/h per org) și un plafon per-IP în
  `proxy.ts` pentru `/login`,`/signup`,`/auth` (30/min → `429`). Fail-open.
- **Audit trail** (`src/lib/audit/`): `writeAudit()` best-effort, cablat pe
  emitere/anulare/ștergere factură, schimbare plan, pregătire e-Factura, creare
  organizație, ștergere document/cheltuială/plată. Migrarea `20260827000006`
  revocă UPDATE/DELETE pe `audit_logs` + `einvoice_submission_events` de la
  `authenticated` **și** `service_role` (imutabilitate la nivel de GRANT, pe
  lângă RLS — §15).
- **Hardening producție**: `next.config.ts` — CSP pragmatic (fără nonce, ca să
  nu forțeze toate paginile pe dynamic rendering), HSTS, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`.
  `scripts/check-bundle-secrets.mjs` (`npm run check:bundle`) verifică că
  valorile secrete nu ajung în `.next/static`. `npm run verify` =
  lint → build → typecheck → check:bundle (typecheck rulează **după** build —
  Next 16 generează `LayoutProps`/`PageProps` în `.next/types`).

**Rămas de făcut (nu în planul M0):**
- M7 real: `RomanianANAFEInvoiceProvider` (OAuth SPV, submit/getStatus/
  downloadResponse), RO_CIUS + scheme de codare + schematron, job de polling
  `upload_id`, butonul real „Trimite la ANAF" + flow `tax_integrations` — toate
  strict pe baza documentației oficiale ANAF/MF curente (§10).
- Management membri (invitații, schimbare rol) — RBAC-ul există, dar nu există
  încă mutații/UI; audit-ul are deja `member.*` rezervat.
- Payment provider real pentru abonamente (Stripe) — schema `subscriptions`
  (`provider`, `provider_subscription_id`) e pregătită (§12).
