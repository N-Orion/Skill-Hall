
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Substitua pelos dados do seu projeto Supabase.
const SUPABASE_URL = 'https://jplityvbdnvzmutlqnlx.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_jkcTFLWy4tr1hXgy-foVMQ_RVg_f_3B';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
