-- First, check if the table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_archives') THEN
        -- Create the table if it doesn't exist
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
    ELSE
        -- Table exists, ensure all columns exist with proper types
        DO $inner$ 
        BEGIN
            -- Add columns if they don't exist
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'savename') THEN
                ALTER TABLE public.tournament_archives ADD COLUMN savename TEXT;
            END IF;
            
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'userid') THEN
                ALTER TABLE public.tournament_archives ADD COLUMN userid UUID;
            END IF;
            
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'club_id') THEN
                ALTER TABLE public.tournament_archives ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
            END IF;
            
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'timestamp') THEN
                ALTER TABLE public.tournament_archives ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
            END IF;
            
            IF NOT EXISTS (SELECT FROM information_schema.columns 
                           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'state_data') THEN
                ALTER TABLE public.tournament_archives ADD COLUMN state_data JSONB;
            END IF;

            -- Drop any incorrect column if it exists (e.g., wrong casing)
            -- Commented out for safety - uncomment only if needed
            -- IF EXISTS (SELECT FROM information_schema.columns 
            --           WHERE table_schema = 'public' AND table_name = 'tournament_archives' AND column_name = 'saveName') THEN
            --     ALTER TABLE public.tournament_archives DROP COLUMN "saveName";
            -- END IF;
        END $inner$;
    END IF;
END $$;

-- Drop duplicate columns if needed (uncomment with caution):
-- ALTER TABLE public.tournament_archives DROP COLUMN IF EXISTS "saveName";

-- Always run this to verify schema is in sync
SELECT pg_catalog.pg_reload_conf();

-- Output current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tournament_archives'; 