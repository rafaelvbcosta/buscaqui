// Teste das telas no navegador, SEM internet e SEM o Supabase de verdade.
// Abre o site do repositório no Chromium (Playwright), troca o Supabase pelo supabase-falso.js,
// tira um print de cada tela (celular e computador) e lista erros de JavaScript.
//
// Uso (na raiz do repositório):
//   node tools/testes/telas.js [pasta-dos-prints]          (padrão: /tmp/buscaqui-prints)
//   node tools/testes/telas.js /tmp/prints vagas painel    (só as telas cujo nome contém "vagas" ou "painel")
// Precisa do pacote "playwright" com o Chromium instalado (já vem no ambiente do Claude).
// Sai com código 1 se alguma tela tiver erro de JavaScript.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const FALSO = fs.readFileSync(path.join(__dirname, 'supabase-falso.js'), 'utf8');
const SAIDA = process.argv[2] || '/tmp/buscaqui-prints';
const FILTRO = process.argv.slice(3);

// [nome, endereço (hash), cenário, largura, altura]
const C = { role: 'candidato' }, P = { role: 'profissional' }, E = { role: 'empresa' }, A = { role: 'candidato', admin: true };
const TELAS = [
  ['inicio', '/', { ...C, deslogado: true }, 390, 844],
  ['entrar', '/entrar', { ...C, deslogado: true }, 390, 844],
  ['vagas', '/vagas', C, 390, 844],
  ['vagas-pc', '/vagas', C, 1280, 800],
  ['candidaturas', '/candidaturas', C, 390, 844],
  ['curriculo', '/curriculo', C, 390, 844],
  ['previa-pdf', '/previa', C, 1280, 900],
  ['servicos', '/servicos', C, 1280, 800],
  ['profissionais', '/profissionais', C, 1280, 900],
  ['pedidos', '/pedidos', P, 390, 844],
  ['meu-servico', '/meu-servico', P, 390, 844],
  ['planos-autonomo', '/planos', P, 390, 844],
  ['painel', '/painel', E, 1280, 900],
  ['painel-vencido', '/painel', { ...E, mode: 'vencido' }, 1280, 700],
  ['minhas-vagas', '/minhas-vagas', E, 1280, 600],
  ['vaga-form', '/vaga-form', E, 390, 844],
  ['empresa-form', '/empresa', E, 1280, 900],
  ['divulgar', '/divulgar', { ...E, mode: 'dono' }, 1280, 1000],
  ['empresa-pagina', '/empresa/c1', C, 1280, 800],
  ['planos-empresa', '/planos', { ...E, mode: 'pend' }, 1280, 900],
  ['perfil', '/perfil', C, 390, 844],
  ['sugestao', '/sugestao', C, 390, 844],
  ['admin', '/admin', A, 1280, 800],
  ['admin-usuarios', '/admin/usuarios', A, 1280, 900],
  ['admin-pagamentos', '/admin/pagamentos', A, 1280, 800],
  ['admin-moderacao', '/admin/moderacao', A, 1280, 700],
  ['admin-config', '/admin/config', A, 1280, 800],
  ['admin-sugestoes', '/admin/sugestoes', A, 1280, 900],
];

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const br = await chromium.launch();
  let falhas = 0;
  for (const [nome, hash, cen, w, h] of TELAS) {
    if (FILTRO.length && !FILTRO.some((f) => nome.includes(f))) continue;
    const pg = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1.25 });
    const erros = [];
    pg.on('pageerror', (e) => erros.push(e.message));
    pg.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && erros.push(m.text()));
    await pg.addInitScript((c) => {
      window.__ROLE = c.role; window.__ADMIN = !!c.admin; window.__MODE = c.mode || '';
      if (c.deslogado) window.__NOSESSION = true;
    }, cen);
    await pg.route('**/*', async (rt) => {
      const u = new URL(rt.request().url());
      if (u.host === 'cdn.jsdelivr.net') {
        return rt.fulfill({ contentType: 'text/javascript', body: FALSO });
      }
      if (u.host === 'brasilapi.com.br') {
        return rt.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ razao_social: 'EMPRESA TESTE LTDA', descricao_situacao_cadastral: 'ATIVA', municipio: 'ARCOS', uf: 'MG' }) });
      }
      if (u.host === 'app.local') {
        const arq = path.join(RAIZ, u.pathname === '/' ? 'index.html' : u.pathname);
        if (arq.startsWith(RAIZ) && fs.existsSync(arq)) return rt.fulfill({ path: arq });
      }
      return rt.fulfill({ status: 404, body: '' });
    });
    await pg.goto('http://app.local/#' + hash);
    await pg.waitForTimeout(900);
    await pg.screenshot({ path: path.join(SAIDA, `${nome}.png`), fullPage: true });
    console.log(`${erros.length ? 'ERRO' : 'ok  '}  ${nome}${erros.length ? '  ' + erros.join(' | ') : ''}`);
    if (erros.length) falhas++;
    await pg.close();
  }
  await br.close();
  console.log(`\nPrints em ${SAIDA}. ${falhas ? falhas + ' tela(s) com erro.' : 'Nenhum erro de JavaScript.'}`);
  process.exit(falhas ? 1 : 0);
})();
