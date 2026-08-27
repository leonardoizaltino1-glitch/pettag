-- Estrutura sugerida para Supabase/PostgreSQL

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  name text,
  phone text,
  whatsapp text,
  created_at timestamptz default now()
);

create table pets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  public_code text not null unique,
  name text not null,
  species text,
  breed text,
  sex text,
  color text,
  city text,
  district text,
  address text,
  notes text,
  lost boolean not null default false,
  created_at timestamptz default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  uid text unique,
  pet_id uuid references pets(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz default now()
);

create index pets_public_code_idx on pets(public_code);
create index tags_uid_idx on tags(uid);
