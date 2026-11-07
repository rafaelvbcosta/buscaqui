import { sb } from '../supabase.js?v=202611071833';
import { ICON, esc, nl2br, toast, errMsg, setBusy, empty, dateBR, timeAgo, waLink } from '../ui.js?v=202611071833';

// ============================================================
// SUGESTÕES E FEEDBACKS
// O usuário só envia. Quem lê é o admin (tela /admin/sugestoes).
// ============================================================
export const TIPOS = {
  sugestao: '💡 Sugestão',
  problema: '🐞 Problema no site',
  elogio: '👏 Elogio',
  outro: 'Outro',
};
const PERFIL = { candidato: 'Candidato', profissional: 'Autônomo', empresa: 'Empresa' };

// ---------- Formulário (todos os perfis) ----------
export function sendForm(el, _p, { go }) {
  el.innerHTML = `
    <div class="page-head"><h1>Enviar sugestão</h1>
      <p class="muted">Sua opinião ajuda a melhorar o BuscAqui. A equipe lê todas as mensagens.</p></div>
    <form id="f" class="card narrow">
      <label>Tipo de mensagem</label>
      <div class="check-grid">${Object.entries(TIPOS).map(([k, t], i) => `
        <label class="check-chip"><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>
      <label>Mensagem<textarea name="message" rows="6" maxlength="1000" required
        placeholder="Conte sua ideia, o problema que encontrou ou o que você gostou."></textarea></label>
      <p class="muted small"><span id="cnt">0</span>/1000 caracteres</p>
      <button class="btn btn-primary btn-block btn-lg" type="submit">${ICON.check} Enviar mensagem</button>
    </form>`;
  const f = el.querySelector('#f');
  f.message.addEventListener('input', () => { el.querySelector('#cnt').textContent = f.message.value.length; });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const message = f.message.value.trim();
    if (message.length < 5) return toast('Escreva um pouco mais sobre a sua mensagem.', 'err');
    const btn = f.querySelector('[type=submit]'); setBusy(btn, true, 'Enviando...');
    const { error } = await sb.from('feedbacks').insert({ kind: f.kind.value, message });
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    el.innerHTML = `
      <div class="card narrow center thanks">
        ${ICON.check}<h1>Obrigado!</h1>
        <p>Sua mensagem chegou à equipe do BuscAqui.</p>
        <div class="row wrap center-row">
          <button class="btn btn-ghost" id="mais">Enviar outra</button>
          <button class="btn btn-primary" id="voltar">Voltar ao início</button>
        </div>
      </div>`;
    el.querySelector('#mais').onclick = () => sendForm(el, _p, { go });
    el.querySelector('#voltar').onclick = () => go('/');
  };
}

// ---------- Admin: lista ----------
export async function adminList(el, _p, ctx) {
  const { data, error } = await sb.from('feedbacks')
    .select('*, profiles(full_name, email, phone)').order('created_at', { ascending: false }).limit(300);
  if (!ctx.alive()) return;
  if (error) { el.innerHTML = `<div class="card">${esc(errMsg(error))}</div>`; return; }
  const all = data || [];
  let status = 'nova', tipo = '';
  const STATUS = { nova: ['b-yellow', 'Nova'], lida: ['b-blue', 'Lida'], resolvida: ['b-green', 'Resolvida'] };
  const count = (s) => all.filter((x) => x.status === s).length;

  el.innerHTML = `
    <a href="#/admin" class="back-link">${ICON.back} Visão geral</a>
    <div class="page-head"><h1>Sugestões</h1><p class="muted">Mensagens enviadas pelos usuários. Só você vê esta tela.</p></div>
    <div class="card filters">
      <div class="seg" id="st" role="group" aria-label="Situação">
        <button type="button" data-s="nova" class="on">Novas (${count('nova')})</button>
        <button type="button" data-s="lida">Lidas (${count('lida')})</button>
        <button type="button" data-s="resolvida">Resolvidas (${count('resolvida')})</button>
        <button type="button" data-s="">Todas (${all.length})</button>
      </div>
      <div class="filter-row"><select id="tp"><option value="">Todos os tipos</option>
        ${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></div>
    </div>
    <div class="stack" id="list"></div>`;

  const draw = () => {
    const res = all.filter((x) => (!status || x.status === status) && (!tipo || x.kind === tipo));
    el.querySelector('#list').innerHTML = res.map((x) => {
      const u = x.profiles || {};
      const wa = waLink(u.phone, `Olá, ${u.full_name || ''}! Aqui é da equipe do BuscAqui, sobre a mensagem que você nos enviou.`);
      return `<article class="card fb-row" data-id="${x.id}">
        <div class="row-between"><div class="chips"><span class="tag">${esc(TIPOS[x.kind] || x.kind)}</span>
          <span class="badge ${STATUS[x.status][0]}">${STATUS[x.status][1]}</span></div>
          <span class="muted small" title="${esc(dateBR(x.created_at, true))}">${timeAgo(x.created_at)}</span></div>
        <p class="fb-msg">${nl2br(x.message)}</p>
        <p class="muted small">${esc(u.full_name || 'Usuário removido')}${x.role ? ` · ${esc(PERFIL[x.role] || x.role)}` : ''}${u.email ? ` · ${esc(u.email)}` : ''}</p>
        <label class="small">Sua anotação (só você vê)<textarea rows="2" data-note>${esc(x.admin_note || '')}</textarea></label>
        <div class="row wrap">
          ${x.status !== 'lida' ? `<button class="btn btn-ghost btn-sm" data-set="lida">${ICON.eye} Marcar como lida</button>` : ''}
          ${x.status !== 'resolvida' ? `<button class="btn btn-ghost btn-sm" data-set="resolvida">${ICON.check} Marcar como resolvida</button>` : ''}
          ${x.status !== 'nova' ? `<button class="btn btn-ghost btn-sm" data-set="nova">Voltar para nova</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-save>${ICON.edit} Salvar anotação</button>
          ${wa ? `<a class="btn btn-whats btn-sm" href="${wa}" target="_blank" rel="noopener">${ICON.chat} Responder</a>` : ''}
        </div>
      </article>`;
    }).join('') || empty('chat', status === 'nova' ? 'Nenhuma sugestão nova' : 'Nada por aqui', 'Quando alguém enviar uma mensagem, ela aparece aqui.');

    el.querySelectorAll('.fb-row').forEach((card) => {
      const item = all.find((x) => x.id === card.dataset.id);
      const save = async (patch, msg) => {
        const { error: e } = await sb.from('feedbacks').update(patch).eq('id', item.id);
        if (e) return toast(errMsg(e), 'err');
        Object.assign(item, patch);
        toast(msg);
        refreshCounts(); draw();
      };
      card.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () =>
        save({ status: b.dataset.set, admin_note: card.querySelector('[data-note]').value.trim() || null },
          { lida: 'Marcada como lida.', resolvida: 'Marcada como resolvida. ✅', nova: 'Voltou para novas.' }[b.dataset.set])));
      card.querySelector('[data-save]').onclick = () => save({ admin_note: card.querySelector('[data-note]').value.trim() || null }, 'Anotação salva.');
    });
  };
  const refreshCounts = () => {
    const lbl = { nova: 'Novas', lida: 'Lidas', resolvida: 'Resolvidas', '': 'Todas' };
    el.querySelectorAll('#st [data-s]').forEach((b) => {
      const s = b.dataset.s;
      b.textContent = `${lbl[s]} (${s ? count(s) : all.length})`;
    });
  };
  el.querySelectorAll('#st [data-s]').forEach((b) => (b.onclick = () => {
    status = b.dataset.s;
    el.querySelectorAll('#st [data-s]').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  }));
  el.querySelector('#tp').onchange = (e) => { tipo = e.target.value; draw(); };
  draw();
}
