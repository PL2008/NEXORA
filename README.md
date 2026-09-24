# NEXORA · Gestão

_Criado Por Pedro Lucas!_

Sistema de gestão da NEXORA: vendas, recebimentos, despesas, clientes, propostas, contratos recorrentes e relatórios.

- **Começa vazio.** Não há dados de exemplo: todos os números e gráficos vêm do que você cadastrar.
- **Local e privado.** Os dados ficam no navegador (IndexedDB). Use **Configurações → Backup** para exportar e restaurar (JSON).
- **Responsivo.** Barra lateral no desktop, barra inferior e formulários em _bottom sheet_ no celular. Tema claro, escuro ou do sistema.

## Como rodar

Requer Node.js 20.19+ (ou 22.12+).

```bash
npm install
npm run dev          # http://localhost:5173
```

Build de produção:

```bash
npm run build        # typecheck + build em dist/
npm run preview      # serve dist/ em http://localhost:4173
```

> O app usa rotas no navegador (`/vendas`, `/clientes/…`). Ao publicar em hospedagem estática, configure o fallback de SPA para `index.html`.

## Aplicativo para Windows

O sistema também roda como **aplicativo desktop** (Electron), sem precisar de navegador nem internet.

- **`NEXORA-Portatil-<versão>.exe`** — um único arquivo: dê dois cliques e use. Não precisa instalar.
- Os dados ficam salvos no computador, em `%APPDATA%\NEXORA`, e continuam lá entre usos e atualizações do `.exe`.
- Na primeira execução o Windows pode mostrar “O Windows protegeu o computador” (o app não tem assinatura digital paga). Clique em **Mais informações → Executar assim mesmo**.
- Exportações (CSV e backup) abrem a janela “Salvar como”, começando pela pasta Downloads.

Para gerar os arquivos:

```bash
npm run app:win      # build + release/NEXORA-Portatil-<versão>.exe e NEXORA-Windows-<versão>.zip
npm run app          # abre o aplicativo desktop localmente
npm run app:test     # testes do aplicativo desktop (Playwright + Electron)
npm run app:icons    # regenera ícones e tela de abertura a partir do logo
```

No Windows, também é possível gerar um instalador com atalho na área de trabalho: `npx electron-builder --win nsis`.

## Scripts

| Script              | O que faz                                                |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                              |
| `npm run build`     | `tsc -b` (TypeScript strict) + build do Vite             |
| `npm run typecheck` | Só a checagem de tipos                                   |
| `npm run lint`      | ESLint (inclui regras de hooks do React)                 |
| `npm run format`    | Prettier (com ordenação de classes do Tailwind)          |
| `npm test`          | Vitest — lógica de negócio, banco e exportações          |
| `npm run e2e`       | Playwright — desktop e mobile, falha com erro no console |
| `npm run check`     | typecheck + lint + testes + build                        |

Para os testes e2e, instale o navegador uma vez: `npx playwright install chromium`.

## Stack

Vite · React 19 · TypeScript strict · Tailwind CSS v4 · motion · Dexie (IndexedDB) · React Router · zod · lucide-react.
Gráficos em SVG próprio (linha/área com crosshair e tooltip, colunas, barras, sparkline, medidor e funil), navegáveis pelo teclado e com alternância para tabela.

## Regras de negócio

- **Valores** sempre em centavos (inteiros); **datas** no formato `YYYY-MM-DD` no fuso local; formatação pt-BR/BRL.
- **Receita recebida**: soma das parcelas pagas (vendas e mensalidades de contratos) pela data de pagamento.
- **Despesas**: despesas operacionais pela data + custos de projetos das vendas fechadas no período.
- **Lucro** = receita recebida − despesas. **Margem** = lucro ÷ receita.
- **Comparação com o período anterior**: período equivalente imediatamente antes. Se o período atual está em andamento, compara até o mesmo ponto (ex.: 1–24/set vs 1–24/ago).
- **Vendas fechadas / ticket médio**: vendas não canceladas com data no período; ticket = valor vendido ÷ quantidade.
- **A receber / atrasados**: parcelas não pagas; atrasadas quando o vencimento já passou. Parcelas de vendas canceladas deixam de contar.
- **Parcelas**: à vista, parcelado (mensal, centavos restantes nas primeiras parcelas; dia 31 vira o último dia em meses curtos) ou personalizado. A soma precisa ser igual ao total.
- **Contratos recorrentes**: cobranças mensais geradas automaticamente até o mês atual (idempotente). Pausar/retomar não gera meses retroativos; encerrar remove cobranças futuras em aberto. **MRR** = soma dos contratos ativos.
- **Despesas recorrentes**: marque “Repetir todo mês” — os lançamentos são gerados automaticamente no mesmo dia de cada mês.
- **LTV** do cliente = total já recebido dele.
- **Funil de propostas**: conta a etapa mais avançada que cada proposta alcançou (lead → proposta → negociação → ganha). Ganhar é converter em venda. Taxa de ganho = ganhas ÷ (ganhas + perdidas).
- **CSV**: separador `;`, vírgula decimal e BOM UTF-8 (abre direto no Excel/Planilhas); células que começam com `=`, `+`, `-` ou `@` são neutralizadas.

## Estrutura

```
src/
  lib/          dinheiro, datas, CSV, ids
  domain/       tipos, schemas zod, métricas, período, parcelas, recorrência, exportações
  db/           Dexie, repositório (todas as gravações), sincronização de recorrências, backup
  app/          provedor de dados (consultas ao vivo), tema, error boundary
  components/   UI (botões, campos, modal, toast…), gráficos SVG, layout
  features/     telas: visão geral, vendas, recebimentos, despesas, clientes, propostas, contratos, relatórios, configurações
e2e/            testes Playwright (desktop + mobile)
e2e-desktop/    testes do aplicativo Electron
electron/       processo principal do aplicativo desktop
scripts/        ícones, tela de abertura e gancho de empacotamento do Windows
```
