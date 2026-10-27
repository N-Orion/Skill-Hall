
// ============================================================
// MUSEU DE HABILIDADES — FUNÇÕES UTILITÁRIAS
// Arquivo: js/utils.js
//
// Responsabilidade:
// Reunir funções pequenas que podem ser reutilizadas
// por diferentes páginas do sistema.
// ============================================================


// ------------------------------------------------------------
// 01. GERAR IDENTIFICADORES
// Cria um ID simples para habilidades, sessões, objetivos etc.
// Exemplo: uid('skill') -> "skill-k3j8abc"
// ------------------------------------------------------------

export function uid(prefix = 's') {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${randomPart}`;
}


// ------------------------------------------------------------
// 02. FORMATAR DATAS
// Converte uma data válida para o formato AAAA-MM-DD.
//
// Retorna uma string vazia se não houver data ou se ela for inválida.
// Mantemos o formato ISO para compatibilidade com os campos de data.
// ------------------------------------------------------------

export function fmtDate(value) {
  if (!value) {
    return '';
  }

  // Datas recebidas como texto precisam ser convertidas.
  const date = new Date(value);

  // Evita erros caso o valor salvo não represente uma data válida.
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}


// ------------------------------------------------------------
// 03. MOSTRAR NOTIFICAÇÕES
// Exibe uma mensagem temporária na área #toast-area.
//
// message: texto que será exibido.
// duration: tempo em milissegundos antes de desaparecer.
// ------------------------------------------------------------

export function toast(message, duration = 3000) {
  const area = document.getElementById('toast-area');

  // Algumas páginas podem não possuir área de notificações.
  if (!area) {
    return;
  }

  const notification = document.createElement('div');

  notification.className = 'toast';

  // textContent insere texto sem interpretar HTML.
  notification.textContent = String(message ?? '');

  area.appendChild(notification);

  // Ativa a transição visual definida no CSS.
  requestAnimationFrame(() => {
    notification.classList.add('visible');
  });

  // Remove a notificação depois do tempo configurado.
  window.setTimeout(() => {
    notification.classList.remove('visible');

    // Aguarda a animação de saída antes de remover o elemento.
    window.setTimeout(() => {
      notification.remove();
    }, 300);
  }, duration);
}


// ------------------------------------------------------------
// 04. PREPARAR CAMPOS PARA EXPORTAÇÃO
// Substitui tabulações e quebras de linha para evitar que um
// campo ocupe acidentalmente várias colunas ou linhas do TSV.
//
// Esta função não é um mecanismo de segurança para HTML.
// Ela serve especificamente para preparar texto exportado.
// ------------------------------------------------------------

export function escapeField(value) {
  return String(value ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, ' ');
}


// ------------------------------------------------------------
// 05. BAIXAR UM ARQUIVO
// Gera um arquivo no navegador e inicia seu download.
//
// text: conteúdo do arquivo.
// type: tipo MIME, como "application/json" ou "text/tab-separated-values".
// filename: nome do arquivo baixado.
// ------------------------------------------------------------

export function downloadString(text, type, filename) {
  const blob = new Blob([text], { type });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;

  // O link é temporário: não precisa ficar visível na página.
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Libera a URL depois que o navegador teve tempo de iniciar o download.
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
