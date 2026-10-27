/*
 * SKILL HALL — BIBLIOTECA DE RECURSOS
 *
 * Responsabilidades:
 * 1. Carregar e vincular recursos às habilidades.
 * 2. Cadastrar novos recursos.
 * 3. Renderizar a lista sem inserir HTML inseguro.
 * 4. Vincular, desvincular e remover recursos.
 * 5. Validar URLs externas.
 */

// ============================================================
// 1. IMPORTAÇÕES E REFERÊNCIAS DO HTML
// ============================================================

import {
  loadSkills,
  loadResources,
  saveResources,
} from './storage.js';

import {
  uid,
  toast,
} from './utils.js';

const form = document.getElementById('res-form');
const titleInput = document.getElementById('res-title');
const typeInput = document.getElementById('res-type');
const urlInput = document.getElementById('res-url');
const skillSelect = document.getElementById('link-skill');
const resourcesList = document.getElementById('resources-list');

// Tipos permitidos para os recursos cadastrados.
const RESOURCE_TYPES = Object.freeze({
  course: 'Curso',
  book: 'Livro',
  video: 'Vídeo',
  article: 'Artigo',
  other: 'Outro',
});


// ============================================================
// 2. FUNÇÕES AUXILIARES
// ============================================================

/*
 * Cria um elemento com texto simples.
 *
 * Usamos textContent para que títulos e nomes cadastrados
 * pelo usuário sejam tratados como texto, não como HTML.
 */
function createTextElement(tagName, text, className = '') {
  const element = document.createElement(tagName);

  element.textContent = text;

  if (className) {
    element.className = className;
  }

  return element;
}


/*
 * Aceita somente URLs HTTP ou HTTPS.
 *
 * Isso evita protocolos perigosos, como javascript:.
 * Retorna a URL normalizada ou uma string vazia.
 */
function normalizeExternalUrl(value) {
  const input = String(value ?? '').trim();

  if (!input) {
    return '';
  }

  try {
    const parsedUrl = new URL(input);

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:'
    ) {
      return '';
    }

    return parsedUrl.href;
  } catch {
    return '';
  }
}


/*
 * Lê as habilidades e os recursos do armazenamento.
 *
 * As funções de storage.js continuam sendo a fonte
 * principal dos dados da aplicação.
 */
function getCurrentData() {
  return {
    skills: loadSkills(),
    resources: loadResources(),
  };
}


/*
 * Procura uma habilidade pelo identificador.
 *
 * O vínculo é feito pelo ID, não pelo nome, porque nomes
 * podem mudar e duas habilidades podem ter nomes parecidos.
 */
function findSkillById(skills, skillId) {
  if (!skillId) {
    return null;
  }

  return skills.find((skill) => skill.id === skillId) ?? null;
}


/*
 * Salva a lista completa de recursos.
 *
 * A validação final dos dados permanece centralizada
 * na camada de armazenamento.
 */
function persistResources(resources) {
  saveResources(resources);
}


// ============================================================
// 3. PREENCHIMENTO DO SELETOR DE HABILIDADES
// ============================================================

/*
 * Atualiza as opções do formulário com as habilidades
 * existentes no Skill Hall.
 */
function populateSkillOptions() {
  const skills = loadSkills();
  const previousValue = skillSelect.value;

  // Limpa as opções antigas sem interpretar HTML.
  skillSelect.replaceChildren();

  const defaultOption = createTextElement(
    'option',
    'Nenhuma habilidade'
  );

  defaultOption.value = '';
  skillSelect.appendChild(defaultOption);

  // Adiciona cada habilidade como uma opção independente.
  skills.forEach((skill) => {
    const option = createTextElement(
      'option',
      skill.name || 'Habilidade sem nome'
    );

    option.value = skill.id;
    skillSelect.appendChild(option);
  });

  // Mantém a seleção anterior, caso ela ainda exista.
  const previousOptionExists = Array.from(skillSelect.options)
    .some((option) => option.value === previousValue);

  skillSelect.value = previousOptionExists ? previousValue : '';
}


// ============================================================
// 4. CONSTRUÇÃO DOS ELEMENTOS DE UM RECURSO
// ============================================================

/*
 * Cria o link externo de um recurso.
 *
 * O atributo rel protege a página ao abrir outra aba.
 */
function createResourceLink(url) {
  const safeUrl = normalizeExternalUrl(url);

  if (!safeUrl) {
    return null;
  }

  const link = createTextElement(
    'a',
    'Abrir recurso',
    'resource-link'
  );

  link.href = safeUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  return link;
}


/*
 * Cria o seletor para vincular um recurso ainda não
 * associado a nenhuma habilidade.
 */
function createLinkChooser(resource, skills) {
  const select = document.createElement('select');

  select.className = 'link-chooser';
  select.dataset.resourceId = resource.id;
  select.setAttribute(
    'aria-label',
    `Vincular ${resource.title} a uma habilidade`
  );

  const placeholder = createTextElement(
    'option',
    'Vincular a uma habilidade'
  );

  placeholder.value = '';
  select.appendChild(placeholder);

  skills.forEach((skill) => {
    const option = createTextElement(
      'option',
      skill.name || 'Habilidade sem nome'
    );

    option.value = skill.id;
    select.appendChild(option);
  });

  return select;
}


/*
 * Cria um botão de ação.
 *
 * O identificador do recurso fica em dataset, evitando
 * construir trechos de HTML com dados dinâmicos.
 */
function createActionButton(label, action, resourceId) {
  const button = createTextElement(
    'button',
    label,
    'btn small'
  );

  button.type = 'button';
  button.dataset.action = action;
  button.dataset.resourceId = resourceId;

  return button;
}


/*
 * Monta um único item da biblioteca.
 *
 * Esta função só cria elementos e atribui propriedades.
 * Nenhum título, URL ou nome é executado como HTML.
 */
function createResourceItem(resource, skills) {
  const item = document.createElement('li');
  item.className = 'resource-item';

  // Cabeçalho: título e tipo.
  const heading = document.createElement('div');
  heading.className = 'resource-heading';

  const title = createTextElement(
    'h3',
    resource.title || 'Recurso sem título',
    'resource-title'
  );

  const resourceType = RESOURCE_TYPES[resource.type] || 'Outro';

  const typeLabel = createTextElement(
    'span',
    resourceType,
    'resource-type'
  );

  heading.append(title, typeLabel);

  // Informações adicionais.
  const details = document.createElement('div');
  details.className = 'resource-details';

  const externalLink = createResourceLink(resource.url);

  if (externalLink) {
    details.appendChild(externalLink);
  } else {
    details.appendChild(
      createTextElement(
        'span',
        resource.url ? 'Link inválido ou não permitido' : 'Sem link externo',
        'muted'
      )
    );
  }

  // Identifica a habilidade associada, se houver.
  const linkedSkill = findSkillById(
    skills,
    resource.linkedSkillId
  );

  if (linkedSkill) {
    const linkedText = createTextElement(
      'p',
      `Habilidade vinculada: ${linkedSkill.name}`,
      'resource-linked-skill'
    );

    details.appendChild(linkedText);
  }

  // Área de ações.
  const actions = document.createElement('div');
  actions.className = 'resource-actions';

  if (linkedSkill) {
    const skillLink = createTextElement(
      'a',
      'Abrir habilidade',
      'btn small'
    );

    skillLink.href =
      `skill.html?id=${encodeURIComponent(linkedSkill.id)}`;

    actions.appendChild(skillLink);

    actions.appendChild(
      createActionButton(
        'Desvincular',
        'unlink',
        resource.id
      )
    );
  } else {
    actions.appendChild(
      createLinkChooser(resource, skills)
    );
  }

  actions.appendChild(
    createActionButton(
      'Remover',
      'delete',
      resource.id
    )
  );

  item.append(heading, details, actions);

  return item;
}


// ============================================================
// 5. RENDERIZAÇÃO DA BIBLIOTECA
// ============================================================

/*
 * Reconstrói a lista com os dados atuais.
 *
 * É chamada após adicionar, vincular, desvincular,
 * remover ou atualizar a lista de habilidades.
 */
function renderResources() {
  const { skills, resources } = getCurrentData();

  // Remove a renderização anterior.
  resourcesList.replaceChildren();

  // Estado vazio.
  if (resources.length === 0) {
    const emptyMessage = createTextElement(
      'li',
      'Nenhum recurso cadastrado ainda.',
      'muted empty-state'
    );

    resourcesList.appendChild(emptyMessage);
    return;
  }

  // Cria um item de lista para cada recurso.
  resources.forEach((resource) => {
    resourcesList.appendChild(
      createResourceItem(resource, skills)
    );
  });
}


/*
 * Atualiza os seletores e a lista.
 *
 * Centraliza a atualização da interface após mudanças.
 */
function refreshLibrary() {
  populateSkillOptions();
  renderResources();
}


// ============================================================
// 6. CADASTRO DE RECURSOS
// ============================================================

/*
 * Valida e salva um novo recurso.
 */
function handleResourceSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const type = typeInput.value;
  const rawUrl = urlInput.value.trim();
  const linkedSkillId = skillSelect.value || null;

  // O título é obrigatório.
  if (!title) {
    toast('Informe o título do recurso.', 2500);
    titleInput.focus();
    return;
  }

  // Impede tipos inesperados enviados pelo formulário.
  if (!Object.hasOwn(RESOURCE_TYPES, type)) {
    toast('Selecione um tipo de recurso válido.', 2500);
    return;
  }

  // Campo de URL opcional, mas precisa ser válido se preenchido.
  let url = '';

  if (rawUrl) {
    url = normalizeExternalUrl(rawUrl);

    if (!url) {
      toast('Informe um link HTTP ou HTTPS válido.', 3000);
      urlInput.focus();
      return;
    }
  }

  const { skills, resources } = getCurrentData();

  // Confere se a habilidade selecionada ainda existe.
  if (
    linkedSkillId &&
    !skills.some((skill) => skill.id === linkedSkillId)
  ) {
    toast('A habilidade selecionada não foi encontrada.', 3000);
    refreshLibrary();
    return;
  }

  // Novo recurso.
  const newResource = {
    id: uid('res'),
    title,
    type,
    url,
    linkedSkillId,
    createdAt: new Date().toISOString(),
  };

  // Coloca o recurso mais recente no início da lista.
  resources.unshift(newResource);

  persistResources(resources);

  // Limpa o formulário após salvar.
  form.reset();

  refreshLibrary();

  toast('Recurso adicionado com sucesso.', 2500);
}


// ============================================================
// 7. VINCULAR E DESVINCULAR RECURSOS
// ============================================================

/*
 * Atualiza o vínculo entre um recurso e uma habilidade.
 *
 * Se skillId for null, o recurso ficará sem vínculo.
 */
function updateResourceLink(resourceId, skillId) {
  const { skills, resources } = getCurrentData();

  const resourceExists = resources.some(
    (resource) => resource.id === resourceId
  );

  if (!resourceExists) {
    toast('O recurso não foi encontrado.', 2500);
    refreshLibrary();
    return;
  }

  if (
    skillId &&
    !skills.some((skill) => skill.id === skillId)
  ) {
    toast('A habilidade selecionada não existe.', 2500);
    refreshLibrary();
    return;
  }

  const updatedResources = resources.map((resource) => {
    if (resource.id !== resourceId) {
      return resource;
    }

    return {
      ...resource,
      linkedSkillId: skillId || null,
    };
  });

  persistResources(updatedResources);
  refreshLibrary();

  toast(
    skillId ? 'Recurso vinculado.' : 'Recurso desvinculado.',
    2000
  );
}


// ============================================================
// 8. REMOÇÃO DE RECURSOS
// ============================================================

/*
 * Remove um recurso pelo identificador.
 *
 * A confirmação evita exclusões acidentais.
 */
function deleteResource(resourceId) {
  const resources = loadResources();

  const resource = resources.find(
    (item) => item.id === resourceId
  );

  if (!resource) {
    toast('O recurso não foi encontrado.', 2500);
    refreshLibrary();
    return;
  }

  const confirmed = window.confirm(
    `Deseja remover o recurso "${resource.title}"?`
  );

  if (!confirmed) {
    return;
  }

  const updatedResources = resources.filter(
    (item) => item.id !== resourceId
  );

  persistResources(updatedResources);
  refreshLibrary();

  toast('Recurso removido.', 2500);
}


// ============================================================
// 9. EVENTOS DA LISTA
// ============================================================

/*
 * Delegação de eventos:
 *
 * Em vez de registrar eventos em cada botão a cada
 * renderização, ouvimos os eventos no elemento da lista.
 */
function handleResourceListClick(event) {
  const button = event.target.closest('button[data-action]');

  if (!button || !resourcesList.contains(button)) {
    return;
  }

  const resourceId = button.dataset.resourceId;
  const action = button.dataset.action;

  if (!resourceId) {
    return;
  }

  if (action === 'unlink') {
    updateResourceLink(resourceId, null);
    return;
  }

  if (action === 'delete') {
    deleteResource(resourceId);
  }
}


/*
 * Detecta a escolha de uma habilidade no seletor
 * de vínculo de cada recurso.
 */
function handleResourceListChange(event) {
  const select = event.target.closest(
    'select.link-chooser[data-resource-id]'
  );

  if (!select || !resourcesList.contains(select)) {
    return;
  }

  const resourceId = select.dataset.resourceId;
  const skillId = select.value || null;

  // Não altera o vínculo se o usuário ainda não escolheu nada.
  if (!skillId) {
    return;
  }

  updateResourceLink(resourceId, skillId);
}


// ============================================================
// 10. SINCRONIZAÇÃO ENTRE ABAS
// ============================================================

/*
 * O evento storage é disparado quando outra aba do mesmo
 * navegador altera o armazenamento local.
 *
 * Ele não sincroniza dispositivos diferentes; para isso,
 * precisamos de uma solução de sincronização própria.
 */
function handleStorageChange(event) {
  const relevantKeys = [
    'museu_skills',
    'museu_resources',
  ];

  if (event.key === null || relevantKeys.includes(event.key)) {
    refreshLibrary();
  }
}


// ============================================================
// 11. INICIALIZAÇÃO
// ============================================================

/*
 * Registra os eventos uma vez e carrega os dados iniciais.
 */
function initializeLibrary() {
  form.addEventListener('submit', handleResourceSubmit);

  resourcesList.addEventListener(
    'click',
    handleResourceListClick
  );

  resourcesList.addEventListener(
    'change',
    handleResourceListChange
  );

  window.addEventListener(
    'storage',
    handleStorageChange
  );

  refreshLibrary();
}

// Inicia a página.
initializeLibrary();