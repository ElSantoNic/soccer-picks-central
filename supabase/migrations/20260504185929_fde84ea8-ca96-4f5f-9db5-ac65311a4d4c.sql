ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 50);

ALTER TABLE public.league_members
  ADD CONSTRAINT league_members_display_name_length
  CHECK (char_length(display_name) <= 50);

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_name_length
  CHECK (char_length(name) <= 100);

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_description_length
  CHECK (description IS NULL OR char_length(description) <= 300);