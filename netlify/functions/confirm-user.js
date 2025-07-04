// netlify/functions/confirm-user.js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event) {
  const token = event.queryStringParameters?.token;
  if (!token) return { statusCode: 400, body: 'Missing token' };

  // Chiama la tua RPC confirm_pending_user
  const { data, error } = await supabase.rpc('confirm_pending_user', { p_confirmation_token: token });
  if (error) {
    console.error(error);
    return { statusCode: 500, body: 'Errore di conferma' };
  }

  // Redirect al login
  return {
    statusCode: 302,
    headers: { Location: '/login?confirmed=1' }
  };
}
