import { sb } from '../supabase.js?v=202611071815';
import { state, loadUserData, activePlan, pendingSub, pendingJobOrder, trialDaysLeft, companyActive, jobLive, promoActive, promoLastDay, trialStarts } from '../store.js?v=202611071815';
import {
  ICON, esc, nl2br, avatar, options, empty, toast, modal, confirmBox, errMsg, setBusy, formData,
  maskPhone, maskCNPJ, waLink, dateBR, salaryRange, badgeStatus, uploadFile, STATUS_CANDIDATURA,
  CATEGORIAS_VAGA, MODALIDADES, CATEGORIAS_EMPRESA, PLANOS, validCNPJ, checkCNPJ, isArcos, LIMITE_SERVICOS,
  moneyCents, pixBoxHtml, wirePixCopy, pixCode, newId,
} from '../ui.js?v=202611071815';
import { jobCard, wireJobButtons, resumeHtml } from './candidato.js?v=202611071815';
import { visibleServices } from './servicos.js?v=202611071815';

async function myJobsWithCounts() {
  const { data: jobs, error } = await sb.from('jobs').select('*')
    .eq('company_id', state.company.id).order('created_at', { ascending: false });
  if (error) throw error;
  const ids = (jobs || []).map((j) => j.id);
  let apps = [];
  if (ids.length) {
    const r = await sb.from('applications').select('id, job_id, status').in('job_id', ids);
    apps = r.data || [];
  }
  return (jobs || []).map((j) => {
    const a = apps.filter((x) => x.job_id === j.id);
    return { ...j, total: a.length, novos: a.filter((x) => x.status === 'enviada').length, entrevistas: a.filter((x) => x.status === 'entrevista').length };
  });
}

// ============================================================
// PAINEL
// ============================================================
export async function dashboard(el, _p, { alive }) {
  const jobs = await myJobsWithCounts();
  if (!alive()) return;
  const open = jobs.filter(jobLive);
  const sum = (k) => jobs.reduce((s, j) => s + (j[k] || 0), 0);
  const c = state.company;
  el.innerHTML = `
    <div class="page-head row-between">
      <div class="row">${avatar(c.logo_url, c.name, 52, true)}<div><h1>Olá, ${esc(c.name)}</h1><p class="muted">Resumo das suas vagas</p></div></div>
      <a href="#/vaga-form" class="btn btn-primary">${ICON.plus} Publicar vaga</a>
    </div>
    ${promoBanner()}${planBanner()}
    <div class="stats">
      <div class="stat">${ICON.briefcase}<b>${open.length}</b><span>Vagas abertas</span></div>
      <div class="stat">${ICON.eye}<b>${sum('views')}</b><span>Visualizações</span></div>
      <div class="stat">${ICON.users}<b>${sum('total')}</b><span>Candidatos</span></div>
      <div class="stat">${ICON.calendar}<b>${sum('entrevistas')}</b><span>Entrevistas</span></div>
    </div>
    <div class="card">
      <h2>Desempenho por vaga</h2>
      ${jobs.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Vaga</th><th>Status</th><th>Visualizações</th><th>Candidatos</th><th>Novos</th><th></th></tr></thead>
        <tbody>${jobs.map((j) => `<tr>
          <td><b>${esc(j.title)}</b></td>
          <td>${jobBadge(j, false)}</td>
          <td>${j.views}</td><td>${j.total}</td>
          <td>${j.novos ? `<span class="badge b-yellow">${j.novos}</span>` : '0'}</td>
          <td><a href="#/candidatos/${j.id}" class="btn btn-ghost btn-sm">Ver candidatos</a></td></tr>`).join('')}</tbody>
      </table></div>`
      : empty('briefcase', 'Você ainda não publicou vagas', 'Publique sua primeira vaga.', '<a class="btn btn-primary" href="#/vaga-form">Publicar vaga</a>')}
    </div>
    <div class="card cta-band">
      <div><h3>${state.professional ? 'Os serviços da empresa estão sendo divulgados' : 'Divulgue os serviços da sua empresa'}</h3>
      <p class="muted">${state.professional ? 'Sua empresa aparece em "Encontrar profissional".' : 'Apareça para quem procura uma oficina, um pet shop ou uma assistência técnica em Arcos. Incluído no teste grátis e nos planos.'}</p></div>
      <a href="#/divulgar" class="btn btn-secondary">${state.professional ? 'Editar divulgação' : 'Divulgar serviços'}</a>
    </div>
    <a href="#/planos" class="card soon">${ICON.star}<div><b>Planos Básico e Profissional</b><p class="muted small">Mais vagas por mês e sua empresa em destaque. A partir de R$ 29,90/mês.</p></div></a>`;
}

// Situação de cada vaga: Encerrada, Aberta, ou Pausada/Vencida (sem plano e fora do prazo grátis/pago)
function jobBadge(j, link) {
  if (j.status === 'aguardando') return '<span class="badge b-yellow">Aguardando pagamento</span>';
  if (j.status !== 'aberta') return '<span class="badge b-gray">Encerrada</span>';
  if (jobLive(j)) return '<span class="badge b-green">Aberta</span>';
  const txt = j.paid_until ? 'Vencida' : 'Pausada';
  // em Minhas vagas, ao lado aparece o botão de pagar/renovar (R$ 9,90) e o link para os planos
  return link ? `<a href="#/planos" class="badge b-yellow" title="Ver planos">${txt}: fora do ar</a>` : `<span class="badge b-yellow">${txt}</span>`;
}

// Prazo da vaga grátis/paga, mostrado quando a empresa não está com teste/plano em dia
function prazoVaga(j) {
  if (!j.paid_until || companyActive() || j.status !== 'aberta') return '';
  return Date.parse(j.paid_until) > Date.now() ? ` · <b>no ar até ${dateBR(j.paid_until)}</b>` : ` · venceu em ${dateBR(j.paid_until)}`;
}

// Promoção de lançamento (só aparece enquanto vale; a data é escolhida pelo admin)
export function promoBanner(withButton = true) {
  if (!promoActive()) return '';
  return `<div class="card plan-status promo">${ICON.star}<div class="grow"><b>Promoção de lançamento: publique vagas grátis até ${promoLastDay()}</b>
    <p class="muted small">Cada vaga publicada na promoção fica 30 dias no ar, sem custo.</p></div>
    ${withButton ? `<a href="#/vaga-form" class="btn btn-primary btn-sm">${ICON.plus} Publicar vaga</a>` : ''}</div>`;
}

// Aviso do plano no topo do painel
function planBanner() {
  const ativo = activePlan(), pend = pendingSub(), dias = trialDaysLeft();
  if (pend) return `<a href="#/planos" class="card plan-status trial">${ICON.clock}<div class="grow"><b>Pagamento do plano ${esc(PLANOS[pend.plan]?.nome || '')} aguardando confirmação</b>
    <p class="muted small">Assim que o Pix for confirmado, o plano é ativado.</p></div></a>`;
  if (ativo) return `<a href="#/planos" class="card plan-status ok">${ICON.star}<div class="grow"><b>Plano ${esc(PLANOS[ativo.plan].nome)}</b>
    <p class="muted small">Válido até ${dateBR(ativo.ends_at)}.</p></div><span class="btn btn-ghost btn-sm">Ver plano</span></a>`;
  const ini = trialStarts();
  if (ini && ini.getTime() > Date.now()) return `<a href="#/planos" class="card plan-status trial">${ICON.clock}<div class="grow"><b>Seu teste grátis de 30 dias começa em ${dateBR(ini.toISOString())}</b>
    <p class="muted small">Ele começa quando a promoção terminar: vagas ilimitadas e até ${LIMITE_SERVICOS} serviços divulgados.</p></div></a>`;
  if (dias > 0) return `<a href="#/planos" class="card plan-status trial">${ICON.clock}<div class="grow"><b>Teste grátis: falta${dias === 1 ? '' : 'm'} ${dias} dia${dias === 1 ? '' : 's'}</b>
    <p class="muted small">Vagas ilimitadas e até ${LIMITE_SERVICOS} serviços divulgados. Depois, escolha um plano para continuar.</p></div><span class="btn btn-secondary btn-sm">Ver planos</span></a>`;
  const venceu = state.subs.some((x) => x.status === 'ativa');
  return `<a href="#/planos" class="card plan-status warn">${ICON.ban}<div class="grow"><b>${venceu ? 'Seu plano venceu' : 'Seu teste grátis terminou'}: vagas e divulgação pausadas</b>
    <p class="muted small">${promoActive() ? 'Durante a promoção, as vagas novas são grátis. As vagas antigas e a divulgação voltam quando o pagamento de um plano for confirmado.' : `Nada foi apagado. Escolha um plano, ou coloque cada vaga no ar por ${moneyCents(PLANOS.vaga_avulsa.preco)} em Minhas vagas.`}</p></div><span class="btn btn-primary btn-sm">${venceu ? 'Renovar plano' : 'Escolher plano'}</span></a>`;
}

// ============================================================
// MINHAS VAGAS
// ============================================================
export async function myJobs(el, _p, ctx) {
  const jobs = await myJobsWithCounts();
  if (!ctx.alive()) return;
  el.innerHTML = `
    <div class="page-head row-between"><div><h1>Minhas vagas</h1><p class="muted">${jobs.length} vaga(s) publicada(s)</p></div>
      <a href="#/vaga-form" class="btn btn-primary">${ICON.plus} Nova vaga</a></div>
    ${jobs.length ? `<div class="stack">${jobs.map((j) => `
      <div class="card myjob">
        <div class="grow">
          <div class="row"><h3><a href="#/vaga/${j.id}">${esc(j.title)}</a></h3>
            ${jobBadge(j, true)}</div>
          <p class="muted small">${esc(j.modality || '')} · ${esc(j.location || '')} · ${salaryRange(j.salary_min, j.salary_max)} · publicada em ${dateBR(j.created_at)}${prazoVaga(j)}</p>
          ${pendingJobOrder(j.id) ? `<p class="small">${ICON.clock} Aguardando a confirmação do Pix · pedido <b class="pix-code">${esc(pixCode(pendingJobOrder(j.id)))}</b></p>` : ''}
          <p class="small">${ICON.eye} ${j.views} visualizações · ${ICON.users} ${j.total} candidatos ${j.novos ? `· <b class="hl">${j.novos} novo(s)</b>` : ''}</p>
        </div>
        <div class="myjob-actions">
          ${payActions(j)}
          ${j.status === 'aguardando' ? '' : `<a class="btn btn-primary btn-sm" href="#/candidatos/${j.id}">${ICON.users} Candidatos</a>`}
          <a class="btn btn-ghost btn-sm" href="#/vaga-form/${j.id}">${ICON.edit} Editar</a>
          ${j.status === 'aguardando' ? '' : `<button class="btn btn-ghost btn-sm" data-toggle="${j.id}" data-st="${j.status}">${j.status === 'aberta' ? 'Encerrar' : 'Reabrir'}</button>`}
          <button class="btn btn-ghost btn-sm danger" data-del="${j.id}" aria-label="Excluir">${ICON.trash}</button>
        </div>
      </div>`).join('')}</div>`
    : empty('briefcase', 'Nenhuma vaga ainda', 'Publique sua primeira vaga.', '<a class="btn btn-primary" href="#/vaga-form">Publicar vaga</a>')}`;
  wirePayActions(el, jobs, () => myJobs(el, _p, ctx));
  // veio do formulário de vaga com um pedido novo: mostra o Pix
  const novo = new URLSearchParams(location.hash.split('?')[1] || '').get('pix');
  if (novo) {
    history.replaceState(null, '', '#/minhas-vagas');
    const s = state.subs.find((x) => x.id === novo);
    if (s) showJobPix(s, jobs.find((x) => x.id === s.job_id)?.title);
  }
  el.querySelectorAll('[data-toggle]').forEach((b) => (b.onclick = async () => {
    const st = b.dataset.st === 'aberta' ? 'encerrada' : 'aberta';
    const { error } = await sb.from('jobs').update({ status: st }).eq('id', b.dataset.toggle);
    if (error) return toast(errMsg(error), 'err');
    toast(st === 'aberta' ? 'Vaga reaberta.' : 'Vaga encerrada.'); myJobs(el, _p, ctx);
  }));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('Excluir vaga', 'A vaga e todas as candidaturas dela serão apagadas. Deseja continuar?', 'Excluir', true))) return;
    const { error } = await sb.from('jobs').delete().eq('id', b.dataset.del);
    if (error) return toast(errMsg(error), 'err');
    toast('Vaga excluída.', 'info'); myJobs(el, _p, ctx);
  }));
}

// ---------- Vaga avulsa / renovação (R$ 9,90 por 30 dias no ar, pago por Pix) ----------
const PRECO_AVULSA = PLANOS.vaga_avulsa.preco;

// Botões de pagamento de uma vaga em Minhas vagas
function payActions(j) {
  const pend = pendingJobOrder(j.id);
  if (pend) return `<button class="btn btn-secondary btn-sm" data-pix="${pend.id}">${ICON.card} Ver Pix</button>
    <button class="btn btn-ghost btn-sm" data-cancel-order="${pend.id}">Cancelar pedido</button>`;
  if (j.status === 'aguardando') return `<button class="btn btn-secondary btn-sm" data-order="${j.id}">${ICON.card} Pagar ${moneyCents(PRECO_AVULSA)}</button>`;
  if (j.status === 'aberta' && !jobLive(j)) return `<button class="btn btn-secondary btn-sm" data-order="${j.id}">${ICON.card} ${j.paid_until ? 'Renovar' : 'Colocar no ar'} por ${moneyCents(PRECO_AVULSA)}</button>`;
  return '';
}

function wirePayActions(el, jobs, refresh) {
  el.querySelectorAll('[data-order]').forEach((b) => (b.onclick = async () => {
    const j = jobs.find((x) => x.id === b.dataset.order);
    setBusy(b, true, 'Gerando pedido...');
    const s = await orderJob(j.id);
    setBusy(b, false);
    if (!s) return;
    refresh();
    showJobPix(s, j.title);
  }));
  el.querySelectorAll('[data-pix]').forEach((b) => (b.onclick = () => {
    const s = state.subs.find((x) => x.id === b.dataset.pix);
    showJobPix(s, jobs.find((x) => x.id === s.job_id)?.title);
  }));
  el.querySelectorAll('[data-cancel-order]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('Cancelar pedido', 'Se você já fez o Pix, não cancele: aguarde a confirmação. Deseja cancelar este pedido?', 'Cancelar pedido', true))) return;
    const { error } = await sb.from('subscriptions').update({ status: 'cancelada' }).eq('id', b.dataset.cancelOrder);
    if (error) return toast(errMsg(error), 'err');
    await loadUserData();
    toast('Pedido cancelado.', 'info'); refresh();
  }));
}

// Cria o pedido de 30 dias no ar para uma vaga (o preço vem do banco)
async function orderJob(jobId) {
  const s = { id: newId(), user_id: state.user.id, plan: 'vaga_avulsa', job_id: jobId };
  const { error } = await sb.from('subscriptions').insert(s);
  if (error) { toast(errMsg(error), 'err'); return null; }
  await loadUserData();
  return state.subs.find((x) => x.id === s.id) || { ...s, price: PRECO_AVULSA, status: 'pendente', created_at: new Date().toISOString() };
}

async function showJobPix(s, title) {
  const { data } = await sb.from('app_settings').select('key, value');
  const pix = Object.fromEntries((data || []).map((x) => [x.key, x.value]));
  const m = modal('Pagamento da vaga', `
    <p>Vaga <b>${esc(title || '')}</b>: <b>${moneyCents(s.price || PRECO_AVULSA)}</b> por 30 dias no ar.</p>
    ${pixBoxHtml(pix, s.price || PRECO_AVULSA, s, 'Depois do pagamento, a equipe do BuscAqui confirma e a vaga entra no ar por 30 dias (normalmente em até 1 dia útil). Você acompanha em Minhas vagas.')}
    <div class="row-end"><button class="btn btn-primary" data-ok>Entendi</button></div>`);
  wirePixCopy(m.el, pix);
  m.el.querySelector('[data-ok]').onclick = m.close;
}

// ============================================================
// PUBLICAR / EDITAR VAGA
// ============================================================
export async function jobForm(el, [id], { go, alive }) {
  let j = {};
  if (id) {
    const { data } = await sb.from('jobs').select('*').eq('id', id).eq('company_id', state.company.id).maybeSingle();
    if (!alive()) return;
    if (!data) { el.innerHTML = empty('briefcase', 'Vaga não encontrada'); return; }
    j = data;
  }
  // sem teste/plano e sem promoção: a vaga nova é avulsa (paga por Pix)
  const pagar = !id && !promoActive() && !companyActive();
  el.innerHTML = `
    <a href="#/minhas-vagas" class="back-link">${ICON.back} Minhas vagas</a>
    <div class="card narrow">
      <h1>${id ? 'Editar vaga' : 'Publicar nova vaga'}</h1>
      <form id="f">
        <label>Título da vaga<input name="title" value="${esc(j.title)}" required placeholder="Ex.: Atendente de loja"></label>
        <div class="two">
          <label>Categoria<select name="category" required>${options(CATEGORIAS_VAGA, j.category, 'Escolha')}</select></label>
          <label>Modalidade<select name="modality" required>${options(MODALIDADES, j.modality || 'Presencial')}</select></label>
        </div>
        <label>Salário (R$)<input name="salary" type="number" min="0" step="1" value="${esc(j.salary_min ?? j.salary_max)}" placeholder="Ex.: 1800"></label>
        <p class="muted small">Deixe em branco para mostrar "Salário a combinar".</p>
        <label>Bairro<input name="location" value="${esc(j.location || '')}" placeholder="Ex.: Centro"></label>
        <label>Descrição da vaga<textarea name="description" rows="5" required placeholder="O que a pessoa vai fazer no dia a dia?">${esc(j.description)}</textarea></label>
        <label>Requisitos<textarea name="requirements" rows="3" placeholder="Escolaridade, experiência, CNH...">${esc(j.requirements)}</textarea></label>
        <label>Benefícios<textarea name="benefits" rows="3" placeholder="Vale-transporte, refeição, plano de saúde...">${esc(j.benefits)}</textarea></label>
        ${!id && promoActive() ? `<p class="promo-note">${ICON.star}<span><b>Grátis na promoção de lançamento:</b> esta vaga fica 30 dias no ar, sem custo.</span></p>` : ''}
        ${pagar ? `<div class="avulsa-note">${ICON.card}<div><b>Publique esta vaga por ${moneyCents(PRECO_AVULSA)}</b>
          <p class="small">Sua empresa está sem plano ativo. A vaga fica 30 dias no ar depois que o Pix for confirmado. Sem mensalidade.
          Prefere um plano mensal? <a href="#/planos">Veja os planos</a>.</p></div></div>` : ''}
        <button class="btn btn-primary btn-block btn-lg" type="submit">${id ? 'Salvar alterações' : pagar ? `Continuar para o pagamento (${moneyCents(PRECO_AVULSA)})` : 'Publicar vaga'}</button>
      </form>
    </div>`;
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.title || !d.category || !d.description) return toast('Preencha título, categoria e descrição.', 'err');
    // Um só campo de salário: guardado em salary_min e salary_max com o mesmo valor
    // (as colunas do banco continuam as mesmas; vagas antigas com faixa seguem aparecendo).
    const { salary, ...rest } = d;
    const valor = salary ? Number(salary) : null;
    const row = { ...rest, company_id: state.company.id, salary_min: valor, salary_max: valor };
    const btn = f.querySelector('button[type=submit]'); setBusy(btn, true, 'Salvando...');
    // vaga avulsa: guarda a vaga "aguardando pagamento" e cria o pedido do Pix
    const avulsa = async () => {
      const nova = { ...row, id: newId(), status: 'aguardando' };
      const r = await sb.from('jobs').insert(nova);
      if (r.error) { setBusy(btn, false); return toast(errMsg(r.error), 'err'); }
      const s = await orderJob(nova.id);
      setBusy(btn, false);
      toast('Vaga guardada! Agora faça o Pix para ela entrar no ar.');
      go(s ? `/minhas-vagas?pix=${s.id}` : '/minhas-vagas');
    };
    if (pagar) return avulsa();
    const { error } = id ? await sb.from('jobs').update(row).eq('id', id) : await sb.from('jobs').insert(row);
    if (error) {
      setBusy(btn, false);
      if (!id && /PLANO_NECESSARIO|LIMITE_VAGAS/.test(error.message || '')) {
        const lim = /LIMITE_VAGAS/.test(error.message || '');
        const ok = await confirmBox(lim ? 'Limite do plano Básico' : 'Sua empresa está sem plano',
          `${lim ? 'Você já publicou as 5 vagas do mês do plano Básico.' : 'O teste grátis terminou.'} Quer publicar esta vaga avulsa por ${moneyCents(PRECO_AVULSA)} (30 dias no ar, pagamento por Pix)?`,
          'Sim, continuar');
        if (ok) { setBusy(btn, true, 'Salvando...'); return avulsa(); }
        return;
      }
      return toast(errMsg(error), 'err');
    }
    setBusy(btn, false);
    toast(id ? 'Vaga atualizada! ✅' : 'Vaga publicada! 🎉');
    go('/minhas-vagas');
  };
}

// ============================================================
// CANDIDATOS DE UMA VAGA
// ============================================================
export async function candidates(el, [jobId], ctx) {
  const { data: job } = await sb.from('jobs').select('*').eq('id', jobId).eq('company_id', state.company.id).maybeSingle();
  if (!ctx.alive()) return;
  if (!job) { el.innerHTML = empty('briefcase', 'Vaga não encontrada'); return; }
  const { data: apps, error } = await sb.from('applications')
    .select('*, profiles(id, full_name, phone, email, avatar_url, city)')
    .eq('job_id', jobId).order('created_at', { ascending: false });
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const ids = (apps || []).map((a) => a.candidate_id);
  const { data: resumes } = ids.length ? await sb.from('resumes').select('*').in('user_id', ids) : { data: [] };
  if (!ctx.alive()) return;
  const cv = Object.fromEntries((resumes || []).map((r) => [r.user_id, r]));
  let filter = '';

  const draw = () => {
    const list = (apps || []).filter((a) => !filter || a.status === filter);
    el.innerHTML = `
      <a href="#/minhas-vagas" class="back-link">${ICON.back} Minhas vagas</a>
      <div class="page-head"><h1>Candidatos</h1><p class="muted">${esc(job.title)} · ${apps.length} candidato(s)</p></div>
      <div class="chips">
        <button class="chip ${!filter ? 'on' : ''}" data-f="">Todos</button>
        ${Object.entries(STATUS_CANDIDATURA).map(([k, v]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${v.label}</button>`).join('')}
      </div>
      ${list.length ? `<div class="stack">${list.map((a) => {
        const p = a.profiles || {}; const r = cv[a.candidate_id] || {};
        const wa = waLink(p.phone, `Olá, ${(p.full_name || '').split(' ')[0]}! Somos da ${state.company.name} e vimos sua candidatura para a vaga de ${job.title} no BuscAqui.`);
        return `<div class="card cand">
          <div class="cand-top">${avatar(p.avatar_url, p.full_name, 52)}
            <div class="grow"><h3>${esc(p.full_name || 'Candidato')}</h3>
              <p class="muted small">${esc(r.headline || '')}${r.headline ? ' · ' : ''}${esc(r.city || p.city || '')}</p>
              <p class="small">${p.phone ? `${ICON.phone} ${esc(p.phone)} ` : ''} ${p.email ? `· ${esc(p.email)}` : ''}</p>
              ${a.status === 'entrevista' && a.interview_at ? `<p class="interview">${ICON.calendar} Entrevista: <b>${dateBR(a.interview_at, true)}</b>${a.interview_note ? ` — ${esc(a.interview_note)}` : ''}</p>` : ''}
            </div>
            <div>${badgeStatus(a.status)}<p class="muted small">${dateBR(a.created_at)}</p></div>
          </div>
          <div class="cand-actions">
            <button class="btn btn-ghost btn-sm" data-cv="${a.id}">${ICON.file} Ver currículo</button>
            ${wa ? `<a class="btn btn-whats btn-sm" href="${wa}" target="_blank" rel="noopener">${ICON.chat} WhatsApp</a>` : ''}
            <button class="btn btn-ghost btn-sm" data-int="${a.id}">${ICON.calendar} Marcar entrevista</button>
            <button class="btn btn-ghost btn-sm ok" data-st="aprovada" data-id="${a.id}">${ICON.check} Aprovar</button>
            <button class="btn btn-ghost btn-sm danger" data-st="recusada" data-id="${a.id}">${ICON.x} Recusar</button>
          </div>
        </div>`; }).join('')}</div>`
      : empty('users', filter ? 'Nenhum candidato com este status' : 'Ainda não há candidatos', 'Quando alguém se candidatar, aparecerá aqui.')}`;

    el.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filter = b.dataset.f; draw(); }));
    el.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => setStatus(b.dataset.id, { status: b.dataset.st })));
    el.querySelectorAll('[data-cv]').forEach((b) => (b.onclick = () => showCv(apps.find((a) => a.id === b.dataset.cv))));
    el.querySelectorAll('[data-int]').forEach((b) => (b.onclick = () => interview(apps.find((a) => a.id === b.dataset.int))));
  };

  const setStatus = async (id, patch) => {
    const { error: e } = await sb.from('applications').update(patch).eq('id', id);
    if (e) return toast(errMsg(e), 'err');
    Object.assign(apps.find((a) => a.id === id), patch);
    toast(`Status atualizado: ${STATUS_CANDIDATURA[patch.status].label}`);
    draw();
  };

  const showCv = async (a) => {
    const p = a.profiles || {}; const r = cv[a.candidate_id];
    const m = modal('Currículo', `${r ? resumeHtml(p, r) : '<p class="muted">Este candidato ainda não preencheu o currículo no app.</p>'}
      <div id="pdfl"></div>`, { wide: true });
    if (r?.pdf_path) {
      const { data } = await sb.storage.from('curriculos').createSignedUrl(r.pdf_path, 3600);
      if (data) m.el.querySelector('#pdfl').innerHTML = `<a class="btn btn-primary" target="_blank" rel="noopener" href="${data.signedUrl}">${ICON.download} Abrir PDF enviado pelo candidato</a>`;
    }
    if (a.status === 'enviada') setStatus(a.id, { status: 'em_analise' });
  };

  const interview = (a) => {
    const pad = (n) => String(n).padStart(2, '0');
    const t = a.interview_at ? new Date(a.interview_at) : new Date(Date.now() + 86400000);
    const local = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(a.interview_at ? t.getHours() : 9)}:${pad(a.interview_at ? t.getMinutes() : 0)}`;
    const m = modal('Marcar entrevista', `
      <form id="fi">
        <label>Data e horário<input type="datetime-local" name="when" value="${local}" required></label>
        <label>Local ou observação<input name="note" value="${esc(a.interview_note)}" placeholder="Ex.: Rua das Flores, 120 — levar documento"></label>
        <div class="row-end"><button type="submit" class="btn btn-primary">Salvar entrevista</button></div>
      </form>`);
    m.el.querySelector('#fi').onsubmit = (e) => {
      e.preventDefault();
      const d = formData(e.target);
      m.close();
      setStatus(a.id, { status: 'entrevista', interview_at: new Date(d.when).toISOString(), interview_note: d.note || null });
    };
  };
  draw();
}

// ============================================================
// CADASTRO DA EMPRESA
// ============================================================
export function companyForm(el, _p, { go, refreshShell }) {
  const c = state.company || {};
  const isNew = !c.id;
  let logo = c.logo_url || '';
  el.innerHTML = `
    <div class="page-head"><h1>${isNew ? 'Cadastro da empresa' : 'Dados da empresa'}</h1>
      <p class="muted">${isNew ? 'Falta pouco! Preencha os dados da sua empresa para publicar vagas.' : 'Essas informações aparecem na página pública da empresa.'}</p></div>
    <form id="f" class="card narrow">
      <div class="photo-row"><div id="lg">${avatar(logo, c.name || 'E', 80, true)}</div>
        <label class="btn btn-ghost btn-sm file-btn">${ICON.upload} Enviar logo<input type="file" id="logo" accept="image/*" hidden></label></div>
      <label>Nome da empresa<input name="name" value="${esc(c.name)}" required></label>
      <div class="two">
        <label>CNPJ ${c.cnpj ? '' : '<small class="muted">(obrigatório)</small>'}<input name="cnpj" value="${esc(c.cnpj)}" inputmode="numeric" placeholder="00.000.000/0000-00" ${c.cnpj ? 'readonly' : 'required'}>
          ${c.cnpj ? '<small class="muted">Para corrigir o CNPJ, fale com o suporte do BuscAqui.</small>' : ''}</label>
        <label>Segmento<select name="segment">${options(CATEGORIAS_VAGA, c.segment, 'Escolha')}</select></label>
      </div>
      <label>Endereço<input name="address" value="${esc(c.address)}" placeholder="Rua, número, bairro"></label>
      <label>Cidade<input name="city" value="${esc(c.city)}" placeholder="Ex.: Belo Horizonte - MG"></label>
      <label>Sobre a empresa<textarea name="about" rows="4">${esc(c.about)}</textarea></label>
      <div class="two">
        <label>Telefone / WhatsApp<input name="phone" type="tel" value="${esc(c.phone || state.profile?.phone)}"></label>
        <label>E-mail de contato<input name="email" type="email" value="${esc(c.email || state.user.email)}"></label>
      </div>
      <h3>Redes sociais <small class="muted">(opcional)</small></h3>
      <div class="three">
        <label>Instagram<input name="instagram" value="${esc(c.instagram)}" placeholder="@suaempresa"></label>
        <label>LinkedIn<input name="linkedin" value="${esc(c.linkedin)}" placeholder="link da página"></label>
        <label>Site<input name="website" value="${esc(c.website)}" placeholder="www.suaempresa.com.br"></label>
      </div>
      <button class="btn btn-primary btn-block btn-lg" type="submit">${isNew ? 'Concluir cadastro' : 'Salvar'}</button>
      ${!isNew ? `<p class="center"><a href="#/empresa/${c.id}">Ver página pública da empresa</a></p>` : ''}
    </form>`;
  maskCNPJ(el.querySelector('[name=cnpj]'));
  maskPhone(el.querySelector('[name=phone]'));
  el.querySelector('#logo').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      toast('Enviando logo...', 'info');
      logo = await uploadFile(sb, 'logos', state.user.id, file, { maxMB: 2 });
      el.querySelector('#lg').innerHTML = avatar(logo, 'E', 80, true);
    } catch (err) { toast(errMsg(err), 'err'); }
  };
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.name) return toast('Informe o nome da empresa.', 'err');
    if (!validCNPJ(d.cnpj)) return toast('Informe um CNPJ válido (14 números).', 'err');
    const btn = f.querySelector('[type=submit]'); setBusy(btn, true, 'Conferindo o CNPJ...');
    if (!c.cnpj) {
      const ck = await checkCNPJ(d.cnpj);
      if (ck.found === false) { setBusy(btn, false); return toast('Este CNPJ não foi encontrado na Receita Federal. Confira os números.', 'err'); }
      if (ck.found && ck.situacao && ck.situacao !== 'ATIVA') { setBusy(btn, false); return toast(`Este CNPJ não está ativo na Receita Federal (situação: ${ck.situacao}).`, 'err'); }
      if (ck.found && !isArcos(ck)) {
        setBusy(btn, false);
        const ok = await confirmBox('CNPJ de outra cidade', `Este CNPJ é de ${ck.municipio || '?'} - ${ck.uf || '?'}. O BuscAqui é exclusivo para empresas de Arcos - MG. Deseja continuar mesmo assim? A equipe do BuscAqui vai analisar o cadastro.`, 'Continuar');
        if (!ok) return;
        setBusy(btn, true, 'Salvando...');
      }
    }
    const row = { ...d, logo_url: logo || null, owner_id: state.user.id };
    if (c.cnpj) delete row.cnpj;
    setBusy(btn, true, 'Salvando...');
    const { error } = isNew ? await sb.from('companies').insert(row) : await sb.from('companies').update(row).eq('id', c.id);
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    if (!isNew && state.professional?.company_id === c.id) {
      // Mantém a divulgação de serviços com o nome, a logo e o contato atualizados
      await sb.from('professionals').update(companyListingFields({ ...c, ...row })).eq('id', state.professional.id);
    }
    await loadUserData();
    refreshShell();
    toast(isNew ? 'Empresa cadastrada! Agora publique sua primeira vaga 🎉' : 'Dados salvos! ✅');
    go(isNew ? '/vaga-form' : '/painel');
  };
}

// ============================================================
// PÁGINA PÚBLICA DA EMPRESA
// ============================================================
export async function companyPage(el, [id], { alive }) {
  const [{ data: c }, { data: jobs }, { data: listing }] = await Promise.all([
    sb.from('companies').select('*').eq('id', id).maybeSingle(),
    sb.from('jobs').select('*, companies(id, name, logo_url, city)').eq('company_id', id).eq('status', 'aberta').order('created_at', { ascending: false }),
    sb.from('professionals').select('*').eq('company_id', id).maybeSingle(),
  ]);
  if (!alive()) return;
  if (!c) { el.innerHTML = empty('building', 'Empresa não encontrada'); return; }
  const dono = state.user && c.owner_id === state.user.id;
  let svcs = [];
  if (listing) {
    const { data: plano } = await sb.rpc('active_plan', { uid: c.owner_id });
    if (!alive()) return;
    svcs = visibleServices(listing, plano);
    if (!svcs.some((x) => x.descricao) && listing.about && svcs[0]) svcs = [{ ...svcs[0], descricao: listing.about }, ...svcs.slice(1)];
  }
  const wa = waLink(c.phone, `Olá! Vi a ${c.name} no BuscAqui.`);
  const insta = c.instagram ? `https://instagram.com/${c.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}` : '';
  const url = (u) => (u && !/^https?:\/\//.test(u) ? 'https://' + u : u);
  const isCompany = state.profile?.role === 'empresa';
  el.innerHTML = `
    <a href="javascript:history.back()" class="back-link">${ICON.back} Voltar</a>
    <div class="card company-hero">
      ${avatar(c.logo_url, c.name, 96, true)}
      <div class="grow"><h1>${esc(c.name)}</h1>
        <p class="muted">${esc(c.segment || '')}${c.segment && c.city ? ' · ' : ''}${esc(c.city || '')}</p></div>
      <div class="row wrap">
        ${wa ? `<a class="btn btn-whats" href="${wa}" target="_blank" rel="noopener">${ICON.chat} Contato</a>` : ''}
        ${c.email ? `<a class="btn btn-ghost" href="mailto:${esc(c.email)}">${ICON.mail} E-mail</a>` : ''}
      </div>
    </div>
    ${listing ? `<div class="card">
      <div class="row-between"><h2>Serviços oferecidos</h2>
        ${dono ? `<a href="#/divulgar" class="btn btn-secondary btn-sm">${ICON.edit} Editar divulgação</a>` : ''}</div>
      <ul class="svc-offer">${svcs.map((x) => `<li><span class="tag">${esc(x.categoria)}</span>${x.descricao ? `<span>${esc(x.descricao)}</span>` : ''}</li>`).join('')}</ul>
    </div>` : dono ? `<a href="#/divulgar" class="card cta-band"><div><h3>Divulgue os serviços da sua empresa</h3><p class="muted">Apareça para quem procura em Arcos.</p></div><span class="btn btn-secondary">Divulgar serviços</span></a>` : ''}
    <div class="detail">
      <div>
        <h2 class="section-title">Vagas abertas (${(jobs || []).length})</h2>
        <div class="stack" id="jobs">${(jobs || []).map(jobCard).join('') || empty('briefcase', 'Nenhuma vaga aberta no momento')}</div>
      </div>
      <aside class="card">
        <h3>Sobre a empresa</h3><p>${nl2br(c.about || 'Sem descrição.')}</p>
        ${c.address ? `<p class="small">${ICON.pin} ${esc(c.address)}${c.city ? ', ' + esc(c.city) : ''}</p>` : ''}
        <div class="links">
          ${insta ? `<a href="${esc(insta)}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${c.linkedin ? `<a href="${esc(url(c.linkedin))}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
          ${c.website ? `<a href="${esc(url(c.website))}" target="_blank" rel="noopener">${ICON.globe} Site</a>` : ''}
        </div>
      </aside>
    </div>`;
  if (isCompany) el.querySelectorAll('[data-apply],[data-fav]').forEach((b) => b.remove());
  else wireJobButtons(el.querySelector('#jobs'), () => companyPage(el, [id], { alive }));
}

// ============================================================
// DIVULGAR SERVIÇOS DA EMPRESA
// ============================================================
// Campos que vêm do cadastro da empresa (não são digitados de novo)
function companyListingFields(c) {
  return {
    name: c.name, phone: c.phone || null, city: c.city || null,
    address: c.address || null, avatar_url: c.logo_url || null,
  };
}

export function companyServices(el, _p, { go }) {
  const c = state.company;
  const cur = state.professional?.company_id === c.id ? state.professional : null;
  const limite = servicesLimit();
  // Cada serviço = categoria + descrição. Divulgações antigas (uma descrição só) viram o 1º serviço.
  let rows = (cur?.services || []).map((x) => ({ categoria: x.categoria || '', descricao: x.descricao || '' }));
  if (rows.length && cur?.about && !rows.some((r) => r.descricao)) rows[0].descricao = cur.about;
  if (!rows.length) rows = [{ categoria: '', descricao: '' }];

  const read = () => {
    rows = [...el.querySelectorAll('.svc')].map((r) => ({
      categoria: r.querySelector('select').value, descricao: r.querySelector('input').value.trim(),
    }));
  };
  const draw = () => {
    const cheio = limite && rows.length >= limite;
    el.innerHTML = `
      <div class="page-head"><h1>${cur ? 'Editar divulgação' : 'Divulgar serviços da empresa'}</h1>
        <p class="muted">Sua empresa aparece em "Encontrar profissional", com a etiqueta "Empresa", para quem procura esses serviços.</p></div>
      <form id="f" class="card narrow">
        <div class="row">${avatar(c.logo_url, c.name, 56, true)}
          <div><b>${esc(c.name)}</b><p class="muted small">${ICON.pin}${esc([c.address, c.city].filter(Boolean).join(', ') || 'Endereço não informado')}</p></div></div>
        <p class="muted small">Nome, logo, telefone e endereço vêm do <a href="#/empresa">cadastro da empresa</a>.</p>
        <h3>Quais serviços a empresa oferece?</h3>
        <p class="muted small">${limite ? `Seu plano permite até <b>${limite} serviços</b>. No plano <a href="#/planos">Profissional</a>, são ilimitados.` : 'Seu plano permite serviços ilimitados.'}</p>
        <div id="svcs">${rows.map((r, i) => `
          <div class="svc repeat">
            <label>Serviço ${i + 1}<select>${options(CATEGORIAS_EMPRESA, r.categoria, 'Escolha a categoria')}</select></label>
            <label>Descrição<input value="${esc(r.descricao)}" maxlength="200" placeholder="Ex.: Freios, suspensão e troca de óleo para carros e motos"></label>
            ${rows.length > 1 ? `<button type="button" class="link-btn danger small" data-del="${i}">Remover este serviço</button>` : ''}
          </div>`).join('')}</div>
        ${cheio ? `<p class="muted small">${ICON.star} Para divulgar mais serviços, mude para o plano <a href="#/planos">Profissional</a>.</p>`
          : `<button type="button" class="btn btn-ghost btn-sm" id="add">${ICON.plus} Adicionar outro serviço</button>`}
        <p class="muted small">Não é preciso informar valores.</p>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${cur ? 'Salvar alterações' : 'Divulgar serviços'}</button>
        ${cur ? `<button type="button" class="btn btn-ghost btn-block danger" id="stop">${ICON.trash} Parar de divulgar</button>` : ''}
      </form>`;
    el.querySelector('#add')?.addEventListener('click', () => { read(); rows.push({ categoria: '', descricao: '' }); draw(); });
    el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { read(); rows.splice(Number(b.dataset.del), 1); draw(); }));
    const f = el.querySelector('#f');
    f.onsubmit = async (e) => {
      e.preventDefault();
      read();
      const lista = rows.filter((r) => r.categoria);
      if (!lista.length) return toast('Escolha a categoria de pelo menos um serviço.', 'err');
      if (lista.some((r) => r.descricao.length < 5)) return toast('Escreva uma descrição curta para cada serviço.', 'err');
      if (limite && lista.length > limite) return toast(`Seu plano permite até ${limite} serviços.`, 'err');
      const row = {
        ...companyListingFields(c), user_id: state.user.id, company_id: c.id,
        services: lista, about: null, price: null,
      };
      const btn = f.querySelector('[type=submit]'); setBusy(btn, true, 'Salvando...');
      const { error } = cur
        ? await sb.from('professionals').update(row).eq('id', cur.id)
        : await sb.from('professionals').insert(row);
      setBusy(btn, false);
      if (error) {
        toast(errMsg(error), 'err');
        if (/PLANO_NECESSARIO|LIMITE_SERVICOS/.test(error.message || '')) go('/planos');
        return;
      }
      await loadUserData();
      toast(cur ? 'Divulgação atualizada! ✅' : 'Serviços divulgados! 🎉');
      go('/painel');
    };
    el.querySelector('#stop')?.addEventListener('click', async () => {
      if (!(await confirmBox('Parar de divulgar', 'Sua empresa vai sair da lista de serviços. Você pode divulgar de novo quando quiser.', 'Parar de divulgar', true))) return;
      const { error } = await sb.from('professionals').delete().eq('id', cur.id);
      if (error) return toast(errMsg(error), 'err');
      await loadUserData();
      toast('Divulgação encerrada.', 'info');
      go('/painel');
    });
  };
  draw();
}

// Quantos serviços a empresa pode divulgar: Profissional = sem limite; teste grátis e Básico = 3
function servicesLimit() {
  return activePlan()?.plan === 'profissional' ? 0 : LIMITE_SERVICOS;
}
