import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://qxxjcmdbipwxfjulczpm.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_rvpvDEUSPSt5Ou1bJ9AKow_xP1QFVTW";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log("Checking columns of teams...");
  const { data: teamsData, error: teamsErr } = await supabase
    .from('teams')
    .select('*')
    .limit(1);
  if (teamsErr) {
    console.log("Error:", teamsErr);
  } else if (teamsData.length > 0) {
    console.log("Columns:", Object.keys(teamsData[0]).join(', '));
  } else {
    console.log("Table is empty, trying to insert a dummy row to get columns...");
    const { data: dummyData, error: dummyErr } = await supabase
      .from('teams')
      .insert([{ }])
      .select('*');
    if (dummyErr) {
       console.log("Insert error (can reveal columns):", dummyErr);
    }
  }
}

testQueries();
