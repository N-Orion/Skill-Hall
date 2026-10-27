
/*
 * SKILL HALL — CAMADA DE ARMAZENAMENTO
 *
 * Responsabilidade deste arquivo:
 * 1. Centralizar as chaves usadas no localStorage.
 * 2. Ler e gravar habilidades, configurações e recursos.
 * 3. Oferecer funções reutilizáveis para localizar e atualizar habilidades.
 *
 * Este arquivo não manipula elementos HTML e não calcula progresso.
 */

// ============================================================
// 1. CHAVES DE ARMAZENAMENTO
// ============================================================

const STORAGE_KEYS = Object.freeze({
  skills: 'museu_skills',
  settings: 'museu_settings',
  resources: 'museu_resources',
  gistId: 'museu_gist_id',
});

// Pesos padrão usados no cálculo de progresso.
export const DEFAULT_SETTINGS = Object.freeze({
  objectivesWeight: 60,
  hoursWeight: 40,
});

// ============================================================
// 2. FUNÇÕES INTERNAS DE APOIO
// ============================================================

/**
 * Converte texto JSON em um valor JavaScript.
 *
 * Se o conteúdo estiver vazio ou inválido, devolve o valor alternativo.
 */
function safeParse(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Skill Hall: não foi possível ler os dados salvos.', error);
    return fallback;
  }
}

/**
 * Recupera uma lista do localStorage.
 * Evita que dados inválidos sejam tratados como arrays.
 */
function loadArray(key) {
  const value = safeParse(localStorage.getItem(key), []);
  return Array.isArray(value) ? value : [];
}

/**
 * Grava um valor no localStorage.
 *
 * Se o navegador bloquear o armazenamento ou ele estiver cheio,
 * o erro é registrado e repassado para quem chamou a função.
 */
function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Skill Hall: falha ao salvar dados.', error);
    throw error;
  }
}

/**
 * Converte um valor em número válido e não negativo.
 */
function nonNegativeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

// ============================================================
// 3. HABILIDADES
// ============================================================

/**
 * Retorna todas as habilidades salvas.
 */
export function loadSkills() {
  return loadArray(STORAGE_KEYS.skills);
}

/**
 * Salva a lista completa de habilidades.
 */
export function saveSkills(skills) {
  if (!Array.isArray(skills)) {
    throw new TypeError('saveSkills espera receber um array.');
  }

  return saveValue(STORAGE_KEYS.skills, skills);
}

/**
 * Procura uma habilidade pelo identificador.
 * Retorna null quando não encontra.
 */
export function getSkillById(id) {
  return loadSkills().find((skill) => skill.id === id) || null;
}

/**
 * Insere uma habilidade nova ou substitui uma existente.
 * A habilidade é identificada pelo campo id.
 */
export function persistSkill(skill) {
  if (!skill || !skill.id) {
    throw new TypeError('A habilidade precisa ter um id.');
  }

  const skills = loadSkills();
  const index = skills.findIndex((item) => item.id === skill.id);

  if (index >= 0) {
    skills[index] = skill;
  } else {
    skills.unshift(skill);
  }

  saveSkills(skills);
  return skill;
}

/**
 * Atualiza uma habilidade existente por meio de uma função.
 *
 * Exemplo:
 * updateSkillById(id, (skill) => ({ ...skill, name: 'Novo nome' }));
 *
 * Retorna null se o id não existir.
 */
export function updateSkillById(id, updater) {
  if (typeof updater !== 'function') {
    throw new TypeError('updater precisa ser uma função.');
  }

  const skills = loadSkills();
  const index = skills.findIndex((skill) => skill.id === id);

  if (index === -1) return null;

  const updatedSkill = updater(skills[index]);

  if (!updatedSkill || updatedSkill.id !== id) {
    throw new TypeError(
      'A atualização precisa retornar a habilidade com o mesmo id.'
    );
  }

  skills[index] = updatedSkill;
  saveSkills(skills);

  return updatedSkill;
}

// ============================================================
// 4. CONFIGURAÇÕES DE PROGRESSO
// ============================================================

/**
 * Carrega as configurações, preenchendo valores ausentes com os padrões.
 */
export function loadSettings() {
  const raw = safeParse(
    localStorage.getItem(STORAGE_KEYS.settings),
    {}
  );

  const objectivesWeight = nonNegativeNumber(
    raw.objectivesWeight,
    DEFAULT_SETTINGS.objectivesWeight
  );

  const hoursWeight = nonNegativeNumber(
    raw.hoursWeight,
    DEFAULT_SETTINGS.hoursWeight
  );

  return {
    objectivesWeight,
    hoursWeight,
  };
}

/**
 * Salva os pesos usados pelo cálculo de progresso.
 *
 * A soma não precisa ser 100: o skill-model.js normaliza os pesos
 * proporcionalmente durante o cálculo.
 */
export function saveSettings(settings = {}) {
  const objectivesWeight = nonNegativeNumber(
    settings.objectivesWeight,
    DEFAULT_SETTINGS.objectivesWeight
  );

  const hoursWeight = nonNegativeNumber(
    settings.hoursWeight,
    DEFAULT_SETTINGS.hoursWeight
  );

  const normalizedSettings = {
    objectivesWeight,
    hoursWeight,
  };

  saveValue(STORAGE_KEYS.settings, normalizedSettings);
  return normalizedSettings;
}

// ============================================================
// 5. BIBLIOTECA DE RECURSOS
// ============================================================

/**
 * Retorna os recursos cadastrados.
 * Exemplos: cursos, livros, vídeos e artigos.
 */
export function loadResources() {
  return loadArray(STORAGE_KEYS.resources);
}

/**
 * Salva a lista completa de recursos.
 */
export function saveResources(resources) {
  if (!Array.isArray(resources)) {
    throw new TypeError('saveResources espera receber um array.');
  }

  return saveValue(STORAGE_KEYS.resources, resources);
}

// ============================================================
// 6. CHAVE DE SINCRONIZAÇÃO COM GIST
// ============================================================

/**
 * Lê o ID do Gist usado para sincronização, se existir.
 */
export function loadGistId() {
  return localStorage.getItem(STORAGE_KEYS.gistId) || '';
}

/**
 * Salva o ID do Gist. Uma string vazia limpa o valor armazenado.
 */
export function saveGistId(id) {
  const value = String(id || '').trim();

  if (!value) {
    localStorage.removeItem(STORAGE_KEYS.gistId);
    return '';
  }

  localStorage.setItem(STORAGE_KEYS.gistId, value);
  return value;
}
