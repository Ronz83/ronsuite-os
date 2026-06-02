import { createClient } from '@supabase/supabase-js';

export function createBrokerClient() {
  const url = process.env.NWS_BROKER_SUPABASE_URL;
  const serviceKey = process.env.NWS_BROKER_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('NWS_BROKER_SUPABASE_URL and NWS_BROKER_SUPABASE_SERVICE_ROLE_KEY must be defined in environment');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}
