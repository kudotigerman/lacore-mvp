-- Ensure every new auth user gets a profiles row with free credits (backup to app callback).

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, plan, credits_balance, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')), ''),
      split_part(NEW.email, '@', 1),
      'User'
    ),
    'free',
    20,
    'inactive'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();
