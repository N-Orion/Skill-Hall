
/*
 * SKILL HALL — PÁGINA INDIVIDUAL DA HABILIDADE
 *
 * Responsabilidades:
 * 1. Carregar a habilidade selecionada pela URL.
 * 2. Exibir progresso, histórico, objetivos e recursos.
 * 3. Gerenciar sessões de estudo e edição.
 * 4. Gerenciar configurações e exportação para Anki.
 *
 * Dependências:
 * - storage.js: persistência dos dados.
 * - skill-model.js: padronização e cálculo de progresso.
 * - utils.js: identificadores, mensagens, datas e download.
 */

// ============================================================
// 1. IMPORTAÇÕES E ESTADO DA PÁGINA
// ============================================================

import {
  loadSkills,
  saveSkills,
  loadSettings,
  saveSettings,
  loadResources,
} from './storage.js';

import {
  uid,
  toast,
  fmtDate,
  downloadString,
} from './utils.js';

import {
  normalizeSkill,
  recalcProgress,
} from './skill-model.js';

const params = new URLSearchParams(window.location.search);
const skillId = params.get('id');

let currentSkill = null;

// ============================================================
// 2. FUNÇÕES UTILITÁRIAS DA PÁGINA
// ============================================================

/** Retorna a data de hoje no fuso horário local. */
function todayLocal() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Localiza um elemento pelo ID. */
function byId(id) {
  return document.getElementById(id);
}

/** Cria um elemento HTML e define seu texto sem interpretar HTML. */
function createTextElement(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text ?? '');

  if (className) element.className = className;

  return element;
}

/** Mostra ou esconde um modal. */
function setModalVisible(modal, visible) {
  if (!modal) return;

  modal.style.display = visible ? 'flex' : 'none';
  modal.setAttribute('aria-hidden', String(!visible));
}

/** Valida se uma URL pode ser aberta com segurança. */
function safeHttpUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/** Converte um valor em número finito e não negativo. */
function validNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}

// ============================================================
// 3. CARREGAMENTO E PERSISTÊNCIA DA HABILIDADE
// ============================================================

/** Procura a habilidade indicada pelo parâmetro ?id= da URL. */
function getSkillFromStorage() {
  if (!skillId) return null;

  const skill = loadSkills()
    .map(normalizeSkill)
    .find((item) => item.id === skillId);

  return skill || null;
}

/**
 * Atualiza a habilidade na lista completa e grava os dados.
 * Outras habilidades não são descartadas durante a atualização.
 */
function persistCurrentSkill(skill) {
  const normalizedSkill = normalizeSkill(skill);
  const skills = loadSkills().map(normalizeSkill);

  const index = skills.findIndex(
    (item) => item.id === normalizedSkill.id
  );

  if (index >= 0) {
    skills[index] = normalizedSkill;
  } else {
    skills.unshift(normalizedSkill);
  }

  saveSkills(skills);
  currentSkill = normalizedSkill;

  return currentSkill;
}

/** Recalcula o progresso e atualiza o registro em memória. */
function refreshProgress() {
  currentSkill = recalcProgress(currentSkill);
}

// ============================================================
// 4. RENDERIZAÇÃO DO RESUMO
// ============================================================

function renderSummary() {
  byId('skill-name').textContent = currentSkill.name;

  byId('skill-sub').textContent =
    `${currentSkill.category} • Início: ${currentSkill.startedAt || '—'}`;

  byId('big-progress').textContent =
    `${currentSkill.currentProgress}%`;

  byId('current-level').textContent =
    `Nível atual: ${currentSkill.currentLevel || '—'}`;

  byId('total-hours').textContent =
    String(currentSkill.totalHours);

  byId('last-date').textContent =
    currentSkill.lastDate ? fmtDate(currentSkill.lastDate) : '—';

  byId('skill-goal').textContent =
    currentSkill.goal || '(Nenhuma meta definida)';

  byId('target-hours-display').textContent =
    currentSkill.targetHours > 0
      ? `Horas alvo: ${currentSkill.targetHours}h`
      : 'Nenhuma meta de horas definida';

  const objectives = currentSkill.objectives;
  const completedCount = objectives.filter(
    (objective) => objective.completed
  ).length;

  const objectivePercent = objectives.length
    ? Math.round((completedCount / objectives.length) * 100)
    : null;

  const hoursPercent = currentSkill.targetHours > 0
    ? Math.min(
        100,
        Math.round(
          (currentSkill.totalHours / currentSkill.targetHours) * 100
        )
      )
    : null;

  const objectiveLabel = objectivePercent === null
    ? '—'
    : `${objectivePercent}%`;

  const hoursLabel = hoursPercent === null
    ? '—'
    : `${hoursPercent}%`;

  byId('progress-breakdown').textContent =
    `Objetivos: ${objectiveLabel} • Horas: ${hoursLabel}`;
}

// ============================================================
// 5. LINHA DO TEMPO
// ============================================================

function renderTimeline() {
  const timeline = byId('timeline-list');
  timeline.replaceChildren();

  const snapshots = currentSkill.snapshots.map((item) => ({
    date: item.date,
    title: item.title || 'Registro de evolução',
    note: item.note || '',
    type: 'snapshot',
  }));

  const sessions = currentSkill.sessions.map((item) => ({
    date: item.date,
    title: `Sessão de estudo — ${item.duration}h`,
    note: item.note || '',
    type: 'session',
  }));

  const events = [...snapshots, ...sessions];

  // Datas em formato YYYY-MM-DD podem ser ordenadas cronologicamente.
  events.sort((a, b) => {
    const dateComparison = String(b.date || '').localeCompare(
      String(a.date || '')
    );

    return dateComparison;
  });

  if (!events.length) {
    const item = document.createElement('li');
    item.appendChild(
      createTextElement('p', 'Nenhuma entrada registrada ainda.', 'muted')
    );
    timeline.appendChild(item);
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('li');
    item.className = 'timeline-item';

    item.appendChild(
      createTextElement('time', fmtDate(event.date) || 'Data desconhecida')
    );

    item.appendChild(createTextElement('h3', event.title));
    item.appendChild(createTextElement('p', event.note, 'muted'));

    timeline.appendChild(item);
  });
}

// ============================================================
// 6. OBJETIVOS DE APRENDIZAGEM
// ============================================================

function renderObjectives() {
  const list = byId('objectives-list');
  list.replaceChildren();

  if (!currentSkill.objectives.length) {
    const item = document.createElement('li');
    item.className = 'timeline-item';
    item.textContent = 'Nenhum objetivo cadastrado.';
    list.appendChild(item);
    return;
  }

  currentSkill.objectives.forEach((objective) => {
    const item = document.createElement('li');
    item.className = 'objective-item';

    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.style.flex = '1';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = objective.completed;
    checkbox.dataset.objId = objective.id;
    checkbox.setAttribute(
      'aria-label',
      `Concluir objetivo: ${objective.text}`
    );

    const text = createTextElement('span', objective.text);
    text.style.flex = '1';

    if (objective.completed) {
      text.style.opacity = '0.7';
      text.style.textDecoration = 'line-through';
    }

    label.append(checkbox, text);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const editButton = createTextElement('button', 'Editar', 'btn small');
    editButton.type = 'button';
    editButton.dataset.editObj = objective.id;

    const deleteButton = createTextElement(
      'button',
      'Remover',
      'btn small'
    );
    deleteButton.type = 'button';
    deleteButton.dataset.deleteObj = objective.id;

    actions.append(editButton, deleteButton);
    item.append(label, actions);
    list.appendChild(item);
  });
}

/** Adiciona um objetivo. */
function addObjective(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    toast('O objetivo não pode ficar vazio.', 2500);
    return false;
  }

  currentSkill.objectives.push({
    id: uid('obj'),
    text: trimmed,
    completed: false,
  });

  refreshProgress();
  persistCurrentSkill(currentSkill);
  renderSkill();
  toast('Objetivo adicionado.', 1800);

  return true;
}

/** Alterna a conclusão de um objetivo. */
function toggleObjective(id, completed) {
  const objective = currentSkill.objectives.find(
    (item) => item.id === id
  );

  if (!objective) return;

  objective.completed = completed;

  refreshProgress();
  persistCurrentSkill(currentSkill);
  renderSkill();

  toast('Objetivo atualizado.', 1800);
}

/** Edita o texto de um objetivo. */
function editObjective(id) {
  const objective = currentSkill.objectives.find(
    (item) => item.id === id
  );

  if (!objective) return;

  const answer = prompt('Editar objetivo:', objective.text);

  if (answer === null) return;

  const text = answer.trim();

  if (!text) {
    toast('O objetivo não pode ficar vazio.', 2500);
    return;
  }

  objective.text = text;

  persistCurrentSkill(currentSkill);
  renderSkill();
  toast('Objetivo editado.', 1800);
}

/** Remove um objetivo após confirmação. */
function deleteObjective(id) {
  const objective = currentSkill.objectives.find(
    (item) => item.id === id
  );

  if (!objective) return;

  const confirmed = confirm(
    `Remover o objetivo "${objective.text}"?`
  );

  if (!confirmed) return;

  currentSkill.objectives = currentSkill.objectives.filter(
    (item) => item.id !== id
  );

  refreshProgress();
  persistCurrentSkill(currentSkill);
  renderSkill();
  toast('Objetivo removido.', 1800);
}

// ============================================================
// 7. RECURSOS VINCULADOS
// ============================================================

function renderLinkedResources() {
  const list = byId('resources-list');
  list.replaceChildren();

  const resources = loadResources().filter(
    (resource) => resource.linkedSkillId === currentSkill.id
  );

  if (!resources.length) {
    const item = document.createElement('li');
    item.className = 'timeline-item';
    item.textContent = 'Nenhum recurso vinculado.';
    list.appendChild(item);
    return;
  }

  resources.forEach((resource) => {
    const item = document.createElement('li');
    item.className = 'timeline-item';

    item.appendChild(
      createTextElement('strong', resource.title || 'Recurso sem título')
    );

    const url = safeHttpUrl(resource.url);
    const description = document.createElement('p');
    description.className = 'muted';

    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = url;
      description.appendChild(link);
    } else {
      description.textContent = resource.url
        ? 'URL inválida ou não permitida.'
        : 'Sem URL';
    }

    item.appendChild(description);
    item.appendChild(
      createTextElement('small', `[${resource.type || 'outro'}]`, 'muted')
    );

    list.appendChild(item);
  });
}

// ============================================================
// 8. REGISTRO DE SESSÕES DE ESTUDO
// ============================================================

function handleSessionSubmit(event) {
  event.preventDefault();

  const date = byId('sess-date').value || todayLocal();
  const duration = Number(byId('sess-duration').value);
  const note = byId('sess-note').value.trim();

  if (!date) {
    toast('Informe a data da sessão.', 2500);
    return;
  }

  if (!Number.isFinite(duration) || duration <= 0 || duration > 24) {
    toast('A duração deve ser maior que zero e não passar de 24 horas.', 3000);
    return;
  }

  currentSkill.sessions.push({
    id: uid('sess'),
    date,
    duration,
    note,
  });

  // O total é atualizado junto com o histórico da sessão.
  currentSkill.totalHours += duration;
  currentSkill.lastDate = date;

  refreshProgress();
  persistCurrentSkill(currentSkill);

  byId('sess-duration').value = '';
  byId('sess-note').value = '';

  renderSkill();
  toast('Sessão salva.', 1800);
}

// ============================================================
// 9. EDIÇÃO DOS DADOS DA HABILIDADE
// ============================================================

function openEditModal() {
  byId('edit-name').value = currentSkill.name;
  byId('edit-cat').value = currentSkill.category;
  byId('edit-start').value = currentSkill.startedAt || todayLocal();
  byId('edit-goal').value = currentSkill.goal;
  byId('edit-target-hours').value = currentSkill.targetHours || '';

  setModalVisible(byId('skill-edit-modal'), true);
}

function handleEditSubmit(event) {
  event.preventDefault();

  const name = byId('edit-name').value.trim();
  const category = byId('edit-cat').value.trim() || 'Outras';
  const startedAt = byId('edit-start').value;
  const goal = byId('edit-goal').value.trim();
  const rawTargetHours = byId('edit-target-hours').value;
  const targetHours = rawTargetHours === ''
    ? 0
    : validNonNegativeNumber(rawTargetHours);

  if (!name) {
    toast('O nome da habilidade é obrigatório.', 2500);
    return;
  }

  if (!startedAt) {
    toast('Informe a data de início.', 2500);
    return;
  }

  if (targetHours === null) {
    toast('A meta de horas precisa ser um número válido.', 2500);
    return;
  }

  currentSkill.name = name;
  currentSkill.category = category;
  currentSkill.startedAt = startedAt;
  currentSkill.goal = goal;
  currentSkill.targetHours = targetHours;

  refreshProgress();
  persistCurrentSkill(currentSkill);

  setModalVisible(byId('skill-edit-modal'), false);
  renderSkill();

  toast('Habilidade atualizada.', 1800);
}

// ============================================================
// 10. CONFIGURAÇÕES DO CÁLCULO DE PROGRESSO
// ============================================================

function openSettingsModal() {
  const settings = loadSettings();

  byId('weight-objectives').value = settings.objectivesWeight;
  byId('weight-hours').value = settings.hoursWeight;

  setModalVisible(byId('settings-modal'), true);
}

function handleSettingsSubmit(event) {
  event.preventDefault();

  const objectivesWeight = Number(byId('weight-objectives').value);
  const hoursWeight = Number(byId('weight-hours').value);

  if (
    !Number.isFinite(objectivesWeight) ||
    !Number.isFinite(hoursWeight) ||
    objectivesWeight < 0 ||
    objectivesWeight > 100 ||
    hoursWeight < 0 ||
    hoursWeight > 100
  ) {
    toast('Cada peso deve estar entre 0 e 100.', 2500);
    return;
  }

  if (objectivesWeight + hoursWeight === 0) {
    toast('Pelo menos um dos pesos deve ser maior que zero.', 2500);
    return;
  }

  saveSettings({
    objectivesWeight,
    hoursWeight,
  });

  refreshProgress();
  persistCurrentSkill(currentSkill);

  setModalVisible(byId('settings-modal'), false);
  renderSkill();

  toast('Configurações salvas.', 1800);
}

// ============================================================
// 11. EXPORTAÇÃO PARA ANKI
// ============================================================

/**
 * Remove tabulações e quebras de linha para manter o formato TSV.
 * Cada linha representa um cartão: frente, verso e campo de tags.
 */
function sanitizeTsvField(value) {
  return String(value ?? '')
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function exportToAnki(event) {
  event.preventDefault();

  const cards = [];

  currentSkill.snapshots.forEach((snapshot) => {
    cards.push({
      front: snapshot.title || 'Registro de evolução',
      back: snapshot.note || '',
    });
  });

  currentSkill.sessions.forEach((session) => {
    if (session.note) {
      cards.push({
        front: `Sessão ${fmtDate(session.date)} — ${currentSkill.name}`,
        back: session.note,
      });
    }
  });

  currentSkill.objectives.forEach((objective) => {
    cards.push({
      front: `Objetivo: ${objective.text}`,
      back: objective.completed ? 'Concluído' : 'Pendente',
    });
  });

  if (!cards.length) {
    toast('Não há cartões para exportar.', 2500);
    return;
  }

  const tsv = cards
    .map((card) => {
      const front = sanitizeTsvField(card.front);
      const back = sanitizeTsvField(card.back);

      return `${front}\t${back}\t`;
    })
    .join('\n');

  const filename = `${currentSkill.name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')}_cards.tsv`;

  downloadString(tsv, 'text/tab-separated-values;charset=utf-8', filename);

  toast('Arquivo TSV exportado.', 2000);
}

// ============================================================
// 12. RENDERIZAÇÃO GERAL
// ============================================================

function renderSkill() {
  renderSummary();
  renderTimeline();
  renderObjectives();
  renderLinkedResources();
}

/**
 * Exibe uma mensagem de erro se a página for aberta sem um ID válido.
 */
function showMissingSkill() {
  const container = document.querySelector('main.container');

  container.replaceChildren();

  const heading = createTextElement('h2', 'Habilidade não encontrada');
  const message = createTextElement(
    'p',
    'Volte ao Hall e selecione uma habilidade.'
  );
  const link = createTextElement('a', 'Voltar ao Hall');
  link.href = 'index.html';
  link.className = 'btn';

  container.append(heading, message, link);
}

// ============================================================
// 13. INICIALIZAÇÃO E EVENTOS
// ============================================================

function initializeSkillPage() {
  currentSkill = getSkillFromStorage();

  if (!currentSkill) {
    showMissingSkill();
    return;
  }

  // Padroniza os dados e atualiza o progresso inicial.
  currentSkill = normalizeSkill(currentSkill);
  refreshProgress();

  // Valores iniciais do formulário de sessão.
  byId('sess-date').value = todayLocal();

  // Objetivos.
  byId('obj-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const input = byId('obj-text');

    if (addObjective(input.value)) {
      input.value = '';
    }
  });

  byId('objectives-list').addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-obj-id]');

    if (!checkbox) return;

    toggleObjective(checkbox.dataset.objId, checkbox.checked);
  });

  byId('objectives-list').addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-obj]');
    const deleteButton = event.target.closest('[data-delete-obj]');

    if (editButton) {
      editObjective(editButton.dataset.editObj);
    } else if (deleteButton) {
      deleteObjective(deleteButton.dataset.deleteObj);
    }
  });

  // Sessões.
  byId('session-form').addEventListener('submit', handleSessionSubmit);

  byId('open-session').addEventListener('click', () => {
    byId('sess-duration').focus();
  });

  // Edição.
  byId('open-edit').addEventListener('click', (event) => {
    event.preventDefault();
    openEditModal();
  });

  byId('cancel-edit').addEventListener('click', () => {
    setModalVisible(byId('skill-edit-modal'), false);
  });

  byId('edit-form').addEventListener('submit', handleEditSubmit);

  // Configurações.
  byId('open-settings-link').addEventListener('click', (event) => {
    event.preventDefault();
    openSettingsModal();
  });

  byId('cancel-settings').addEventListener('click', () => {
    setModalVisible(byId('settings-modal'), false);
  });

  byId('settings-form').addEventListener('submit', handleSettingsSubmit);

  // Exportação.
  byId('export-anki').addEventListener('click', exportToAnki);

  // Renderização inicial.
  renderSkill();
}

initializeSkillPage();
