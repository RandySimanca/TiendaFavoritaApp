import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://slycdczdvnoeesdsberl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNseWNkY3pkdm5vZWVzZHNiZXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDk2ODUsImV4cCI6MjA4OTA4NTY4NX0.1pEUzMJTTqFZimZnZSZE2IeY0Wvn4-_Ojxcz2bEMOO4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
