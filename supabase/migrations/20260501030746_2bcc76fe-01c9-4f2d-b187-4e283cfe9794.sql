-- 1. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'none';

-- 2. Constrain notification_channel values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_notification_channel_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_notification_channel_check
      CHECK (notification_channel IN ('none', 'email', 'sms', 'whatsapp'));
  END IF;
END$$;

-- 3. Backfill email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- 4. Backfill notification_channel based on what contact info exists
UPDATE public.profiles
SET notification_channel = CASE
  WHEN phone IS NOT NULL THEN 'whatsapp'
  WHEN email IS NOT NULL THEN 'email'
  ELSE 'none'
END
WHERE notification_channel = 'none';

-- 5. Validation trigger: every profile must have email or phone
CREATE OR REPLACE FUNCTION public.validate_profile_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL AND NEW.phone IS NULL THEN
    RAISE EXCEPTION 'profile must have at least an email or phone number';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_contact ON public.profiles;
CREATE TRIGGER profiles_validate_contact
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_contact();

-- 6. Update handle_new_user to capture email + set notification preference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone, email, notification_channel)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.phone,
      NEW.email
    ),
    NEW.phone,
    NEW.email,
    CASE
      WHEN NEW.phone IS NOT NULL THEN 'whatsapp'
      ELSE 'none'
    END
  );
  RETURN NEW;
END;
$$;