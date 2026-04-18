create table scanner_alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  grade text not null,
  dodgydd_score int not null,
  direction text not null,
  killzone text not null,
  ny_time text,
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
  action text,
  candle_body_pct float,
  candle_wick_ratio float,
  candles_to_invert int,
  close_vs_ifvg_edge float,
  outcome text,
  r_achieved float,
  execution_score int
);

alter table scanner_alerts enable row level security;
create policy "anon read" on scanner_alerts for select using (true);
create policy "anon insert" on scanner_alerts for insert with check (true);
create policy "anon update" on scanner_alerts for update using (true);
