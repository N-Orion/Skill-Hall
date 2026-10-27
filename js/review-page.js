
/*
 * SKILL HALL — SISTEMA DE REVISÃO
 *
 * Gera flashcards automáticos, permite criar cartões manuais,
 * filtra por categoria e exporta cartões para o Anki.
 *
 * Os cartões manuais ficam salvos no localStorage.
 * As avaliações desta sessão ainda não são permanentes.
 */

// ============================================================
// 1. IMPORTAÇÕES E ELEMENTOS DA PÁGINA
// ============================================================

import { loadSkills } from './storage.js';

import {
  uid,
  toast,
  escapeField,
  downloadString,
} from './utils.js';

const categoryFilter = document.getElementById('category-filter');

const frontElement = document.getElementById('front');
const backElement = document.getElementById('back');
const answerTextElement = document.getElementById('answer-text');
const categoryElement = document.getElementById('card-category');
const statusElement = document.getElementById('review-status');

const showAnswerButton = document.getElementById('show-answer');
const againButton = document.getElementById('again');
const goodButton = document.getElementById('good');
const easyButton = document.getElementById('easy');

const questionActions = document.getElementById('question-actions');
const answerActions = document.getElementById('answer-actions');

const manualCardForm = document.getElementById('manual-card-form');
const manualQuestionInput = document.getElementById('manual-question');
const manualAnswerInput = document.getElementById('manual-answer');
const manualCategoryInput = document.getElementById('manual-category');

const downloadButton = document.getElementById('download-tsv');
const exportAnkiLink = document.getElementById('export-anki');
const resetSessionButton = document.getElementById('reset-session');


// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================

const MANUAL_CARDS_KEY = 'museu_flashcards';

let allCards = [];
let sessionDeck = [];
let currentIndex = 0;
let answerIsVisible = false;

const sessionStats = {
  again: 0,
  good: 0,
  easy: 0,
};


// ============================================================
// 3. ARMAZENAMENTO DOS CARTÕES MANUAIS
// ============================================================

function loadManualCards() {
  try {
    const stored = localStorage.getItem(MANUAL_CARDS_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((card) =>
      card &&
      typeof card.id === 'string' &&
      typeof card.front === 'string' &&
      typeof card.back === 'string' &&
      typeof card.category === 'string'
    );
  } catch (error) {
    console.error('Erro ao carregar cartões manuais:', error);
    return [];
  }
}

function saveManualCards(cards) {
  try {
    localStorage.setItem(MANUAL_CARDS_KEY, JSON.stringify(cards));
    return true;
  } catch (error) {
    console.error('Erro ao salvar cartões manuais:', error);
    toast('Não foi possível salvar. Verifique o armazenamento.', 3500);
    return false;
  }
}


// ============================================================
// 4. NORMALIZAÇÃO DE CATEGORIAS
// ============================================================

function normalizeCategory(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function getSkillCategory(skill) {
  return normalizeCategory(skill.category) || 'Outras';
}


// ============================================================
// 5. GERAÇÃO DE CARTÕES AUTOMÁTICOS
// ============================================================

function buildAutomaticCards() {
  const skills = loadSkills();
  const generatedCards = [];

  skills.forEach((skill) => {
    const category = getSkillCategory(skill);
    const skillName = skill.name || 'Habilidade sem nome';

    // Objetivos cadastrados na habilidade.
    (skill.objectives || []).forEach((objective, index) => {
      if (!objective.text) {
        return;
      }

      generatedCards.push({
        id: `objective-${skill.id}-${objective.id || index}`,
        front: `Objetivo: ${objective.text}`,
        back: objective.completed
          ? 'Este objetivo está marcado como concluído.'
          : 'Este objetivo ainda está pendente.',
        category,
        source: 'automatic',
      });
    });

    // Snapshots de progresso.
    (skill.snapshots || []).forEach((snapshot, index) => {
      if (!snapshot.title && !snapshot.note) {
        return;
      }

      generatedCards.push({
        id: `snapshot-${skill.id}-${snapshot.id || index}`,
        front: `${skillName}: ${snapshot.title || 'Registro de progresso'}`,
        back: snapshot.note || 'Este registro não possui anotação.',
        category,
        source: 'automatic',
      });
    });

    // Anotações de sessões de estudo.
    (skill.sessions || []).forEach((session, index) => {
      if (!session.note) {
        return;
      }

      generatedCards.push({
        id: `session-${skill.id}-${session.id || index}`,
        front: `Sessão de estudo: ${skillName}`,
        back: session.note,
        category,
        source: 'automatic',
      });
    });
  });

  return generatedCards;
}


// ============================================================
// 6. COMBINAÇÃO DOS CARTÕES
// ============================================================

function buildAllCards() {
  const automaticCards = buildAutomaticCards();

  const manualCards = loadManualCards().map((card) => ({
    ...card,
    category: normalizeCategory(card.category) || 'Outras',
    source: 'manual',
  }));

  return [...automaticCards, ...manualCards];
}


// ============================================================
// 7. CADASTRO MANUAL DE FLASHCARDS
// ============================================================

function handleManualCardSubmit(event) {
  event.preventDefault();

  const front = manualQuestionInput.value.trim();
  const back = manualAnswerInput.value.trim();
  const category = normalizeCategory(manualCategoryInput.value);

  if (!front || !back || !category) {
    toast('Preencha pergunta, resposta e categoria.', 3000);
    return;
  }

  const manualCards = loadManualCards();

  manualCards.push({
    id: uid('card'),
    front,
    back,
    category,
    createdAt: new Date().toISOString(),
  });

  if (!saveManualCards(manualCards)) {
    return;
  }

  const previousCategory = categoryFilter.value;

  allCards = buildAllCards();
  populateCategories(previousCategory);

  categoryFilter.value = previousCategory;

  // Se a categoria selecionada for "Todos" ou a categoria
  // do novo cartão, reconstrói a fila para incluir o cartão.
  if (
    previousCategory === 'Todos' ||
    previousCategory === category
  ) {
    resetSessionDeck();
  } else {
    renderCard();
  }

  manualCardForm.reset();
  toast('Flashcard salvo com sucesso.', 2500);
}


// ============================================================
// 8. FILTRO DE CATEGORIAS
// ============================================================

function populateCategories(preferredCategory = 'Todos') {
  const categories = [
    ...new Set(allCards.map((card) =>
      normalizeCategory(card.category) || 'Outras'
    )),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  categoryFilter.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'Todos';
  allOption.textContent = 'Todas as categorias';
  categoryFilter.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  const exists = Array.from(categoryFilter.options)
    .some((option) => option.value === preferredCategory);

  categoryFilter.value = exists ? preferredCategory : 'Todos';
}

function getFilteredCards() {
  const selectedCategory = categoryFilter.value;

  if (!selectedCategory || selectedCategory === 'Todos') {
    return allCards;
  }

  return allCards.filter(
    (card) => normalizeCategory(card.category) === selectedCategory
  );
}


// ============================================================
// 9. CONTROLE DA PERGUNTA E DA RESPOSTA
// ============================================================

/*
 * Controlamos display diretamente para impedir que regras
 * de CSS mostrem os botões de avaliação antecipadamente.
 */

function showQuestionSide() {
  answerIsVisible = false;

  backElement.style.display = 'none';
  questionActions.style.display = 'flex';
  answerActions.style.display = 'none';
}

function showAnswerSide() {
  if (sessionDeck.length === 0) {
    return;
  }

  answerIsVisible = true;

  backElement.style.display = 'block';
  questionActions.style.display = 'none';
  answerActions.style.display = 'flex';
}


// ============================================================
// 10. CONTROLE DA FILA DE REVISÃO
// ============================================================

function resetSessionStats() {
  sessionStats.again = 0;
  sessionStats.good = 0;
  sessionStats.easy = 0;
}

function resetSessionDeck() {
  // A fila contém somente os cartões do filtro selecionado.
  sessionDeck = [...getFilteredCards()];
  currentIndex = 0;

  resetSessionStats();
  renderCard();
}

function renderSessionStatus() {
  const total = sessionDeck.length;

  if (total === 0) {
    statusElement.textContent = 'Não há cartões nesta fila.';
    return;
  }

  statusElement.textContent =
    `Cartão ${currentIndex + 1} de ${total} · ` +
    `Novamente: ${sessionStats.again} · ` +
    `Bom: ${sessionStats.good} · ` +
    `Fácil: ${sessionStats.easy}`;
}


// ============================================================
// 11. RENDERIZAÇÃO DO CARTÃO ATUAL
// ============================================================

function renderCard() {
  // Cada cartão novo começa com a resposta escondida.
  showQuestionSide();

  const total = sessionDeck.length;

  if (allCards.length === 0) {
    frontElement.textContent = 'Nenhum flashcard disponível.';
    answerTextElement.textContent =
      'Crie seu primeiro flashcard ou adicione objetivos e registros às habilidades.';

    categoryElement.textContent = 'Biblioteca vazia';

    backElement.style.display = 'block';
    questionActions.style.display = 'none';
    answerActions.style.display = 'none';

    statusElement.textContent = 'Ainda não existem cartões para revisar.';
    return;
  }

  if (total === 0) {
    frontElement.textContent = 'Revisão concluída.';
    answerTextElement.textContent =
      'Não há mais cartões nesta fila. Reinicie a revisão ou selecione outra categoria.';

    categoryElement.textContent = categoryFilter.value;

    backElement.style.display = 'block';
    questionActions.style.display = 'none';
    answerActions.style.display = 'none';

    statusElement.textContent =
      'Todos os cartões desta fila foram avaliados.';
    return;
  }

  if (currentIndex >= total) {
    currentIndex = 0;
  }

  const card = sessionDeck[currentIndex];

  frontElement.textContent = card.front;
  answerTextElement.textContent = card.back;
  categoryElement.textContent = card.category;

  renderSessionStatus();
}


// ============================================================
// 12. AVALIAÇÃO DOS CARTÕES
// ============================================================

/*
 * Novamente: envia o cartão para o fim da fila.
 */
function markAgain() {
  if (!answerIsVisible || sessionDeck.length === 0) {
    return;
  }

  sessionStats.again += 1;

  if (sessionDeck.length > 1) {
    const currentCard = sessionDeck.shift();
    sessionDeck.push(currentCard);
  }

  currentIndex = 0;
  renderCard();
}

/*
 * Bom: remove o cartão da fila atual.
 */
function markGood() {
  if (!answerIsVisible || sessionDeck.length === 0) {
    return;
  }

  sessionStats.good += 1;
  sessionDeck.shift();
  currentIndex = 0;

  renderCard();
}

/*
 * Fácil: remove o cartão da fila atual.
 */
function markEasy() {
  if (!answerIsVisible || sessionDeck.length === 0) {
    return;
  }

  sessionStats.easy += 1;
  sessionDeck.shift();
  currentIndex = 0;

  renderCard();
}


// ============================================================
// 13. EXPORTAÇÃO PARA O ANKI
// ============================================================

function exportCards() {
  const cards = getFilteredCards();

  if (cards.length === 0) {
    toast('Não há cartões para exportar nesta categoria.', 2500);
    return;
  }

  const tsv = cards
    .map((card) => {
      const front = escapeField(card.front);
      const back = escapeField(card.back);

      return `${front}\t${back}`;
    })
    .join('\n');

  downloadString(
    tsv,
    'text/tab-separated-values;charset=utf-8',
    'museu_cards.tsv'
  );

  toast(`${cards.length} cartões exportados.`, 2500);
}


// ============================================================
// 14. EVENTOS DA INTERFACE
// ============================================================

manualCardForm.addEventListener('submit', handleManualCardSubmit);

showAnswerButton.addEventListener('click', showAnswerSide);

againButton.addEventListener('click', markAgain);
goodButton.addEventListener('click', markGood);
easyButton.addEventListener('click', markEasy);

categoryFilter.addEventListener('change', resetSessionDeck);
resetSessionButton.addEventListener('click', resetSessionDeck);

downloadButton.addEventListener('click', exportCards);

exportAnkiLink.addEventListener('click', (event) => {
  event.preventDefault();
  exportCards();
});


// ============================================================
// 15. INICIALIZAÇÃO
// ============================================================

function initializeReviewPage() {
  allCards = buildAllCards();

  populateCategories('Todos');
  resetSessionDeck();
}

initializeReviewPage();
