-- ═══════════════════════════════════════════════════
-- SQL Schema for Tienda Favorita App (Supabase)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════

-- 1. Tabla de Precios
create table if not exists public.precios (
  id bigint primary key generated always as identity,
  nombre text not null,
  proveedor text,
  compra numeric default 0,
  venta numeric default 0,
  unidad text,
  created_at timestamp with time zone default now()
);

-- 2. Tabla de Historial de Días
create table if not exists public.historial (
  fecha date primary key,
  datos_json jsonb not null,
  total_vendido numeric default 0,
  created_at timestamp with time zone default now()
);

-- 3. Tabla de Retiros
create table if not exists public.retiros (
  id bigint primary key generated always as identity,
  fecha date not null,
  valor numeric not null,
  timestamp bigint,
  created_at timestamp with time zone default now()
);

-- 4. Tabla de Borradores (Drafts)
-- Esta tabla permite que el trabajador empiece un día y la dueña lo vea en su celular
create table if not exists public.borradores (
  key text primary key,
  datos_json jsonb not null,
  updated_at timestamp with time zone default now()
);

-- Habilitar Realtime para estas tablas para ver cambios al instante
alter publication supabase_realtime add table precios;
alter publication supabase_realtime add table historial;
alter publication supabase_realtime add table retiros;
alter publication supabase_realtime add table borradores;
