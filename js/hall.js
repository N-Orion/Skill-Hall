
// ============================================================
// MUSEU DE HABILIDADES — CONTROLE DO HALL
// Arquivo: js/hall.js
//
// Responsabilidades:
// 01. Imports e configurações
// 02. Dados iniciais
// 03. Busca e filtros
// 04. Criação e renderização dos cartões
// 05. Criação e edição de habilidades
// 06. Configurações de progresso
// 07. Backup e restauração
// 08. Sincronização com GitHub Gist
// 09. Inicialização
// ============================================================


// ------------------------------------------------------------
// 01. IMPORTAÇÕES E CONFIGURAÇÕES
// ------------------------------------------------------------

import {
  loadSkills,
  saveSkills,
  loadSettings,
  saveSettings,
} from './storage.js';

import {
  uid,
  toast,
  fmtDate,
} from './utils.js';

import {
  normalizeSkill,
  recalcProgress,
} from './skill-model.js';

// Chave usada pelo armazenamento local e pelo backup.
const STORAGE_KEY = 'museu_skills';

// Referências aos elementos de busca e filtragem.
const searchInput = document.getElementById('skill-search');
const categoryFilter = document.getElementById('category-filter');

// Referências à área de cartões.
const hallGrid = document.getElementById('hall-grid');


// ------------------------------------------------------------
// 02. DADOS INICIAIS DE DEMONSTRAÇÃO
//
// Se não houver habilidades salvas, cria dois exemplos.
// Se já existirem registros, não altera os dados do usuário.
// ------------------------------------------------------------

function ensureSeed() {
  const existingSkills = loadSkills();

  if (existingSkills.length > 0) {
    return;
  }

  const sampleSkills = [
    {
      id: 'skill-1',
      name: 'Redes de Computadores',
      category: 'Cybersecurity',
      startedAt: '2026-06-01',
      goal: 'Compreender topologias e TCP/IP',
      targetHours: 40,
      currentLevel: 'Fundamentos',
      currentProgress: 22,
      totalHours: 14.5,
      lastDate: '2026-08-28',

      snapshots: [
        {
          id: uid('snap'),
          date: '2026-08-28',
          title: 'Fundamentos',
          note: 'Aprofundei TCP/IP',
        },
      ],

      sessions: [
        {
          id: uid('sess'),
          date: '2026-08-28',
          duration: 1.5,
          note: 'Experimento com Wireshark',
        },
      ],

      objectives: [
        {
          id: uid('obj'),
          text: 'Entender o modelo OSI',
          completed: true,
        },
        {
          id: uid('obj'),
          text: 'Praticar captura com Wireshark',
          completed: false,
        },
      ],
    },

    {
      id: 'skill-2',
      name: 'Python — Automação',
      category: 'Programação',
      startedAt: '2025-11-01',
      goal: 'Automatizar tarefas',
      targetHours: 100,
      currentLevel: 'Laboratório',
      currentProgress: 68,
      totalHours: 73,
      lastDate: '2026-09-01',
      snapshots: [],
      sessions: [],
      objectives: [],
    },
  ];

  const normalizedSkills = sampleSkills.map(normalizeSkill);

  saveSkills(normalizedSkills);
}


// ------------------------------------------------------------
// 03. BUSCA E FILTROS
// ------------------------------------------------------------

// Preenche o seletor com as categorias existentes.
//
// Usamos createElement e textContent para que uma categoria
// digitada pelo usuário seja tratada como texto, não como HTML.

function populateCategoryOptions() {
  if (!categoryFilter) {
    return;
  }

  const previousSelection = categoryFilter.value || 'Todos';
  const skills = loadSkills().map(normalizeSkill);

  const categories = [
    'Todos',
    ...new Set(
      skills.map((skill) => skill.category || 'Outras')
    ),
  ];

  categoryFilter.replaceChildren();

  categories.forEach((category) => {
    const option = document.createElement('option');

    option.value = category;
    option.textContent =
      category === 'Todos'
        ? 'Todas as categorias'
        : category;

    categoryFilter.appendChild(option);
  });

  // Mantém o filtro selecionado, se a categoria ainda existir.
  categoryFilter.value = categories.includes(previousSelection)
    ? previousSelection
    : 'Todos';
}


// Retorna apenas as habilidades que correspondem à busca
// e à categoria escolhida.

function getVisibleSkills() {
  const query = (searchInput?.value || '')
    .trim()
    .toLowerCase();

  const selectedCategory = categoryFilter?.value || 'Todos';

  return loadSkills()
    .map(normalizeSkill)
    .filter((skill) => {
      const category = skill.category || 'Outras';

      const matchesCategory =
        selectedCategory === 'Todos' ||
        category === selectedCategory;

      const name = String(skill.name || '').toLowerCase();
      const goal = String(skill.goal || '').toLowerCase();

      const matchesSearch =
        query === '' ||
        name.includes(query) ||
        goal.includes(query);

      return matchesCategory && matchesSearch;
    })
    .map((skill) => recalcProgress(skill));
}


// ------------------------------------------------------------
// 04. CRIAÇÃO DOS CARTÕES
//
// Cada cartão representa uma habilidade.
// Os dados variáveis são inseridos com textContent.
// ------------------------------------------------------------

function createCardNode(skill) {
  const article = document.createElement('article');

  article.className = 'card';

  // Estrutura visual do cartão.
  // O HTML abaixo é estático; os dados são inseridos depois.
  article.innerHTML = `
    <div class="card-head">
      <div class="category"></div>

      <div class="progress-ring" data-progress="0">
        <svg viewBox="0 0 36 36" class="ring" aria-hidden="true">
          <path
            class="ring-bg"
            d="M18 2a16 16 0 1 0 0 32 16 16 0 1 0 0-32z"
          ></path>

          <path
            class="ring-fg"
            d="M18 2a16 16 0 1 0 0 32 16 16 0 1 0 0-32z"
          ></path>

          <text x="18" y="20" class="ring-text"></text>
        </svg>
      </div>
    </div>

    <h3 class="card-title"></h3>
    <p class="card-sub"></p>

    <div class="card-meta">
      <span class="card-hours"></span>
      <span class="card-date"></span>
    </div>

    <div class="card-actions">
      <a class="card-action">Abrir →</a>
      <button class="btn small" type="button">Editar</button>
    </div>
  `;

  const progress = Math.min(
    100,
    Math.max(0, Number(skill.currentProgress) || 0)
  );

  // Preenche os textos sem interpretar os dados como HTML.
  article.querySelector('.category').textContent =
    skill.category || 'Outras';

  article.querySelector('.card-title').textContent =
    skill.name || 'Habilidade sem nome';

  article.querySelector('.card-sub').textContent =
    `Estado: ${skill.currentLevel || '—'}`;

  article.querySelector('.ring-text').textContent =
    `${Math.round(progress)}%`;

  article.querySelector('.progress-ring').dataset.progress =
    String(progress);

  const totalHours = Number(skill.totalHours) || 0;
  const targetHours = Number(skill.targetHours) || 0;

  article.querySelector('.card-hours').textContent =
    `Horas: ${totalHours}${targetHours > 0 ? ` / ${targetHours}h` : ''}`;

  article.querySelector('.card-date').textContent =
    `Última: ${fmtDate(skill.lastDate) || '—'}`;

  // Link para a página individual da habilidade.
  const openLink = article.querySelector('.card-action');

  openLink.href =
    `skill.html?id=${encodeURIComponent(skill.id)}`;

  // Botão para editar a habilidade.
  const editButton = article.querySelector('button');

  editButton.addEventListener('click', () => {
    openSkillModalForEdit(skill.id);
  });

  return article;
}


// Cria o cartão especial usado para adicionar uma habilidade.

function createAddCard() {
  const article = document.createElement('article');

  article.className = 'card empty';

  article.innerHTML = `
    <div class="add">
      <button class="btn" type="button" id="open-new-skill">
        + Nova Habilidade
      </button>
    </div>
  `;

  article
    .querySelector('#open-new-skill')
    .addEventListener('click', openSkillModal);

  return article;
}


// Atualiza o desenho circular de progresso.
//
// A circunferência e o deslocamento controlam quanto do círculo
// fica visível. O CSS determina a aparência do traço.

function updateProgressRings() {
  const rings = document.querySelectorAll('.progress-ring');

  rings.forEach((ring) => {
    const progress = Math.min(
      100,
      Math.max(0, Number(ring.dataset.progress) || 0)
    );

    const foreground = ring.querySelector('.ring-fg');

    if (!foreground) {
      return;
    }

    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress / 100);

    foreground.style.strokeDasharray = String(circumference);
    foreground.style.strokeDashoffset = String(offset);
  });
}


// Desenha novamente a área principal do Hall.

function renderHall() {
  if (!hallGrid) {
    return;
  }

  const skills = getVisibleSkills();

  hallGrid.replaceChildren();

  // Mensagem mostrada quando a busca não encontra resultados.
  if (skills.length === 0) {
    const emptyState = document.createElement('div');

    emptyState.className = 'empty-state';

    const title = document.createElement('h3');
    title.textContent = 'Nenhuma habilidade encontrada';

    const description = document.createElement('p');
    description.textContent =
      'Teste outro termo de busca ou mude a categoria.';

    emptyState.append(title, description);
    hallGrid.appendChild(emptyState);
  }

  // Adiciona os cartões encontrados.
  skills.forEach((skill) => {
    hallGrid.appendChild(createCardNode(skill));
  });

  // O botão de criação fica disponível mesmo quando não há resultados.
  hallGrid.appendChild(createAddCard());

  updateProgressRings();
}


// ------------------------------------------------------------
// 05. CRIAÇÃO E EDIÇÃO DE HABILIDADES
// ------------------------------------------------------------

// Referências ao formulário do modal.

const skillModal = document.getElementById('skill-modal');
const modalTitle = document.getElementById('modal-title');
const skillForm = document.getElementById('skill-form');

const nameInput = document.getElementById('skill-name-input');
const categoryInput = document.getElementById('skill-cat-input');
const startInput = document.getElementById('skill-start-input');
const goalInput = document.getElementById('skill-goal-input');
const targetHoursInput = document.getElementById('skill-target-hours');

// Guarda o ID da habilidade que está sendo editada.
// Se for null, o formulário criará uma habilidade nova.

let editingSkillId = null;


// Abre um modal e atualiza seu estado de acessibilidade.

function showModal(modal) {
  if (!modal) {
    return;
  }

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}


// Fecha um modal.

function hideModal(modal) {
  if (!modal) {
    return;
  }

  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}


// Prepara o formulário para criar uma habilidade nova.

function openSkillModal() {
  editingSkillId = null;

  modalTitle.textContent = 'Nova Habilidade';
  skillForm.reset();

  // Define a data atual como valor inicial.
  startInput.value = new Date().toISOString().slice(0, 10);

  targetHoursInput.value = '';

  showModal(skillModal);
}


// Preenche o formulário com os dados de uma habilidade existente.

function openSkillModalForEdit(id) {
  const skill = loadSkills().find((item) => item.id === id);

  if (!skill) {
    toast('Habilidade não encontrada', 3000);
    return;
  }

  editingSkillId = id;

  modalTitle.textContent = 'Editar Habilidade';

  nameInput.value = skill.name || '';
  categoryInput.value = skill.category || '';
  startInput.value =
    skill.startedAt || new Date().toISOString().slice(0, 10);
  goalInput.value = skill.goal || '';
  targetHoursInput.value = skill.targetHours ?? '';

  showModal(skillModal);
}


// Fecha o modal de habilidade sem salvar.

document
  .getElementById('cancel-skill')
  .addEventListener('click', () => {
    hideModal(skillModal);
  });


// Processa o envio do formulário de criação/edição.

skillForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();

  if (!name) {
    toast('O nome da habilidade é obrigatório', 3000);
    nameInput.focus();
    return;
  }

  const category = categoryInput.value.trim() || 'Outras';

  const startedAt =
    startInput.value || new Date().toISOString().slice(0, 10);

  const goal = goalInput.value.trim();

  const targetHours = Math.max(
    0,
    Number(targetHoursInput.value) || 0
  );

  const skills = loadSkills().map(normalizeSkill);

  // MODO DE EDIÇÃO
  if (editingSkillId) {
    const skill = skills.find(
      (item) => item.id === editingSkillId
    );

    if (!skill) {
      toast('Não foi possível encontrar a habilidade', 3000);
      return;
    }

    skill.name = name;
    skill.category = category;
    skill.startedAt = startedAt;
    skill.goal = goal;
    skill.targetHours = targetHours;

    recalcProgress(skill);
    saveSkills(skills);

    hideModal(skillModal);
    populateCategoryOptions();
    renderHall();

    toast('Habilidade atualizada', 2500);
    return;
  }

  // MODO DE CRIAÇÃO
  const newSkill = normalizeSkill({
    id: uid('skill'),
    name,
    category,
    startedAt,
    goal,
    targetHours,

    currentLevel: 'Início',
    currentProgress: 0,
    totalHours: 0,
    lastDate: null,

    snapshots: [],
    sessions: [],
    objectives: [],
  });

  skills.unshift(newSkill);
  saveSkills(skills);

  hideModal(skillModal);
  populateCategoryOptions();
  renderHall();

  toast('Habilidade criada', 2000);

  // Abre a página de detalhes da nova habilidade.
  window.location.href =
    `skill.html?id=${encodeURIComponent(newSkill.id)}`;
});


// ------------------------------------------------------------
// 06. CONFIGURAÇÕES DE PROGRESSO
//
// Os pesos definem a importância dos objetivos e das horas
// no cálculo do progresso. O cálculo em si fica em skill-model.js.
// ------------------------------------------------------------

const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');

const weightObjectivesInput =
  document.getElementById('weight-objectives');

const weightHoursInput =
  document.getElementById('weight-hours');


// Abre o modal preenchendo os valores salvos.

document
  .getElementById('open-settings')
  .addEventListener('click', (event) => {
    event.preventDefault();

    const settings = loadSettings();

    weightObjectivesInput.value = settings.objectivesWeight;
    weightHoursInput.value = settings.hoursWeight;

    showModal(settingsModal);
  });


// Fecha o modal de configurações.

document
  .getElementById('cancel-settings')
  .addEventListener('click', () => {
    hideModal(settingsModal);
  });


// Salva os novos pesos.

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  let objectivesWeight = Number(weightObjectivesInput.value);
  let hoursWeight = Number(weightHoursInput.value);

  if (
    !Number.isFinite(objectivesWeight) ||
    !Number.isFinite(hoursWeight) ||
    objectivesWeight < 0 ||
    hoursWeight < 0
  ) {
    toast('Informe pesos válidos, iguais ou maiores que zero', 3500);
    return;
  }

  // Evita um cálculo sem peso algum.
  if (objectivesWeight + hoursWeight === 0) {
    objectivesWeight = 60;
    hoursWeight = 40;
  }

  // Os pesos serão normalizados pelo cálculo de progresso.
  saveSettings({
    objectivesWeight: Math.round(objectivesWeight),
    hoursWeight: Math.round(hoursWeight),
  });

  hideModal(settingsModal);

  renderHall();

  toast('Configurações salvas', 2000);
});


// ------------------------------------------------------------
// 07. BACKUP E RESTAURAÇÃO
// ------------------------------------------------------------

// Exporta os dados salvos como arquivo JSON.

document
  .getElementById('backup-btn')
  .addEventListener('click', (event) => {
    event.preventDefault();

    const backupData = localStorage.getItem(STORAGE_KEY) || '[]';

    const blob = new Blob(
      [backupData],
      { type: 'application/json' }
    );

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = 'museu_skills_backup.json';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    toast('Backup baixado', 2000);
  });


// Importa um arquivo JSON selecionado pelo usuário.

document
  .getElementById('import-file')
  .addEventListener('change', (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsedData = JSON.parse(reader.result);

        if (!Array.isArray(parsedData)) {
          toast(
            'Arquivo inválido: era esperado um array de habilidades',
            4000
          );
          return;
        }

        const normalizedSkills = parsedData.map(normalizeSkill);

        saveSkills(normalizedSkills);

        populateCategoryOptions();
        renderHall();

        toast('Backup importado com sucesso', 2500);
      } catch (error) {
        toast(
          `Erro ao importar o backup: ${error.message || error}`,
          5000
        );
      } finally {
        // Permite selecionar o mesmo arquivo novamente.
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      toast('Não foi possível ler o arquivo selecionado', 4000);
      event.target.value = '';
    };

    reader.readAsText(file);
  });


// ------------------------------------------------------------
// 08. SINCRONIZAÇÃO COM GITHUB GIST
//
// O token é lido do formulário e não é salvo no localStorage.
// Ainda assim, ele é usado diretamente pelo navegador para
// chamar a API do GitHub.
//
// Não publique a aplicação sem revisar esta abordagem.
// Nunca coloque um token pessoal diretamente no código-fonte.
// ------------------------------------------------------------

const syncModal = document.getElementById('sync-modal');
const gistTokenInput = document.getElementById('gist-token');
const gistIdInput = document.getElementById('gist-id');
const syncNote = document.getElementById('sync-note');


// Abre o modal de sincronização.

document
  .getElementById('open-sync')
  .addEventListener('click', (event) => {
    event.preventDefault();

    gistTokenInput.value = '';
    gistIdInput.value =
      localStorage.getItem('museu_gist_id') || '';

    syncNote.textContent =
      'A sincronização envia ou carrega seus dados quando você solicita a operação.';

    showModal(syncModal);
  });


// Fecha o modal de sincronização.

document
  .getElementById('cancel-sync')
  .addEventListener('click', () => {
    hideModal(syncModal);
  });


// Cria um Gist privado ou atualiza um Gist existente.

async function pushGist(token, gistId = null) {
  const payload = {
    files: {
      'museu_skills.json': {
        content: JSON.stringify(loadSkills(), null, 2),
      },
    },

    public: false,
    description: 'Museu de Habilidades — backup pessoal',
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let url = 'https://api.github.com/gists';
  let method = 'POST';

  if (gistId) {
    url = `https://api.github.com/gists/${encodeURIComponent(gistId)}`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `O GitHub retornou o status ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.id) {
    throw new Error('O GitHub não retornou um ID de Gist válido');
  }

  localStorage.setItem('museu_gist_id', data.id);

  return data;
}


// Carrega as habilidades de um Gist.

async function pullGist(token, gistId) {
  const safeGistId = encodeURIComponent(gistId);

  const response = await fetch(
    `https://api.github.com/gists/${safeGistId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar o Gist (status ${response.status})`
    );
  }

  const data = await response.json();

  const file =
    data.files?.['museu_skills.json'] ||
    Object.values(data.files || {})[0];

  if (!file || !file.content) {
    throw new Error('O Gist não contém um arquivo JSON utilizável');
  }

  const parsedData = JSON.parse(file.content);

  if (!Array.isArray(parsedData)) {
    throw new Error('Os dados do Gist não têm o formato esperado');
  }

  const normalizedSkills = parsedData.map(normalizeSkill);

  saveSkills(normalizedSkills);

  return normalizedSkills;
}


// Botão: enviar dados para o Gist.

document
  .getElementById('push-gist')
  .addEventListener('click', async (event) => {
    event.preventDefault();

    const token = gistTokenInput.value.trim();
    const gistId = gistIdInput.value.trim() || null;

    if (!token) {
      toast('Informe o token do GitHub para continuar', 4000);
      return;
    }

    try {
      syncNote.textContent = 'Enviando dados para o GitHub...';

      const result = await pushGist(token, gistId);

      syncNote.textContent = `Gist salvo: ${result.html_url}`;

      toast('Gist salvo com sucesso', 3000);
    } catch (error) {
      syncNote.textContent = 'Não foi possível salvar o Gist';

      toast(
        `Erro ao salvar o Gist: ${error.message || error}`,
        5000
      );
    }
  });


// Botão: carregar dados de um Gist.

document
  .getElementById('pull-gist')
  .addEventListener('click', async (event) => {
    event.preventDefault();

    const token = gistTokenInput.value.trim();
    const gistId = gistIdInput.value.trim();

    if (!token || !gistId) {
      toast('Informe o token e o ID do Gist', 4000);
      return;
    }

    // Carregar um Gist substitui os dados locais.
    // Pedimos confirmação antes de sobrescrever o conteúdo atual.
    const confirmed = window.confirm(
      'Carregar este Gist substituirá as habilidades salvas neste navegador. Deseja continuar?'
    );

    if (!confirmed) {
      return;
    }

    try {
      syncNote.textContent = 'Carregando dados do GitHub...';

      const importedSkills = await pullGist(token, gistId);

      populateCategoryOptions();
      renderHall();

      syncNote.textContent =
        `Dados carregados: ${importedSkills.length} habilidade(s).`;

      toast('Dados importados do Gist', 3000);
      hideModal(syncModal);
    } catch (error) {
      syncNote.textContent = 'Não foi possível carregar o Gist';

      toast(
        `Erro ao carregar o Gist: ${error.message || error}`,
        5000
      );
    }
  });


// ------------------------------------------------------------
// 09. INICIALIZAÇÃO
//
// Esta seção é executada quando o módulo é carregado.
// A ordem importa: primeiro preparar os dados, depois os filtros
// e, por último, desenhar os cartões.
// ------------------------------------------------------------

searchInput?.addEventListener('input', renderHall);

categoryFilter?.addEventListener('change', renderHall);

ensureSeed();
populateCategoryOptions();
renderHall();
