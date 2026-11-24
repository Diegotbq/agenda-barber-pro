(() => {
  const days = [
    { id: 1, label: 'Segunda-feira' },
    { id: 2, label: 'Terça-feira' },
    { id: 3, label: 'Quarta-feira' },
    { id: 4, label: 'Quinta-feira' },
    { id: 5, label: 'Sexta-feira' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' }
  ];
  const root = document.getElementById('businessHoursList');
  const save = document.getElementById('saveBusinessHours');
  if (!root || !save) return;
  let cloud = null, shopId = null;
  const defaultRows = () => days.map(d => ({
    weekday: d.id,
    is_closed: d.id === 0,
    opens_at: '09:00',
    closes_at: d.id === 6 ? '14:00' : '18:00'
  }));
  const render = rows => {
    const byDay = new Map((rows || []).map(row => [Number(row.weekday), row]));
    root.innerHTML = days.map(day => {
      const row = byDay.get(day.id) || defaultRows().find(x => x.weekday === day.id);
      return `<div class="business-hours-row" data-weekday="${day.id}">
        <strong>${day.label}</strong>
        <label class="hours-closed"><input type="checkbox" class="hours-closed-toggle" ${row.is_closed ? 'checked' : ''}> Fechado</label>
        <input aria-label="Abertura ${day.label}" class="hours-open" type="time" value="${row.opens_at || '09:00'}" ${row.is_closed ? 'disabled' : ''}>
        <span class="hours-separator">até</span>
        <input aria-label="Fechamento ${day.label}" class="hours-close" type="time" value="${row.closes_at || '18:00'}" ${row.is_closed ? 'disabled' : ''}>
      </div>`;
    }).join('');
    root.querySelectorAll('.hours-closed-toggle').forEach(toggle => toggle.addEventListener('change', () => {
      const row = toggle.closest('.business-hours-row');
      row.querySelector('.hours-open').disabled = toggle.checked;
      row.querySelector('.hours-close').disabled = toggle.checked;
    }));
  };
  const notify = message => {
    if (typeof showToast === 'function') showToast(message);
    else window.alert(message);
  };
  async function load() {
    cloud = window.agendaProSupabase || null;
    const userId = window.agendaProSession?.user?.id;
    if (!cloud || !userId) {
      let local = [];
      try { local = JSON.parse(localStorage.getItem('agendaProBusinessHours') || '[]'); } catch {}
      render(local.length ? local : defaultRows());
      return;
    }
    const { data: shops, error: shopError } = await cloud.from('barbershops').select('id').limit(1);
    if (shopError || !shops?.length) {
      render(defaultRows());
      notify(shopError?.message || 'Não encontramos sua barbearia.');
      return;
    }
    shopId = shops[0].id;
    const { data, error } = await cloud.from('barbershop_business_hours')
      .select('weekday,is_closed,opens_at,closes_at')
      .eq('barbershop_id', shopId);
    if (error) {
      render(defaultRows());
      notify('Não foi possível carregar os horários. Verifique se a migration 004 foi aplicada.');
      return;
    }
    render(data?.length ? data : defaultRows());
  }
  save.addEventListener('click', async () => {
    const rows = [...root.querySelectorAll('.business-hours-row')].map(row => {
      const closed = row.querySelector('.hours-closed-toggle').checked;
      const opens = row.querySelector('.hours-open').value;
      const closes = row.querySelector('.hours-close').value;
      return {
        weekday: Number(row.dataset.weekday),
        is_closed: closed,
        opens_at: closed ? null : opens,
        closes_at: closed ? null : closes
      };
    });
    if (rows.some(row => !row.is_closed && (!row.opens_at || !row.closes_at || row.closes_at <= row.opens_at))) {
      notify('Confira os horários: o fechamento precisa ser depois da abertura.');
      return;
    }
    save.disabled = true;
    try {
      if (!cloud || !shopId) {
        localStorage.setItem('agendaProBusinessHours', JSON.stringify(rows));
        notify('Horários salvos neste dispositivo (modo demonstração).');
      } else {
        const payload = rows.map(row => ({ ...row, barbershop_id: shopId }));
        const { error } = await cloud.from('barbershop_business_hours').upsert(payload, { onConflict: 'barbershop_id,weekday' });
        if (error) throw error;
        notify('Horários salvos na nuvem!');
      }
    } catch (error) {
      notify(error?.message || 'Não foi possível salvar os horários.');
    } finally {
      save.disabled = false;
    }
  });
  document.addEventListener('agenda-pro-authenticated', load);
  if (window.agendaProSupabase && window.agendaProSession) load();
  else render(defaultRows());
})();