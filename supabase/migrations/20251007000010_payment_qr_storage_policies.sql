-- Storage RLS policies for `payment-qr` bucket
-- Allows authenticated users to upload/read their own files under a folder named by their user id

-- Ensure bucket exists (no-op if it already does)
insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (usually enabled by default)
alter table storage.objects enable row level security;

-- Helper: first path folder must equal auth.uid()
-- Example path: <user_id>/filename.png

-- SELECT policy: public read for this bucket (since we use public URLs)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read payment-qr'
  ) then
    create policy "Public read payment-qr"
    on storage.objects
    for select
    using (bucket_id = 'payment-qr');
  end if;
end $$;

-- INSERT policy: authenticated users can upload into their own folder
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload to their payment folder'
  ) then
    create policy "Users can upload to their payment folder"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'payment-qr'
      and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    );
  end if;
end $$;

-- UPDATE policy: allow users to update their own files
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can update their payment files'
  ) then
    create policy "Users can update their payment files"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'payment-qr'
      and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    )
    with check (
      bucket_id = 'payment-qr'
      and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    );
  end if;
end $$;

-- DELETE policy: allow users to delete their own files
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can delete their payment files'
  ) then
    create policy "Users can delete their payment files"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'payment-qr'
      and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    );
  end if;
end $$;


