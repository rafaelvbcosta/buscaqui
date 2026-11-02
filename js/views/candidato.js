import { sb } from '../supabase.js?v=202611022217';
import { state, loadUserData } from '../store.js?v=202611022217';
import {
  ICON, esc, nl2br, salaryRange, timeAgo, dateBR, avatar, options, loading, empty, toast, modal,
  confirmBox, errMsg, setBusy, formData, badgeStatus, uploadFile, maskPhone, waLink,
  CATEGORIAS_VAGA,
} from '../ui.js?v=202611022217';

// ============================================================
// Cartão de vaga (usado em várias telas)
// ============================================================
export function jobCard(j) {
  const c = j.companies || {};
  const fav = state.favorites.has(j.id);
  const applied = state.applied.has(j.id);
  return `
    <article class="card job-card" data-job="${j.id}">
      <div class="job-top">
        ${avatar(c.logo_url, c.name, 48, true)}
        <div class="job-head">
          <h3><a href="#/vaga/${j.id}">${esc(j.title)}</a></h3>
          <a class="muted" href="#/empresa/${c.id}">${esc(c.name || '')}</a>
        </div>
        <button class="icon-btn fav ${fav ? 'on' : ''}" data-fav="${j.id}" aria-label="Favoritar">${ICON.heart}</button>
      </div>
      <div class="job-meta">
        <span>${ICON.pin}${esc(j.location || 'Arcos')}</span>
        <span>${ICON.briefcase}${esc(j.modality || '—')}</span>
        ${j.category ? `<span class="tag">${esc(j.category)}</span>` : ''}
      </div>
      <div class="job-bottom">
        <strong class="salary">${salaryRange(j.salary_min, j.salary_max)}</strong>
        ${applied
          ? `<span class="badge b-green">${ICON.check} Candidatado</span>`
          : `<button class="btn btn-primary btn-sm" data-apply="${j.id}">Candidatar-se agora</button>`}
      </div>
    </article>`;
}

// Liga os botões de favoritar e candidatar dentro de um container
export function wireJobButtons(root, onChange) {
  root.querySelectorAll('[data-fav]').forEach((b) => (b.onclick = async (e) => {
    e.preventDefault();
    const id = b.dataset.fav;
    const uid = state.user.id;
    if (state.favorites.has(id)) {
      const { error } = await sb.from('favorites').delete().eq('user_id', uid).eq('job_id', id);
      if (error) return toast(errMsg(error), 'err');
      state.favorites.delete(id); b.classList.remove('on'); toast('Removida dos favoritos.', 'info');
    } else {
      const { error } = await sb.from('favorites').insert({ user_id: uid, job_id: id });
      if (error) return toast(errMsg(error), 'err');
      state.favorites.add(id); b.classList.add('on'); toast('Vaga salva nos favoritos ❤️');
    }
    onChange?.();
  }));
  root.querySelectorAll('[data-apply]').forEach((b) => (b.onclick = () => apply(b.dataset.apply, onChange)));
}

async function apply(jobId, onDone) {
  const send = async () => {
    const { error } = await sb.from('applications').insert({ job_id: jobId, candidate_id: state.user.id });
    if (error) return toast(errMsg(error), 'err');
    state.applied.add(jobId);
    toast('Candidatura enviada! Boa sorte 🍀');
    onDone?.();
  };
  if (!state.resume) {
    const m = modal('Seu currículo está vazio', `
      <p>As empresas vão ver seu currículo junto com a candidatura. Recomendamos preencher antes.</p>
      <div class="row-end"><button class="btn btn-ghost" data-send>Candidatar mesmo assim</button>
      <a class="btn btn-primary" href="#/curriculo" data-cv>Preencher currículo</a></div>`);
    m.el.querySelector('[data-send]').onclick = () => { m.close(); send(); };
    m.el.querySelector('[data-cv]').onclick = () => m.close();
    return;
  }
  if (await confirmBox('Confirmar candidatura', 'Seu currículo será enviado para a empresa. Deseja continuar?', 'Enviar candidatura')) send();
}

// ============================================================
// VAGAS (busca com filtros)
// ============================================================
export async function jobs(el, _p, { alive }) {
  const { data, error } = await sb.from('jobs')
    .select('*, companies(id, name, logo_url, city)')
    .eq('status', 'aberta').order('created_at', { ascending: false });
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const all = data || [];
  const f = JSON.parse(sessionStorage.getItem('bq_filters') || '{}');

  el.innerHTML = `
    <div class="page-head"><h1>Vagas</h1><p class="muted">Encontre a oportunidade certa para você.</p></div>
    <div class="card filters">
      <div class="search-box">${ICON.search}<input id="q" type="search" placeholder="Buscar cargo ou empresa" value="${esc(f.q || '')}"></div>
      <div class="filter-row cols-2">
        <select id="cat">${options(CATEGORIAS_VAGA, f.cat, 'Todas as categorias')}</select>
        <select id="sal">
          ${[['', 'Qualquer salário'], ['1500', 'A partir de R$ 1.500'], ['2000', 'A partir de R$ 2.000'], ['3000', 'A partir de R$ 3.000'], ['5000', 'A partir de R$ 5.000']]
            .map(([v, t]) => `<option value="${v}" ${f.sal === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="chips">
        <button class="chip ${f.fav ? 'on' : ''}" id="onlyfav">${ICON.heart} Só favoritas</button>
        <button class="chip" id="clear">Limpar filtros</button>
      </div>
    </div>
    <p class="muted small" id="count"></p>
    <div class="grid" id="list"></div>`;

  const list = el.querySelector('#list');
  const q = el.querySelector('#q'), cat = el.querySelector('#cat'), sal = el.querySelector('#sal');
  const favBtn = el.querySelector('#onlyfav');

  const draw = () => {
    const term = q.value.trim().toLowerCase();
    const min = Number(sal.value || 0);
    const onlyFav = favBtn.classList.contains('on');
    sessionStorage.setItem('bq_filters', JSON.stringify({ q: q.value, cat: cat.value, sal: sal.value, fav: onlyFav }));
    const res = all.filter((j) =>
      (!term || j.title.toLowerCase().includes(term) || (j.companies?.name || '').toLowerCase().includes(term)) &&
      (!cat.value || j.category === cat.value) &&
      (!min || Number(j.salary_max || j.salary_min || 0) >= min) &&
      (!onlyFav || state.favorites.has(j.id)));
    el.querySelector('#count').textContent = `${res.length} vaga${res.length === 1 ? '' : 's'} encontrada${res.length === 1 ? '' : 's'}`;
    list.innerHTML = res.length ? res.map(jobCard).join('')
      : empty('search', onlyFav ? 'Nenhuma vaga favorita ainda' : 'Nenhuma vaga encontrada', onlyFav ? 'Toque no coração de uma vaga para salvá-la aqui.' : 'Tente mudar os filtros.');
    wireJobButtons(list, draw);
  };
  [q, cat, sal].forEach((i) => i.addEventListener('input', draw));
  favBtn.onclick = () => { favBtn.classList.toggle('on'); draw(); };
  el.querySelector('#clear').onclick = () => { q.value = ''; cat.value = ''; sal.value = ''; favBtn.classList.remove('on'); draw(); };
  draw();
}

// ============================================================
// DETALHE DA VAGA
// ============================================================
export async function jobDetail(el, [id], { alive }) {
  const { data: j, error } = await sb.from('jobs').select('*, companies(*)').eq('id', id).maybeSingle();
  if (!alive()) return;
  if (error || !j) { el.innerHTML = empty('briefcase', 'Vaga não encontrada', 'Ela pode ter sido encerrada.', '<a class="btn btn-primary" href="#/vagas">Ver outras vagas</a>'); return; }
  if (!state.company || state.company.id !== j.company_id) sb.rpc('increment_job_view', { jid: id }).then(() => {});
  const c = j.companies || {};
  const isCompany = state.profile?.role === 'empresa';

  const draw = () => {
    const applied = state.applied.has(j.id);
    el.innerHTML = `
      <a href="#/vagas" class="back-link">${ICON.back} Voltar para vagas</a>
      <div class="detail">
        <div class="card">
          <div class="job-top">
            ${avatar(c.logo_url, c.name, 64, true)}
            <div class="job-head"><h1>${esc(j.title)}</h1><a href="#/empresa/${c.id}">${esc(c.name)}</a></div>
            ${isCompany ? '' : `<button class="icon-btn fav ${state.favorites.has(j.id) ? 'on' : ''}" data-fav="${j.id}" aria-label="Favoritar">${ICON.heart}</button>`}
          </div>
          <div class="job-meta">
            <span>${ICON.pin}${esc(j.location || 'Arcos')}</span>
            <span>${ICON.briefcase}${esc(j.modality || '—')}</span>
            ${j.category ? `<span class="tag">${esc(j.category)}</span>` : ''}
            <span>${ICON.clock}Publicada ${timeAgo(j.created_at)}</span>
          </div>
          <p class="salary big">${salaryRange(j.salary_min, j.salary_max)}</p>
          ${j.status !== 'aberta' ? '<p class="badge b-red">Vaga encerrada</p>' : ''}
          ${j.description ? `<h3>Descrição</h3><p>${nl2br(j.description)}</p>` : ''}
          ${j.requirements ? `<h3>Requisitos</h3><p>${nl2br(j.requirements)}</p>` : ''}
          ${j.benefits ? `<h3>Benefícios</h3><p>${nl2br(j.benefits)}</p>` : ''}
        </div>
        <aside class="card side-cta">
          ${isCompany ? '<p class="muted">Você está vendo esta vaga como empresa.</p>'
            : applied ? `<p class="badge b-green big-badge">${ICON.check} Você já se candidatou</p><a href="#/candidaturas" class="btn btn-ghost btn-block">Ver minhas candidaturas</a>`
            : j.status === 'aberta' ? `<button class="btn btn-primary btn-block btn-lg" data-apply="${j.id}">Candidatar-se agora</button>` : ''}
          <div class="company-mini">
            ${avatar(c.logo_url, c.name, 40, true)}
            <div><b>${esc(c.name)}</b><br><span class="muted small">${esc(c.segment || '')}</span></div>
          </div>
          <a href="#/empresa/${c.id}" class="btn btn-outline btn-block">Ver empresa</a>
        </aside>
      </div>`;
    wireJobButtons(el, draw);
  };
  draw();
}

// ============================================================
// MINHAS CANDIDATURAS
// ============================================================
export async function applications(el, _p, { alive }) {
  const { data, error } = await sb.from('applications')
    .select('*, jobs(id, title, status, location, modality, companies(id, name, logo_url, phone))')
    .eq('candidate_id', state.user.id).order('created_at', { ascending: false });
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const list = data || [];
  el.innerHTML = `
    <div class="page-head"><h1>Minhas candidaturas</h1><p class="muted">Acompanhe o andamento de cada vaga.</p></div>
    ${list.length ? `<div class="stack">${list.map((a) => {
      const j = a.jobs || {}; const c = j.companies || {};
      return `<div class="card app-row">
        ${avatar(c.logo_url, c.name, 48, true)}
        <div class="grow">
          <h3><a href="#/vaga/${j.id}">${esc(j.title || 'Vaga removida')}</a></h3>
          <p class="muted">${esc(c.name || '')} · enviada em ${dateBR(a.created_at)}</p>
          ${a.status === 'entrevista' && a.interview_at ? `<p class="interview">${ICON.calendar} Entrevista: <b>${dateBR(a.interview_at, true)}</b>${a.interview_note ? ` — ${esc(a.interview_note)}` : ''}</p>` : ''}
        </div>
        <div class="app-side">${badgeStatus(a.status)}
          ${a.status === 'enviada' ? `<button class="link-btn danger small" data-cancel="${a.id}" data-job="${j.id}">Cancelar</button>` : ''}
        </div>
      </div>`; }).join('')}</div>`
    : empty('list', 'Você ainda não se candidatou', 'Encontre uma vaga e toque em "Candidatar-se agora".', '<a class="btn btn-primary" href="#/vagas">Ver vagas</a>')}
    <div class="card soon">${ICON.chat}<div><b>Chat com as empresas</b><p class="muted small">Em breve você poderá conversar direto com o recrutador por aqui.</p></div></div>`;
  el.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('Cancelar candidatura', 'Tem certeza? A empresa não verá mais seu currículo nesta vaga.', 'Cancelar candidatura', true))) return;
    const { error } = await sb.from('applications').delete().eq('id', b.dataset.cancel);
    if (error) return toast(errMsg(error), 'err');
    state.applied.delete(b.dataset.job);
    toast('Candidatura cancelada.', 'info');
    applications(el, _p, { alive });
  }));
}

// ============================================================
// CURRÍCULO FÁCIL
// ============================================================
const blankExp = () => ({ cargo: '', empresa: '', periodo: '', descricao: '' });
const blankEdu = () => ({ curso: '', instituicao: '', periodo: '' });
const blankCert = () => ({ nome: '', instituicao: '', ano: '' });

export async function resumeForm(el, _p, { refreshShell }) {
  const p = state.profile || {};
  const r = state.resume || {};
  const data = {
    exp: (r.experiences?.length ? r.experiences : [blankExp()]),
    edu: (r.education?.length ? r.education : [blankEdu()]),
    cert: (r.certificates?.length ? r.certificates : []),
  };
  let avatarUrl = p.avatar_url || '';
  let pdfPath = r.pdf_path || '';

  const expHtml = (x, i) => `
    <div class="repeat" data-i="${i}">
      <div class="two"><label>Cargo<input data-k="cargo" value="${esc(x.cargo)}" placeholder="Ex.: Vendedor"></label>
      <label>Empresa<input data-k="empresa" value="${esc(x.empresa)}"></label></div>
      <label>Período<input data-k="periodo" value="${esc(x.periodo)}" placeholder="Ex.: 2021 – 2023 ou 2022 – atual"></label>
      <label>O que você fazia?<textarea data-k="descricao" rows="2">${esc(x.descricao)}</textarea></label>
      <button type="button" class="link-btn danger small" data-del>Remover</button>
    </div>`;
  const eduHtml = (x, i) => `
    <div class="repeat" data-i="${i}">
      <div class="two"><label>Curso / Escolaridade<input data-k="curso" value="${esc(x.curso)}" placeholder="Ex.: Ensino médio completo"></label>
      <label>Instituição<input data-k="instituicao" value="${esc(x.instituicao)}"></label></div>
      <label>Período / Conclusão<input data-k="periodo" value="${esc(x.periodo)}"></label>
      <button type="button" class="link-btn danger small" data-del>Remover</button>
    </div>`;
  const certHtml = (x, i) => `
    <div class="repeat" data-i="${i}">
      <div class="three"><label>Certificado / Curso<input data-k="nome" value="${esc(x.nome)}" placeholder="Ex.: NR-35"></label>
      <label>Instituição<input data-k="instituicao" value="${esc(x.instituicao)}"></label>
      <label>Ano<input data-k="ano" value="${esc(x.ano)}" inputmode="numeric"></label></div>
      <button type="button" class="link-btn danger small" data-del>Remover</button>
    </div>`;

  el.innerHTML = `
    <div class="page-head"><h1>Currículo fácil</h1><p class="muted">Preencha com calma. Você pode salvar e voltar depois.</p></div>
    <form id="f" class="stack">
      <section class="card">
        <h2>1. Dados pessoais</h2>
        <div class="photo-row">
          <div id="ph">${avatar(avatarUrl, p.full_name, 80)}</div>
          <label class="btn btn-ghost btn-sm file-btn">${ICON.upload} Foto (opcional)<input type="file" id="photo" accept="image/*" hidden></label>
        </div>
        <div class="two">
          <label>Nome completo<input name="full_name" value="${esc(p.full_name)}" required></label>
          <label>Telefone / WhatsApp<input name="phone" value="${esc(p.phone)}" type="tel"></label>
        </div>
        <label>E-mail<input value="${esc(p.email || state.user.email)}" disabled></label>
        <label>Cargo que procura<input name="headline" value="${esc(r.headline)}" placeholder="Ex.: Auxiliar administrativo"></label>
        <label>Sobre você<textarea name="about" rows="3" placeholder="Conte em poucas linhas quem você é e o que busca.">${esc(r.about)}</textarea></label>
      </section>
      <section class="card"><h2>2. Experiências</h2><div id="exp"></div>
        <button type="button" class="btn btn-ghost btn-sm" data-add="exp">${ICON.plus} Adicionar experiência</button></section>
      <section class="card"><h2>3. Formação</h2><div id="edu"></div>
        <button type="button" class="btn btn-ghost btn-sm" data-add="edu">${ICON.plus} Adicionar formação</button></section>
      <section class="card"><h2>4. Habilidades</h2>
        <label>Separe por vírgula<input name="skills" value="${esc((r.skills || []).join(', '))}" placeholder="Ex.: Atendimento ao cliente, Excel, Pontualidade"></label></section>
      <section class="card"><h2>5. Certificados</h2><div id="cert"></div>
        <button type="button" class="btn btn-ghost btn-sm" data-add="cert">${ICON.plus} Adicionar certificado</button></section>
      <section class="card"><h2>6. Currículo em PDF <small class="muted">(opcional)</small></h2>
        <p class="muted small">Já tem um currículo pronto? Envie o arquivo PDF (até 5 MB).</p>
        <div id="pdfbox"></div>
        <label class="btn btn-ghost btn-sm file-btn">${ICON.upload} Enviar PDF<input type="file" id="pdf" accept="application/pdf" hidden></label>
        <p class="muted small">Vídeo de apresentação: em breve.</p></section>
      <div class="sticky-save"><button class="btn btn-primary btn-lg btn-block" type="submit">Salvar currículo</button></div>
    </form>`;

  const lists = { exp: [expHtml, blankExp], edu: [eduHtml, blankEdu], cert: [certHtml, blankCert] };
  const collect = (key) => [...el.querySelectorAll(`#${key} .repeat`)].map((row) => {
    const o = {}; row.querySelectorAll('[data-k]').forEach((i) => (o[i.dataset.k] = i.value.trim())); return o;
  });
  const drawList = (key) => {
    const box = el.querySelector('#' + key);
    box.innerHTML = data[key].map(lists[key][0]).join('');
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      data[key] = collect(key); data[key].splice(Number(b.closest('.repeat').dataset.i), 1); drawList(key);
    }));
  };
  Object.keys(lists).forEach(drawList);
  el.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.add; data[k] = collect(k); data[k].push(lists[k][1]()); drawList(k);
  }));
  maskPhone(el.querySelector('[name=phone]'));

  const drawPdf = () => {
    el.querySelector('#pdfbox').innerHTML = pdfPath
      ? `<p class="file-ok">${ICON.file} PDF enviado <button type="button" class="link-btn small" id="seepdf">ver arquivo</button></p>` : '';
    el.querySelector('#seepdf')?.addEventListener('click', async () => {
      const { data: s, error } = await sb.storage.from('curriculos').createSignedUrl(pdfPath, 600);
      if (error) return toast(errMsg(error), 'err');
      window.open(s.signedUrl, '_blank');
    });
  };
  drawPdf();

  el.querySelector('#photo').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      toast('Enviando foto...', 'info');
      avatarUrl = await uploadFile(sb, 'avatars', state.user.id, file, { maxMB: 2 });
      el.querySelector('#ph').innerHTML = avatar(avatarUrl, p.full_name, 80);
      toast('Foto carregada. Clique em Salvar.');
    } catch (err) { toast(errMsg(err), 'err'); }
  };
  el.querySelector('#pdf').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.type !== 'application/pdf') return toast('Escolha um arquivo PDF.', 'err');
    try {
      toast('Enviando PDF...', 'info');
      pdfPath = await uploadFile(sb, 'curriculos', state.user.id, file, { maxMB: 5, name: 'curriculo' });
      drawPdf(); toast('PDF carregado. Clique em Salvar.');
    } catch (err) { toast(errMsg(err), 'err'); }
  };

  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.full_name) return toast('Informe seu nome.', 'err');
    const btn = f.querySelector('[type=submit]');
    setBusy(btn, true, 'Salvando...');
    const notEmpty = (o) => Object.values(o).some((v) => v);
    const [r1, r2] = await Promise.all([
      sb.from('profiles').update({ full_name: d.full_name, phone: d.phone, avatar_url: avatarUrl || null }).eq('id', state.user.id),
      sb.from('resumes').upsert({
        user_id: state.user.id, headline: d.headline, about: d.about,
        experiences: collect('exp').filter(notEmpty), education: collect('edu').filter(notEmpty),
        certificates: collect('cert').filter(notEmpty),
        skills: d.skills.split(',').map((s) => s.trim()).filter(Boolean),
        pdf_path: pdfPath || null, updated_at: new Date().toISOString(),
      }),
    ]);
    setBusy(btn, false);
    const err = r1.error || r2.error;
    if (err) return toast(errMsg(err), 'err');
    await loadUserData();
    refreshShell();
    toast('Currículo salvo! ✅');
    location.hash = '#/previa';
  };
}

// ============================================================
// PRÉVIA E PDF
// ============================================================
// Endereço do site (muda sozinho se um dia usarmos domínio próprio)
const siteUrl = () => (location.host + location.pathname).replace(/\/$/, '').replace(/\/index\.html$/, '');

export function resumeHtml(p, r) {
  r = r || {};
  const sec = (t, body) => (body ? `<section><h3>${t}</h3>${body}</section>` : '');
  return `
    <div class="cv">
      <header class="cv-head">
        ${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" crossorigin="anonymous">` : ''}
        <div><h2>${esc(p.full_name)}</h2>
          ${r.headline ? `<p class="cv-role">${esc(r.headline)}</p>` : ''}
          <p class="cv-contact">${[p.phone, p.email, r.city || p.city || 'Arcos - MG'].filter(Boolean).map(esc).join(' · ')}</p></div>
      </header>
      ${sec('Sobre', r.about ? `<p>${nl2br(r.about)}</p>` : '')}
      ${sec('Experiência profissional', (r.experiences || []).map((x) => `
        <div class="cv-item"><b>${esc(x.cargo)}</b>${x.empresa ? ` — ${esc(x.empresa)}` : ''}
        ${x.periodo ? `<span class="cv-date">${esc(x.periodo)}</span>` : ''}
        ${x.descricao ? `<p>${nl2br(x.descricao)}</p>` : ''}</div>`).join(''))}
      ${sec('Formação', (r.education || []).map((x) => `
        <div class="cv-item"><b>${esc(x.curso)}</b>${x.instituicao ? ` — ${esc(x.instituicao)}` : ''}
        ${x.periodo ? `<span class="cv-date">${esc(x.periodo)}</span>` : ''}</div>`).join(''))}
      ${sec('Habilidades', (r.skills || []).length ? `<p class="cv-skills">${r.skills.map((s) => `<span>${esc(s)}</span>`).join('')}</p>` : '')}
      ${sec('Certificados', (r.certificates || []).map((x) => `
        <div class="cv-item"><b>${esc(x.nome)}</b>${x.instituicao ? ` — ${esc(x.instituicao)}` : ''}${x.ano ? ` (${esc(x.ano)})` : ''}</div>`).join(''))}
      <footer class="cv-foot">
        <img src="assets/icone.png" alt="">
        <span><b>Currículo feito no BuscAqui</b> · Vagas e serviços em Arcos - MG<br>
        Monte o seu grátis em <b>${esc(siteUrl())}</b></span>
      </footer>
    </div>`;
}

// Ícone em formato que o PDF entende (data URL). Se falhar, o rodapé sai sem o ícone.
async function imageData(src) {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
  } catch { return null; }
}

// Rodapé desenhado no pé de CADA página A4 do PDF (com numeração quando há mais de uma)
function drawPdfFooter(pdf, icon) {
  const n = pdf.internal.getNumberOfPages();
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const left = 12, y1 = H - 13, y2 = H - 8.8;
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(227, 232, 228); pdf.setLineWidth(0.3); pdf.line(left, H - 19, W - left, H - 19);
    const tx = icon ? left + 10 : left;
    if (icon) pdf.addImage(icon, 'PNG', left, H - 16.6, 8, 8);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(0, 53, 21);
    const t1 = 'Currículo feito no BuscAqui';
    pdf.text(t1, tx, y1);
    const w1 = pdf.getTextWidth(t1); // medir ainda com a fonte em negrito
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(94, 107, 99);
    pdf.text('  ·  Vagas e serviços em Arcos - MG', tx + w1, y1);
    pdf.text(`Monte o seu grátis em ${siteUrl()}`, tx, y2);
    if (n > 1) pdf.text(`Página ${i} de ${n}`, W - left, y1, { align: 'right' });
  }
}

function loadHtml2pdf() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
}

export async function resumePreview(el) {
  const p = state.profile || {};
  const r = state.resume;
  if (!r) {
    el.innerHTML = empty('file', 'Seu currículo ainda está vazio', 'Preencha o Currículo fácil para ver a prévia e baixar em PDF.', '<a class="btn btn-primary" href="#/curriculo">Preencher agora</a>');
    return;
  }
  el.innerHTML = `
    <div class="page-head row-between"><div><h1>Prévia do currículo</h1><p class="muted">É assim que as empresas veem você.</p></div>
      <div class="row"><a href="#/curriculo" class="btn btn-ghost">${ICON.edit} Editar</a>
      <button class="btn btn-primary" id="dl">${ICON.download} Baixar PDF</button></div></div>
    <div class="paper" id="paper">${resumeHtml(p, r)}</div>
    ${r.pdf_path ? `<p class="center"><button class="link-btn" id="mypdf">${ICON.file} Ver o PDF que você enviou</button></p>` : ''}`;
  el.querySelector('#dl').onclick = async (e) => {
    const btn = e.currentTarget;
    setBusy(btn, true, 'Gerando PDF...');
    try {
      const [, icon] = await Promise.all([loadHtml2pdf(), imageData('assets/icone.png')]);
      const name = (p.full_name || 'curriculo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\W+/g, '-').toLowerCase();
      const paper = el.querySelector('#paper .cv');
      paper.classList.add('pdf-mode'); // o rodapé da tela some; no PDF ele é desenhado no pé de cada página
      try {
        await window.html2pdf().set({
          margin: [12, 12, 24, 12], filename: `curriculo-${name}.pdf`,
          image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          // não corta um item (uma experiência, um curso) no meio; as seções podem continuar na página seguinte
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.cv-head', '.cv-item', '.cv section h3', '.cv p'] },
        }).from(paper).toPdf().get('pdf').then((pdf) => drawPdfFooter(pdf, icon)).save();
      } finally {
        paper.classList.remove('pdf-mode');
      }
      toast('PDF baixado! 📄');
    } catch (err) {
      console.error(err);
      toast('Não foi possível gerar o PDF aqui. Abrindo a opção de imprimir — escolha "Salvar como PDF".', 'info');
      window.print();
    }
    setBusy(btn, false);
  };
  el.querySelector('#mypdf')?.addEventListener('click', async () => {
    const { data, error } = await sb.storage.from('curriculos').createSignedUrl(r.pdf_path, 600);
    if (error) return toast(errMsg(error), 'err');
    window.open(data.signedUrl, '_blank');
  });
}

export { waLink };
