-- Storage buckets. Path convention: {organization_id}/{entity_type}/{entity_id}/{uuid}-{filename}
-- The first path segment is always the organization id, which every policy below checks.

insert into storage.buckets (id, name, public)
values ('org-files', 'org-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('org-public-assets', 'org-public-assets', true)
on conflict (id) do nothing;

-- ============ org-files (private: expenses, contracts, e-Factura archive, ...) ============

create policy org_files_select on storage.objects for select
  using (
    bucket_id = 'org-files'
    and is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy org_files_insert on storage.objects for insert
  with check (
    bucket_id = 'org-files'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN','EMPLOYEE'])
  );

create policy org_files_update on storage.objects for update
  using (
    bucket_id = 'org-files'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN','EMPLOYEE'])
  )
  with check (
    bucket_id = 'org-files'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN','EMPLOYEE'])
  );

create policy org_files_delete on storage.objects for delete
  using (
    bucket_id = 'org-files'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN'])
  );

-- ============ org-public-assets (public read: logos only) ============

create policy org_public_assets_select on storage.objects for select
  using (bucket_id = 'org-public-assets');

create policy org_public_assets_insert on storage.objects for insert
  with check (
    bucket_id = 'org-public-assets'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN'])
  );

create policy org_public_assets_update on storage.objects for update
  using (
    bucket_id = 'org-public-assets'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN'])
  )
  with check (
    bucket_id = 'org-public-assets'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN'])
  );

create policy org_public_assets_delete on storage.objects for delete
  using (
    bucket_id = 'org-public-assets'
    and has_org_role(((storage.foldername(name))[1])::uuid, array['OWNER','ADMIN'])
  );
