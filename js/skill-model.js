
/*
 * SKILL HALL — MODELO DE HABILIDADE
 *
 * Responsabilidade deste arquivo:
 * 1. Padronizar os dados de uma habilidade.
 * 2. Padronizar os objetivos de aprendizagem.
 * 3. Calcular o progresso usando objetivos concluídos e horas estudadas.
 *
 * Este arquivo não cria elementos HTML nem grava dados no localStorage.
 */

// ============================================================
// 1. FUNÇÕES INTERNAS DE APOIO
// ============================================================

/**
 * Gera um identificador simples para registros novos.
 * O prefixo facilita reconhecer o tipo de registro durante a depuração.
 */
import { loadSettings } from './storage.js';

function createId(prefix) {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${randomPart}`;
}

/**
 * Retorna a data local no formato YYYY-MM-DD.
 *
 * Usamos a data local em vez de toISOString() para evitar que
 * o fuso horário transforme a data de hoje no dia anterior.
 */
function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Converte um valor em número finito e não negativo.
 */
function toNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : fallback;
}

/**
 * Limita um percentual ao intervalo entre 0 e 100.
 */
function clampPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.min(100, Math.max(0, Math.round(number)));
}

// ============================================================
// 2. NORMALIZAÇÃO DE OBJETIVOS
// ============================================================

/**
 * Garante que cada objetivo tenha id, texto e estado de conclusão.
 *
 * A normalização é útil quando abrimos dados antigos ou importados
 * que podem não conter todos os campos esperados.
 */
function normalizeObjective(objective = {}) {
  return {
    id: objective.id || createId('obj'),
    text: String(objective.text ?? ''),
    completed: Boolean(objective.completed),
  };
}

// ============================================================
// 3. NORMALIZAÇÃO DE HABILIDADES
// ============================================================

/**
 * Converte um registro para o formato usado pelo Skill Hall.
 *
 * Campos principais:
 * - id: identificador único da habilidade.
 * - name/category: nome e categoria.
 * - startedAt/goal: início e meta geral.
 * - targetHours/totalHours: horas desejadas e acumuladas.
 * - currentLevel/currentProgress: nível e percentual exibidos.
 * - snapshots: registros de evolução.
 * - sessions: sessões de estudo.
 * - objectives: objetivos de aprendizagem.
 */
export function normalizeSkill(skill = {}) {
  const normalized = {
    id: skill.id || createId('skill'),

    name: String(skill.name || 'Nova habilidade'),
    category: String(skill.category || 'Outras'),

    startedAt: skill.startedAt || todayLocal(),
    goal: String(skill.goal || ''),

    targetHours: toNonNegativeNumber(skill.targetHours),
    currentLevel: String(skill.currentLevel || 'Início'),
    currentProgress: clampPercent(skill.currentProgress),

    totalHours: toNonNegativeNumber(skill.totalHours),
    lastDate: skill.lastDate || null,

    snapshots: Array.isArray(skill.snapshots)
      ? skill.snapshots
      : [],

    sessions: Array.isArray(skill.sessions)
      ? skill.sessions
      : [],

    objectives: Array.isArray(skill.objectives)
      ? skill.objectives.map(normalizeObjective)
      : [],
  };

  return normalized;
}

// ============================================================
// 4. CÁLCULO DO PROGRESSO
// ============================================================

/**
 * Calcula o percentual de conclusão de uma habilidade.
 *
 * Quando há objetivos e meta de horas:
 *   progresso = objetivos (%) × peso + horas (%) × peso
 *
 * Quando só existe uma das duas métricas, ela representa o progresso.
 * Quando não existe nenhuma métrica, o percentual atual é preservado.
 *
 * A função atualiza e devolve o mesmo objeto recebido, mantendo
 * compatibilidade com as páginas que chamam recalcProgress(skill).
 */
export function recalcProgress(skill) {
  if (!skill || typeof skill !== 'object') {
    throw new TypeError('recalcProgress espera receber uma habilidade.');
  }

  // Normaliza os valores numéricos usados no cálculo.
  const totalHours = toNonNegativeNumber(skill.totalHours);
  const targetHours = toNonNegativeNumber(skill.targetHours);

  const objectives = Array.isArray(skill.objectives)
    ? skill.objectives
    : [];

  // Lê as configurações atuais. A importação é dinâmica para manter
  // este módulo independente da interface e usar os pesos salvos.
  // O módulo de armazenamento é carregado no topo do arquivo abaixo.

  // Calcula a porcentagem de objetivos concluídos.
  const totalObjectives = objectives.length;
  const completedObjectives = objectives.filter(
    (objective) => Boolean(objective.completed)
  ).length;

  const objectivesPercent = totalObjectives > 0
    ? (completedObjectives / totalObjectives) * 100
    : null;

  // Calcula a porcentagem de horas acumuladas.
  // Uma meta de zero horas significa que essa métrica não está definida.
  const hoursPercent = targetHours > 0
    ? Math.min(100, (totalHours / targetHours) * 100)
    : null;

  // Busca os pesos configurados para as duas métricas.
  const settings = loadSettings();

  let objectivesWeight = toNonNegativeNumber(
    settings.objectivesWeight,
    60
  );

  let hoursWeight = toNonNegativeNumber(
    settings.hoursWeight,
    40
  );

  // Evita divisão por zero se ambas as métricas tiverem peso zero.
  if (objectivesWeight + hoursWeight === 0) {
    objectivesWeight = 60;
    hoursWeight = 40;
  }

  const totalWeight = objectivesWeight + hoursWeight;

  // Combina as métricas disponíveis.
  if (objectivesPercent !== null && hoursPercent !== null) {
    const weightedProgress =
      (objectivesPercent * objectivesWeight +
        hoursPercent * hoursWeight) /
      totalWeight;

    skill.currentProgress = clampPercent(weightedProgress);
  } else if (objectivesPercent !== null) {
    skill.currentProgress = clampPercent(objectivesPercent);
  } else if (hoursPercent !== null) {
    skill.currentProgress = clampPercent(hoursPercent);
  } else {
    // Não inventamos um progresso quando não há dados para calculá-lo.
    skill.currentProgress = clampPercent(skill.currentProgress);
  }

  return skill;
}

// ============================================================
// 5. IMPORTAÇÃO DAS CONFIGURAÇÕES
// ============================================================


