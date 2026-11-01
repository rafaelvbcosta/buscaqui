import { sb } from '../supabase.js';
import { state, loadUserData } from '../store.js';
import {
  ICON, esc, nl2br, avatar, options, empty, toast, modal, confirmBox, errMsg, setBusy, formData,
  maskPhone, maskCNPJ, waLink, dateBR, salaryRange, badgeStatus, uploadFile, STATUS_CANDIDATURA,
  CATEGORIAS_VAGA, MODALIDADES,
} from '../ui.js';
import { jobCard, wireJobButtons, resumeHtml } from './candidato.js';

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
  const open = jobs.filter((j) => j.status === 'aberta');
  const sum = (k) => jobs.reduce((s, j) => s + (j[k] || 0), 0);
  const c = state.company;
  el.innerHTML = `
    <div class="page-head row-between">
      <div class="row">${avatar(c.logo_url, c.name, 52, true)}<div><h1>Olá, ${esc(c.name)}</h1><p class="muted">Resumo das suas vagas</p></div></div>
      <a href="#/vaga-form" class="btn btn-primary">${ICON.plus} Publicar vaga</a>
    </div>
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
          <td>${j.status === 'aberta' ? '<span class="badge b-green">Aberta</span>' : '<span class="badge b-gray">Encerrada</span>'}</td>
          <td>${j.views}</td><td>${j.total}</td>
          <td>${j.novos ? `<span class="badge b-yellow">${j.novos}</span>` : '0'}</td>
          <td><a href="#/candidatos/${j.id}" class="btn btn-ghost btn-sm">Ver candidatos</a></td></tr>`).join('')}</tbody>
      </table></div>`
      : empty('briefcase', 'Você ainda não publicou vagas', 'Publique sua primeira vaga gratuitamente.', '<a class="btn btn-primary" href="#/vaga-form">Publicar vaga</a>')}
    </div>
    <div class="grid two-col">
      <div class="card soon">${ICON.chart}<div><b>Relatórios avançados</b><p class="muted small">Em breve: gráficos de cliques por dia e origem dos candidatos.</p></div></div>
      <div class="card soon">${ICON.star}<div><b>Planos e destaque de vagas</b><p class="muted small">Em breve: planos Básico e Profissional com vagas em destaque.</p></div></div>
    </div>`;
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
            ${j.status === 'aberta' ? '<span class="badge b-green">Aberta</span>' : '<span class="badge b-gray">Encerrada</span>'}</div>
          <p class="muted small">${esc(j.modality || '')} · ${esc(j.location || '')} · ${salaryRange(j.salary_min, j.salary_max)} · publicada em ${dateBR(j.created_at)}</p>
          <p class="small">${ICON.eye} ${j.views} visualizações · ${ICON.users} ${j.total} candidatos ${j.novos ? `· <b class="hl">${j.novos} novo(s)</b>` : ''}</p>
        </div>
        <div class="myjob-actions">
          <a class="btn btn-primary btn-sm" href="#/candidatos/${j.id}">${ICON.users} Candidatos</a>
          <a class="btn btn-ghost btn-sm" href="#/vaga-form/${j.id}">${ICON.edit} Editar</a>
          <button class="btn btn-ghost btn-sm" data-toggle="${j.id}" data-st="${j.status}">${j.status === 'aberta' ? 'Encerrar' : 'Reabrir'}</button>
          <button class="btn btn-ghost btn-sm danger" data-del="${j.id}" aria-label="Excluir">${ICON.trash}</button>
        </div>
      </div>`).join('')}</div>`
    : empty('briefcase', 'Nenhuma vaga ainda', 'Publique sua primeira vaga gratuitamente.', '<a class="btn btn-primary" href="#/vaga-form">Publicar vaga</a>')}`;
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
        <div class="two">
          <label>Salário de (R$)<input name="salary_min" type="number" min="0" step="50" value="${esc(j.salary_min)}" placeholder="Ex.: 1800"></label>
          <label>Salário até (R$)<input name="salary_max" type="number" min="0" step="50" value="${esc(j.salary_max)}" placeholder="Ex.: 2200"></label>
        </div>
        <p class="muted small">Deixe os dois em branco para mostrar "Salário a combinar".</p>
        <label>Localização<input name="location" value="${esc(j.location || state.company.city)}" placeholder="Ex.: Centro, Belo Horizonte - MG"></label>
        <label>Descrição da vaga<textarea name="description" rows="5" required placeholder="O que a pessoa vai fazer no dia a dia?">${esc(j.description)}</textarea></label>
        <label>Requisitos<textarea name="requirements" rows="3" placeholder="Escolaridade, experiência, CNH...">${esc(j.requirements)}</textarea></label>
        <label>Benefícios<textarea name="benefits" rows="3" placeholder="Vale-transporte, refeição, plano de saúde...">${esc(j.benefits)}</textarea></label>
        <button class="btn btn-primary btn-block btn-lg" type="submit">${id ? 'Salvar alterações' : 'Publicar vaga'}</button>
      </form>
    </div>`;
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.title || !d.category || !d.description) return toast('Preencha título, categoria e descrição.', 'err');
    const row = {
      ...d, company_id: state.company.id,
      salary_min: d.salary_min ? Number(d.salary_min) : null,
      salary_max: d.salary_max ? Number(d.salary_max) : null,
    };
    if (row.salary_min && row.salary_max && row.salary_min > row.salary_max) return toast('O salário "de" está maior que o "até".', 'err');
    const btn = f.querySelector('button'); setBusy(btn, true, 'Salvando...');
    const { error } = id ? await sb.from('jobs').update(row).eq('id', id) : await sb.from('jobs').insert(row);
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
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
        <label>CNPJ<input name="cnpj" value="${esc(c.cnpj)}" inputmode="numeric" placeholder="00.000.000/0000-00"></label>
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
    const row = { ...d, logo_url: logo || null, owner_id: state.user.id };
    const btn = f.querySelector('[type=submit]'); setBusy(btn, true, 'Salvando...');
    const { error } = isNew ? await sb.from('companies').insert(row) : await sb.from('companies').update(row).eq('id', c.id);
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
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
  const [{ data: c }, { data: jobs }] = await Promise.all([
    sb.from('companies').select('*').eq('id', id).maybeSingle(),
    sb.from('jobs').select('*, companies(id, name, logo_url, city)').eq('company_id', id).eq('status', 'aberta').order('created_at', { ascending: false }),
  ]);
  if (!alive()) return;
  if (!c) { el.innerHTML = empty('building', 'Empresa não encontrada'); return; }
  const wa = waLink(c.phone, `Olá! Vi a ${c.name} no BuscAqui.`);
  const insta = c.instagram ? `https://instagram.com/${c.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}` : '';
  const url = (u) => (u && !/^https?:\/\//.test(u) ? 'https://' + u : u);
  const isCompany = state.profile?.role === 'empresa';
  el.innerHTML = `
    <a href="javascript:history.back()" class="back-link">${ICON.back} Voltar</a>
    <div class="card company-hero">
      ${avatar(c.logo_url, c.name, 96, true)}
      <div class="grow"><h1>${esc(c.name)}</h1>
        <p class="muted">${esc(c.segment || '')}${c.segment && c.city ? ' · ' : ''}${esc(c.city || '')}</p>
        <p class="muted small">${ICON.star} Avaliações: em breve</p></div>
      <div class="row wrap">
        ${wa ? `<a class="btn btn-whats" href="${wa}" target="_blank" rel="noopener">${ICON.chat} Contato</a>` : ''}
        ${c.email ? `<a class="btn btn-ghost" href="mailto:${esc(c.email)}">${ICON.mail} E-mail</a>` : ''}
      </div>
    </div>
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
