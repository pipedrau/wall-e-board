import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzrqvtgcgmyficytpud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enJxdnRnY2dteWZpY3l0cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyNzIsImV4cCI6MjA4NzcyOTI3Mn0.D0uVaK1Y4sC5qKXJzYqL4z0eVTW0lZlvJ6P8KQd6nM';

export const supabase = createClient(supabaseUrl, supabaseKey);
