import { sb } from '../supabase.js?v=202611071755';
import {
  ICON, esc, avatar, toast, errMsg, setBusy, confirmBox, modal, empty, dateBR, timeAgo,
  moneyCents, waLink, PLANOS, digits, checkCNPJ, isArcos, pixCode, validCPF, validCNPJ, maskCPF, maskCNPJ,
} from '../ui.js?v=202611071755';

// ============================================================
// ÁREA DO ADMINISTRADOR
// (o banco também confere: só quem tem is_admin = true vê e muda estes dados)
// ============================================================
const PERFIL = { candidato: 'Candidato', profissional: 'Autônomo', empresa: 'Empresa' };
const planName = (p) => PLANOS[p]?.nome || p;
const now = () => Date.now();
const isActive = (s) => s.status === 'ativa' && Date.parse(s.starts_at) <= now() && now() < Date.parse(s.ends_at);

// ---------- Visão geral ----------
export async function overview(el, _p, { alive }) {
  const [pr, jobs, pros, reqs, subs, fbs] = await Promise.all([
    sb.from('profiles').select('id, role, blocked, created_at'),
    sb.from('jobs').select('id, status'),
    sb.from('professionals').select('id, company_id'),
    sb.from('service_requests').select('id, status'),
    sb.from('subscriptions').select('id, plan, status, price, starts_at, ends_at, confirmed_at'),
    sb.from('feedbacks').select('id', { count: 'exact', head: true }).eq('status', 'nova'),
  ]);
  if (!alive()) return;
  const err = [pr, jobs, pros, reqs, subs].find((x) => x.error);
  if (err) { el.innerHTML = `<div class="card">${esc(errMsg(err.error))}</div>`; return; }
  const P = pr.data, S = subs.data;
  const count = (r) => P.filter((x) => x.role === r).length;
  const mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
  const receita = S.filter((x) => x.confirmed_at && Date.parse(x.confirmed_at) >= mes.getTime()).reduce((t, x) => t + Number(x.price), 0);
  const pend = S.filter((x) => x.status === 'pendente').length;
  const ativos = S.filter(isActive);
  el.innerHTML = `
    <div class="page-head"><h1>Visão geral</h1><p class="muted">Resumo do BuscAqui hoje.</p></div>
    ${pend ? `<a href="#/admin/pagamentos" class="card alert-band">${ICON.card}<span class="grow"><b>${pend} pagamento(s) aguardando confirmação</b>
      <small class="muted">Confira o Pix na sua conta e confirme.</small></span><span class="btn btn-secondary btn-sm">Ver pagamentos</span></a>` : ''}
    <a href="#/admin/sugestoes" class="card alert-band ${fbs.count ? '' : 'quiet'}">${ICON.chat}<span class="grow"><b>${fbs.count ? `${fbs.count} sugestão(ões) nova(s)` : 'Sugestões dos usuários'}</b>
      <small class="muted">${fbs.count ? 'Mensagens enviadas pelos usuários esperando sua leitura.' : 'Nenhuma mensagem nova. Veja as anteriores.'}</small></span><span class="btn btn-${fbs.count ? 'secondary' : 'ghost'} btn-sm">Ver sugestões</span></a>
    <h2 class="section-title">Usuários</h2>
    <div class="stats">
      <div class="stat">${ICON.users}<b>${P.length}</b><span>Total de contas</span></div>
      <div class="stat">${ICON.file}<b>${count('candidato')}</b><span>Candidatos</span></div>
      <div class="stat">${ICON.tool}<b>${count('profissional')}</b><span>Autônomos</span></div>
      <div class="stat">${ICON.building}<b>${count('empresa')}</b><span>Empresas</span></div>
    </div>
    <h2 class="section-title">Conteúdo</h2>
    <div class="stats">
      <div class="stat">${ICON.briefcase}<b>${jobs.data.filter((x) => x.status === 'aberta').length}</b><span>Vagas abertas</span></div>
      <div class="stat">${ICON.tool}<b>${pros.data.filter((x) => !x.company_id).length}</b><span>Perfis de autônomos</span></div>
      <div class="stat">${ICON.building}<b>${pros.data.filter((x) => x.company_id).length}</b><span>Empresas divulgando</span></div>
      <div class="stat">${ICON.list}<b>${reqs.data.filter((x) => x.status === 'aberto').length}</b><span>Pedidos de serviço abertos</span></div>
    </div>
    <h2 class="section-title">Planos</h2>
    <div class="stats">
      <div class="stat">${ICON.star}<b>${ativos.length}</b><span>Assinaturas ativas</span></div>
      <div class="stat">${ICON.clock}<b>${pend}</b><span>Pagamentos pendentes</span></div>
      <div class="stat">${ICON.card}<b>${moneyCents(receita)}</b><span>Recebido neste mês</span></div>
      <div class="stat">${ICON.ban}<b>${P.filter((x) => x.blocked).length}</b><span>Contas bloqueadas</span></div>
    </div>`;
}

// ---------- Usuários ----------
export async function users(el, _p, ctx) {
  const [pr, subs, comps, trials, docs] = await Promise.all([
    sb.from('profiles').select('*').order('created_at', { ascending: false }),
    sb.from('subscriptions').select('user_id, plan, status, starts_at, ends_at'),
    sb.from('companies').select('id, owner_id, name, cnpj, cnpj_check, created_at'),
    sb.from('trial_registry').select('cnpj, started_at'),
    sb.from('user_docs').select('user_id, cpf'),
  ]);
  if (!ctx.alive()) return;
  if (pr.error) { el.innerHTML = `<div class="card">${esc(errMsg(pr.error))}</div>`; return; }
  const cpfDe = Object.fromEntries((docs.data || []).map((x) => [x.user_id, x.cpf]));
  pr.data.forEach((u) => { u.cpf = cpfDe[u.id] || null; });
  const plano = (uid) => {
    const a = (subs.data || []).filter((s) => s.user_id === uid && isActive(s));
    if (!a.length) return null;
    const fim = Math.max(...(subs.data || []).filter((s) => s.user_id === uid && s.status === 'ativa' && s.plan === a[0].plan).map((s) => Date.parse(s.ends_at)));
    return { plan: a[0].plan, ends: fim };
  };
  const empresa = (uid) => (comps.data || []).find((c) => c.owner_id === uid);
  const trialEnd = (emp) => {
    const t = (trials.data || []).find((x) => x.cnpj === digits(emp.cnpj));
    return Date.parse(t?.started_at || emp.created_at) + 30 * 864e5;
  };
  // Mesmo telefone em contas diferentes = possível cadastro duplicado (para você analisar)
  const fones = {};
  pr.data.forEach((u) => { const f = digits(u.phone); if (f.length >= 10) (fones[f] = fones[f] || []).push(u.id); });
  const dup = (u) => (fones[digits(u.phone)] || []).length > 1;
  const nDup = pr.data.filter(dup).length;
  el.innerHTML = `
    <div class="page-head"><h1>Usuários</h1><p class="muted">${pr.data.length} conta(s) cadastrada(s).</p></div>
    <div class="card filters">
      <div class="search-box">${ICON.search}<input id="q" type="search" placeholder="Buscar por nome, e-mail, telefone ou empresa"></div>
      <div class="seg" id="tipo" role="group" aria-label="Perfil">
        <button type="button" data-t="" class="on">Todos</button>
        <button type="button" data-t="candidato">Candidatos</button>
        <button type="button" data-t="profissional">Autônomos</button>
        <button type="button" data-t="empresa">Empresas</button>
        <button type="button" data-t="dup">Possíveis duplicados (${nDup})</button>
      </div>
    </div>
    <div class="stack" id="list"></div>`;
  let tipo = '';
  const q = el.querySelector('#q');
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const res = pr.data.filter((u) => (!tipo || (tipo === 'dup' ? dup(u) : u.role === tipo)) &&
      (!t || [u.full_name, u.email, u.phone, u.cpf, empresa(u.id)?.name, empresa(u.id)?.cnpj].join(' ').toLowerCase().includes(t)));
    el.querySelector('#list').innerHTML = res.map((u) => {
      const pl = plano(u.id), emp = empresa(u.id);
      const trial = u.role === 'empresa' && emp && trialEnd(emp) > now();
      const ck = emp?.cnpj_check;
      const doc = u.role === 'empresa'
        ? (emp?.cnpj ? `CNPJ ${esc(emp.cnpj)} ${ck ? (ck.found === false ? '<span class="badge b-red">Não encontrado</span>' : `<span class="badge ${ck.situacao === 'ATIVA' && isArcos(ck) ? 'b-green' : 'b-yellow'}">${ICON.check} ${esc(ck.situacao || '')} · ${esc(ck.municipio || '?')}-${esc(ck.uf || '')}</span>`) : '<span class="badge b-gray">Não verificado</span>'}` : '<span class="badge b-yellow">Sem CNPJ</span>')
        : u.role === 'profissional' ? (u.cpf ? `CPF ${esc(u.cpf)}` : '<span class="badge b-yellow">Sem CPF</span>') : '';
      return `<article class="card user-row ${u.blocked ? 'is-blocked' : ''}">
        <div class="row grow">${avatar(u.avatar_url, u.full_name, 44)}
          <div><b>${esc(u.full_name || '(sem nome)')}</b>${u.is_admin ? ' <span class="badge b-blue">Admin</span>' : ''}
            <p class="muted small">${esc(u.email || '')}${u.phone ? ' · ' + esc(u.phone) : ''}${dup(u) ? ' <span class="badge b-yellow">Telefone repetido</span>' : ''}</p>
            ${doc ? `<p class="small">${doc}</p>` : ''}
            <div class="chips"><span class="tag">${esc(PERFIL[u.role] || u.role)}</span>
              ${emp ? `<span class="tag">${ICON.building} ${esc(emp.name)}</span>` : ''}
              ${pl ? `<span class="badge b-green">${esc(planName(pl.plan))} até ${dateBR(new Date(pl.ends))}</span>` : trial ? '<span class="badge b-yellow">Teste grátis</span>' : ''}
              ${u.blocked ? '<span class="badge b-red">Bloqueado</span>' : ''}</div>
            <p class="muted small">Cadastro em ${dateBR(u.created_at)}</p></div></div>
        <div class="row wrap">
          ${emp?.cnpj ? `<button class="btn btn-ghost btn-sm" data-check="${emp.id}">${ICON.search} Verificar CNPJ</button>` : ''}
          ${u.role !== 'candidato' ? `<button class="btn btn-ghost btn-sm" data-doc="${u.id}">${ICON.edit} Documento</button>` : ''}
          ${u.role !== 'candidato' ? `<button class="btn btn-ghost btn-sm" data-grant="${u.id}">${ICON.star} Dar plano</button>` : ''}
          ${u.is_admin ? '' : u.blocked
            ? `<button class="btn btn-ghost btn-sm" data-unblock="${u.id}">${ICON.check} Desbloquear</button>`
            : `<button class="btn btn-ghost btn-sm danger" data-block="${u.id}">${ICON.ban} Bloquear</button>`}
        </div></article>`;
    }).join('') || empty('users', 'Nenhum usuário encontrado');
    wire();
  };
  const setBlocked = async (id, blocked) => {
    const u = pr.data.find((x) => x.id === id);
    if (blocked && !(await confirmBox('Bloquear conta', `${u.full_name || u.email} não vai mais conseguir usar o BuscAqui. Você pode desbloquear depois.`, 'Bloquear', true))) return;
    const { error } = await sb.from('profiles').update({ blocked }).eq('id', id);
    if (error) return toast(errMsg(error), 'err');
    u.blocked = blocked;
    toast(blocked ? 'Conta bloqueada.' : 'Conta desbloqueada.', 'info');
    draw();
  };
  const wire = () => {
    el.querySelectorAll('[data-check]').forEach((b) => (b.onclick = async () => {
      const emp = comps.data.find((c) => c.id === b.dataset.check);
      setBusy(b, true, 'Consultando...');
      const ck = await checkCNPJ(emp.cnpj);
      if (ck.error) { setBusy(b, false); return toast('Não foi possível consultar agora. Tente de novo em alguns minutos.', 'err'); }
      const { error } = await sb.from('companies').update({ cnpj_check: ck }).eq('id', emp.id);
      setBusy(b, false);
      if (error) return toast(errMsg(error), 'err');
      emp.cnpj_check = ck;
      toast(ck.found ? `${ck.razao || 'CNPJ encontrado'} · ${ck.situacao} · ${ck.municipio}-${ck.uf}` : 'CNPJ não encontrado na Receita Federal.', ck.found ? 'ok' : 'err');
      draw();
    }));
    el.querySelectorAll('[data-doc]').forEach((b) => (b.onclick = () => {
      const u = pr.data.find((x) => x.id === b.dataset.doc);
      const emp = empresa(u.id);
      const isEmp = u.role === 'empresa';
      if (isEmp && !emp) return toast('Esta empresa ainda não preencheu o cadastro da empresa.', 'info');
      const m = modal(isEmp ? 'Corrigir CNPJ' : 'Corrigir CPF', `
        <p>Só o admin pode trocar o documento depois de salvo. Confira antes de salvar.</p>
        <form id="d"><label>${isEmp ? 'CNPJ' : 'CPF'}<input name="doc" inputmode="numeric" value="${esc(isEmp ? emp.cnpj : u.cpf)}"></label>
          <div class="row-end"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
      const inp = m.el.querySelector('[name=doc]');
      (isEmp ? maskCNPJ : maskCPF)(inp);
      m.el.querySelector('[data-x]').onclick = m.close;
      m.el.querySelector('#d').onsubmit = async (e) => {
        e.preventDefault();
        const v = inp.value.trim();
        if (v && !(isEmp ? validCNPJ(v) : validCPF(v))) return toast(isEmp ? 'CNPJ inválido.' : 'CPF inválido.', 'err');
        const { error } = isEmp
          ? await sb.from('companies').update({ cnpj: v || null, cnpj_check: null }).eq('id', emp.id)
          : v ? await sb.from('user_docs').upsert({ user_id: u.id, cpf: v }) : await sb.from('user_docs').delete().eq('user_id', u.id);
        if (error) return toast(errMsg(error), 'err');
        if (isEmp) { emp.cnpj = v; emp.cnpj_check = null; } else u.cpf = v;
        m.close(); toast('Documento atualizado. ✅'); draw();
      };
    }));
    el.querySelectorAll('[data-block]').forEach((b) => (b.onclick = () => setBlocked(b.dataset.block, true)));
    el.querySelectorAll('[data-unblock]').forEach((b) => (b.onclick = () => setBlocked(b.dataset.unblock, false)));
    el.querySelectorAll('[data-grant]').forEach((b) => (b.onclick = () => {
      const u = pr.data.find((x) => x.id === b.dataset.grant);
      const opts = Object.entries(PLANOS).filter(([, p]) => p.para === u.role);
      const m = modal('Dar plano', `
        <p>Para <b>${esc(u.full_name || u.email)}</b>. Use para cortesias ou acertos. Pagamentos por Pix são confirmados na tela Pagamentos.</p>
        <form id="g">
          <label>Plano<select name="plan">${opts.map(([id, p]) => `<option value="${id}">${esc(p.nome)} (${moneyCents(p.preco)}/mês)</option>`).join('')}</select></label>
          <label>Por quantos dias?<input name="days" type="number" min="1" max="366" value="30"></label>
          <div class="row-end"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button class="btn btn-primary">Dar plano</button></div>
        </form>`);
      m.el.querySelector('[data-x]').onclick = m.close;
      m.el.querySelector('#g').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target, btn = f.querySelector('.btn-primary');
        setBusy(btn, true);
        const { error } = await sb.rpc('admin_grant_plan', { uid: u.id, p: f.plan.value, days: Number(f.days.value) || 30 });
        setBusy(btn, false);
        if (error) return toast(errMsg(error), 'err');
        m.close(); toast('Plano concedido! ✅');
        users(el, _p, ctx);
      };
    }));
  };
  el.querySelectorAll('#tipo [data-t]').forEach((b) => (b.onclick = () => {
    tipo = b.dataset.t;
    el.querySelectorAll('#tipo [data-t]').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  q.oninput = draw;
  draw();
}

// ---------- Pagamentos ----------
export async function payments(el, _p, ctx) {
  const { data, error } = await sb.from('subscriptions')
    .select('*, profiles(full_name, email, phone, role)').order('created_at', { ascending: false }).limit(200);
  if (!ctx.alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const pend = data.filter((x) => x.status === 'pendente');
  const hist = data.filter((x) => x.status !== 'pendente').slice(0, 50);
  const STATUS = { ativa: ['b-green', 'Confirmado'], recusada: ['b-red', 'Recusado'], cancelada: ['b-gray', 'Cancelado pelo usuário'] };
  el.innerHTML = `
    <div class="page-head"><h1>Pagamentos</h1><p class="muted">Confira o Pix na sua conta do banco antes de confirmar. O código do pedido vem na mensagem do Pix.</p></div>
    <h2 class="section-title">Aguardando confirmação (${pend.length})</h2>
    <div class="stack">${pend.map((s) => {
      const u = s.profiles || {};
      const wa = waLink(u.phone, `Olá! Aqui é do BuscAqui, sobre o seu pedido do plano ${planName(s.plan)}.`);
      return `<article class="card pay-row">
        <div class="grow"><b>${esc(u.full_name || u.email || 'Usuário')}</b> <span class="tag">${esc(PERFIL[u.role] || '')}</span>
          <p class="muted small">${esc(u.email || '')}${u.phone ? ' · ' + esc(u.phone) : ''}</p>
          <p>Código <b class="pix-code">${esc(pixCode(s))}</b> · Plano <b>${esc(planName(s.plan))}</b> · <b>${moneyCents(s.price)}</b> · pedido ${timeAgo(s.created_at)}</p></div>
        <div class="row wrap">
          ${wa ? `<a class="btn btn-ghost btn-sm" href="${wa}" target="_blank" rel="noopener">${ICON.chat} WhatsApp</a>` : ''}
          <button class="btn btn-ghost btn-sm danger" data-refuse="${s.id}">Recusar</button>
          <button class="btn btn-primary btn-sm" data-ok="${s.id}">${ICON.check} Confirmar pagamento</button>
        </div></article>`;
    }).join('') || empty('card', 'Nenhum pagamento aguardando', 'Quando alguém pedir um plano, ele aparece aqui.')}</div>
    <h2 class="section-title">Histórico</h2>
    <div class="card">${hist.length ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>Código</th><th>Usuário</th><th>Plano</th><th>Valor</th><th>Situação</th><th>Validade</th></tr></thead>
      <tbody>${hist.map((s) => `<tr>
        <td>${esc(pixCode(s))}</td><td>${esc(s.profiles?.full_name || s.profiles?.email || '')}</td><td>${esc(planName(s.plan))}</td>
        <td>${s.note ? esc(s.note) : moneyCents(s.price)}</td>
        <td><span class="badge ${STATUS[s.status]?.[0] || 'b-gray'}">${STATUS[s.status]?.[1] || esc(s.status)}</span></td>
        <td>${s.status === 'ativa' ? `${dateBR(s.starts_at)} a ${dateBR(s.ends_at)}` : '—'}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p class="muted">Nada por aqui ainda.</p>'}</div>`;
  el.querySelectorAll('[data-ok]').forEach((b) => (b.onclick = async () => {
    const s = data.find((x) => x.id === b.dataset.ok);
    if (!(await confirmBox('Confirmar pagamento', `Você confirma que recebeu o Pix de ${moneyCents(s.price)}? O plano ${planName(s.plan)} será ativado por 30 dias.`, 'Confirmar'))) return;
    setBusy(b, true);
    const { error: e } = await sb.rpc('confirm_subscription', { sid: s.id });
    if (e) { setBusy(b, false); return toast(errMsg(e), 'err'); }
    toast('Pagamento confirmado e plano ativado! ✅');
    payments(el, _p, ctx);
  }));
  el.querySelectorAll('[data-refuse]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox('Recusar pedido', 'Use quando o Pix não chegou. O usuário poderá fazer um novo pedido.', 'Recusar', true))) return;
    const { error: e } = await sb.from('subscriptions').update({ status: 'recusada' }).eq('id', b.dataset.refuse);
    if (e) return toast(errMsg(e), 'err');
    toast('Pedido recusado.', 'info');
    payments(el, _p, ctx);
  }));
}

// ---------- Moderação ----------
export async function moderation(el, _p, ctx) {
  const [jobs, pros, reqs] = await Promise.all([
    sb.from('jobs').select('id, title, status, created_at, companies(name)').order('created_at', { ascending: false }).limit(200),
    sb.from('professionals').select('id, name, about, services, company_id, created_at').order('created_at', { ascending: false }).limit(200),
    sb.from('service_requests').select('id, title, description, status, created_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (!ctx.alive()) return;
  const tabs = {
    vagas: { nome: 'Vagas', tabela: 'jobs', itens: (jobs.data || []).map((j) => ({ id: j.id, titulo: j.title, sub: `${j.companies?.name || ''} · ${j.status === 'aberta' ? 'Aberta' : 'Encerrada'}`, data: j.created_at, link: `#/vaga/${j.id}` })) },
    servicos: { nome: 'Serviços', tabela: 'professionals', itens: (pros.data || []).map((p) => ({ id: p.id, titulo: p.name, sub: `${p.company_id ? 'Empresa' : 'Autônomo'} · ${[p.about, ...(p.services || []).map((x) => [x.categoria, x.descricao].filter(Boolean).join(': '))].filter(Boolean).join(' · ')}`, data: p.created_at, link: p.company_id ? `#/empresa/${p.company_id}` : `#/profissional/${p.id}` })) },
    pedidos: { nome: 'Pedidos de serviço', tabela: 'service_requests', itens: (reqs.data || []).map((r) => ({ id: r.id, titulo: r.title, sub: `${r.status === 'aberto' ? 'Aberto' : 'Encerrado'} · ${r.description || ''}`, data: r.created_at })) },
  };
  let aba = 'vagas';
  el.innerHTML = `
    <div class="page-head row-between"><div><h1>Moderação</h1><p class="muted">Remova conteúdo impróprio, falso ou repetido. A remoção não pode ser desfeita.</p></div>
      <a href="#/admin/sugestoes" class="btn btn-ghost">${ICON.chat} Ver sugestões</a></div>
    <div class="seg" id="abas" role="group" aria-label="Tipo de conteúdo">${Object.entries(tabs).map(([k, t]) =>
      `<button type="button" data-a="${k}" class="${k === aba ? 'on' : ''}">${esc(t.nome)} (${t.itens.length})</button>`).join('')}</div>
    <div class="stack" id="list" style="margin-top:1rem"></div>`;
  const draw = () => {
    const t = tabs[aba];
    el.querySelector('#list').innerHTML = t.itens.map((i) => `
      <article class="card mod-row"><div class="grow"><b>${esc(i.titulo)}</b>
        <p class="muted small clamp">${esc(i.sub)}</p><p class="muted small">Publicado em ${dateBR(i.data)}</p></div>
        <div class="row wrap">${i.link ? `<a class="btn btn-ghost btn-sm" href="${i.link}">Ver</a>` : ''}
          <button class="btn btn-ghost btn-sm danger" data-del="${i.id}">${ICON.trash} Remover</button></div></article>`).join('') ||
      empty('shield', 'Nada para moderar aqui');
    el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const item = t.itens.find((x) => x.id === b.dataset.del);
      if (!(await confirmBox('Remover', `Remover "${item.titulo}" do BuscAqui? Isso não pode ser desfeito.`, 'Remover', true))) return;
      const { error } = await sb.from(t.tabela).delete().eq('id', item.id);
      if (error) return toast(errMsg(error), 'err');
      t.itens = t.itens.filter((x) => x.id !== item.id);
      toast('Removido.', 'info');
      el.querySelector(`[data-a="${aba}"]`).textContent = `${t.nome} (${t.itens.length})`;
      draw();
    }));
  };
  el.querySelectorAll('#abas [data-a]').forEach((b) => (b.onclick = () => {
    aba = b.dataset.a;
    el.querySelectorAll('#abas [data-a]').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  draw();
}

// ---------- Configurações ----------
export async function settings(el, _p, ctx) {
  const { data } = await sb.from('app_settings').select('key, value');
  if (!ctx.alive()) return;
  const v = Object.fromEntries((data || []).map((x) => [x.key, x.value]));
  el.innerHTML = `
    <div class="page-head"><h1>Configurações</h1><p class="muted">Dados que aparecem para quem vai pagar um plano.</p></div>
    <form id="f" class="card narrow">
      <h2>Pagamento por Pix</h2>
      <label>Chave Pix<input name="pix_chave" value="${esc(v.pix_chave)}" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"></label>
      <label>Nome de quem recebe<input name="pix_nome" value="${esc(v.pix_nome)}" placeholder="Ex.: Rafael V. B. Costa"></label>
      <p class="muted small">Aparece na tela Planos, para o usuário conferir antes de pagar.</p>
      <h2>Promoção de lançamento</h2>
      <label>Vagas grátis para todas as empresas até (último dia)<input name="promo_ate" type="date" value="${esc(v.promo_ate || '')}"></label>
      <p class="muted small">Enquanto vale, qualquer empresa publica vagas sem pagar; cada vaga fica 30 dias no ar. Quem cadastrar a empresa
        durante a promoção começa o teste grátis de 30 dias só depois dela. Deixe em branco para não ter promoção (nada aparece no site).</p>
      ${v.promo_ate ? '<button type="button" class="btn btn-ghost btn-sm" id="promo-clear">Encerrar promoção (apagar a data)</button>' : ''}
      <h2>Preços dos planos</h2>
      <ul class="plan-items">${Object.values(PLANOS).map((p) => `<li>${ICON.check}${esc(p.nome)}: <b>${moneyCents(p.preco)}/mês</b> (${p.para === 'empresa' ? 'empresas' : 'autônomos'})</li>`).join('')}</ul>
      <p class="muted small">Para mudar os preços, peça ao Claude: eles ficam no código e no banco.</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit">Salvar</button>
    </form>`;
  el.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('[type=submit]');
    setBusy(btn, true, 'Salvando...');
    const { error } = await sb.from('app_settings').upsert([
      { key: 'pix_chave', value: f.pix_chave.value.trim() },
      { key: 'pix_nome', value: f.pix_nome.value.trim() },
      { key: 'promo_ate', value: f.promo_ate.value || '' },
    ]);
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    toast('Configurações salvas! ✅');
    settings(el, _p, ctx);
  };
  el.querySelector('#promo-clear')?.addEventListener('click', () => {
    el.querySelector('[name=promo_ate]').value = '';
    toast('Data apagada. Clique em Salvar para encerrar a promoção.', 'info');
  });
}
