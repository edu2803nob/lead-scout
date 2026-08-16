# Lead Scout

Você é o arquiteto principal e engenheiro de software sênior responsável pelo projeto LeadHunter.

OBJETIVO

Construir uma aplicação SaaS profissional, simples, modular, segura e escalável para prospecção inteligente de empresas locais.

O sistema deve identificar empresas com potencial para contratar serviços de criação ou melhoria de landing pages.

IMPORTANTE

Esta é a ETAPA 1.

Não implemente integrações externas, LLM, WhatsApp, Google Places ou automações comerciais ainda.

PRINCÍPIO FUNDAMENTAL

A partir desta etapa, todo desenvolvimento futuro deverá ser incremental.

NENHUMA implementação futura pode:

- remover funcionalidades existentes;

- alterar contratos de APIs sem necessidade;

- alterar nomes de entidades sem migração;

- quebrar rotas existentes;

- duplicar lógica;

- colocar regras de negócio em componentes visuais;

- colocar secrets no frontend;

- criar código paralelo desnecessário.

STACK

Frontend:

- Next.js

- TypeScript

- Tailwind CSS

- componentes reutilizáveis

Backend:

- Next.js

- API Routes / Route Handlers / Server Actions quando apropriado

Banco:

- PostgreSQL

ORM:

- Prisma

Autenticação:

- Supabase Auth

Deploy futuro:

- Vercel

Arquitetura sugerida:

/app

/components

/components/ui

/components/forms

/components/leads

/components/prospecting

/components/dashboard

/lib

/lib/auth

/lib/db

/lib/validation

/services

/services/google

/services/social

/services/ai

/services/scoring

/services/analytics

/types

/utils

/hooks

/prisma

/tests

PRINCÍPIOS DE ARQUITETURA

1. Separação entre apresentação, domínio, infraestrutura e persistência.

2. TypeScript strict.

3. Validação de entrada.

4. Tratamento centralizado de erros.

5. Services para integrações externas.

6. Repository/data access quando necessário.

7. Não acessar Prisma diretamente de componentes React.

8. Não acessar APIs externas diretamente de componentes React.

9. Secrets somente no servidor.

10. Configurações através de environment variables.

11. Funções pequenas e testáveis.

12. Evitar overengineering.

13. Não criar abstrações sem necessidade real.

14. Não utilizar dados fake como substituto de funcionalidades reais.

MÓDULOS INICIAIS

Criar:

- autenticação;

- layout;

- dashboard vazio;

- CRUD de leads;

- página de leads;

- página de detalhes do lead;

- navegação principal.

MODELO INICIAL DE LEAD

Criar estrutura para:

- id

- userId

- companyName

- businessCategory

- businessSubcategory

- description

- phone

- email

- address

- city

- state

- country

- latitude

- longitude

- websiteUrl

- hasWebsite

- status

- source

- createdAt

- updatedAt

STATUS:

NEW

QUALIFIED

CONTACT_READY

CONTACTED

RESPONDED

MEETING

PROPOSAL

NEGOTIATION

WON

LOST

NO_INTEREST

NO_RESPONSE

REQUISITOS

- Autenticação obrigatória.

- Usuário só pode acessar seus próprios leads.

- CRUD completo.

- Paginação.

- Busca.

- Filtros básicos.

- Loading states.

- Empty states.

- Error states.

- Responsividade.

TESTES

Criar testes básicos para:

- criação de lead;

- atualização;

- exclusão;

- isolamento por usuário;

- validação de campos.

ANTES DE TERMINAR

Execute:

- typecheck;

- lint;

- testes;

- build.

Se houver erros, corrija antes de concluir.

Ao final, apresente:

1. arquivos criados;

2. arquivos modificados;

3. banco;

4. rotas;

5. testes executados;

6. problemas encontrados;

7. próximos passos.

NÃO implemente a próxima etapa automaticamente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a577819d-8a4a-4e7f-8a65-a76b610d11d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
