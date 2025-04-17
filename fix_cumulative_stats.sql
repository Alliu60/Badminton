-- Check if cumulative_stats table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cumulative_stats'
);

-- Check structure if it exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cumulative_stats';

-- Create or replace the table with proper structure
DROP TABLE IF EXISTS public.cumulative_stats;

CREATE TABLE public.cumulative_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    stats JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.cumulative_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON public.cumulative_stats FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON public.cumulative_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON public.cumulative_stats FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON public.cumulative_stats FOR DELETE USING (true);

-- Verify final structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cumulative_stats'; 