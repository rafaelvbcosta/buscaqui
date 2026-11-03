import { state } from '../store.js?v=202611031707';
import { ICON, CONTATO_EMAIL, TERMOS_VERSAO } from '../ui.js?v=202611031707';

// ============================================================
// POLÍTICA DE PRIVACIDADE E TERMOS DE USO (abrem logado ou não)
// Ao mudar o texto de forma importante, troque TERMOS_VERSAO em ui.js.
// ============================================================
const mail = `<a href="mailto:${CONTATO_EMAIL}">${CONTATO_EMAIL}</a>`;
const dataBR = TERMOS_VERSAO.split('-').reverse().join('/');

function frame(el, title, body) {
  const back = state.user ? '' : `<a href="#/" class="back-link">${ICON.back} Voltar</a>`;
  el.innerHTML = `
    <div class="${state.user ? '' : 'legal-wrap'}">
      <article class="card legal">
        ${back}
        <h1>${title}</h1>
        <p class="muted small">Última atualização: ${dataBR}</p>
        ${body}
        <p class="legal-links"><a href="#/privacidade">Política de privacidade</a> · <a href="#/termos">Termos de uso</a></p>
      </article>
    </div>`;
}

export function privacy(el) {
  frame(el, 'Política de privacidade', `
    <p>Esta política explica, em linguagem simples, quais dados o <b>BuscAqui</b> (site de vagas e serviços de
      Arcos - MG, www.buscaquiarcos.com.br) guarda, para que usa, quem pode ver e como você pede para corrigir ou
      apagar seus dados, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>

    <h2>1. Quem cuida dos seus dados</h2>
    <p>O BuscAqui é o responsável (controlador) pelos dados tratados no site. Para qualquer assunto de privacidade,
      fale com a gente pelo e-mail ${mail}. Esse é o nosso canal de atendimento ao titular dos dados.</p>

    <h2>2. Quais dados guardamos</h2>
    <ul>
      <li><b>Todos:</b> nome, telefone/WhatsApp, e-mail, senha (guardada de forma criptografada; nem a equipe vê),
        tipo de perfil, foto (opcional) e a data em que você aceitou estes termos.</li>
      <li><b>Candidato:</b> currículo (resumo, experiências, escolaridade, habilidades, cursos), PDF do currículo
        que você enviar, vagas favoritas e candidaturas.</li>
      <li><b>Profissional autônomo:</b> CPF, cidade, serviços, descrição, valores e foto do perfil profissional.</li>
      <li><b>Empresa:</b> CNPJ, nome, endereço, telefone, e-mail, redes sociais, logo, descrição e vagas publicadas.</li>
      <li><b>Outros:</b> pedidos de serviço que você publicar, sugestões que enviar e pedidos de plano (plano, valor,
        data e situação). O pagamento é feito por Pix no seu banco: o BuscAqui <b>não</b> recebe dados do seu
        cartão nem da sua conta bancária.</li>
    </ul>

    <h2>3. Para que usamos</h2>
    <ul>
      <li>Fazer o site funcionar: mostrar vagas, currículos, profissionais e pedidos de serviço (execução do
        serviço que você pediu ao se cadastrar).</li>
      <li>Evitar cadastros falsos e repetidos: o CPF e o CNPJ precisam ser válidos e únicos. O CNPJ é conferido em
        dados públicos da Receita Federal pela BrasilAPI (legítimo interesse e prevenção a fraudes).</li>
      <li>Ativar planos, responder sugestões e dar suporte.</li>
      <li>Cumprir obrigações legais.</li>
    </ul>
    <p>Não vendemos seus dados e não usamos seus dados para propaganda de terceiros.</p>

    <h2>4. Quem pode ver</h2>
    <ul>
      <li><b>Seu CPF:</b> só você e a administração do BuscAqui.</li>
      <li><b>Currículo e dados de contato do candidato:</b> só as empresas das vagas em que você se candidatou.</li>
      <li><b>Perfil do profissional autônomo e página da empresa</b> (nome, foto/logo, telefone/WhatsApp, cidade,
        serviços, vagas): ficam públicos no site, porque o objetivo é que clientes e candidatos encontrem você.</li>
      <li><b>Pedidos de serviço:</b> usuários cadastrados veem o pedido e o telefone que você informou nele.</li>
      <li><b>Administração do BuscAqui:</b> vê os cadastros para moderação, suporte e confirmação de pagamentos.</li>
    </ul>

    <h2>5. Empresas que nos ajudam a funcionar</h2>
    <p>Usamos serviços de terceiros, que tratam dados apenas para fazer o site funcionar:
      <b>Supabase</b> (banco de dados, login e arquivos, com servidores em São Paulo), <b>GitHub Pages</b>
      (hospedagem do site), <b>BrasilAPI</b> (consulta de CNPJ), <b>Google Fonts</b>, <b>jsDelivr</b> e
      <b>cdnjs</b> (letras e bibliotecas do site; recebem o endereço de internet de quem acessa). Quando você toca
      em um botão de WhatsApp, a conversa acontece no WhatsApp, que tem a sua própria política.</p>

    <h2>6. Por quanto tempo guardamos</h2>
    <ul>
      <li>Enquanto a sua conta existir. Ao excluir a conta, apagamos o perfil, currículo, CPF, candidaturas,
        favoritos, pedidos de serviço, pedidos de plano, perfil profissional, dados da empresa e vagas.</li>
      <li>Ficam guardados, mesmo depois da exclusão: o <b>CNPJ que já usou o teste grátis</b> (para o teste ser
        uma vez só por empresa), as <b>sugestões</b> que você enviou (sem ligação com o seu nome) e o que a lei
        obrigar a manter (por exemplo, registros de acesso por 6 meses, pelo Marco Civil da Internet).</li>
    </ul>

    <h2>7. Seus direitos</h2>
    <p>Você pode, a qualquer momento: confirmar se temos dados seus, ver uma cópia, corrigir dados errados ou
      desatualizados, pedir a exclusão, pedir os dados em formato para levar a outro serviço, saber com quem
      compartilhamos e retirar o consentimento. A maior parte você mesmo faz no site (Minha conta, Currículo,
      Meu perfil profissional, Empresa). Para o resto — inclusive <b>corrigir o CPF ou o CNPJ</b> e <b>excluir a
      conta</b> — escreva para ${mail}. Respondemos em até 15 dias. Você também pode reclamar na Autoridade
      Nacional de Proteção de Dados (ANPD).</p>

    <h2>8. Segurança</h2>
    <p>Usamos conexão segura (HTTPS), senhas criptografadas e regras no banco de dados que limitam quem pode ver cada
      informação. Nenhum sistema é 100% seguro; se acontecer algum incidente que possa causar risco a você,
      avisaremos você e a ANPD, como manda a lei.</p>

    <h2>9. Cookies e armazenamento no navegador</h2>
    <p>O BuscAqui <b>não</b> usa cookies de propaganda nem rastreadores. O navegador guarda apenas o necessário
      para manter você conectado e lembrar os filtros da busca de vagas.</p>

    <h2>10. Idade</h2>
    <p>O cadastro é para maiores de 16 anos. Quem tem entre 16 e 18 anos deve usar o site com o conhecimento e a
      autorização dos pais ou responsáveis.</p>

    <h2>11. Mudanças nesta política</h2>
    <p>Se esta política mudar de forma importante, avisaremos no site. A data da última atualização fica no topo
      desta página.</p>`);
}

export function terms(el) {
  frame(el, 'Termos de uso', `
    <p>Estes termos são as regras para usar o <b>BuscAqui</b> (www.buscaquiarcos.com.br). Ao criar uma conta, você
      concorda com eles e com a <a href="#/privacidade">Política de privacidade</a>.</p>

    <h2>1. O que é o BuscAqui</h2>
    <p>Um site que aproxima, em Arcos - MG, quem procura emprego, empresas que contratam, profissionais autônomos
      e quem precisa de um serviço. O BuscAqui <b>só faz a ponte</b>: não é empregador, não é agência de emprego,
      não participa da contratação nem da negociação e não garante vaga, contratação, pagamento ou a qualidade de
      um serviço. Combinados, contratos e pagamentos entre usuários são responsabilidade de quem combinou.</p>

    <h2>2. Sua conta</h2>
    <ul>
      <li>Para se cadastrar é preciso ter pelo menos 16 anos (entre 16 e 18, com autorização dos responsáveis).</li>
      <li>Informe dados verdadeiros e mantenha-os atualizados. Cada pessoa ou empresa deve ter uma conta.</li>
      <li>Guarde sua senha; o que for feito com a sua conta é responsabilidade sua.</li>
      <li>Profissional autônomo precisa de CPF válido e empresa precisa de CNPJ válido, ambos únicos no site. Depois
        de salvos, só a equipe do BuscAqui altera (peça por ${mail}).</li>
    </ul>

    <h2>3. O que não é permitido</h2>
    <ul>
      <li>Publicar vaga falsa, enganosa ou que <b>cobre qualquer valor do candidato</b>.</li>
      <li>Discriminar por cor, raça, sexo, religião, idade, deficiência, orientação sexual ou qualquer outro motivo.</li>
      <li>Conteúdo ilegal, ofensivo, sexual, propaganda enganosa, spam ou dados de outra pessoa sem autorização.</li>
      <li>Usar os contatos do site para outros fins (por exemplo, vender listas ou mandar propaganda em massa).</li>
      <li>Tentar burlar as regras do site, os limites dos planos ou a segurança do sistema.</li>
    </ul>
    <p>A equipe pode remover conteúdo e bloquear contas que descumpram estas regras.</p>

    <h2>4. Planos e pagamento</h2>
    <ul>
      <li>Para candidatos, o BuscAqui é <b>grátis</b>, inclusive o currículo em PDF.</li>
      <li>Empresas têm <b>30 dias de teste grátis</b>, uma vez por CNPJ. Depois, para publicar vagas e divulgar
        serviços, é preciso um plano pago. Profissionais autônomos usam o site de graça e podem contratar o plano
        Destaque.</li>
      <li>Os preços e o que cada plano inclui estão na página <b>Planos</b>. O pagamento é por Pix, feito por você
        no seu banco; o plano é ativado por 30 dias depois que a equipe confirma o pagamento. Não há renovação
        automática: para continuar, pague de novo (os dias são somados).</li>
      <li>Quando o plano ou o teste termina, as vagas e a divulgação da empresa ficam pausadas (nada é apagado) e
        voltam quando o plano é renovado.</li>
      <li><b>Arrependimento:</b> você pode desistir em até 7 dias depois do pagamento e receber o valor de volta,
        pedindo por ${mail} (Código de Defesa do Consumidor, art. 49).</li>
    </ul>

    <h2>5. Disponibilidade</h2>
    <p>Fazemos o possível para o site funcionar sempre, mas ele pode ficar fora do ar em alguns momentos
      (manutenção ou problemas técnicos). Funções e regras podem mudar para melhorar o serviço.</p>

    <h2>6. Encerrar a conta</h2>
    <p>Você pode pedir a exclusão da sua conta quando quiser, por ${mail}. Veja na Política de privacidade o que é
      apagado e o que a lei obriga a guardar.</p>

    <h2>7. Mudanças nestes termos</h2>
    <p>Se estes termos mudarem de forma importante, avisaremos no site. Continuar usando o BuscAqui depois do aviso
      significa que você concorda com a nova versão.</p>

    <h2>8. Contato e lei aplicável</h2>
    <p>Dúvidas: ${mail}. Estes termos seguem as leis do Brasil. Fica eleito o foro da comarca de Arcos - MG,
      sem prejuízo do direito do consumidor de buscar a Justiça no lugar onde mora.</p>`);
}
