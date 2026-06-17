import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qxxjcmdbipwxfjulczpm.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rvpvDEUSPSt5Ou1bJ9AKow_xP1QFVTW";

// Startup diagnostics
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key loaded:', supabaseKey ? '✓' : '✗ MISSING');

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin accounts are created by the system administrator via direct database inserts.
// No public admin registration is allowed.
