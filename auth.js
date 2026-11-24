(() => {
  const config = window.AGENDA_PRO_SUPABASE;
  const configured = config && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || '') &&
    config.anonKey && !String(config.anonKey).includes('YOUR_');
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  shell.classList.add('auth-locked');

  const panel = document.createElement('section');
  panel.id = 'authGate';
  panel.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand"><span class="brand-mark">A<span>.</span></span><div><strong>agenda<span>pro</span></strong><small>BARBER MANAGEMENT</small></div></div>
      <div id="authContent"></div>
      <p class="auth-foot">Plano único de R$ 19,90/mês · 7 dias grátis</p>
    </div>`;
  document.body.append(panel);
  const content = panel.querySelector('#authContent');
  const setMessage = (msg, error = false) => {
    let el = content.querySelector('.auth-message');
    if (!el) { el = document.createElement('p'); el.className = 'auth-message'; content.append(el); }
    el.textContent = msg;
    el.classList.toggle('error', error);
  };
  const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const renderSetup = () => {
    content.innerHTML = `<h1>Conecte sua conta</h1><p>O acesso seguro será ativado quando as credenciais do Supabase forem configuradas.</p><div class="auth-notice">A interface atual permanece em modo demonstração. Nenhum cadastro ou dado será enviado a um servidor.</div><button id="continueDemo" class="button button-primary auth-submit">Continuar na demonstração</button>`;
    content.querySelector('#continueDemo').onclick = () => { panel.remove(); shell.classList.remove('auth-locked'); };
  };
  if (!configured || !window.supabase?.createClient) { renderSetup(); return; }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  shell.classList.add('auth-locked');

  function renderAuth(mode = 'login') {
    const signup = mode === 'signup';
    content.innerHTML = `
      <h1>${signup ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
      <p>${signup ? 'Comece seu teste grátis de 7 dias.' : 'Entre para acessar sua barbearia.'}</p>
      <form id="authForm">
        ${signup ? '<label>Seu nome<input name="fullName" autocomplete="name" required minlength="2" maxlength="80" placeholder="Nome completo"></label>' : ''}
        <label>E-mail<input name="email" type="email" autocomplete="email" required placeholder="voce@email.com"></label>
        <label>Senha<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="8" placeholder="Mínimo de 8 caracteres"></label>
        <button class="button button-primary auth-submit" type="submit">${signup ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <div class="auth-links">
        <button id="switchMode" type="button">${signup ? 'Já tenho conta · Entrar' : 'Criar minha conta'}</button>
        ${signup ? '' : '<button id="forgotPassword" type="button">Esqueci minha senha</button>'}
      </div>`;
    content.querySelector('#switchMode').onclick = () => renderAuth(signup ? 'login' : 'signup');
    content.querySelector('#forgotPassword')?.addEventListener('click', async () => {
      const email = content.querySelector('[name="email"]').value.trim();
      if (!email) return setMessage('Informe seu e-mail primeiro.', true);
      const { error } = await client.auth.resetPasswordForEmail(email);
      setMessage(error ? error.message : 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
    });
    content.querySelector('#authForm').onsubmit = async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email')).trim();
      const password = String(form.get('password'));
      const submit = event.currentTarget.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Aguarde...';
      const result = signup
        ? await client.auth.signUp({ email, password, options: { data: { full_name: String(form.get('fullName')).trim() } } })
        : await client.auth.signInWithPassword({ email, password });
      submit.disabled = false;
      submit.textContent = signup ? 'Criar conta' : 'Entrar';
      if (result.error) return setMessage(result.error.message, true);
      if (signup && !result.data.session) {
        content.innerHTML = '<h1>Confira seu e-mail</h1><p>Enviamos um link de confirmação. Depois de confirmar, volte aqui e entre na sua conta.</p><button id="backLogin" class="button button-primary auth-submit">Voltar ao login</button>';
        content.querySelector('#backLogin').onclick = () => renderAuth('login');
        return;
      }
      await activate(result.data.session);
    };
  }

  async function activate(session) {
    if (!session) { panel.hidden = false; shell.classList.add('auth-locked'); renderAuth(); return; }
    panel.hidden = false;
    content.innerHTML = '<h1>Preparando seu espaço...</h1><p>Estamos verificando sua barbearia.</p>';
    const { data: shops, error } = await client.from('barbershops').select('id,name').limit(1);
    if (error) { setMessage('Não foi possível carregar sua barbearia: ' + error.message, true); return; }
    if (!shops?.length) {
      content.innerHTML = `<h1>Vamos configurar sua barbearia</h1><p>Seu teste grátis de 7 dias começa quando o espaço for criado.</p><form id="shopForm"><label>Nome da barbearia<input name="shopName" required minlength="2" maxlength="100" placeholder="Ex.: Barbearia Central"></label><button class="button button-primary auth-submit">Criar minha barbearia</button></form>`;
      content.querySelector('#shopForm').onsubmit = async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button');
        button.disabled = true;
        const shopName = new FormData(event.currentTarget).get('shopName');
        const { error: createError } = await client.rpc('create_my_barbershop', { shop_name: shopName });
        if (createError) { button.disabled = false; setMessage('Não foi possível criar: ' + createError.message, true); return; }
        await showApp(session);
      };
      return;
    }
    await showApp(session, shops[0]);
  }

  async function showApp(session, shop) {
    const name = shop?.name || 'Minha barbearia';
    const switcher = document.querySelector('.shop-switcher');
    if (switcher) switcher.querySelector('strong').textContent = name;
    const { data: profile } = await client.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
    const userName = profile?.full_name || session.user.email;
    document.querySelectorAll('.profile-button strong').forEach(el => el.textContent = userName);
    document.querySelectorAll('.profile-button small').forEach(el => el.textContent = 'Minha conta · Sair');
    document.querySelectorAll('.profile-button').forEach(el => el.title = 'Clique para sair');
    panel.remove();
    shell.classList.remove('auth-locked');
    window.agendaProSupabase = client;
    window.agendaProSession = session;
    window.dispatchEvent(new CustomEvent('agenda-pro-authenticated'));
    // The operational dashboard remains local-demo data until its tables are migrated.
    if (!document.getElementById('dataModeNotice')) {
      const notice = document.createElement('div');
      notice.id = 'dataModeNotice';
      notice.className = 'data-mode-notice';
      notice.textContent = 'Conta autenticada. Agenda, clientes e serviços ainda estão em modo demonstração local.';
      document.querySelector('.main-content')?.prepend(notice);
    }
  }

  document.querySelectorAll('.profile-button').forEach(el => el.addEventListener('click', async () => {
    if (window.agendaProSession && confirm('Deseja sair da sua conta?')) {
      await client.auth.signOut();
      window.location.reload();
    }
  }));
  client.auth.onAuthStateChange((_event, session) => {
    if (session && !window.agendaProSession) setTimeout(() => activate(session), 0);
    if (!session && window.agendaProSession) window.location.reload();
  });
  client.auth.getSession().then(({ data }) => data.session ? activate(data.session) : renderAuth());
})();