
import { supabase } from './supabase.js';

// ============================================================
// 1. ELEMENTOS E CONFIGURAÇÕES
// ============================================================

const LOGIN_PAGE = 'login.html';
const HOME_PAGE = 'index.html';

const currentPage = window.location.pathname
  .split('/')
  .pop() || HOME_PAGE;

const isLoginPage = currentPage === LOGIN_PAGE;

const form = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const message = document.getElementById('auth-message');

function showMessage(text, isError = false) {
  if (!message) return;

  message.textContent = text;
  message.style.color = isError ? '#e57373' : '';
}

function getCredentials() {
  return {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };
}

// ============================================================
// 2. LOGIN
// ============================================================

async function signIn() {
  const { email, password } = getCredentials();

  if (!email || !password) {
    showMessage('Informe e-mail e senha.', true);
    return;
  }

  showMessage('Autenticando...');

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  window.location.replace(HOME_PAGE);
}

// ============================================================
// 3. CADASTRO
// ============================================================

async function signUp() {
  const { email, password } = getCredentials();

  if (!email || !password) {
    showMessage('Informe e-mail e senha.', true);
    return;
  }

  if (password.length < 6) {
    showMessage('A senha precisa ter pelo menos 6 caracteres.', true);
    return;
  }

  showMessage('Criando sua conta...');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  if (data.session) {
    window.location.replace(HOME_PAGE);
    return;
  }

  showMessage(
    'Conta criada! Verifique seu e-mail para confirmar o cadastro.'
  );
}

// ============================================================
// 4. RECUPERAÇÃO DE SENHA
// ============================================================

async function resetPassword() {
  const email = emailInput.value.trim();

  if (!email) {
    showMessage('Informe seu e-mail primeiro.', true);
    return;
  }

  showMessage('Enviando instruções...');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html`,
  });

  if (error) {
    showMessage(error.message, true);
    return;
  }

  showMessage('Confira seu e-mail para redefinir a senha.');
}

// ============================================================
// 5. LOGOUT
// ============================================================

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Erro ao sair:', error);
    return;
  }

  window.location.replace(LOGIN_PAGE);
}

// ============================================================
// 6. PROTEÇÃO DAS PÁGINAS
// ============================================================

async function checkAuthentication() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Erro ao verificar sessão:', error);

    if (!isLoginPage) {
      window.location.replace(LOGIN_PAGE);
    }

    return;
  }

  const session = data.session;

  if (isLoginPage && session) {
    window.location.replace(HOME_PAGE);
    return;
  }

  if (!isLoginPage && !session) {
    window.location.replace(LOGIN_PAGE);
  }
}

// ============================================================
// 7. EVENTOS DA TELA DE LOGIN
// ============================================================

if (isLoginPage) {
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await signIn();
  });

  document.getElementById('signup-btn')?.addEventListener(
    'click',
    signUp
  );

  document.getElementById('reset-btn')?.addEventListener(
    'click',
    resetPassword
  );
}

// ============================================================
// 8. BOTÕES DE SAÍDA
// ============================================================

document.querySelectorAll('[data-logout]').forEach((button) => {
  button.addEventListener('click', signOut);
});

// ============================================================
// 9. INICIALIZAÇÃO
// ============================================================

await checkAuthentication();
