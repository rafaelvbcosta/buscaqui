import { sb } from './supabase.js?v=202611021901';

export const state = {
  session: null,
  user: null,
  profile: null,
  company: null,
  professional: null,
  resume: null,
  favorites: new Set(),
  applied: new Set(),
  subs: [],
};

export function clearState() {
  Object.assign(state, {
    session: null, user: null, profile: null, company: null,
    professional: null, resume: null, favorites: new Set(), applied: new Set(), subs: [],
  });
}

export async function loadUserData() {
  if (!state.user) return;
  const uid = state.user.id;
  const [p, c, pr, r, f, a, s] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('companies').select('*').eq('owner_id', uid).maybeSingle(),
    sb.from('professionals').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('resumes').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('favorites').select('job_id').eq('user_id', uid),
    sb.from('applications').select('job_id').eq('candidate_id', uid),
    sb.from('subscriptions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
  ]);
  state.profile = p.data || null;
  state.company = c.data || null;
  state.professional = pr.data || null;
  state.resume = r.data || null;
  state.favorites = new Set((f.data || []).map((x) => x.job_id));
  state.applied = new Set((a.data || []).map((x) => x.job_id));
  state.subs = s.data || [];
  state.trialEnds = null;
  if (state.company) {
    const t = await sb.rpc('company_trial_ends', { cid: state.company.id });
    state.trialEnds = t.data || null;
  }
  if (p.error) console.error(p.error);
}

export function role() {
  return state.profile?.role || state.user?.user_metadata?.role || 'candidato';
}

// ---------- Planos ----------
export const isAdmin = () => Boolean(state.profile?.is_admin);

// Plano ativo agora (ou null)
export function activePlan() {
  const now = Date.now();
  const ativos = state.subs.filter((x) => x.status === 'ativa' && Date.parse(x.starts_at) <= now && now < Date.parse(x.ends_at));
  const ordem = { profissional: 1, basico: 2, autonomo_destaque: 3 };
  ativos.sort((x, y) => ordem[x.plan] - ordem[y.plan]);
  if (!ativos.length) return null;
  // validade = fim da última assinatura ativa do mesmo plano (inclui renovações já pagas)
  const fim = Math.max(...state.subs.filter((x) => x.status === 'ativa' && x.plan === ativos[0].plan).map((x) => Date.parse(x.ends_at)));
  return { ...ativos[0], ends_at: new Date(fim).toISOString() };
}

export const pendingSub = () => state.subs.find((x) => x.status === 'pendente') || null;

// Empresa em dia (teste grátis ou plano ativo). Fora disso, vagas e divulgação ficam pausadas.
export const companyActive = () => trialDaysLeft() > 0 || Boolean(activePlan());

// Teste grátis da empresa: dias que faltam (0 = acabou)
export function trialDaysLeft() {
  if (!state.company?.created_at) return 0;
  // o teste conta pelo CNPJ (o banco guarda quando cada CNPJ começou o teste)
  const fim = state.trialEnds ? Date.parse(state.trialEnds) : Date.parse(state.company.created_at) + 30 * 864e5;
  return Math.max(0, Math.ceil((fim - Date.now()) / 864e5));
}

export function homeFor(r = role()) {
  if (isAdmin()) return '/admin';
  if (r === 'empresa') return '/painel';
  if (r === 'profissional') return '/pedidos';
  return '/vagas';
}
