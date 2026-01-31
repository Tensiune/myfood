import { createClient } from '@supabase/supabase-js';

// Using the credentials provided in the project context
const SUPABASE_URL = "https://ulaosfxeilccmptlpwxr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsYW9zZnhlaWxjY21wdGxwd3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTA2MjIsImV4cCI6MjA4NDU4NjYyMn0.dGtgbIr-V1cYdHW1Spo106fHL_87pEeIdiGYIhI-3Sc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'foodapp-auth-token',
  }
});