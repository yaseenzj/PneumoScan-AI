-- Supabase schema for PneumoniaXpert
-- This schema assumes the auth.users table corresponds to the default Supabase Auth.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT,
    result VARCHAR(50) NOT NULL CHECK (result IN ('Pneumonia', 'Normal')),
    confidence DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    patient_id VARCHAR(100)
);

-- Setup Row Level Security (RLS)
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own analyses
CREATE POLICY "Users can view their own analyses" ON public.analyses
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own analyses
CREATE POLICY "Users can insert their own analyses" ON public.analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own analyses
CREATE POLICY "Users can update their own analyses" ON public.analyses
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own analyses
CREATE POLICY "Users can delete their own analyses" ON public.analyses
    FOR DELETE USING (auth.uid() = user_id);
