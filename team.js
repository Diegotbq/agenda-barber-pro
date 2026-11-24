(() => {
  const table = document.getElementById('teamTable');
  const count = document.getElementById('teamCount');
  const empty = document.getElementById('teamEmpty');
  const invitePanel = document.getElementById('teamInvitePanel');
  const inviteForm = document.getElementById('teamInviteForm');
  if (!table || !count || !empty) return;
  const roleNames = { owner: 'Proprietário', admin: 'Administrador', barber: 'Barbeiro', receptionist: 'Recepção' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const dateText = value => value ? new Date(value).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  let currentShopId = null;
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
      currentShopId = null;
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
    currentShopId = shops[0].id;
    const { data, error } = await cloud.rpc('get_barbershop_team', { target_barbershop_id: currentShopId });
    if (error) {
      showError('Aplique as migrations 005 para habilitar a consulta segura da equipe.');
      return;
    }
    render(data || []);
  }
  document.getElementById('showTeamInvite')?.addEventListener('click', () => {
    if (!window.agendaProSupabase || !currentShopId) {
      if (typeof showToast === 'function') showToast('Convites exigem uma conta Supabase conectada.');
      return;
    }
    invitePanel?.classList.remove('hidden');
  });
  document.getElementById('cancelTeamInvite')?.addEventListener('click', () => {
    invitePanel?.classList.add('hidden');
    inviteForm?.reset();
    const feedback = document.getElementById('teamInviteFeedback');
    if (feedback) feedback.textContent = '';
  });
  inviteForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const cloud = window.agendaProSupabase;
    if (!cloud || !currentShopId) return;
    const values = Object.fromEntries(new FormData(inviteForm));
    const button = document.getElementById('sendTeamInvite');
    const feedback = document.getElementById('teamInviteFeedback');
    button.disabled = true;
    button.textContent = 'Enviando…';
    feedback.textContent = 'Validando permissões e enviando o convite…';
    const { data, error } = await cloud.functions.invoke('invite-team-member', {
      body: {
        barbershopId: currentShopId,
        fullName: String(values.fullName || '').trim(),
        email: String(values.email || '').trim(),
        role: values.role
      }
    });
    button.disabled = false;
    button.textContent = 'Enviar convite';
    if (error || data?.error) {
      feedback.textContent = data?.error || error?.message || 'Não foi possível enviar o convite.';
      feedback.classList.add('error');
      return;
    }
    feedback.classList.remove('error');
    feedback.textContent = 'Convite enviado para ' + data.email + '.';
    inviteForm.reset();
    await load();
  });
  document.addEventListener('agenda-pro-authenticated', load);
  if (window.agendaProSupabase && window.agendaProSession) load();
  else render([]);
})();