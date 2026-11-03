// Funções de apoio usadas por todas as telas

export const CATEGORIAS_VAGA = [
  'Administrativo', 'Alimentação', 'Atendimento', 'Beleza e Estética', 'Comércio/Vendas',
  'Construção Civil', 'Educação', 'Indústria', 'Limpeza e Conservação', 'Logística/Transporte',
  'Manutenção', 'Saúde', 'Segurança', 'Tecnologia', 'Outros',
];

export const CATEGORIAS_SERVICO = [
  'Eletricista', 'Encanador', 'Pedreiro', 'Pintor', 'Diarista / Limpeza', 'Jardineiro',
  'Montador de móveis', 'Marido de aluguel', 'Mecânico', 'Cabeleireiro(a) / Manicure',
  'Costureira', 'Técnico de informática', 'Fretes e mudanças', 'Aulas particulares',
  'Cuidador(a)', 'Cozinheiro(a) / Buffet', 'Fotógrafo(a)', 'Outros',
];

// Categorias de serviço para empresas (ex.: oficina divulgando seus serviços)
export const CATEGORIAS_EMPRESA = [
  'Oficina mecânica', 'Autopeças', 'Assistência técnica', 'Pet shop', 'Barbearia',
  'Oficina elétrica', 'Locação de equipamentos', 'Salão de beleza', 'TI', 'Outros',
];

export const MODALIDADES = ['Presencial', 'Híbrido', 'Remoto'];

// Planos pagos (o preço que vale é o do banco: função plan_price no setup.sql)
export const PLANOS = {
  basico: {
    nome: 'Básico', preco: 29.90, para: 'empresa',
    itens: ['Até 5 vagas por mês', 'Até 3 serviços divulgados, com selo "Destaque"'],
  },
  profissional: {
    nome: 'Profissional', preco: 49.90, para: 'empresa',
    itens: ['Vagas ilimitadas', 'Serviços ilimitados, no topo da lista'],
  },
  autonomo_destaque: {
    nome: 'Autônomo Destaque', preco: 14.90, para: 'profissional',
    itens: ['Seu perfil no topo da lista da sua categoria', 'Selo "Destaque" no seu perfil'],
  },
};
export const DIAS_TESTE_EMPRESA = 30;
export const LIMITE_SERVICOS = 3; // teste grátis e Básico (Profissional = ilimitado)

export const STATUS_CANDIDATURA = {
  enviada: { label: 'Enviada', cls: 'b-gray' },
  em_analise: { label: 'Em análise', cls: 'b-blue' },
  entrevista: { label: 'Entrevista', cls: 'b-yellow' },
  aprovada: { label: 'Aprovada', cls: 'b-green' },
  recusada: { label: 'Não selecionado', cls: 'b-red' },
};

// Evita que textos digitados pelos usuários quebrem a página
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function nl2br(v) {
  return esc(v).replace(/\n/g, '<br>');
}

export function money(v) {
  if (v === null || v === undefined || v === '') return '';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function moneyCents(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function salaryRange(min, max) {
  if (min && max && Number(min) === Number(max)) return money(min);
  if (min && max) return `${money(min)} a ${money(max)}`;
  if (min) return `A partir de ${money(min)}`;
  if (max) return `Até ${money(max)}`;
  return 'Salário a combinar';
}

export function dateBR(v, withTime = false) {
  if (!v) return '';
  const d = new Date(v);
  return withTime
    ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR');
}

export function timeAgo(v) {
  const s = (Date.now() - new Date(v).getTime()) / 1000;
  if (s < 3600) return 'agora há pouco';
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

export function waLink(phone, msg = '') {
  let d = digits(phone);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
}

export function maskPhone(input) {
  input.addEventListener('input', () => {
    const d = digits(input.value).slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    input.value = out;
  });
}

export function maskCNPJ(input) {
  input.addEventListener('input', () => {
    const d = digits(input.value).slice(0, 14);
    let o = d;
    if (d.length > 2) o = d.slice(0, 2) + '.' + d.slice(2);
    if (d.length > 5) o = o.slice(0, 6) + '.' + o.slice(6);
    if (d.length > 8) o = o.slice(0, 10) + '/' + o.slice(10);
    if (d.length > 12) o = o.slice(0, 15) + '-' + o.slice(15);
    input.value = o;
  });
}

// ---------- CPF / CNPJ ----------
export function validCPF(v) {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const k of [9, 10]) {
    let s = 0;
    for (let i = 0; i < k; i++) s += Number(d[i]) * (k + 1 - i);
    const r = (s * 10) % 11 % 10;
    if (r !== Number(d[k])) return false;
  }
  return true;
}

export function validCNPJ(v) {
  const d = digits(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n) => {
    const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = w.reduce((t, x, i) => t + Number(d[i]) * x, 0) % 11;
    return s < 2 ? 0 : 11 - s;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function maskCPF(input) {
  input.addEventListener('input', () => {
    const d = digits(input.value).slice(0, 11);
    let o = d;
    if (d.length > 3) o = d.slice(0, 3) + '.' + d.slice(3);
    if (d.length > 6) o = o.slice(0, 7) + '.' + o.slice(7);
    if (d.length > 9) o = o.slice(0, 11) + '-' + o.slice(11);
    input.value = o;
  });
}

// Consulta pública e gratuita do CNPJ (BrasilAPI). Nunca trava o site se a consulta falhar.
export async function checkCNPJ(cnpj) {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits(cnpj)}`);
    if (r.status === 404) return { found: false };
    if (!r.ok) return { error: true };
    const j = await r.json();
    return {
      found: true,
      situacao: String(j.descricao_situacao_cadastral || '').toUpperCase(),
      municipio: String(j.municipio || '').toUpperCase(),
      uf: String(j.uf || '').toUpperCase(),
      razao: j.razao_social || '', fantasia: j.nome_fantasia || '',
      checked_at: new Date().toISOString(),
    };
  } catch { return { error: true }; }
}
export const isArcos = (ck) => ck?.municipio === 'ARCOS' && ck?.uf === 'MG';

// Código curto do pedido de plano, para a pessoa escrever na mensagem do Pix
export function pixCode(sub) {
  const pre = { basico: 'BA', profissional: 'PR', autonomo_destaque: 'AD' }[sub.plan] || 'BQ';
  return `${pre}-${String(sub.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export function initials(name) {
  const p = String(name || '?').trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

export function avatar(url, name, size = 48, square = false) {
  const r = square ? '12px' : '50%';
  // Logo (quadrado): mostra a imagem inteira, sem cortar. Foto (redondo): preenche o círculo.
  if (url) return `<img class="avatar${square ? ' avatar-logo' : ''}" src="${esc(url)}" alt="" style="width:${size}px;height:${size}px;border-radius:${r}${square ? `;padding:${Math.max(2, Math.round(size * 0.08))}px` : ''}">`;
  return `<span class="avatar avatar-fallback" style="width:${size}px;height:${size}px;border-radius:${r};font-size:${Math.round(size / 2.6)}px">${esc(initials(name))}</span>`;
}

export function options(list, selected, placeholder) {
  return (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '') +
    list.map((o) => `<option ${o === selected ? 'selected' : ''}>${esc(o)}</option>`).join('');
}

export function loading(text = 'Carregando...') {
  return `<div class="loading"><span class="spinner"></span>${esc(text)}</div>`;
}

export function empty(icon, title, text = '', action = '') {
  return `<div class="empty">${ICON[icon] || ''}<h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}

export function badgeStatus(s) {
  const st = STATUS_CANDIDATURA[s] || { label: s, cls: 'b-gray' };
  return `<span class="badge ${st.cls}">${esc(st.label)}</span>`;
}

// ---------- Avisos rápidos ----------
let toastTimer;
export function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.className = `show ${type}`;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 3500);
}

// ---------- Janela (modal) ----------
export function modal(title, bodyHtml, { wide = false } = {}) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Fechar">${ICON.x}</button></div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    </div>`;
  const close = () => (root.innerHTML = '');
  root.querySelector('[data-close]').onclick = close;
  root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) close();
  });
  return { el: root.querySelector('.modal-body'), close };
}

export function confirmBox(title, text, okLabel = 'Confirmar', danger = false) {
  return new Promise((resolve) => {
    const m = modal(title, `<p>${esc(text)}</p>
      <div class="row-end"><button class="btn btn-ghost" data-no>Cancelar</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(okLabel)}</button></div>`);
    m.el.querySelector('[data-no]').onclick = () => { m.close(); resolve(false); };
    m.el.querySelector('[data-yes]').onclick = () => { m.close(); resolve(true); };
  });
}

// ---------- Erros em português ----------
export function errMsg(error) {
  const m = String(error?.message || error || '');
  const map = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/already registered|already been registered/i, 'Este e-mail já está cadastrado. Tente entrar.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'],
    [/rate limit|too many/i, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
    [/Unable to validate email|invalid format|valid email/i, 'E-mail inválido.'],
    [/(?:PLANO_NECESSARIO|CNPJ_INVALIDO|CPF_INVALIDO|CPF_NECESSARIO):\s*(.*)/i, (x) => x[1].charAt(0).toUpperCase() + x[1].slice(1)],
    [/companies_cnpj_uniq/i, 'Este CNPJ já está cadastrado em outra conta. Se for seu, fale com o suporte do BuscAqui.'],
    [/profiles_cpf_uniq|user_docs_cpf_uniq/i, 'Este CPF já está cadastrado em outra conta. Se for seu, fale com o suporte do BuscAqui.'],
    [/LIMITE_SERVICOS:\s*(.*)/i, (x) => x[1].charAt(0).toUpperCase() + x[1].slice(1)],
    [/LIMITE_SUGESTOES:\s*(.*)/i, (x) => x[1].charAt(0).toUpperCase() + x[1].slice(1)],
    [/LIMITE_VAGAS:\s*(.*)/i, (x) => x[1].charAt(0).toUpperCase() + x[1].slice(1) + ' Para publicar mais, mude para o plano Profissional.'],
    [/duplicate key/i, 'Este registro já existe.'],
    [/row-level security/i, 'Você não tem permissão para fazer isso.'],
    [/Failed to fetch|NetworkError/i, 'Sem conexão com o servidor. Verifique sua internet.'],
    [/exceeded the maximum allowed size|Payload too large/i, 'Arquivo grande demais.'],
    [/relation .* does not exist|Could not find the table/i, 'O banco de dados ainda não foi configurado (rode o arquivo setup.sql no Supabase).'],
  ];
  for (const [re, t] of map) { const x = m.match(re); if (x) return typeof t === 'function' ? t(x) : t; }
  return m || 'Algo deu errado. Tente novamente.';
}

export function setBusy(btn, busy, text = 'Aguarde...') {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="spinner sm"></span>${esc(text)}`; btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.label || btn.innerHTML; btn.disabled = false; }
}

export function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => (o[k] = typeof v === 'string' ? v.trim() : v));
  return o;
}

// ---------- Ícones ----------
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
export const ICON = {
  shield: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  card: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  ban: svg('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'),
  briefcase: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/>'),
  tool: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  list: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>'),
  file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  chart: svg('<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  building: svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>'),
  user: svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>'),
  search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  phone: svg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  chat: svg('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  eye: svg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  trash: svg('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'),
  star: svg('<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'),
  globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
};

// ---------- Envio de arquivos ----------
export async function uploadFile(sb, bucket, uid, file, { maxMB = 2, name } = {}) {
  if (file.size > maxMB * 1024 * 1024) throw new Error(`O arquivo deve ter no máximo ${maxMB} MB.`);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${uid}/${name || Date.now()}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  if (bucket === 'curriculos') return path;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
