-- Platform: organizations, membership, profiles, bank accounts.

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

create index organization_bank_accounts_org_idx on organization_bank_accounts(organization_id);

-- Mirrors auth.users; populated by a trigger on signup (see 000003_helper_functions.sql).
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

create index organization_users_org_idx on organization_users(organization_id);
create index organization_users_user_idx on organization_users(user_id);
