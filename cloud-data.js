
// Supabase tenant data integration. Local demo remains available when no authenticated session exists.
(() => {
  let cloud = null;
  let shopId = null;
  let userId = null;
  let team = [];
  window.agendaProTeam = team;
  window.agendaProTeamRole = null;
  const statusToDb = { 'Confirmado':'confirmed', 'Pendente':'pending', 'Concluído':'completed', 'Cancelado':'cancelled' };
  const statusFromDb = { confirmed:'Confirmado', pending:'Pendente', completed:'Concluído', cancelled:'Cancelado', no_show:'Não compareceu' };
  const localDateTime = value => {
    const d = new Date(value);
    return { date: iso(d), time: d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}) };
  };
  const toIso = (date,time) => new Date(date+'T'+time+':00').toISOString();
  const report = error => showToast(error?.code === '23P01' ? 'Este profissional já possui um atendimento nesse intervalo.' : (error?.message || 'Não foi possível salvar. Tente novamente.'));
  async function loadCloudData() {
    const [servicesRes,clientsRes,appointmentsRes] = await Promise.all([
      cloud.from('services').select('id,name,description,duration_minutes,price_cents,active').eq('barbershop_id',shopId).eq('active',true).order('created_at'),
      cloud.from('clients').select('id,full_name,phone,created_at').eq('barbershop_id',shopId).order('full_name'),
      cloud.from('appointments').select('id,client_id,service_id,professional_user_id,starts_at,ends_at,status,price_cents,clients(full_name,phone),services(name)').eq('barbershop_id',shopId).order('starts_at')
    ]);
    const failure = servicesRes.error || clientsRes.error || appointmentsRes.error;
    if (failure) { report(failure); return; }
    data.services = (servicesRes.data||[]).map(s=>({id:s.id,name:s.name,description:s.description||'',duration:s.duration_minutes,price:s.price_cents/100,symbol:'✂'}));
    data.clients = (clientsRes.data||[]).map(c=>({id:c.id,name:c.full_name,phone:c.phone||'',created:iso(c.created_at)}));
    data.appointments = (appointmentsRes.data||[]).map(a=>{
      const dt=localDateTime(a.starts_at);
      return {id:a.id,client:a.clients?.full_name||'Cliente',phone:a.clients?.phone||'',service:a.services?.name||'Serviço',professional:'Equipe',date:dt.date,time:dt.time,status:statusFromDb[a.status]||a.status,price:a.price_cents/100,clientId:a.client_id,serviceId:a.service_id};
    });
    persist(); render();
    const notice=document.getElementById('dataModeNotice');
    if(notice) notice.textContent='Dados sincronizados com o Supabase e isolados por barbearia.';
  }
  async function ensureCloud() {
    cloud=window.agendaProSupabase;
    userId=window.agendaProSession?.user?.id;
    if(!cloud||!userId) return false;
    const {data:shops,error}=await cloud.from('barbershops').select('id,name').limit(1);
    if(error||!shops?.length){report(error||new Error('Nenhuma barbearia vinculada a esta conta.'));return false;}
    shopId=shops[0].id;
    const switcher=$('.shop-switcher strong'); if(switcher) switcher.textContent=shops[0].name;
    await loadCloudData();
    return true;
  }
  document.addEventListener('agenda-pro-authenticated',()=>{ensureCloud();});
  // Auth may complete before this file's listener is registered.
  if(window.agendaProSupabase&&window.agendaProSession) ensureCloud();

  const form=$('#modalForm');
  if(form) form.addEventListener('submit',async event=>{
    if(!cloud||!shopId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const f=Object.fromEntries(new FormData(form)), action=form.dataset.action;
    const button=$('#saveModal'); button.disabled=true;
    try {
      if(action==='new-client') {
        const {error}=await cloud.from('clients').insert({barbershop_id:shopId,full_name:f.name.trim(),phone:f.phone});
        if(error) throw error;
        showToast('Cliente cadastrado na nuvem!');
      } else if(action==='new-service') {
        const {error}=await cloud.from('services').insert({barbershop_id:shopId,name:f.name.trim(),description:f.description,duration_minutes:Number(f.duration),price_cents:Math.round(Number(f.price)*100)});
        if(error) throw error;
        showToast('Serviço cadastrado na nuvem!');
      } else if(action==='new-appointment') {
        let client=data.clients.find(c=>c.phone===f.phone);
        if(!client) {
          const {data:created,error}=await cloud.from('clients').insert({barbershop_id:shopId,full_name:f.client.trim(),phone:f.phone}).select('id,full_name,phone,created_at').single();
          if(error) throw error;
          client={id:created.id,name:created.full_name,phone:created.phone||'',created:iso(created.created_at)};
        }
        const service=data.services.find(s=>s.name===f.service);
        if(!service) throw new Error('Selecione um serviço válido.');
        const startsAt=toIso(f.date,f.time), endsAt=new Date(new Date(startsAt).getTime()+service.duration*60000).toISOString();
        const {data:overlap,error:checkError}=await cloud.from('appointments').select('id').eq('barbershop_id',shopId).eq('professional_user_id',userId).lt('starts_at',endsAt).gt('ends_at',startsAt).not('status','in','(cancelled)');
        if(checkError) throw checkError;
        if(overlap?.length) throw new Error('Você já possui um atendimento nesse intervalo.');
        const {error}=await cloud.from('appointments').insert({barbershop_id:shopId,client_id:client.id,service_id:service.id,professional_user_id:professionalUserId,starts_at:startsAt,ends_at:endsAt,status:'confirmed',price_cents:Math.round(service.price*100),created_by:userId});
        if(error) throw error;
        showToast('Agendamento salvo na nuvem!');
      }
      await loadCloudData(); closeModal();
    } catch(error) { report(error); }
    finally { button.disabled=false; }
  },true);

  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-status-id]');
    if(!button||!cloud||!shopId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const appointment=data.appointments.find(a=>String(a.id)===button.dataset.statusId);
    if(!appointment) return;
    const sequence=['Confirmado','Pendente','Concluído','Cancelado'];
    const next=sequence[(sequence.indexOf(appointment.status)+1)%sequence.length];
    const {error}=await cloud.from('appointments').update({status:statusToDb[next]}).eq('id',appointment.id).eq('barbershop_id',shopId);
    if(error) report(error); else { await loadCloudData(); showToast('Status atualizado: '+next); }
  },true);
})();