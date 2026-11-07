import { sb } from '../supabase.js?v=202611071815';
import { state, loadUserData, role, activePlan, pendingSub, trialDaysLeft, trialStarts } from '../store.js?v=202611071815';
import { promoBanner } from './empresa.js?v=202611071815';
import { ICON, esc, toast, errMsg, setBusy, confirmBox, dateBR, moneyCents, PLANOS, pixCode } from '../ui.js?v=202611071815';

// ============================================================
// PLANOS (empresa e profissional autônomo) — pagamento por Pix manual
// ============================================================
export async function plans(el, _p, ctx) {
  const { data: cfg } = await sb.from('app_settings').select('key, value');
  if (!ctx.alive()) return;
  const pix = Object.fromEntries((cfg || []).map((x) => [x.key, x.value]));
  const r = role();
  const ativo = activePlan();
  const pend = pendingSub();
  const lista = Object.entries(PLANOS).filter(([, p]) => p.para === r);
  const dias = r === 'empresa' ? trialDaysLeft() : 0;

  let status;
  if (ativo) {
    status = `<div class="card plan-status ok">${ICON.check}<div><b>Plano ${esc(PLANOS[ativo.plan].nome)} ativo</b>
      <p class="muted small">Válido até ${dateBR(ativo.ends_at)}. Para renovar, pague de novo antes dessa data: os dias são somados.</p></div></div>`;
  } else if (r === 'empresa' && trialStarts() && trialStarts().getTime() > Date.now()) {
    status = `<div class="card plan-status trial">${ICON.clock}<div><b>Seu teste grátis de 30 dias começa em ${dateBR(trialStarts().toISOString())}</b>
      <p class="muted small">Ele começa quando a promoção de lançamento terminar. Até lá, as vagas novas são grátis.</p></div></div>`;
  } else if (r === 'empresa' && dias > 0) {
    status = `<div class="card plan-status trial">${ICON.clock}<div><b>Teste grátis: falta${dias === 1 ? '' : 'm'} ${dias} dia${dias === 1 ? '' : 's'}</b>
      <p class="muted small">Durante o teste: vagas ilimitadas e até 3 serviços divulgados. Depois, escolha um plano para continuar publicando vagas.</p></div></div>`;
  } else if (r === 'empresa') {
    status = `<div class="card plan-status warn">${ICON.ban}<div><b>Seu teste grátis terminou</b>
      <p class="muted small">Escolha um plano mensal, ou publique só a vaga que precisar por ${moneyCents(PLANOS.vaga_avulsa.preco)} (vaga avulsa, abaixo).</p></div></div>`;
  } else {
    status = `<div class="card plan-status">${ICON.star}<div><b>Você está no plano grátis</b>
      <p class="muted small">Seu perfil continua aparecendo para todos. Com o Destaque, ele aparece primeiro.</p></div></div>`;
  }

  const pixBox = (p, sub) => pix.pix_chave ? `
    <div class="pix-box">
      <p class="muted small">1. Faça um Pix de <b>${moneyCents(p.preco)}</b> para a chave abaixo${pix.pix_nome ? ` (${esc(pix.pix_nome)})` : ''}:</p>
      <div class="pix-key"><code id="pixkey">${esc(pix.pix_chave)}</code>
        <button type="button" class="btn btn-ghost btn-sm" id="copy">${ICON.copy} Copiar</button></div>
      <p class="muted small">2. Na mensagem do Pix, escreva o código do seu pedido: <b class="pix-code">${esc(pixCode(sub))}</b></p>
      <p class="muted small">Depois do pagamento, a equipe do BuscAqui confirma e o plano é ativado por 30 dias (normalmente em até 1 dia útil).</p>
    </div>` : '<p class="muted small">O pagamento por Pix ainda não foi configurado. Tente novamente mais tarde.</p>';

  el.innerHTML = `
    <div class="page-head"><h1>Planos</h1><p class="muted">${r === 'empresa' ? 'Plano mensal ou vaga avulsa: escolha o que combina com a sua empresa. O pagamento é por Pix.' : 'Escolha o plano ideal. O pagamento é por Pix, todo mês.'}</p></div>
    ${r === 'empresa' ? promoBanner() : ''}
    ${status}
    ${pend ? `<div class="card pend">
      <h3>${ICON.clock} Pedido aguardando confirmação</h3>
      <p>Pedido <b>${esc(pixCode(pend))}</b> · Plano <b>${esc(PLANOS[pend.plan]?.nome || pend.plan)}</b> · ${moneyCents(pend.price)} · pedido em ${dateBR(pend.created_at)}</p>
      ${pixBox(PLANOS[pend.plan], pend)}
      <button class="btn btn-ghost btn-sm danger" id="cancel">Cancelar pedido</button>
    </div>` : ''}
    <div class="grid plans">${lista.map(([id, p]) => `
      <article class="card plan ${id === 'profissional' || id === 'autonomo_destaque' ? 'plan-top' : ''}">
        <h2>${esc(p.nome)}</h2>
        <p class="plan-price">${moneyCents(p.preco)}<small>/mês</small></p>
        <ul class="plan-items">${p.itens.map((i) => `<li>${ICON.check}${esc(i)}</li>`).join('')}</ul>
        ${ativo?.plan === id ? '<span class="badge b-green">Seu plano atual</span>' : ''}
        <button class="btn ${ativo?.plan === id ? 'btn-ghost' : 'btn-primary'} btn-block" data-plan="${id}" ${pend ? 'disabled' : ''}>
          ${ativo?.plan === id ? 'Renovar' : 'Assinar'} ${esc(p.nome)}</button>
      </article>`).join('')}</div>
    ${pend ? '<p class="muted small center">Você já tem um pedido aguardando. Cancele-o para escolher outro plano.</p>' : ''}
    ${r === 'empresa' ? `<article class="card plan plan-avulsa">
      <div class="grow"><h2>${esc(PLANOS.vaga_avulsa.nome)} <span class="tag">sem mensalidade</span></h2>
        <p class="plan-price">${moneyCents(PLANOS.vaga_avulsa.preco)}<small>/vaga</small></p>
        <ul class="plan-items">${PLANOS.vaga_avulsa.itens.map((i) => `<li>${ICON.check}${esc(i)}</li>`).join('')}</ul>
        <p class="muted small">Para quem contrata de vez em quando. Sem plano ativo, é só publicar a vaga e seguir para o pagamento.
          Para renovar, use o botão "Renovar" em Minhas vagas. A partir de 3 vagas no mês, o Básico sai mais em conta.</p></div>
      <a class="btn btn-secondary" href="#/vaga-form">${ICON.plus} Publicar uma vaga</a>
    </article>` : ''}`;

  el.querySelector('#copy')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pix.pix_chave); toast('Chave Pix copiada!'); }
    catch { toast('Não foi possível copiar. Selecione a chave e copie manualmente.', 'err'); }
  });
  el.querySelector('#cancel')?.addEventListener('click', async () => {
    if (!(await confirmBox('Cancelar pedido', 'Deseja cancelar este pedido de plano? Se você já fez o Pix, não cancele: aguarde a confirmação.', 'Cancelar pedido', true))) return;
    const { error } = await sb.from('subscriptions').update({ status: 'cancelada' }).eq('id', pend.id);
    if (error) return toast(errMsg(error), 'err');
    await loadUserData();
    toast('Pedido cancelado.', 'info');
    plans(el, _p, ctx);
  });
  el.querySelectorAll('[data-plan]').forEach((b) => (b.onclick = async () => {
    const id = b.dataset.plan;
    setBusy(b, true, 'Enviando...');
    const { error } = await sb.from('subscriptions').insert({ user_id: state.user.id, plan: id });
    setBusy(b, false);
    if (error) return toast(errMsg(error), 'err');
    await loadUserData();
    toast('Pedido criado! Agora faça o Pix.');
    plans(el, _p, ctx);
  }));
}
