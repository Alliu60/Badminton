-- Add the savename column if it doesn't exist
ALTER TABLE public.tournament_archives ADD COLUMN IF NOT EXISTS savename TEXT;

-- Make sure all columns exist
ALTER TABLE public.tournament_archives ADD COLUMN IF NOT EXISTS userid UUID;
ALTER TABLE public.tournament_archives ADD COLUMN IF NOT EXISTS club_id UUID;
ALTER TABLE public.tournament_archives ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tournament_archives ADD COLUMN IF NOT EXISTS state_data JSONB;

-- Refresh schema cache
SELECT pg_catalog.pg_reload_conf();

-- Check the final column structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tournament_archives'; 