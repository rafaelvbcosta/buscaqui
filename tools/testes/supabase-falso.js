// Supabase FALSO para testar as telas sem internet (usado por telas.js).
// O navegador de teste carrega este arquivo no lugar de @supabase/supabase-js (cdn.jsdelivr.net).
// Cenário escolhido por variáveis da janela, definidas pelo telas.js antes de abrir a página:
//   window.__ROLE  = 'candidato' | 'profissional' | 'empresa'   (perfil do usuário logado)
//   window.__ADMIN = true                                       (usuário é admin)
//   window.__MODE  = '' | 'pend' (pedido de plano pendente) | 'plano' (Básico ativo) | 'vencido' (teste vencido)
//                    | 'semcnpj' (empresa sem CNPJ) | 'dono' (o usuário é dono da "Oficina Modelo")
//   window.__NOSESSION = true                                   (ninguém logado: telas públicas)
// Todos os nomes, e-mails e telefones são FICTÍCIOS. Escritas (insert/update/delete) só respondem "ok".
const uid='u1';const R=window.__ROLE||'candidato';const ADM=!!window.__ADMIN;const MODE=window.__MODE||'';
const day=864e5, iso=(d)=>new Date(Date.now()+d*day).toISOString();
const DB={
 profiles:[
  {id:uid,role:R,full_name:ADM?'Admin Exemplo':'Usuário Candidato',email:'usuario@exemplo.com',phone:ADM?'(37) 90000-0000':'(37) 90000-0001',is_admin:ADM,blocked:false,created_at:iso(-10)},
  {id:'u2',role:'empresa',full_name:'Carlos Souza',email:'carlos@exemplo.com',phone:'(37) 99999-1234',created_at:iso(-40)},
  {id:'u3',role:'profissional',full_name:'Profissional Exemplo',email:'profissional@exemplo.com',phone:'(37) 90000-0001',cpf:'529.982.247-25',created_at:iso(-2)},
  {id:'u4',role:'candidato',full_name:'Usuário Candidato',email:'candidato@exemplo.com',phone:'(37) 90000-0001',created_at:iso(-2)},
  {id:'u5',role:'empresa',full_name:'Ana Lima',email:'ana@exemplo.com',phone:'(37) 98888-2222',created_at:iso(-5)},
  {id:'u7',role:'empresa',full_name:'Ana Lima (2ª conta)',email:'ana2@exemplo.com',phone:'(37) 98888-2222',created_at:iso(-1)},
  {id:'u6',role:'candidato',full_name:'Conta Falsa',email:'falso@exemplo.com',blocked:true,created_at:iso(-1)}],
 companies:[
  ...(R==='empresa'&&!ADM&&MODE!=='dono'?[{id:'c0',owner_id:uid,name:'Empresa de Teste',cnpj:MODE==='semcnpj'?null:'11.444.777/0001-61',city:'Arcos',created_at:MODE==='vencido'||MODE==='plano'?iso(-40):iso(-22)}]:[]),
  {id:'c1',owner_id:MODE==='dono'?uid:'u2',name:'Oficina Modelo',cnpj:'11.222.333/0001-81',cnpj_check:{found:true,situacao:'ATIVA',municipio:'ARCOS',uf:'MG'},city:'Arcos - MG',address:'Rua Getúlio Vargas, 120 - Centro',created_at:iso(-40)},
  {id:'c2',owner_id:'u5',name:'Pet Shop Modelo',cnpj:'45.723.174/0001-10',city:'Arcos - MG',address:'Av. Magalhães Pinto, 45',created_at:iso(-5)}],
 professionals:[
  {id:'p0',user_id:MODE==='dono'?uid:'u2',company_id:'c1',name:'Oficina Modelo',city:'Arcos - MG',address:'Rua Getúlio Vargas, 120 - Centro',phone:'37999991234',services:[{categoria:'Oficina mecânica',descricao:'Freios, suspensão e troca de óleo para carros e motos.'},{categoria:'Autopeças',descricao:'Peças originais e paralelas, com entrega em Arcos.'},{categoria:'Oficina elétrica',descricao:'Bateria, alternador e injeção eletrônica.'}],about:null,created_at:iso(-1)},
  {id:'p1',user_id:R==='profissional'&&!ADM?uid:'u3',name:'Profissional Exemplo',city:'Arcos',phone:'37900000001',services:[{categoria:'Eletricista'}],about:'Instalações elétricas residenciais e comerciais.',price:'R$100 por dia',created_at:iso(-2)},
  {id:'p2',user_id:'z',name:'João Eletricista',city:'Arcos - MG',phone:'31999990001',services:[{categoria:'Eletricista'}],about:'Eletricista há 15 anos.',price:'A partir de R$ 80,00',created_at:iso(-30)},
  {id:'p3',user_id:'u5',company_id:'c2',name:'Pet Shop Modelo',city:'Arcos - MG',address:'Av. Magalhães Pinto, 45',phone:'37988882222',services:[{categoria:'Pet shop'}],about:'Banho, tosa e rações.',created_at:iso(-3)}],
 subscriptions:[
  {id:'s1',user_id:'u2',plan:'profissional',price:49.90,status:'ativa',starts_at:iso(-3),ends_at:iso(27),confirmed_at:iso(-3),created_at:iso(-3),profiles:{full_name:'Carlos Souza',email:'carlos@exemplo.com',role:'empresa'}},
  {id:'s2',user_id:'u3',plan:'autonomo_destaque',price:14.90,status:'pendente',created_at:iso(-0.1),profiles:{full_name:'Profissional Exemplo',email:'profissional@exemplo.com',phone:'(37) 90000-0001',role:'profissional'}},
  {id:'s3',user_id:'u5',plan:'basico',price:29.90,status:'pendente',created_at:iso(-0.3),profiles:{full_name:'Ana Lima',email:'ana@exemplo.com',phone:'(37) 98888-2222',role:'empresa'}},
  {id:'s4',user_id:'u5',plan:'basico',price:29.90,status:'cancelada',created_at:iso(-4),profiles:{full_name:'Ana Lima',email:'ana@exemplo.com',role:'empresa'}},
  ...(MODE==='plano'?[{id:'s9',user_id:uid,plan:'basico',price:29.90,status:'ativa',starts_at:iso(-5),ends_at:iso(25),created_at:iso(-5)}]:[]),
  ...(MODE==='pend'?[{id:'s8',user_id:uid,plan:R==='profissional'?'autonomo_destaque':'basico',price:R==='profissional'?14.90:29.90,status:'pendente',created_at:iso(0)}]:[])],
 trial_registry:[{cnpj:'11222333000181',started_at:iso(-40)},{cnpj:'45723174000110',started_at:iso(-5)}],
 jobs:[...(R==='empresa'&&!ADM?[{id:'j9',company_id:'c0',title:'Auxiliar de escritório',status:'aberta',views:12,created_at:iso(-35),modality:'Presencial',location:'Centro'}]:[]),{id:'j1',company_id:'c1',title:'Mecânico auxiliar',status:'aberta',created_at:iso(-2),companies:{name:'Oficina Modelo'}},{id:'j2',company_id:'c2',title:'Atendente de pet shop',status:'aberta',created_at:iso(-1),companies:{name:'Pet Shop Modelo'}}],
 service_requests:[{id:'r1',user_id:'u4',title:'Trocar chuveiro elétrico',description:'Chuveiro queimou',status:'aberto',created_at:iso(-1)}],
 feedbacks:[
  {id:'f1',user_id:'u4',role:'candidato',kind:'sugestao',message:'Seria ótimo poder filtrar as vagas por bairro, porque moro no Centro e não tenho carro.',status:'nova',created_at:iso(-0.05),profiles:{full_name:'Usuário Candidato',email:'candidato@exemplo.com',phone:'(37) 90000-0001'}},
  {id:'f2',user_id:'u5',role:'empresa',kind:'problema',message:'Tentei enviar a logo da empresa pelo celular e demorou bastante para aparecer.',status:'nova',created_at:iso(-0.4),profiles:{full_name:'Ana Lima',email:'ana@exemplo.com',phone:'(37) 98888-2222'}},
  {id:'f3',user_id:'u3',role:'profissional',kind:'elogio',message:'Muito fácil de usar! Já recebi dois clientes pelo WhatsApp.',status:'lida',admin_note:'Pedir depoimento para divulgar',created_at:iso(-2),profiles:{full_name:'Profissional Exemplo',email:'profissional@exemplo.com',phone:'(37) 90000-0001'}}],
 app_settings:[{key:'pix_chave',value:'pix@exemplo.com'},{key:'pix_nome',value:'Nome de Exemplo'}],
 applications:[],favorites:[],resumes:[{user_id:uid,headline:'Auxiliar administrativo',city:'Arcos - MG',about:'Organizado, pontual e com facilidade para aprender. Busco minha primeira oportunidade em escritório.',experiences:[{cargo:'Atendente',empresa:'Padaria Pão Dourado',periodo:'2024 - 2025',descricao:'Atendimento ao cliente e caixa.'}],education:[{curso:'Ensino Médio completo',instituicao:'E.E. de Arcos',periodo:'2023'}],skills:['Pacote Office','Atendimento','Trabalho em equipe'],courses:[]}]
};
function q(t){let rows=[...(DB[t]||[])];const ok={data:null,error:null};const b={select(){return b},order(){return b},limit(){return b},
 eq(k,v){rows=rows.filter(r=>r[k]===v);return b},in(){return b},ilike(){return b},
 update(){return {eq:async()=>ok}},insert:async()=>ok,upsert:async()=>ok,delete(){return {eq:async()=>ok}},
 maybeSingle(){return Promise.resolve({data:rows[0]||null,error:null})},single(){return b.maybeSingle()},
 then(res,rej){return Promise.resolve({data:rows,error:null,count:rows.length}).then(res,rej)}};return b}
export function createClient(){return{from:q,storage:{from:()=>({})},
 rpc:async(n,a)=>n==='active_plan'?{data:a&&a.uid==='u2'?'profissional':null,error:null}:n==='company_trial_ends'?{data:MODE==='vencido'||MODE==='plano'?iso(-10):iso(8),error:null}:n==='featured_users'?{data:[{user_id:'u2',plan:'profissional'},{user_id:'u5',plan:'basico'}],error:null}:{data:null,error:null},
 auth:{getSession:async()=>({data:{session:window.__NOSESSION?null:{user:{id:uid,email:'a@x',user_metadata:{}}}}}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}}}
