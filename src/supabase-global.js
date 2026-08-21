import { createClient } from '@supabase/supabase-js';

// Keep a mutable global contract for the legacy runtime bridge.
// core-runtime.js wraps createClient to provide one shared client and route cancellation.
window.supabase = { createClient };
