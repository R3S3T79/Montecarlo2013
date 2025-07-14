import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token mancante o non valido' });
  }

  try {
    const { data, error: fetchError } = await supabase
      .from('pending_users')
      .select('*')
      .eq('confirmation_token', token)
      .single();

    if (fetchError || !data) {
      return res.status(400).json({ error: 'Token non valido o già confermato' });
    }

    if (data.confirmed) {
      return res.status(200).json({ message: 'Utente già confermato' });
    }

    const now = new Date();
    const expires = new Date(data.expires_at);
    if (now > expires) {
      return res.status(410).json({ error: 'Link scaduto' });
    }

    const { error: updateError } = await supabase
      .from('pending_users')
      .update({ confirmed: true })
      .eq('id', data.id);

    if (updateError) {
      return res.status(500).json({ error: 'Errore durante la conferma' });
    }

    // Redireziona dopo la conferma
    return res.redirect(302, '/welcome');
  } catch (err) {
    return res.status(500).json({ error: 'Errore interno', details: err.message });
  }
}