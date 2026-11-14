import { sb } from '../supabase.js?v=202611142102';
import { state, loadUserData, activePlan } from '../store.js?v=202611142102';
import { ICON, esc, avatar, toast, errMsg, setBusy, formData, maskPhone, uploadFile, modal, CONTATO_EMAIL } from '../ui.js?v=202611142102';
import { logout } from '../app.js?v=202611142102';

const ROLE_LABEL = { candidato: 'Candidato', empresa: 'Empresa', profissional: 'Profissional autônomo' };

export function profile(el, _p, { refreshShell }) {
  const p = state.profile || {};
  let photo = p.avatar_url || '';
  el.innerHTML = `
    <div class="page-head"><h1>Minha conta</h1></div>
    <div class="stack narrow">
      <form id="f" class="card">
        <div class="photo-row"><div id="ph">${avatar(photo, p.full_name, 80)}</div>
          <div><span class="badge b-green">${esc(ROLE_LABEL[p.role] || 'Usuário')}</span>
          <label class="btn btn-ghost btn-sm file-btn">${ICON.upload} Trocar foto<input type="file" id="photo" accept="image/*" hidden></label></div></div>
        <label>Nome completo<input name="full_name" value="${esc(p.full_name)}" required></label>
        ${p.role === 'candidato' ? `<label>Telefone / WhatsApp<input name="phone" type="tel" value="${esc(p.phone)}"></label>` : `<div class="two">
          <label>Telefone / WhatsApp<input name="phone" type="tel" value="${esc(p.phone)}"></label>
          <label>Cidade<input name="city" value="${esc(p.city)}"></label>
        </div>`}
        <label>E-mail<input value="${esc(state.user.email)}" disabled></label>
        <button class="btn btn-primary" type="submit">Salvar</button>
      </form>

      ${state.profile?.is_admin ? '' : `<a href="#/sugestao" class="card cta-band">
        <div><h3>${ICON.chat} Tem uma ideia ou encontrou um problema?</h3><p class="muted">Envie sua sugestão para a equipe do BuscAqui.</p></div>
        <span class="btn btn-secondary">Enviar sugestão</span></a>`}

      <form id="fp" class="card">
        <h2>Trocar senha</h2>
        <label>Nova senha<input name="p1" type="password" minlength="6" autocomplete="new-password"></label>
        <button class="btn btn-ghost" type="submit">Alterar senha</button>
      </form>

      <section class="card">
        <h2>${ICON.shield} Privacidade</h2>
        <p class="muted">Veja quais dados guardamos e como usamos. Para corrigir documentos ou pedir uma cópia dos seus
          dados, escreva para <a href="mailto:${CONTATO_EMAIL}">${CONTATO_EMAIL}</a>.</p>
        <div class="row wrap"><a class="btn btn-ghost btn-sm" href="#/privacidade">Política de privacidade</a>
          <a class="btn btn-ghost btn-sm" href="#/termos">Termos de uso</a></div>
        ${p.is_admin ? '' : `<div class="del-zone">
          <h3>Excluir minha conta</h3>
          <p class="muted small">Apaga para sempre a sua conta e os seus dados do BuscAqui. Não dá para desfazer.</p>
          <button type="button" class="btn btn-ghost btn-sm danger" id="del-account">${ICON.trash} Excluir minha conta</button>
        </div>`}
      </section>

      <button class="btn btn-ghost btn-block danger" id="out">${ICON.logout} Sair da conta</button>
    </div>`;
  maskPhone(el.querySelector('[name=phone]'));
  el.querySelector('#out').onclick = logout;
  el.querySelector('#del-account')?.addEventListener('click', () => deleteAccount(p));
  el.querySelector('#photo').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      toast('Enviando foto...', 'info');
      photo = await uploadFile(sb, 'avatars', state.user.id, file, { maxMB: 2 });
      el.querySelector('#ph').innerHTML = avatar(photo, p.full_name, 80);
      toast('Foto carregada. Clique em Salvar.');
    } catch (err) { toast(errMsg(err), 'err'); }
  };
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(f);
    if (!d.full_name) return toast('Informe seu nome.', 'err');
    const btn = f.querySelector('[type=submit]'); setBusy(btn, true);
    const { error } = await sb.from('profiles').update({ ...d, avatar_url: photo || null }).eq('id', state.user.id);
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    await loadUserData(); refreshShell();
    toast('Perfil atualizado! ✅');
  };
  const fp = el.querySelector('#fp');
  fp.onsubmit = async (e) => {
    e.preventDefault();
    const { p1 } = formData(fp);
    if (!p1 || p1.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres.', 'err');
    const btn = fp.querySelector('button'); setBusy(btn, true);
    const { error } = await sb.auth.updateUser({ password: p1 });
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    fp.reset(); toast('Senha alterada! ✅');
  };
}

// ---------- Excluir minha conta (LGPD) ----------
const O_QUE_SAI = {
  candidato: 'seu currículo (e o PDF), candidaturas e vagas favoritas',
  profissional: 'seu perfil profissional, CPF, candidaturas e currículo',
  empresa: 'os dados da empresa, todas as vagas e os candidatos recebidos, a divulgação de serviços e os pedidos de plano',
};

function deleteAccount(p) {
  const plano = activePlan();
  const m = modal('Excluir minha conta', `
    <p>Isso apaga <b>para sempre</b> a sua conta: login, nome, telefone, foto, ${O_QUE_SAI[p.role] || 'seus dados'} e os
      pedidos de serviço que você publicou.</p>
    ${plano ? '<p class="danger"><b>Atenção:</b> você tem um plano pago ativo. Ele também será perdido, sem devolução dos dias restantes.</p>' : ''}
    ${p.role === 'empresa' ? '<p class="muted small">O CNPJ continua marcado como "já usou o teste grátis".</p>' : ''}
    <label>Para confirmar, digite <b>EXCLUIR</b><input id="conf" autocomplete="off" autocapitalize="characters"></label>
    <div class="row-end"><button class="btn btn-ghost" data-no>Cancelar</button>
      <button class="btn btn-danger" data-yes disabled>Excluir para sempre</button></div>`);
  const conf = m.el.querySelector('#conf'), yes = m.el.querySelector('[data-yes]');
  conf.addEventListener('input', () => { yes.disabled = conf.value.trim().toUpperCase() !== 'EXCLUIR'; });
  m.el.querySelector('[data-no]').onclick = m.close;
  yes.onclick = async () => {
    setBusy(yes, true, 'Excluindo...');
    const uid = state.user.id;
    // 1) arquivos (foto, logo, PDF do currículo): ficam na pasta com o id do usuário
    for (const bucket of ['avatars', 'logos', 'curriculos']) {
      try {
        const { data } = await sb.storage.from(bucket).list(uid, { limit: 1000 });
        const paths = (data || []).map((f) => `${uid}/${f.name}`);
        if (paths.length) await sb.storage.from(bucket).remove(paths);
      } catch (e) { console.warn('arquivos', bucket, e); }
    }
    // 2) conta e dados (o banco apaga tudo o que está ligado ao perfil)
    const { error } = await sb.rpc('delete_my_account');
    if (error) { setBusy(yes, false); return toast(errMsg(error), 'err'); }
    m.close();
    try { await sb.auth.signOut({ scope: 'local' }); } catch { /* a conta já não existe */ }
    await logout();
    window.scrollTo(0, 0);
    toast('Sua conta foi excluída. Obrigado por ter usado o BuscAqui.');
  };
}
