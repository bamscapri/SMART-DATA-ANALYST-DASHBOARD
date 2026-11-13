-- ==============================================================================
-- SMART AI DATA ANALYST DASHBOARD - ENTERPRISE GRANTS, TRIGGERS & STORAGE RLS
-- Safe, non-destructive additive migration for Project: hbfjcqqiqajwbnnoittc
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.datasets,
  public.dataset_files,
  public.dataset_sheets,
  public.analysis_results,
  public.ai_conversations,
  public.ai_messages,
  public.forecasts,
  public.reports,
  public.activity_logs,
  public.system_settings
TO authenticated;

GRANT SELECT ON public.system_settings TO anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, company)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'company', ''), 'Enterprise Organization')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

INSERT INTO public.system_settings (setting_key, setting_value, description, is_public)
VALUES (
  'enterprise_connectivity',
  jsonb_build_object('project_ref', 'hbfjcqqiqajwbnnoittc', 'storage_bucket', 'datasets', 'rls_enforced', true),
  'Canonical Supabase connectivity health verification record',
  true
)
ON CONFLICT (setting_key) DO UPDATE
SET
  setting_value = EXCLUDED.setting_value,
  is_public = true,
  updated_at = timezone('utc'::text, now());

INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users read own dataset objects" ON storage.objects;
CREATE POLICY "Users read own dataset objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'datasets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users upload own dataset objects" ON storage.objects;
CREATE POLICY "Users upload own dataset objects" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'datasets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own dataset objects" ON storage.objects;
CREATE POLICY "Users update own dataset objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'datasets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users delete own dataset objects" ON storage.objects;
CREATE POLICY "Users delete own dataset objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'datasets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
