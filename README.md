# Skill Hall — Museu de Habilidades

> Um laboratório pessoal para registrar, desenvolver e reconhecer as habilidades que construímos ao longo do tempo.

O **Skill Hall** é um projeto criado para transformar o desenvolvimento pessoal em algo visível e concreto. Em vez de depender apenas da memória ou da sensação de estar evoluindo, a proposta é registrar objetivos, horas de estudo, sessões e aprendizados em um espaço organizado.

A ideia central é simples: cada habilidade merece seu próprio histórico. O progresso não precisa ser perfeito ou linear, mas deve poder ser observado.

## ✦ Funcionalidades

### Hall de habilidades
- Criar e organizar habilidades por categoria.
- Buscar e filtrar habilidades.
- Definir metas e horas de estudo.
- Acompanhar o progresso individual.

### Acompanhamento de evolução
- Registrar objetivos e marcar os concluídos.
- Registrar sessões de estudo, incluindo data, duração e observações.
- Consultar o histórico de evolução.
- Calcular o progresso com base em objetivos e horas, usando pesos configuráveis.

### Biblioteca de recursos
- Organizar materiais de estudo.
- Associar recursos às habilidades correspondentes.
- Manter referências úteis reunidas em um só lugar.

### Revisão e flashcards
- Gerar cartões a partir de informações registradas nas habilidades.
- Criar flashcards manualmente.
- Filtrar cartões por categoria.
- Revisar perguntas e respostas.
- Exportar cartões para um arquivo TSV compatível com fluxos de importação de ferramentas de repetição espaçada, como o Anki.

### Backup e dados
- Exportar e importar backups, conforme suportado pela versão atual.
- Salvar os registros no armazenamento local do navegador.
- A versão atual também inclui uma integração experimental com GitHub Gist, cuja finalidade é permitir a transferência de dados entre ambientes.

> **Atenção:** a integração com Gist não equivale a um sistema completo de contas ou sincronização automática. Antes de utilizá-la, confira quais tipos de dados são efetivamente exportados e importados.

## 🛠️ Tecnologias

- **HTML5** — estrutura das páginas.
- **CSS3** — identidade visual e layout responsivo.
- **JavaScript (ES Modules)** — lógica da aplicação e interação entre páginas.
- **LocalStorage** — persistência dos dados no navegador.
- **Git e GitHub** — versionamento e hospedagem do código.

O projeto foi desenvolvido sem depender de um framework JavaScript para a interface principal.

## 🚀 Como executar

### Requisitos
- Um navegador moderno.
- Um editor de código, como o Visual Studio Code.
- A extensão **Live Server** no VS Code, ou outro servidor HTTP local.

### Passos

1. Clone o repositório ou baixe os arquivos.
2. Abra a pasta do projeto no VS Code.
3. Localize o arquivo `Skill Hall/index.html`.
4. Inicie o Live Server a partir desse arquivo.
5. Acesse o endereço local aberto pelo navegador.

**Importante:** como a aplicação utiliza módulos JavaScript, execute-a por um servidor HTTP local. Abrir o HTML diretamente pelo caminho `file://` pode impedir que os módulos funcionem corretamente.

## 📁 Estrutura do projeto

```text
Skill-Hall/
├── README.md
└── Skill Hall/
    ├── index.html
    ├── skill.html
    ├── library.html
    ├── review.html
    ├── styles.css
    └── js/
        ├── hall.js
        ├── storage.js
        ├── skill-model.js
        ├── skill-page.js
        ├── library-page.js
        ├── review-page.js
        └── utils.js
```

### Responsabilidade dos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Página principal do Hall |
| `skill.html` | Detalhes e evolução de uma habilidade |
| `library.html` | Biblioteca de recursos |
| `review.html` | Revisão e flashcards |
| `styles.css` | Estilos compartilhados |
| `hall.js` | Lógica do Hall, configurações e operações gerais |
| `storage.js` | Leitura e gravação dos dados locais |
| `skill-model.js` | Normalização e cálculo de progresso |
| `skill-page.js` | Comportamento da página de habilidade |
| `library-page.js` | Gerenciamento da biblioteca |
| `review-page.js` | Gerenciamento da revisão |
| `utils.js` | Funções auxiliares reutilizáveis |

## 💾 Armazenamento e privacidade

Na versão atual, os dados são armazenados no navegador por meio do `LocalStorage`.

Isso significa que:

- Os dados ficam associados ao navegador e à origem local utilizada.
- Abrir o projeto em outro computador ou celular não transfere automaticamente os registros.
- Limpar os dados do navegador pode apagar informações armazenadas.
- O backup deve ser utilizado para preservar os dados antes de mudanças importantes.

A aplicação ainda não possui autenticação de usuários, contas individuais ou sincronização automática entre dispositivos.

A integração opcional com GitHub Gist deve ser tratada como um recurso experimental. Tokens de acesso são informações sensíveis e não devem ser compartilhados ou publicados.

## 🧭 Próximos passos

Possíveis evoluções para versões futuras:

- Simplificar e consolidar o sistema de armazenamento.
- Revisar o backup para incluir todas as categorias de dados.
- Remover ou reformular a integração com Gist.
- Implementar autenticação e persistência remota, caso o projeto passe a atender vários usuários.
- Sincronizar os dados entre computador e celular.
- Melhorar testes, validações e documentação.

Esses itens são possibilidades de evolução, não funcionalidades garantidas na versão atual.

## 🎯 Propósito

O Skill Hall nasceu de uma dificuldade comum: investir tempo em várias áreas e, ainda assim, ter dificuldade para reconhecer o próprio progresso.

O objetivo não é colecionar habilidades superficialmente. É construir um histórico real de prática, conhecimento e consistência.

**O que você desenvolve merece ser registrado. O que você registra pode ser avaliado. E o que você avalia pode ser melhorado.**

---

Desenvolvido por [N-Orion](https://github.com/N-Orion).
