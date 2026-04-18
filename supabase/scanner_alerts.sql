-- scanner_alerts: ICT setup alert log for Isaac's NQ futures scanner
-- Run in Supabase SQL Editor. Enables RLS for anon read/insert.
-- outcome/r_achieved/execution_score are populated post-trade for adaptive learning.
-- update policy omitted intentionally — add when adaptive learning feature is built.

create table scanner_alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  grade text not null check (grade in ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'F')),
  dodgydd_score int not null check (dodgydd_score between 0 and 10),
  direction text not null check (direction in ('LONG', 'SHORT')),
  killzone text not null,
  ny_time time,
  htf_bias text,
  timeframes_aligned jsonb,
  sweep_type text,
  fvg_zone jsonb,
  entry_zone text,
  stop_level float,
  target text,
  rr float,
  confluences jsonb,
  reason text,
  action text check (action in ('TAKE IT', 'CONSIDER', 'SKIP')),
  candle_body_pct float,
  candle_wick_ratio float,
  candles_to_invert int,
  close_vs_ifvg_edge float,
  outcome text,
  r_achieved float,
  execution_score int check (execution_score between 0 and 10)
);

alter table scanner_alerts enable row level security;
create policy "anon read" on scanner_alerts for select using (true);
create policy "anon insert" on scanner_alerts for insert with check (true);

create index scanner_alerts_created_at_idx on scanner_alerts (created_at desc);
