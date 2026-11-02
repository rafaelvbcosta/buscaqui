import { sb } from '../supabase.js';
import { state, loadUserData } from '../store.js';
import {
  ICON, esc, nl2br, avatar, options, empty, toast, confirmBox, errMsg, setBusy, formData,
  maskPhone, waLink, timeAgo, uploadFile, CATEGORIAS_SERVICO, CATEGORIAS_EMPRESA,
} from '../ui.js';

const cats = (pr) => [...new Set((pr.services || []).map((s) => s.categoria).filter(Boolean))];

const isCompany = (pr) => Boolean(pr.company_id);

// Todas as categorias, autônomos e empresas, para o filtro (sem repetir "Outros")
const catOptions = (placeholder) => `<option value="">${esc(placeholder)}</option>
  <optgroup label="Autônomos">${options(CATEGORIAS_SERVICO.filter((c) => c !== 'Outros'))}</optgroup>
  <optgroup label="Empresas">${options(CATEGORIAS_EMPRESA.filter((c) => c !== 'Outros'))}</optgroup>
  <option>Outros</option>`;

function proCard(pr) {
  const emp = isCompany(pr);
  const wa = waLink(pr.phone, emp
    ? `Olá! Vi a ${pr.name} no BuscAqui e gostaria de mais informações.`
    : `Olá, ${pr.name}! Vi seu perfil no BuscAqui e gostaria de um orçamento.`);
  const where = emp ? [pr.address, pr.city].filter(Boolean).join(', ') : pr.city;
  return `
    <article class="card pro-card">
      <a href="#/${emp ? `empresa/${pr.company_id}` : `profissional/${pr.id}`}" class="pro-top">
        ${avatar(pr.avatar_url, pr.name, 56, emp)}
        <div><h3>${esc(pr.name)}</h3><p class="muted small">${ICON.pin}${esc(where || 'Cidade não informada')}</p></div>
      </a>
      <div class="chips">${emp ? `<span class="tag tag-company">${ICON.building} Empresa</span>` : ''}${cats(pr).map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
      ${pr.about ? `<p class="clamp">${esc(pr.about)}</p>` : ''}
      <div class="pro-bottom">
        ${emp ? `<a href="#/empresa/${pr.company_id}" class="link-more">Ver empresa</a>` : `<span class="salary">${esc(pr.price || 'Valor a combinar')}</span>`}
        <div class="row">
          ${pr.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(pr.phone.replace(/\D/g, ''))}" aria-label="Ligar">${ICON.phone}</a>` : ''}
          ${wa ? `<a class="btn btn-whats btn-sm" href="${wa}" target="_blank" rel="noopener">${ICON.chat} WhatsApp</a>` : ''}
        </div>
      </div>
    </article>`;
}

// ============================================================
// SERVIÇOS (tela principal)
// ============================================================
export async function hub(el, _p, { alive }) {
  const [{ data }, { data: myReqs }] = await Promise.all([
    sb.from('professionals').select('*').order('created_at', { ascending: false }).limit(6),
    sb.from('service_requests').select('status').eq('user_id', state.user.id),
  ]);
  if (!alive()) return;
  const mine = state.professional;
  const reqs = myReqs || [];
  const abertos = reqs.filter((r) => r.status === 'aberto').length;
  el.innerHTML = `
    <div class="page-head"><h1>Serviços</h1><p class="muted">Contrate profissionais da sua região ou ofereça o seu trabalho.</p></div>
    <div class="big-actions">
      <a href="#/profissionais" class="big-action">${ICON.search}<span><b>Encontrar profissional</b><small>Eletricista, diarista, oficina, pet shop e mais</small></span></a>
      <a href="#/pedido-novo" class="big-action alt">${ICON.plus}<span><b>Publicar pedido de serviço</b><small>Descreva o que precisa e receba contatos</small></span></a>
    </div>
    ${reqs.length ? `
    <a href="#/pedidos" class="card my-reqs">
      ${ICON.list}
      <span class="grow"><b>Meus pedidos de serviço</b>
        <small class="muted">${abertos ? `${abertos} pedido(s) aberto(s)` : 'Nenhum pedido aberto'} · ${reqs.length} no total</small></span>
      <span class="btn btn-secondary btn-sm">Ver meus pedidos</span>
    </a>` : ''}
    <div class="row-between section-title"><h2>Profissionais cadastrados</h2><a href="#/profissionais">Ver todos</a></div>
    <div class="grid">${(data || []).map(proCard).join('') || empty('users', 'Nenhum profissional ainda')}</div>
    ${state.profile?.role === 'empresa' ? `<div class="card cta-band">
      <div><h3>${mine ? 'Os serviços da empresa estão sendo divulgados' : 'Sua empresa também presta serviços?'}</h3>
      <p class="muted">${mine ? 'Mantenha a descrição atualizada para receber mais contatos.' : 'Divulgue grátis e apareça para quem procura em Arcos.'}</p></div>
      <a href="#/divulgar" class="btn btn-secondary">${mine ? 'Editar divulgação' : 'Divulgar serviços'}</a>
    </div>` : `<div class="card cta-band">
      <div><h3>${mine ? 'Seu perfil de serviços está ativo' : 'Você também presta serviços?'}</h3>
      <p class="muted">${mine ? 'Mantenha seus dados atualizados para receber mais contatos.' : 'Cadastre-se como profissional e seja encontrado por quem precisa.'}</p></div>
      <a href="#/meu-servico" class="btn btn-secondary">${mine ? 'Editar meu perfil' : 'Oferecer meus serviços'}</a>
    </div>`}
    <p class="center"><a href="#/pedidos">Ver pedidos de serviço publicados →</a></p>`;
}

// ============================================================
// ENCONTRAR PROFISSIONAL
// ============================================================
export async function professionals(el, _p, { alive }) {
  const { data, error } = await sb.from('professionals').select('*').order('created_at', { ascending: false });
  if (!alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const all = data || [];
  el.innerHTML = `
    <a href="#/servicos" class="back-link">${ICON.back} Serviços</a>
    <div class="page-head"><h1>Encontrar profissional</h1></div>
    <div class="card filters">
      <div class="search-box">${ICON.search}<input id="q" type="search" placeholder="Buscar por nome, serviço ou cidade"></div>
      <div class="filter-row"><select id="cat">${catOptions('Todos os serviços')}</select></div>
      <div class="seg" id="tipo" role="group" aria-label="Tipo">
        <button type="button" data-t="" class="on">Todos</button>
        <button type="button" data-t="autonomo">Autônomos</button>
        <button type="button" data-t="empresa">Empresas</button>
      </div>
    </div>
    <p class="muted small" id="count"></p>
    <div class="grid" id="list"></div>`;
  const q = el.querySelector('#q'), cat = el.querySelector('#cat');
  let tipo = '';
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const res = all.filter((p) =>
      (!tipo || (tipo === 'empresa') === isCompany(p)) &&
      (!cat.value || cats(p).includes(cat.value)) &&
      (!t || [p.name, p.city, p.address, p.about, ...(p.services || []).map((s) => `${s.categoria} ${s.descricao}`)].join(' ').toLowerCase().includes(t)));
    el.querySelector('#count').textContent = `${res.length} resultado${res.length === 1 ? '' : 's'}`;
    el.querySelector('#list').innerHTML = res.map(proCard).join('') ||
      empty('search', 'Nenhum profissional encontrado', 'Que tal publicar um pedido de serviço?', '<a class="btn btn-primary" href="#/pedido-novo">Publicar pedido</a>');
  };
  el.querySelectorAll('#tipo [data-t]').forEach((btn) => (btn.onclick = () => {
    tipo = btn.dataset.t;
    el.querySelectorAll('#tipo [data-t]').forEach((x) => x.classList.toggle('on', x === btn));
    draw();
  }));
  q.oninput = draw; cat.onchange = draw; draw();
}

export async function professionalDetail(el, [id], { alive }) {
  const { data: pr } = await sb.from('professionals').select('*').eq('id', id).maybeSingle();
  if (!alive()) return;
  if (!pr) { el.innerHTML = empty('user', 'Profissional não encontrado'); return; }
  if (pr.company_id) { location.replace(`#/empresa/${pr.company_id}`); return; }
  const wa = waLink(pr.phone, `Olá, ${pr.name}! Vi seu perfil no BuscAqui e gostaria de um orçamento.`);
  el.innerHTML = `
    <a href="#/profissionais" class="back-link">${ICON.back} Profissionais</a>
    <div class="detail">
      <div class="card">
        <div class="pro-top">${avatar(pr.avatar_url, pr.name, 80)}
          <div><h1>${esc(pr.name)}</h1><p class="muted">${ICON.pin}${esc(pr.city || '')}</p></div></div>
        <h3>Serviços</h3>
        <ul class="svc-list">${(pr.services || []).map((s) => `<li><span class="tag">${esc(s.categoria)}</span> ${esc(s.descricao || '')}</li>`).join('')}</ul>
        ${pr.about ? `<h3>Sobre o trabalho</h3><p>${nl2br(pr.about)}</p>` : ''}
      </div>
      <aside class="card side-cta">
        <p class="muted small">Valor</p><p class="salary big">${esc(pr.price || 'A combinar')}</p>
        ${wa ? `<a class="btn btn-whats btn-block btn-lg" href="${wa}" target="_blank" rel="noopener">${ICON.chat} Chamar no WhatsApp</a>` : ''}
        ${pr.phone ? `<a class="btn btn-ghost btn-block" href="tel:${esc(pr.phone.replace(/\D/g, ''))}">${ICON.phone} Ligar ${esc(pr.phone)}</a>` : ''}
        <p class="muted small">${ICON.star} Avaliações de clientes: em breve.</p>
      </aside>
    </div>`;
}

// ============================================================
// PEDIDOS DE SERVIÇO
// ============================================================
export async function requests(el, _p, ctx) {
  const { data, error } = await sb.from('service_requests')
    .select('*').eq('status', 'aberto').order('created_at', { ascending: false });
  const { data: mineData } = await sb.from('service_requests')
    .select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
  if (!ctx.alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const all = data || [];
  const mine = mineData || [];
  const isPro = state.profile?.role === 'profissional';

  const reqCard = (r, own) => {
    const wa = waLink(r.phone, `Olá! Vi seu pedido "${r.title}" no BuscAqui e posso ajudar.`);
    return `<article class="card req-card">
      <div class="row-between"><span class="tag">${esc(r.category || 'Outros')}</span><span class="muted small">${timeAgo(r.created_at)}</span></div>
      <h3>${esc(r.title)}</h3>
      ${r.description ? `<p>${nl2br(r.description)}</p>` : ''}
      <p class="muted small">${ICON.pin}${esc(r.city || 'Local não informado')}</p>
      <div class="row">
        ${own
          ? `${r.status === 'aberto' ? `<button class="btn btn-ghost btn-sm" data-close="${r.id}">${ICON.check} Já resolvi</button>` : '<span class="badge b-gray">Encerrado</span>'}
             <button class="btn btn-ghost btn-sm danger" data-del="${r.id}">${ICON.trash} Excluir</button>`
          : wa ? `<a class="btn btn-whats btn-sm" href="${wa}" target="_blank" rel="noopener">${ICON.chat} Oferecer serviço</a>` : ''}
      </div></article>`;
  };
  const others = all.filter((r) => r.user_id !== state.user.id);

  const mineHtml = mine.length
    ? `<h2 class="section-title">Meus pedidos</h2><div class="grid">${mine.map((r) => reqCard(r, true)).join('')}</div>`
    : '';
  // Quem contrata vê os próprios pedidos primeiro; o profissional vê primeiro os pedidos dos clientes.
  const othersTitle = isPro || !mine.length ? '' : '<h2 class="section-title">Pedidos de outras pessoas</h2>';
  el.innerHTML = `
    <div class="page-head row-between"><div><h1>Pedidos de serviço</h1>
      <p class="muted">${isPro ? 'Pessoas procurando profissionais. Entre em contato e ofereça seu trabalho!' : 'Pedidos publicados por quem precisa de um serviço.'}</p></div>
      <a href="#/pedido-novo" class="btn btn-primary">${ICON.plus} Publicar pedido</a></div>
    ${isPro && !state.professional ? `<div class="card cta-band"><div><h3>Complete seu perfil profissional</h3><p class="muted">Assim os clientes também encontram você.</p></div><a class="btn btn-secondary" href="#/meu-servico">Completar agora</a></div>` : ''}
    ${isPro ? '' : mineHtml}
    ${othersTitle}
    <div class="filters card"><select id="cat">${catOptions('Todas as categorias')}</select></div>
    <div class="grid" id="list"></div>
    ${isPro ? mineHtml : ''}`;
  const cat = el.querySelector('#cat');
  const draw = () => {
    const res = others.filter((r) => !cat.value || r.category === cat.value);
    el.querySelector('#list').innerHTML = res.map((r) => reqCard(r, false)).join('') ||
      empty('list', 'Nenhum pedido aberto no momento', 'Volte mais tarde para ver novos pedidos.');
  };
  cat.onchange = draw; draw();

  el.querySelectorAll('[data-close]').forEach((b) => (b.onclick = async () => {
    const { error: e } = await sb.from('service_requests').update({ status: 'fechado' }).eq('id', b.dataset.close);
    if (e) return toast(errMsg(e), 'err');
    toast('Pedido encerrado.'); requests(el, _p, ctx);
  }));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('Excluir pedido', 'Deseja excluir este pedido?', 'Excluir', true))) return;
    const { error: e } = await sb.from('service_requests').delete().eq('id', b.dataset.del);
    if (e) return toast(errMsg(e), 'err');
    toast('Pedido excluído.', 'info'); requests(el, _p, ctx);
  }));
}

export function newRequest(el, _p, { go }) {
  const p = state.profile || {};
  el.innerHTML = `
    <a href="#/servicos" class="back-link">${ICON.back} Serviços</a>
    <div class="card narrow">
      <h1>Publicar pedido de serviço</h1>
      <p class="muted">Profissionais vão ver seu pedido e entrar em contato pelo WhatsApp.</p>
      <form id="f">
        <label>O que você precisa?<input name="title" required placeholder="Ex.: Trocar chuveiro elétrico"></label>
        <label>Tipo de serviço<select name="category" required>${catOptions('Escolha uma categoria')}</select></label>
        <label>Detalhes<textarea name="description" rows="4" placeholder="Descreva o serviço, quando precisa, etc."></textarea></label>
        <div class="two">
          <label>Cidade / Bairro<input name="city" value="${esc(p.city)}" placeholder="Ex.: Centro, Belo Horizonte"></label>
          <label>WhatsApp para contato<input name="phone" type="tel" value="${esc(p.phone)}" required></label>
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Publicar pedido</button>
      </form>
    </div>`;
  maskPhone(el.querySelector('[name=phone]'));
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.title || !d.category || !d.phone) return toast('Preencha o pedido, a categoria e o WhatsApp.', 'err');
    const btn = f.querySelector('button'); setBusy(btn, true);
    const { error } = await sb.from('service_requests').insert({ ...d, user_id: state.user.id });
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    toast('Pedido publicado! ✅');
    go('/pedidos');
  };
}

// ============================================================
// MEU PERFIL PROFISSIONAL (cadastro em 4 etapas)
// ============================================================
export function myService(el, _p, { go }) {
  if (state.profile?.role === 'empresa') { go('/divulgar'); return; }
  const p = state.profile || {};
  const cur = state.professional || {};
  const d = {
    name: cur.name || p.full_name || '',
    phone: cur.phone || p.phone || '',
    city: cur.city || p.city || '',
    avatar_url: cur.avatar_url || p.avatar_url || '',
    services: cur.services?.length ? cur.services.map((s) => ({ ...s })) : [{ categoria: '', descricao: '' }],
    about: cur.about || '',
    price: cur.price || '',
  };
  let step = 1;

  const stepper = () => `
    <ol class="stepper">${['Dados', 'Serviços', 'Apresentação', 'Valor'].map((t, i) =>
      `<li class="${i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''}"><span>${i + 1 < step ? '✓' : i + 1}</span>${t}</li>`).join('')}</ol>`;

  const readStep = () => {
    const f = el.querySelector('#f');
    if (step === 1) { d.name = f.elements.name.value.trim(); d.phone = f.phone.value.trim(); d.city = f.city.value.trim(); }
    if (step === 2) d.services = [...el.querySelectorAll('.svc')].map((r) => ({ categoria: r.querySelector('select').value, descricao: r.querySelector('input').value.trim() }));
    if (step === 3) d.about = f.about.value.trim();
    if (step === 4) d.price = f.price.value.trim();
  };

  const validate = () => {
    if (step === 1 && (!d.name || !d.phone)) return 'Informe seu nome e telefone.';
    if (step === 2 && !d.services.some((s) => s.categoria)) return 'Escolha pelo menos um serviço.';
    if (step === 3 && d.about.length < 10) return 'Escreva um pouco sobre seu trabalho (pelo menos uma frase).';
    return '';
  };

  const body = () => {
    if (step === 1) return `
      <h2>1. Seus dados básicos</h2>
      <div class="photo-row"><div id="ph">${avatar(d.avatar_url, d.name, 72)}</div>
        <label class="btn btn-ghost btn-sm file-btn">${ICON.upload} Foto (opcional)<input type="file" id="photo" accept="image/*" hidden></label></div>
      <label>Nome que aparece para os clientes<input name="name" value="${esc(d.name)}" required placeholder="Ex.: João Eletricista"></label>
      <label>Telefone / WhatsApp<input name="phone" type="tel" value="${esc(d.phone)}" required></label>
      <label>Cidade onde atende<input name="city" value="${esc(d.city)}" placeholder="Ex.: Belo Horizonte - MG"></label>`;
    if (step === 2) return `
      <h2>2. Quais serviços você oferece?</h2>
      <div id="svcs">${d.services.map((s, i) => `
        <div class="svc repeat">
          <label>Categoria<select>${options(CATEGORIAS_SERVICO, s.categoria, 'Escolha')}</select></label>
          <label>Descreva rapidamente<input value="${esc(s.descricao)}" placeholder="Ex.: Instalação de chuveiro e tomadas"></label>
          ${d.services.length > 1 ? `<button type="button" class="link-btn danger small" data-del="${i}">Remover</button>` : ''}
        </div>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-sm" id="add">${ICON.plus} Adicionar outro serviço</button>`;
    if (step === 3) return `
      <h2>3. Conte um pouco sobre seu trabalho</h2>
      <label>Apresentação profissional<textarea name="about" rows="6" placeholder="Ex.: Trabalho há 10 anos como eletricista, atendo residências e comércios, sou pontual e dou garantia do serviço.">${esc(d.about)}</textarea></label>`;
    return `
      <h2>4. Valor do serviço <small class="muted">(opcional)</small></h2>
      <label>Quanto você cobra?<input name="price" value="${esc(d.price)}" placeholder="Ex.: A partir de R$ 80,00 ou R$ 150,00 a diária"></label>
      <p class="muted small">Se preferir, deixe em branco. Vai aparecer "Valor a combinar".</p>`;
  };

  const draw = () => {
    el.innerHTML = `
      <div class="page-head"><h1>${cur.id ? 'Meu perfil profissional' : 'Cadastre seus serviços'}</h1>
      <p class="muted">Seu perfil aparece em "Encontrar profissional" para todos os usuários.</p></div>
      <div class="card narrow">${stepper()}
        <form id="f">${body()}
          <div class="row-between step-nav">
            ${step > 1 ? '<button type="button" class="btn btn-ghost" id="prev">Voltar</button>' : '<span></span>'}
            ${step < 4 ? '<button type="submit" class="btn btn-primary">Continuar</button>' : '<button type="submit" class="btn btn-primary">Salvar perfil</button>'}
          </div>
        </form>
        ${cur.id && step === 1 ? `<p class="center"><a href="#/profissional/${cur.id}">Ver meu perfil público</a></p>` : ''}
      </div>`;
    const f = el.querySelector('#f');
    if (step === 1) {
      maskPhone(f.phone);
      el.querySelector('#photo').onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          toast('Enviando foto...', 'info');
          d.avatar_url = await uploadFile(sb, 'avatars', state.user.id, file, { maxMB: 2 });
          el.querySelector('#ph').innerHTML = avatar(d.avatar_url, d.name, 72);
        } catch (err) { toast(errMsg(err), 'err'); }
      };
    }
    if (step === 2) {
      el.querySelector('#add').onclick = () => { readStep(); d.services.push({ categoria: '', descricao: '' }); draw(); };
      el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { readStep(); d.services.splice(Number(b.dataset.del), 1); draw(); }));
    }
    el.querySelector('#prev')?.addEventListener('click', () => { readStep(); step--; draw(); });
    f.onsubmit = async (e) => {
      e.preventDefault();
      readStep();
      const v = validate(); if (v) return toast(v, 'err');
      if (step < 4) { step++; return draw(); }
      const btn = f.querySelector('[type=submit]'); setBusy(btn, true, 'Salvando...');
      const row = {
        user_id: state.user.id, name: d.name, phone: d.phone, city: d.city, avatar_url: d.avatar_url || null,
        services: d.services.filter((s) => s.categoria), about: d.about, price: d.price || null,
      };
      const { error } = cur.id
        ? await sb.from('professionals').update(row).eq('id', cur.id)
        : await sb.from('professionals').insert(row);
      setBusy(btn, false);
      if (error) return toast(errMsg(error), 'err');
      await loadUserData();
      toast('Perfil profissional salvo! 🎉');
      go(state.profile?.role === 'profissional' ? '/pedidos' : '/servicos');
    };
  };
  draw();
}
