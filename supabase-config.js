/**
 * supabase-config.js
 * ──────────────────
 * Replace the placeholder values below with your own Supabase project credentials.
 * Go to: https://supabase.com → Project Settings → API
 */

const supabaseUrl = "https://qxxjcmdbipwxfjulczpm.supabase.co";
const supabaseKey = "sb_publishable_rvpvDEUSPSt5Ou1bJ9AKow_xP1QFVTW";

// Initialize Supabase Client
window.supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Admin registration code — change this to something secret in production

