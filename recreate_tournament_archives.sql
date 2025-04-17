-- Drop existing table if it exists
DROP TABLE IF EXISTS public.tournament_archives;

-- Create the table fresh with correct column names
CREATE TABLE public.tournament_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    savename TEXT,
    userid UUID,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    state_data JSONB
);

-- Add RLS policies
ALTER TABLE public.tournament_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON public.tournament_archives FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON public.tournament_archives FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON public.tournament_archives FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON public.tournament_archives FOR DELETE USING (true);

-- Refresh schema cache
SELECT pg_catalog.pg_reload_conf();

-- Verify table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tournament_archives'; 