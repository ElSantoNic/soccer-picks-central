
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone, email, notification_channel)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
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
$function$;

-- Backfill: scrub display_name where it looks like an email or phone
SELECT set_config('app.system_write', 'on', true);

UPDATE public.league_members
SET display_name = 'Jugador'
WHERE display_name ~ '@' OR display_name ~ '^\+?[0-9][0-9\s\-]{5,}$';

UPDATE public.profiles
SET display_name = NULL
WHERE display_name ~ '@' OR display_name ~ '^\+?[0-9][0-9\s\-]{5,}$';
