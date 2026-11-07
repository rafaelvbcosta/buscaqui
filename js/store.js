import { sb } from './supabase.js?v=202611071815';

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
  promoAte: '', // último dia da promoção de lançamento (AAAA-MM-DD) ou ''
};

export function clearState() {
  Object.assign(state, {
    session: null, user: null, profile: null, company: null,
    professional: null, resume: null, favorites: new Set(), applied: new Set(), subs: [], promoAte: '',
  });
}

export async function loadUserData() {
  if (!state.user) return;
  const uid = state.user.id;
  const [p, c, pr, r, f, a, s, doc, promo] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
    sb.from('companies').select('*').eq('owner_id', uid).maybeSingle(),
    sb.from('professionals').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('resumes').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('favorites').select('job_id').eq('user_id', uid),
    sb.from('applications').select('job_id').eq('candidate_id', uid),
    sb.from('subscriptions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    sb.from('user_docs').select('cpf').eq('user_id', uid).maybeSingle(),
    sb.from('app_settings').select('key, value').eq('key', 'promo_ate').maybeSingle(),
  ]);
  state.profile = p.data || null;
  // o CPF fica em user_docs (só o dono e o admin leem); junta no perfil só para uso da tela
  if (state.profile) state.profile.cpf = doc.data?.cpf || null;
  state.company = c.data || null;
  state.professional = pr.data || null;
  state.resume = r.data || null;
  state.favorites = new Set((f.data || []).map((x) => x.job_id));
  state.applied = new Set((a.data || []).map((x) => x.job_id));
  state.subs = s.data || [];
  state.promoAte = /^\d{4}-\d{2}-\d{2}$/.test(promo.data?.value || '') ? promo.data.value : '';
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
  // vaga avulsa não é plano (só coloca uma vaga no ar)
  const ativos = state.subs.filter((x) => x.plan !== 'vaga_avulsa' && x.status === 'ativa' && Date.parse(x.starts_at) <= now && now < Date.parse(x.ends_at));
  const ordem = { profissional: 1, basico: 2, autonomo_destaque: 3 };
  ativos.sort((x, y) => ordem[x.plan] - ordem[y.plan]);
  if (!ativos.length) return null;
  // validade = fim da última assinatura ativa do mesmo plano (inclui renovações já pagas)
  const fim = Math.max(...state.subs.filter((x) => x.status === 'ativa' && x.plan === ativos[0].plan).map((x) => Date.parse(x.ends_at)));
  return { ...ativos[0], ends_at: new Date(fim).toISOString() };
}

export const pendingSub = () => state.subs.find((x) => x.status === 'pendente' && x.plan !== 'vaga_avulsa') || null;
// Pedido de vaga avulsa/renovação aguardando o Pix para uma vaga
export const pendingJobOrder = (jobId) => state.subs.find((x) => x.status === 'pendente' && x.plan === 'vaga_avulsa' && x.job_id === jobId) || null;

// Empresa em dia (teste grátis ou plano ativo). Fora disso, vagas e divulgação ficam pausadas.
export const companyActive = () => trialDaysLeft() > 0 || Boolean(activePlan());

// Teste grátis da empresa: dias que faltam (0 = acabou)
export function trialDaysLeft() {
  if (!state.company?.created_at) return 0;
  // o teste conta pelo CNPJ (o banco guarda quando cada CNPJ começou o teste)
  const fim = state.trialEnds ? Date.parse(state.trialEnds) : Date.parse(state.company.created_at) + 30 * 864e5;
  return Math.max(0, Math.ceil((fim - Date.now()) / 864e5));
}

// ---------- Promoção de lançamento ----------
// Vale até o fim do dia promoAte (horário de Brasília). O banco é quem decide de verdade (promo_active()).
export function promoEnds() {
  if (!state.promoAte) return null;
  return new Date(Date.parse(state.promoAte + 'T00:00:00-03:00') + 864e5);
}
export const promoActive = () => { const e = promoEnds(); return Boolean(e && Date.now() < e.getTime()); };
// Data (dd/mm/aaaa) do último dia da promoção
export const promoLastDay = () => state.promoAte ? state.promoAte.split('-').reverse().join('/') : '';

// Vaga no ar agora? (aberta e: empresa em dia, ou dentro do prazo grátis/pago da própria vaga)
export const jobLive = (j) => j.status === 'aberta' && (companyActive() || Boolean(j.paid_until && Date.parse(j.paid_until) > Date.now()));

// Início do teste grátis (para quem entrou na promoção, começa quando ela termina)
export function trialStarts() {
  return state.trialEnds ? new Date(Date.parse(state.trialEnds) - 30 * 864e5) : null;
}

export function homeFor(r = role()) {
  if (isAdmin()) return '/admin';
  if (r === 'empresa') return '/painel';
  if (r === 'profissional') return '/pedidos';
  return '/vagas';
}
