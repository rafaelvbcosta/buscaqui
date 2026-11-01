import { sb } from './supabase.js';

export const state = {
  session: null,
  user: null,
  profile: null,
  company: null,
  professional: null,
  resume: null,
  favorites: new Set(),
  applied: new Set(),
};

export function clearState() {
  Object.assign(state, {
    session: null, user: null, profile: null, company: null,
    professional: null, resume: null, favorites: new Set(), applied: new Set(),
  });
}

export async function loadUserData() {
  if (!state.user) return;
  const uid = state.user.id;
  const [p, c, pr, r, f, a] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('companies').select('*').eq('owner_id', uid).maybeSingle(),
    sb.from('professionals').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('resumes').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('favorites').select('job_id').eq('user_id', uid),
    sb.from('applications').select('job_id').eq('candidate_id', uid),
  ]);
  state.profile = p.data || null;
  state.company = c.data || null;
  state.professional = pr.data || null;
  state.resume = r.data || null;
  state.favorites = new Set((f.data || []).map((x) => x.job_id));
  state.applied = new Set((a.data || []).map((x) => x.job_id));
  if (p.error) console.error(p.error);
}

export function role() {
  return state.profile?.role || state.user?.user_metadata?.role || 'candidato';
}

export function homeFor(r = role()) {
  if (r === 'empresa') return '/painel';
  if (r === 'profissional') return '/pedidos';
  return '/vagas';
}
