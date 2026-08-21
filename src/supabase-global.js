import { createClient } from '@supabase/supabase-js';

// Preserve the existing global contract while bundling Supabase locally with Vite.
window.supabase = Object.freeze({ createClient });
