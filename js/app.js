import { sb, configured, recoveryFromUrl } from './supabase.js?v=202611022203';
import { state, clearState, loadUserData, role, homeFor, isAdmin } from './store.js?v=202611022203';
import { ICON, esc, avatar, toast, loading } from './ui.js?v=202611022203';
import * as auth from './views/auth.js?v=202611022203';
import * as cand from './views/candidato.js?v=202611022203';
import * as serv from './views/servicos.js?v=202611022203';
import * as emp from './views/empresa.js?v=202611022203';
import * as perfil from './views/perfil.js?v=202611022203';
import * as planos from './views/planos.js?v=202611022203';
import * as admin from './views/admin.js?v=202611022203';

// ---------------------------------------------------------------
// Rotas (endereços das telas)
// ---------------------------------------------------------------
const PUBLIC = [
  { path: /^\/$/, view: auth.landing },
  { path: /^\/entrar$/, view: auth.login },
  { path: /^\/cadastro$/, view: auth.signup },
];

const ROUTES = [
  { path: /^\/nova-senha$/, view: auth.newPassword },
  { path: /^\/perfil$/, view: perfil.profile },
  // Candidato
  { path: /^\/vagas$/, view: cand.jobs },
  { path: /^\/vaga\/([\w-]+)$/, view: cand.jobDetail },
  { path: /^\/candidaturas$/, view: cand.applications },
  { path: /^\/curriculo$/, view: cand.resumeForm },
  { path: /^\/previa$/, view: cand.resumePreview },
  // Serviços
  { path: /^\/servicos$/, view: serv.hub },
  { path: /^\/profissionais$/, view: serv.professionals },
  { path: /^\/profissional\/([\w-]+)$/, view: serv.professionalDetail },
  { path: /^\/pedidos$/, view: serv.requests },
  { path: /^\/pedido-novo$/, view: serv.newRequest },
  { path: /^\/meu-servico$/, view: serv.myService },
  // Empresa
  { path: /^\/painel$/, view: emp.dashboard, roles: ['empresa'], needsCompany: true },
  { path: /^\/minhas-vagas$/, view: emp.myJobs, roles: ['empresa'], needsCompany: true },
  { path: /^\/vaga-form(?:\/([\w-]+))?$/, view: emp.jobForm, roles: ['empresa'], needsCompany: true },
  { path: /^\/candidatos\/([\w-]+)$/, view: emp.candidates, roles: ['empresa'], needsCompany: true },
  { path: /^\/empresa$/, view: emp.companyForm, roles: ['empresa'] },
  { path: /^\/divulgar$/, view: emp.companyServices, roles: ['empresa'], needsCompany: true },
  { path: /^\/planos$/, view: planos.plans, roles: ['empresa', 'profissional'] },
  { path: /^\/admin$/, view: admin.overview, admin: true },
  { path: /^\/admin\/usuarios$/, view: admin.users, admin: true },
  { path: /^\/admin\/pagamentos$/, view: admin.payments, admin: true },
  { path: /^\/admin\/moderacao$/, view: admin.moderation, admin: true },
  { path: /^\/admin\/config$/, view: admin.settings, admin: true },
  { path: /^\/empresa\/([\w-]+)$/, view: emp.companyPage },
];

const NAV = {
  candidato: [
    ['/vagas', 'Vagas', 'briefcase'],
    ['/servicos', 'Serviços', 'tool'],
    ['/candidaturas', 'Candidaturas', 'list'],
    ['/curriculo', 'Currículo', 'file'],
    ['/previa', 'Prévia/PDF', 'download'],
  ],
  empresa: [
    ['/painel', 'Painel', 'chart'],
    ['/minhas-vagas', 'Minhas vagas', 'briefcase'],
    ['/empresa', 'Empresa', 'building'],
    ['/planos', 'Planos', 'star'],
    ['/servicos', 'Serviços', 'tool'],
  ],
  admin: [
    ['/admin', 'Visão geral', 'chart'],
    ['/admin/usuarios', 'Usuários', 'users'],
    ['/admin/pagamentos', 'Pagamentos', 'card'],
    ['/admin/moderacao', 'Moderação', 'shield'],
    ['/admin/config', 'Configurações', 'settings'],
  ],
  profissional: [
    ['/pedidos', 'Pedidos', 'list'],
    ['/servicos', 'Serviços', 'tool'],
    ['/meu-servico', 'Meu perfil', 'user'],
    ['/vagas', 'Vagas', 'briefcase'],
    ['/candidaturas', 'Candidaturas', 'file'],
  ],
};

const app = document.getElementById('app');
let renderToken = 0;
let shellRole = null;

function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h.split('?')[0] : '/';
}

export function go(path) {
  if (currentPath() === path) render();
  else location.hash = '#' + path;
}

// ---------------------------------------------------------------
// Moldura do app (cabeçalho + menu lateral + menu inferior)
// ---------------------------------------------------------------
function renderShell() {
  const r = isAdmin() ? 'admin' : role();
  shellRole = r;
  const items = NAV[r] || NAV.candidato;
  const p = state.profile || {};
  const link = ([href, label, icon]) =>
    `<a href="#${href}" data-nav="${href}">${ICON[icon]}<span>${esc(label)}</span></a>`;
  app.innerHTML = `
    <header class="topbar">
      <a href="#${homeFor(r)}" class="brand"><img src="assets/logo.png" alt="BuscAqui"></a>
      <div class="topbar-actions">
        <button class="icon-btn" id="btn-bell" aria-label="Notificações">${ICON.bell}</button>
        <a href="#/perfil" class="me" data-nav="/perfil">${avatar(p.avatar_url, p.full_name, 36)}
          <span class="me-name">${esc((p.full_name || '').split(' ')[0] || 'Meu perfil')}</span></a>
      </div>
    </header>
    <div class="shell">
      <nav class="sidenav" aria-label="Menu principal">
        ${items.map(link).join('')}
        <div class="sidenav-sep"></div>
        <a href="#/perfil" data-nav="/perfil">${ICON.settings}<span>Meu perfil</span></a>
        <button id="btn-logout" class="sidenav-logout">${ICON.logout}<span>Sair</span></button>
        <div class="sidenav-foot">Encontre. Conecte. Trabalhe.</div>
      </nav>
      <main id="view" class="view"></main>
    </div>
    <nav class="bottomnav" aria-label="Menu">${items.map(link).join('')}</nav>`;
  document.getElementById('btn-logout').onclick = logout;
  document.getElementById('btn-bell').onclick = () =>
    toast('Notificações chegam em breve! Por enquanto, acompanhe tudo pelo app.', 'info');
}

function markNav(path) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const n = a.dataset.nav;
    const active = path === n || (n !== '/' && n !== '/admin' && path.startsWith(n + '/')) ||
      (n === '/vagas' && path.startsWith('/vaga/')) ||
      (n === '/servicos' && /^\/(profissionais|profissional|pedido-novo)/.test(path)) ||
      (n === '/minhas-vagas' && path.startsWith('/candidatos/')) ||
      (n === '/vaga-form' && path === '/vaga-form');
    a.classList.toggle('active', active);
  });
}

export async function logout() {
  await sb.auth.signOut();
  clearState();
  shellRole = null;
  location.hash = '#/';
  render();
}

// ---------------------------------------------------------------
// Desenha a tela atual
// ---------------------------------------------------------------
export async function render() {
  const token = ++renderToken;
  const alive = () => token === renderToken;
  document.getElementById('modal-root').innerHTML = '';

  if (!configured) return setupScreen();

  const path = currentPath();
  const ctx = { go, alive, render, refreshShell: () => { renderShell(); markNav(currentPath()); } };

  if (!state.user) {
    shellRole = null;
    const pub = PUBLIC.find((r) => r.path.test(path));
    if (!pub) { location.hash = '#/'; return; }
    app.innerHTML = '<main id="view" class="public"></main>';
    return pub.view(document.getElementById('view'), path.match(pub.path).slice(1), ctx);
  }

  if (PUBLIC.some((r) => r.path.test(path))) { location.hash = '#' + homeFor(); return; }

  const route = ROUTES.find((r) => r.path.test(path));
  if (!route) { location.hash = '#' + homeFor(); return; }
  if (state.profile?.blocked) return blockedScreen();
  if (route.admin && !isAdmin()) { location.hash = '#' + homeFor(); return; }
  if (route.roles && !route.roles.includes(role())) { location.hash = '#' + homeFor(); return; }
  if (route.needsCompany && !state.company) { location.hash = '#/empresa'; return; }

  if (shellRole !== (isAdmin() ? 'admin' : role()) || !document.getElementById('view') || !document.querySelector('.shell')) renderShell();
  markNav(path);
  const view = document.getElementById('view');
  view.innerHTML = loading();
  window.scrollTo(0, 0);
  try {
    await route.view(view, path.match(route.path).slice(1), ctx);
  } catch (e) {
    console.error(e);
    if (alive()) view.innerHTML = `<div class="card"><h2>Ops!</h2><p>Não foi possível abrir esta tela.</p><p class="muted">${esc(e.message || e)}</p></div>`;
  }
}

function blockedScreen() {
  shellRole = null;
  app.innerHTML = `
    <main class="public"><div class="auth-wrap"><div class="card auth-card center">
      ${ICON.ban}<h1>Conta bloqueada</h1>
      <p>Sua conta foi bloqueada pela administração do BuscAqui. Se acha que foi um engano, entre em contato com o suporte.</p>
      <button class="btn btn-primary" id="out">Sair</button>
    </div></div></main>`;
  document.getElementById('out').onclick = logout;
}

function setupScreen() {
  app.innerHTML = `
    <main class="public"><div class="setup card">
      <img src="assets/logo.png" alt="BuscAqui" class="setup-logo">
      <h1>Quase lá! Falta conectar o Supabase</h1>
      <p>O site já está no ar, mas ainda não sabe qual banco de dados usar.</p>
      <ol>
        <li>No GitHub, abra o arquivo <b>js/config.js</b> e clique no lápis ✏️ para editar.</li>
        <li>Cole a <b>Project URL</b> e a <b>Publishable key</b> do Supabase entre as aspas.</li>
        <li>Clique em <b>Commit changes</b> e aguarde cerca de 1 minuto.</li>
        <li>Atualize esta página.</li>
      </ol>
      <p class="muted">O passo a passo completo está no arquivo README.md do repositório.</p>
    </div></main>`;
}

// ---------------------------------------------------------------
// Início
// ---------------------------------------------------------------
async function start() {
  if (!configured) return setupScreen();
  app.innerHTML = loading('Abrindo o BuscAqui...');

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { location.hash = '#/nova-senha'; }
    if (event === 'SIGNED_OUT') { clearState(); }
    if (event === 'TOKEN_REFRESHED' && session) { state.session = session; state.user = session.user; }
  });

  const { data } = await sb.auth.getSession();
  if (data.session) {
    state.session = data.session;
    state.user = data.session.user;
    await loadUserData();
  }

  if (recoveryFromUrl && state.user) location.replace('#/nova-senha');
  else if (location.hash.includes('access_token') || location.hash.includes('error=')) location.replace('#/');

  window.addEventListener('hashchange', render);
  render();
}

export async function afterLogin(session) {
  state.session = session;
  state.user = session.user;
  await loadUserData();
  shellRole = null;
}

start();
