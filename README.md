# Giga ERP & Remix: Sistema de Gestão de Contratos e Demandas
## 📖 Manual Oficial de Engenharia, Regras de Negócio e Documentação do Sistema

Bem-vindo à documentação oficial do **Remix ERP (Gestão de Contratos e Demandas)**. Este manual consolida a arquitetura, fluxos operacionais, estruturas de dados e regras de negócio robustas desenvolvidas para governar os módulos de Kanban, Fila de Prioridade, Recursos Humanos, Contratos e Sincronização Resiliente de Dados.

---

## 🚀 1. Visão Geral e Arquitetura do Sistema

O **Remix ERP** é uma aplicação full-stack de alto desempenho projetada para centralizar o ciclo de desenvolvimento, faturamento e governança de contratos de TI/Outsourcing. 

### 🛠️ Stack Tecnológica
*   **Apresentação e UI**: React 18+, Vite, Tailwind CSS, Motion (animações de transição).
*   **Persistência e Conectividade**: Firestore (Firebase) para persistência em nuvem, com barramento local em `dbState.tsx` operando em modo híbrido (persistência reativa com resiliência offline e fallback automático em `localStorage`).
*   **Segurança e Acessos**: Firestore Security Rules acoplados a perfis de usuários com restrições por contratos e cargos corporativos.
*   **Tipagem**: TypeScript estrito de ponta a ponta (`/src/types.ts`).

---

## ⚡ 2. Módulo: Fila de Prioridades (Fila do Técnico e Gestor)

O módulo **Fila de Prioridades** é uma joia de fluxo projetada para eliminar o estresse de context-switching de desenvolvedores e engenheiros operacionais. Ela introduz uma trilha linear de execução onde o gestor decide o que é crucial e o técnico consome de forma focada e cadenciada.

### 👥 Fluxo Binário de Perfis: Gestor vs. Técnico
1.  **Visão do Gestor (Priorização Geral)**:
    *   Exibe painéis com a carga de trabalho de todos os colaboradores e equipes.
    *   Permite selecionar demandas elegíveis e promovê-las à fila prioritária de um técnico específico através do botão de ativação de prioridade rápida (**Raio / ⚡**) ou pela estrela de prioridade do Kanban.
    *   O gestor aprova diretamente a inserção dos itens na fila ativa do técnico (`filaAprovada: true`).
2.  **Visão do Técnico (Foco Executivo)**:
    *   Exclusivo para o técnico focar estritamente nas tarefas designadas a ele pelo gestor.
    *   Apresenta uma lista linear de trabalho limpa, sem focar em colunas de Kanban dispersas.
    *   As ações nas demandas da Fila são facilitadas por controladores diretos de status: **Iniciar**, **Pausar** e **Concluir**.

---

## 🛠️ 3. Regras de Negócio e Validações Cruciais

### 📌 3.1 Guarda de Estimativa para Projetos (MUD & MEL)
*   **Regra**: Melhorias (`Melhoria` / `MEL`) e Mudanças (`Mudança` / `MUD`) são tarefas estruturadas que requerem governança de orçamento. O técnico **não pode** alterar o status dessas demandas para **"Em Andamento"** se não houver estimativas de horas cadastradas no plano de estimativa do card.
*   **Efeito**: O sistema valida e impede o acionamento, gerando um feedback visual instruindo o preenchimento de horas estimadas antes da execução.

### 📌 3.2 Interceptador de Apontamentos (Modal de Multi-Etapas)
Ao marcar um item de sua Fila de Prioridades como **"Pausada"** ou **"Concluída"**, o sistema dispara um fluxo inteligente e interativo em três subpassos consecutivos para capturar o esforço aplicado:

```
[Mudar Status para Pausado / Concluído]
                  │
                  ▼
         ┌─────────────────┐
         │ Passo 1:        │
         │ Deseja Apontar? ├───(Não)───► [Mover Direto / QA Check]
         └────────┬────────┘
                (Sim)
                  │
                  ▼
         ┌─────────────────┐
         │ Passo 2:        │
         │ Apontamento     │ ◄─── (Horas calculadas desde updatedAt)
         │ de Horas        │ ◄─── (Busca atividades customizadas do Projeto)
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐             Se tiver idQAManager:
         │ Passo 3:        ├───(Sim)───► [Mover para "Aguardando Gestor" (QA)]
         │ Enviar para QA? │
         └────────┬────────┘             Se não tiver ou recusado:
                (Não)──────────────────► [Mover para "Concluído"]
```

#### 📖 Passos Detalhados do Modal de Apontamentos:
*   **Passo 1: Confirmação de Horas**: O sistema questiona se o técnico deseja registrar suas horas aplicadas na execução da tarefa. Se declinado, a mudança de status prossegue.
*   **Passo 2: Formulário Inteligente de Lançamento de Esforço**:
    *   **Cálculo Dinâmico**: O sistema analisa a última atualização registrada na demanda (`updatedAt`) e calcula uma sugestão de quantidade de horas decimais trabalhadas (resolução de `0.1h`, limitando e arredondando para evitar valores absurdos ou superiores a 24 horas).
    *   **Atividades Dinâmicas**: O seletor de "Atividade" do apontamento busca dinamicamente a matriz de atividades válidas definida nas configurações específicas do Projeto associado. Caso não existam atividades parametrizadas especificamente para aquele projeto, reverte de forma segura às atividades de backup ("Desenvolvimento", "Testes", "Suporte", "Correção de Bugs", etc.).
    *   O clique em confirmar registra de forma imediata o esforço no banco (`apontamentos`) associado à demanda, pessoa e projeto.
*   **Passo 3: Despacho e Controle de Fluxo QA**:
    *   **Regra Especial**: Se a intenção do técnico for marcar como **"Concluída"** e o card possuir um **QA Manager / Analista de QA** associado (`idQAManager`), o sistema entra no subpasso de decisão de QA.
    *   O técnico pode optar por **"Sim, enviar para a fila do QA"**, o que migra o card automaticamente para a coluna de **"Aguardando aprovação do Gestor"** no Kanban (onde o analista de QA realizará a validação dos critérios com base nos passos cadastrados no card).
    *   Se optado por "Não", o card é concluído imediatamente na coluna padrão de conclusão.

### 📌 3.3 Ordenação Estruturada de Prateleiras na Fila
Para otimizar o foco, as demandas priorizadas dadas como ativas ou finalizadas dentro da Fila do Técnico são agrupadas e priorizadas sob regras de empilhamento vertical estritas:

| Grupo | Descrição | Estado dos Filtros Técnicos |
| :--- | :--- | :--- |
| **1. Em Andamento** | No topo da tela. Itens ativamente abertos na coluna "Desenvolvimento" ou "QA" e não finalizados. | `coluna === 'Desenvolvimento' \|\| 'QA'` & `!filaConcluida` |
| **2. Na Fila** | Demandas ativas, organizadas e prontas para consumo imediato. | Demais colunas ativas & `!filaConcluida` |
| **3. Aguardando Aprovação** | Itens que já passaram pelo crivo de desenvolvimento e estão aguardando validação do QA ou Gestor. | `coluna === 'Aguardando aprovação do Gestor'` |
| **4. Concluídas** | Histórico das demandas resolvidas ao longo do período de trabalho, localizadas ao fundo do painel. | `filaConcluida === true` |

> ℹ️ **Regra de Empate**: Em caso de itens no mesmo grupo de priorização, o sistema realiza uma ordenação descrescente por data/hora de última atualização (`updatedAt`), mantendo as demandas com atividades recentes no topo do respectivo bucket.

---

## 🔗 4. Associação Bidirecional de Demandas (Parent-Child-Sister)

Para gerenciar o escopo de implementações complexas ou decompor entregas robustas, o sistema suporta árvore de relações bilaterais estritas.

### 🤝 Tipos de Relacionamentos
*   **Pai (Parent)**: Demandas agregadoras de escopo maior.
*   **Filho (Child)**: Subcomponentes de implementação ou entregas complementares.
*   **Irmã (Sister)**: Demandas do mesmo nível de prioridade ou dependência temporal.

### 🔄 Regra de Integridade e Bidirecionalidade Reativa
Ao vincular a demanda **A** como filha da demanda **B**, o sistema executa automaticamente a ação reversa, inserindo na demanda **B** que ela representa o elemento **Pai** da demanda **A**.
*   A sincronização é instantânea tanto em adição de vínculos como em remoções, garantindo que as árvores relacionais nunca possuam pontas órfãs ou dados corrompidos.
*   O carregamento de dependências permite navegação rápida em cascata na aba "Tarefas & Relações".

---

## 👤 5. Passo a Passo e Processo de QA Unificado

O controle de qualidade foi democratizado e parametrizado para garantir integridade das entregas:
*   **Aba Passo a Passo & QA**: Agora habilitada para **TODOS** os tipos de demanda (Bugs, Incidentes, Melhorias, Mudanças, etc.).
*   **QA Manager Dedicado**: Permite vincular um Analista de QA específico da equipe (através do campo de dados `idQAManager`), que será o responsável por autorizar e realizar a bateria de testes.
*   **Ciclos de Homologação**: Registre as etapas ordenadas de testes e reprodução (Passos em formato Checklist) para validar as correções antes de autorizar a entrega.
*   **Toggles de Status QA**: Controladores de estágio do bug ou correção ("Reproduzido", "Corrigido", "Validado") diretamente integrados na aba.

---

## 🗄️ 6. Matriz de Dados Técnicos (Dicionário do Esquema)

Campos estendidos adicionados à interface de Demandas (`Demanda` em `/src/types.ts`):

```typescript
export interface Demanda {
  id: string;
  titulo: string;
  descricao: string;
  numeroChamado: string;          // Ex: "INC-10101", "BUG-10401", "MEL-10202"
  tipo?: string;                 // "BUG" | "Incidente" | "Melhoria" | "Mudança" | Customizado
  coluna: string;                // "Backlog" | "A Fazer" | "Desenvolvimento" | "QA" | "Aguardando aprovação do Gestor" | "Concluído" | "Pausado"
  
  // Controle de Fila e Fluxo de Estado
  priorizadoFila?: boolean;      // Indica se o item com estrela foi promovido à fila
  filaAprovada?: boolean | null; // Se o gestor aprovou formalmente a entrada para o técnico
  filaConcluida?: boolean;       // Conclusão no painel operacional da fila
  filaConcluidaAt?: string | null;
  updatedAt: string;             // ISO Datetime de controle de versão e cálculo de apontamentos
  
  // Atributos de Engenharia e Homologação de Qualidade
  idQAManager?: string;          // Referência de id da Pessoa vinculada como analista de QA
  statusQA?: "Reproduzido" | "Corrigido" | "Validado";
  passoAPasso?: string;          // Estrutura de lista de passos serializada em string JSON 
  
  // Relacionamentos Complexos e Árvore Relacional
  tarefasAssociadasIds?: string[]; // IDs vinculados de demandas relacionais
  relacoes?: {
    idDemanda: string;
    tipo: "filha" | "pai" | "irma";
  }[];
}
```

---

## 🔒 7. Regras de Segurança do Banco de Dados (Firestore)

A segurança e isolamento corporativo dos dados do **ERP Remix** são mantidos sob regras estritas escritas no arquivo `firestore.rules`:
*   **Pessoas / Usuários**: Apenas o usuário autenticado ou administradores gerenciais podem atualizar perfis individuais e redefinir fotos ou atributos de contratação.
*   **Contratos e Medições**: Acesso de visualização restrito para parceiros com vínculos explícitos declarados e editores autorizados.
*   **Segurança de Escrita em Demandas e Apontamentos**: Bloqueio de inserções e atualizações anônimas. Todas as ações operam amarradas sob a sessão ativamente autenticada e validada no Firebase Auth.

---

### 🛡️ Boas Práticas para Desenvolvedores
1.  **Manipulação de Estados (`dbState.tsx`)**: Sempre use as funções wrapper fornecidas (`addApontamento`, `updateDemanda`, etc.) para assegurar que alertas internos (`addAlerta`) e notificações de sincronização sejam enviados corretamente aos gerentes e parceiros em tempo real.
2.  **Modificações de Colunas**: Sempre que migrar um card de coluna programaticamente ou via arrasto, garanta a atualização do carimbo `updatedAt` para garantir que as estimativas e cálculos do interceptador de apontamentos de horas permaneçam corretos nas transições de ciclo.
