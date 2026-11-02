import { sb } from '../supabase.js?v=202611022227';
import { state, homeFor } from '../store.js?v=202611022227';
import { ICON, esc, toast, errMsg, setBusy, formData, maskPhone } from '../ui.js?v=202611022227';
import { afterLogin } from '../app.js?v=202611022227';

// ---------------- Tela inicial ----------------
export function landing(el) {
  el.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <img src="assets/logo.png" alt="BuscAqui — Encontre. Conecte. Trabalhe." class="hero-logo">
        <h1>Oportunidades de vagas e serviços <span class="hl">em Arcos</span>.</h1>
        <p class="lead">Encontre emprego, contrate profissionais autônomos e divulgue as vagas da sua empresa. Simples, rápido e gratuito.</p>
        <div class="hero-cta">
          <a href="#/entrar" class="btn btn-primary btn-lg">Entrar</a>
          <a href="#/cadastro" class="btn btn-outline btn-lg">Cadastrar-se</a>
        </div>
      </div>
      <div class="hero-cards">
        <div class="feature">${ICON.briefcase}<div><h3>Vagas de emprego</h3><p>Busque por categoria, salário e modalidade e candidate-se com um toque.</p></div></div>
        <div class="feature">${ICON.tool}<div><h3>Serviços</h3><p>Encontre eletricistas, diaristas, pintores e outros profissionais da cidade.</p></div></div>
        <div class="feature">${ICON.file}<div><h3>Currículo fácil</h3><p>Monte seu currículo pelo celular e baixe em PDF.</p></div></div>
        <div class="feature">${ICON.building}<div><h3>Para empresas</h3><p>Publique vagas, receba candidatos de Arcos e marque entrevistas.</p></div></div>
      </div>
    </section>
    <footer class="public-foot">BuscAqui · Feito para Arcos - MG · Encontre. Conecte. Trabalhe.</footer>`;
}

// ---------------- Entrar ----------------
export function login(el, _p, { go }) {
  el.innerHTML = `
    <div class="auth-wrap"><div class="card auth-card">
      <a href="#/" class="back-link">${ICON.back} Voltar</a>
      <img src="assets/logo.png" alt="BuscAqui" class="auth-logo">
      <h1>Entrar</h1>
      <form id="f" novalidate>
        <label>E-mail<input name="email" type="email" autocomplete="email" required placeholder="seuemail@exemplo.com"></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></label>
        <button class="btn btn-primary btn-block btn-lg" type="submit">Entrar</button>
      </form>
      <button class="link-btn" id="forgot">Esqueci minha senha</button>
      <p class="center">Ainda não tem conta? <a href="#/cadastro">Cadastre-se grátis</a></p>
    </div></div>`;
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData(f);
    if (!email || !password) return toast('Preencha e-mail e senha.', 'err');
    const btn = f.querySelector('button');
    setBusy(btn, true, 'Entrando...');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setBusy(btn, false); return toast(errMsg(error), 'err'); }
    await afterLogin(data.session);
    toast(`Olá, ${(state.profile?.full_name || '').split(' ')[0] || 'bem-vindo(a)'}!`);
    go(homeFor());
  };
  el.querySelector('#forgot').onclick = async () => {
    const email = f.email.value.trim();
    if (!email) return toast('Digite seu e-mail no campo acima e clique de novo.', 'info');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return toast(errMsg(error), 'err');
    toast('Enviamos um link para criar uma nova senha. Veja seu e-mail.');
  };
}

// ---------------- Cadastro ----------------
const PERFIS = [
  ['candidato', 'Candidato', 'Quero encontrar vagas de emprego', 'user'],
  ['profissional', 'Profissional autônomo', 'Quero oferecer meus serviços', 'tool'],
  ['empresa', 'Empresa', 'Quero publicar vagas e contratar', 'building'],
];

export function signup(el, _p, { go }) {
  let chosen = null;
  const step1 = () => {
    el.innerHTML = `
      <div class="auth-wrap"><div class="card auth-card">
        <a href="#/" class="back-link">${ICON.back} Voltar</a>
        <img src="assets/logo.png" alt="BuscAqui" class="auth-logo">
        <h1>Criar conta</h1>
        <p class="muted center">Como você quer usar o BuscAqui?</p>
        <div class="role-pick">
          ${PERFIS.map(([v, t, d, i]) => `
            <button class="role-card" data-role="${v}">${ICON[i]}<span><b>${t}</b><small>${d}</small></span></button>`).join('')}
        </div>
        <p class="center">Já tem conta? <a href="#/entrar">Entrar</a></p>
      </div></div>`;
    el.querySelectorAll('[data-role]').forEach((b) => (b.onclick = () => { chosen = b.dataset.role; step2(); }));
  };

  const step2 = () => {
    const perfil = PERFIS.find((p) => p[0] === chosen);
    const isEmp = chosen === 'empresa';
    el.innerHTML = `
      <div class="auth-wrap"><div class="card auth-card">
        <button class="back-link link-btn" id="back">${ICON.back} Trocar perfil</button>
        <div class="chip-role">${ICON[perfil[3]]} ${esc(perfil[1])}</div>
        <h1>Seus dados</h1>
        <form id="f" novalidate>
          <label>${isEmp ? 'Nome do responsável' : 'Nome completo'}<input name="full_name" required autocomplete="name"></label>
          <label>Telefone / WhatsApp<input name="phone" type="tel" inputmode="numeric" required placeholder="(00) 00000-0000"></label>
          <label>E-mail<input name="email" type="email" required autocomplete="email"></label>
          <label>Senha <small class="muted">(mínimo 6 caracteres)</small><input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
          <label>Repita a senha<input name="password2" type="password" required autocomplete="new-password"></label>
          <label class="check"><input type="checkbox" name="terms" required> Li e aceito os termos de uso e a política de privacidade.</label>
          <button class="btn btn-primary btn-block btn-lg" type="submit">Criar minha conta</button>
        </form>
      </div></div>`;
    maskPhone(el.querySelector('[name=phone]'));
    el.querySelector('#back').onclick = step1;
    const f = el.querySelector('#f');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = formData(f);
      if (!d.full_name || !d.phone || !d.email || !d.password) return toast('Preencha todos os campos.', 'err');
      if (d.password.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres.', 'err');
      if (d.password !== d.password2) return toast('As senhas não são iguais.', 'err');
      if (!f.terms.checked) return toast('Aceite os termos para continuar.', 'err');
      const btn = f.querySelector('button[type=submit]');
      setBusy(btn, true, 'Criando conta...');
      const { data, error } = await sb.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          data: { full_name: d.full_name, phone: d.phone, role: chosen },
          emailRedirectTo: location.origin + location.pathname,
        },
      });
      if (error) { setBusy(btn, false); return toast(errMsg(error), 'err'); }
      if (!data.session) {
        el.innerHTML = `<div class="auth-wrap"><div class="card auth-card center">
          ${ICON.mail}<h1>Confirme seu e-mail</h1>
          <p>Enviamos um link para <b>${esc(d.email)}</b>. Clique nele para ativar sua conta e depois volte aqui para entrar.</p>
          <a class="btn btn-primary" href="#/entrar">Ir para Entrar</a></div></div>`;
        return;
      }
      await afterLogin(data.session);
      toast('Conta criada com sucesso! 🎉');
      if (chosen === 'empresa') go('/empresa');
      else if (chosen === 'profissional') go('/meu-servico');
      else go('/curriculo');
    };
  };
  step1();
}

// ---------------- Nova senha ----------------
export function newPassword(el, _p, { go }) {
  el.innerHTML = `
    <div class="card narrow">
      <h1>Criar nova senha</h1>
      <form id="f">
        <label>Nova senha<input name="p1" type="password" minlength="6" required></label>
        <label>Repita a nova senha<input name="p2" type="password" minlength="6" required></label>
        <button class="btn btn-primary btn-block" type="submit">Salvar nova senha</button>
      </form>
    </div>`;
  const f = el.querySelector('#f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const { p1, p2 } = formData(f);
    if (p1.length < 6) return toast('Mínimo de 6 caracteres.', 'err');
    if (p1 !== p2) return toast('As senhas não são iguais.', 'err');
    const btn = f.querySelector('button');
    setBusy(btn, true);
    const { error } = await sb.auth.updateUser({ password: p1 });
    setBusy(btn, false);
    if (error) return toast(errMsg(error), 'err');
    toast('Senha alterada!');
    go(homeFor());
  };
}
