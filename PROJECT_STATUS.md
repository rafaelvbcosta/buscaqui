# BuscAqui — status do projeto

> Atualizado em **03/11/2026**. Base: branch `main` no commit `db70b17` (merge do PR #16).
> Regras, arquitetura e como testar estão em **`CLAUDE.md`**.
> Legenda: ✅ confirmado no código · 🧪 testado pelo Rafael no site real · ⚠️ não confirmado (ver seção 9).

## 1. Situação geral
- Site **no ar** em https://www.buscaquiarcos.com.br/ (domínio próprio com HTTPS) — 🧪.
- **Ainda não aberto ao público.** O Rafael está testando e preparando a divulgação.
- Supabase configurado: `setup.sql` mais recente (com `feedbacks`) rodado no projeto real — 🧪 (Rafael confirmou
  "Success" antes do merge do PR #16).
- Branch de trabalho `claude/sleepy-thompson-oqj14v` está 2 commits à frente da `main` (só `CLAUDE.md`; este
  arquivo e o novo `CLAUDE.md` entram junto no próximo PR).

## 2. Funcionalidades implementadas
| Área | O que funciona | Status |
|---|---|---|
| Cadastro e login | E-mail/senha, escolha de perfil, nova senha por e-mail, sair | ✅ 🧪 |
| Página inicial | "Oportunidades de vagas e serviços em Arcos.", rodapé "Feito para Arcos - MG" | ✅ 🧪 |
| Candidato | Vagas com busca, categoria, salário e favoritas; detalhe; candidatura; Minhas candidaturas (status, entrevista); Currículo fácil; prévia; PDF grátis com rodapé em cada página A4; envio de PDF próprio | ✅ 🧪 |
| Empresa | Cadastro com CNPJ (BrasilAPI), logo encaixada no quadro, painel, vagas (Bairro, salário único), candidatos (aprovar/recusar/entrevista/WhatsApp), página pública | ✅ 🧪 |
| Empresa — serviços | `#/divulgar`: vários serviços (até 3 sem Profissional), etiqueta "Empresa", botão "Editar divulgação" no cartão e na página | ✅ 🧪 |
| Autônomo | Perfil em 4 etapas com CPF, lista "Encontrar profissional", pedidos de serviço, "Oferecer serviço" pelo WhatsApp, botão "Editar meu perfil" no cartão | ✅ 🧪 |
| Pedidos de serviço | Publicar, "Meus pedidos" no topo, "Já resolvi", excluir | ✅ 🧪 |
| Planos e Pix | Teste 30 dias por CNPJ, Básico, Profissional, Autônomo Destaque, pedido com código, confirmação pelo admin, renovação soma dias, vagas pausadas ao vencer | ✅ 🧪 (fluxo Básico testado) |
| Destaques | Selo e topo da lista com revezamento | ✅ |
| Admin | Visão geral, usuários (busca, duplicados por telefone, documento, verificar CNPJ, dar plano, bloquear), pagamentos, moderação, configurações (chave Pix cadastrada) | ✅ 🧪 |
| Sugestões | `#/sugestao` (menu lateral + quadro no Meu perfil), `#/admin/sugestoes` com filtros, anotação e WhatsApp | ✅ 🧪 |
| Cache | `?v=` em todos os arquivos (`tools/versao.py`) | ✅ |

## 3. Em desenvolvimento
Nada em andamento no código. Última tarefa foi documentação (este arquivo e `CLAUDE.md`).

## 4. Pendências (antes de abrir ao público)
- [ ] Religar **"Confirm email"** no Supabase (Authentication → Sign In / Providers → Email).
- [ ] Rodar `supabase/remover-exemplos.sql` e apagar contas/vagas de teste (inclui a empresa de teste com CNPJ
      `11.222.333/0001-81`, que não existe na Receita).
- [ ] Atualizar o **`README.md`** (desatualizado — ver seção 8).
- [ ] Criar a **política de privacidade / termos de uso** (o cadastro pede aceite dos "termos", mas não há página).
- [ ] Lembrar: Supabase gratuito **pausa após 7 dias sem uso** ("Restore project" no painel).
- [ ] Marketing: preencher sobrenome, WhatsApp e e-mail no último slide da apresentação; confirmar a oferta de
      "empresa fundadora" e as metas da estratégia (ver seção 7).

## 5. Bugs e pontos de atenção conhecidos
| # | Descrição | Onde | Gravidade |
|---|---|---|---|
| 1 | No **menu lateral do autônomo** aparecem **dois itens "Meu perfil"** (um vai para `#/meu-servico`, perfil profissional; outro para `#/perfil`, dados da conta) | `js/app.js` (`NAV.profissional` + link fixo do menu lateral) | Baixa (confunde) |
| 2 | No celular, "Enviar sugestão" não está no menu de baixo (só no quadro do Meu perfil, acessado pela foto no topo). Admin no celular também não tem "Sugestões" no menu de baixo (acessa pela Visão geral) | `js/app.js` | Baixa (decisão de espaço) |
| 3 | Dados de exemplo do `setup.sql` estão em **Belo Horizonte/Contagem**, não em Arcos | `supabase/setup.sql` | Baixa (apagar antes de lançar) |
| 4 | Sem aviso antes do plano vencer (o usuário só vê quando vence) | — | Média (ideia futura) |
| 5 | Datas de plano/teste exibidas na tela usam o relógio do aparelho; o banco é quem decide de verdade | `js/store.js` | Baixa |
| 6 | Filtros salvos antigos no navegador podem conter `mod` (modalidade, removida); é ignorado | `js/views/candidato.js` | Nenhuma |

Nenhum bug de funcionamento foi relatado pelo Rafael em aberto.

## 6. Decisões tomadas (e por quê)
- Site estático + Supabase gratuito: custo zero e manutenção simples para iniciante.
- Regras de negócio no **banco** (RLS/gatilhos) para não serem burladas pelo navegador.
- **Pix manual** primeiro (sem taxa); pagamento automático só com muitos clientes.
- Teste grátis **por CNPJ** e documentos **únicos e travados** para evitar cadastro duplicado.
- Plano vencido **pausa** em vez de apagar (cliente volta com tudo ao pagar).
- **Um cartão por empresa** na lista de serviços (lista não fica poluída; destaque justo).
- PDF do currículo **grátis** com propaganda (cobrar seria fácil de burlar e afastaria o público).
- **Sem avisos "em breve"** no site (não criar expectativa).
- Admin dentro do próprio site (opção B), conta separada.
- Domínio `buscaquiarcos.com.br` com `www` como principal.

## 7. Materiais de marketing (fora do repositório)
Criados em 02-03/11/2026 como artifacts no claude.ai (privados; o Rafael compartilha pelo menu Compartilhar):
- Apresentação para empresas (11 slides): https://claude.ai/artifact/Bz6cjopoDYW6ReMpp3Q6kS
- Estratégia de divulgação e aquisição: https://claude.ai/artifact/D2memvvBDcQV3QWpXa5h2o
- Folder para redes sociais (3 posts 1080×1350 + 1 story 1080×1920): https://claude.ai/artifact/RbPWun8ubP9F7G39D3jbdL
- Guia do projeto (documento + .docx): https://claude.ai/artifact/ShY6BobY5zzKoB9sBahxaV (desatualizado desde o PR #8)
- Vídeos MP4 de 15 s (painel LED 1920×1080 e celular 1080×1920), entregues como arquivos na conversa; os arquivos
  ficaram só no ambiente temporário do Claude (o Rafael tem as cópias baixadas). Usam empresas fictícias.

## 8. Documentação × código (conferência de 03/11/2026)
- `CLAUDE.md` antigo dizia que funcionalidades futuras "aparecem como Em breve" → **corrigido** (não aparecem mais).
- `CLAUDE.md` antigo não listava `js/views/sugestoes.js` nem `PROJECT_STATUS.md` → **corrigido**.
- **`README.md` está desatualizado** (não alterado nesta tarefa): cita filtro por modalidade, lista "Em breve"
  (planos pagos, painel administrativo etc. já existem) e não menciona Admin, planos, Pix, CNPJ/CPF, sugestões nem
  `tools/versao.py`.
- Guia do projeto (artifact) também desatualizado.

## 9. Informações não confirmadas
- ⚠️ Chamada **real** à BrasilAPI nunca foi testada pelo Claude (ambiente sem internet); o Rafael não relatou teste
  com CNPJ real.
- ⚠️ Fluxos de planos **Profissional** e **Autônomo Destaque**, recusa de pagamento, bloqueio de conta, vaga
  pausando ao vencer e limite de 5 vagas/mês foram testados só no banco local, não no site real.
- ⚠️ Se a tarefa agendada de lembrete semanal continua ativa depende da conta do Rafael (id
  `trig_01WH61tmoqyXCDSifKYYvdrx`; última verificação em 03/11/2026: ativa).
- ⚠️ Regras atuais do Google Play (teste fechado, valores) não foram conferidas.
- ⚠️ Metas, orçamento (~R$ 600) e oferta de "empresa fundadora" do material de marketing são **sugestões** ainda
  não aprovadas pelo Rafael.
- ⚠️ O texto exato dos termos de uso aceitos no cadastro não existe.

## 10. Histórico de alterações (PRs, todos com merge feito pelo Rafael)
| PR | Data | Mudança | Banco? |
|---|---|---|---|
| — | 01/11 | MVP + configuração (Supabase, Pages) | Sim |
| #1 | 01/11 | "Meus pedidos de serviço" | Não |
| #2 | 02/11 | Nova logo e ícone | Não |
| #3–#5 | 02/11 | Página inicial focada em Arcos (sem selo, sem sombreado) | Não |
| #6 | 02/11 | Um só campo de salário | Não |
| #7 | 02/11 | Empresas divulgam serviços | Sim |
| #8 | 02/11 | Admin, planos, Pix manual, CNPJ/CPF, teste por CNPJ, vagas pausadas | Sim |
| #9 | 02/11 | Vários serviços por empresa, botões do dono, `?v=` | Sim |
| #10–#11 | 02/11 | Rodapé do PDF (propaganda, pé de cada página) | Não |
| #12 | 02/11 | Docs do domínio próprio | Não |
| #13 | 02/11 | Logo encaixada no quadro | Não |
| #14 | 02/11 | Bairro na vaga, sem Cidade (candidato), sem filtro de modalidade | Não |
| #15 | 02/11 | Remove todos os "em breve" e o sino | Não |
| #16 | 02/11 | Sugestões e feedbacks | Sim |

## 11. Próximas etapas sugeridas
1. Abrir PR com `CLAUDE.md` + `PROJECT_STATUS.md` (e, se o Rafael quiser, corrigir o `README.md` e o bug #1).
2. Pendências da seção 4 (principalmente confirmação de e-mail, apagar exemplos, política de privacidade).
3. Cadastrar as 15–20 empresas fundadoras antes de divulgar (ver estratégia).
4. Ideias aprovadas (em ordem sugerida): PWA "instalar app" → relatórios do Profissional → estatísticas do
   autônomo → pagamento automático → Play Store.
