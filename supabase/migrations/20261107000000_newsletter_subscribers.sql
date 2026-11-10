create table if not exists public.newsletter_subscribers (
  email text primary key,
  consented_at timestamptz not null,
  consent_version text not null,
  created_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_length check (char_length(email) between 3 and 320),
  constraint newsletter_subscribers_email_lowercase check (email = lower(email))
);

alter table public.newsletter_subscribers enable row level security;

revoke all on public.newsletter_subscribers from anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;

drop policy if exists "Allow newsletter consent inserts" on public.newsletter_subscribers;
create policy "Allow newsletter consent inserts"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and email = lower(email)
    and consent_version = 'v1'
  );
