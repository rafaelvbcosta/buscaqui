import { sb } from '../supabase.js?v=202611082347';
import { state, loadUserData, role, activePlan, pendingSub, trialDaysLeft, trialStarts, packageCredits } from '../store.js?v=202611082347';
import { promoBanner } from './empresa.js?v=202611082347';
import { ICON, esc, toast, errMsg, setBusy, confirmBox, dateBR, moneyCents, PLANOS, pixCode, pixBoxHtml, wirePixCopy } from '../ui.js?v=202611082347';

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
      <p class="muted small">Escolha um plano mensal, ou pague só as vagas que precisar: vaga avulsa por ${moneyCents(PLANOS.vaga_avulsa.preco)} ou pacote de 3 por ${moneyCents(PLANOS.pacote3.preco)} (abaixo).</p></div></div>`;
  } else {
    status = `<div class="card plan-status">${ICON.star}<div><b>Você está no plano grátis</b>
      <p class="muted small">Seu perfil continua aparecendo para todos. Com o Destaque, ele aparece primeiro.</p></div></div>`;
  }

  const pixBox = (p, sub) => pixBoxHtml(pix, p.preco, sub, sub.plan === 'pacote3'
    ? 'Depois do pagamento, a equipe do BuscAqui confirma e você ganha 3 vagas para usar em até 90 dias (normalmente em até 1 dia útil).'
    : undefined);
  const cred = r === 'empresa' ? packageCredits() : { left: 0 };

  el.innerHTML = `
    <div class="page-head"><h1>Planos</h1><p class="muted">${r === 'empresa' ? 'Plano mensal, pacote de vagas ou vaga avulsa: escolha o que combina com a sua empresa. O pagamento é por Pix.' : 'Escolha o plano ideal. O pagamento é por Pix, todo mês.'}</p></div>
    ${r === 'empresa' ? promoBanner() : ''}
    ${status}
    ${cred.left ? `<div class="card plan-status ok">${ICON.briefcase}<div><b>Pacote: ${cred.left} vaga${cred.left === 1 ? '' : 's'} para usar até ${dateBR(cred.ends)}</b>
      <p class="muted small">Use em "Nova vaga" ou para renovar uma vaga vencida em Minhas vagas. Cada vaga fica 30 dias no ar.</p></div></div>` : ''}
    ${pend ? `<div class="card pend">
      <h3>${ICON.clock} Pedido aguardando confirmação</h3>
      <p>Pedido <b>${esc(pixCode(pend))}</b> · ${pend.plan === 'pacote3' ? '' : 'Plano '}<b>${esc(PLANOS[pend.plan]?.nome || pend.plan)}</b> · ${moneyCents(pend.price)} · pedido em ${dateBR(pend.created_at)}</p>
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
    </article>
    <article class="card plan plan-avulsa">
      <div class="grow"><h2>${esc(PLANOS.pacote3.nome)} <span class="tag">sem mensalidade</span></h2>
        <p class="plan-price">${moneyCents(PLANOS.pacote3.preco)}<small>/pacote</small></p>
        <ul class="plan-items">${PLANOS.pacote3.itens.map((i) => `<li>${ICON.check}${esc(i)}</li>`).join('')}</ul>
        <p class="muted small">Para quem já sabe que vai contratar algumas vezes. As vagas não usadas em 90 dias expiram.</p></div>
      <button class="btn btn-secondary" data-plan="pacote3" ${pend ? 'disabled' : ''}>${ICON.card} Comprar pacote</button>
    </article>` : ''}`;

  wirePixCopy(el, pix);
  el.querySelector('#cancel')?.addEventListener('click', async () => {
    if (!(await confirmBox('Cancelar pedido', 'Deseja cancelar este pedido? Se você já fez o Pix, não cancele: aguarde a confirmação.', 'Cancelar pedido', true))) return;
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
