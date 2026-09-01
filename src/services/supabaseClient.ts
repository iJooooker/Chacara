import { createClient } from '@supabase/supabase-js';

// Clean the base URL in case it has trailing paths
const rawUrl = 'https://ljvklaorekcdkosxozyd.supabase.co/rest/v1/';
const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = 'sb_publishable_iKv9sVX3x8UUX3eNI3wNnw_u_Z2W9u4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
