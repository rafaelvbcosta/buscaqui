import { sb } from '../supabase.js?v=202611022217';
import { state, loadUserData } from '../store.js?v=202611022217';
import { ICON, esc, avatar, toast, errMsg, setBusy, formData, maskPhone, uploadFile } from '../ui.js?v=202611022217';
import { logout } from '../app.js?v=202611022217';

const ROLE_LABEL = { candidato: 'Candidato', empresa: 'Empresa', profissional: 'Profissional autônomo' };

export function profile(el, _p, { refreshShell }) {
  const p = state.profile || {};
  let photo = p.avatar_url || '';
  el.innerHTML = `
    <div class="page-head"><h1>Meu perfil</h1></div>
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

      <form id="fp" class="card">
        <h2>Trocar senha</h2>
        <label>Nova senha<input name="p1" type="password" minlength="6" autocomplete="new-password"></label>
        <button class="btn btn-ghost" type="submit">Alterar senha</button>
      </form>

      <div class="card">
        <h2>Em breve no BuscAqui</h2>
        <ul class="soon-list">
          <li>${ICON.chat} Chat entre empresa e candidato</li>
          <li>${ICON.bell} Notificações de novas vagas e mensagens</li>
          <li>${ICON.star} Avaliação de empresas e profissionais</li>
          <li>${ICON.globe} Login com Google</li>
          <li>${ICON.briefcase} Sugestão de vagas com inteligência artificial</li>
        </ul>
      </div>

      <button class="btn btn-ghost btn-block danger" id="out">${ICON.logout} Sair da conta</button>
    </div>`;
  maskPhone(el.querySelector('[name=phone]'));
  el.querySelector('#out').onclick = logout;
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
