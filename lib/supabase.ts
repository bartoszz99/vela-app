import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://kefaloaydyachrccjzuy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZmFsb2F5ZHlhY2hyY2NqenV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTM5NjYsImV4cCI6MjA5MjI2OTk2Nn0.LdmIQlZhjraO6mho1w-aaYHshn5cztncoU76BsAeBE8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
