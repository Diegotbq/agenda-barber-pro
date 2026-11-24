(() => {
  const table = document.getElementById('teamTable');
  const count = document.getElementById('teamCount');
  const empty = document.getElementById('teamEmpty');
  if (!table || !count || !empty) return;
  const roleNames = { owner: 'Proprietário', admin: 'Administrador', barber: 'Barbeiro', receptionist: 'Recepção' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const dateText = value => value ? new Date(value).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  function render(members) {
    count.textContent = members.length + (members.length === 1 ? ' pessoa na equipe' : ' pessoas na equipe');
    table.innerHTML = members.map(member => {
      const name = escapeHtml(member.full_name || 'Profissional');
      const role = roleNames[member.role] || 'Membro';
      const initials = name.split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase();
      return `<tr><td><div class="table-person"><span class="client-avatar">${initials}</span><strong>${name}</strong></div></td><td><span class="team-role">${role}</span></td><td>${dateText(member.joined_at)}</td><td><span class="team-active"><i></i> Vinculado</span></td></tr>`;
    }).join('');
    empty.classList.toggle('hidden', members.length > 0);
  }
  function showError(message) {
    count.textContent = 'Não foi possível carregar a equipe';
    table.innerHTML = '';
    empty.textContent = message;
    empty.classList.remove('hidden');
  }
  async function load() {
    const cloud = window.agendaProSupabase;
    const userId = window.agendaProSession?.user?.id;
    if (!cloud || !userId) {
      render([
        { full_name: 'João Dias', role: 'owner', joined_at: new Date().toISOString() },
        { full_name: 'Marcos Lima', role: 'barber', joined_at: new Date().toISOString() }
      ]);
      return;
    }
    count.textContent = 'Carregando equipe…';
    const { data: shops, error: shopError } = await cloud.from('barbershops').select('id').limit(1);
    if (shopError || !shops?.length) {
      showError(shopError?.message || 'Nenhuma barbearia vinculada a esta conta.');
      return;
    }
    const { data, error } = await cloud.rpc('get_barbershop_team', { target_barbershop_id: shops[0].id });
    if (error) {
      showError('Aplique a migration 005 para habilitar a consulta segura da equipe.');
      return;
    }
    render(data || []);
  }
  document.addEventListener('agenda-pro-authenticated', load);
  if (window.agendaProSupabase && window.agendaProSession) load();
  else render([]);
})();