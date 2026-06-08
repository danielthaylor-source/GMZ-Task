/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Zap, ArrowUp, ArrowDown, Search, User, CheckCircle2, 
  Clock, AlertCircle, Eye, Settings, ListOrdered, ClipboardList, X,
  Plus, Trash2, Edit3, Calendar, AlertTriangle, Bug, CheckSquare, Play, Pause, Filter,
  FileText, Link2, Paperclip, MessageSquare, Check, Download, ExternalLink, Edit, RotateCcw
} from "lucide-react";
import { Demanda, Pessoa, TarefaPessoal, AnexoDemanda } from "../types";

interface FilaPrioridadesProps {
  mode?: "tecnico" | "gerencial";
  setCurrentModule?: (module: string) => void;
  targetTechSelectedId?: string;
  setTargetTechSelectedId?: (id: string) => void;
}

export const FilaPrioridadesModule: React.FC<FilaPrioridadesProps> = ({ mode, setCurrentModule, targetTechSelectedId, setTargetTechSelectedId }) => {
  const { 
    demandas, pessoas, projetos, empresas, activeUser, activeUserAcessos, updateDemanda, addToast,
    comentarios, apontamentos, addComentario, addApontamento, 
    tarefasPessoais, addTarefaPessoal, updateTarefaPessoal, deleteTarefaPessoal, dbConnected, moveDemanda,
    alertas, addAlerta, addEmailFila
  } = useDB();

  // Mode identification
  // O perfil que tem acesso a fila de prioridades gerencial, se estiver acessando a fila de prioridades da minha jornada (mode === "tecnico"),
  // deve ver apenas a sua fila sem dashboard e também as suas tarefas. Por isso, isWorkspaceManager só pode ser verdadeiro em modo gerencial.
  const isWorkspaceManager = mode === "gerencial";

  // State selectors
  const [selectedPessoaId, setSelectedPessoaId] = useState<string>(() => {
    if (targetTechSelectedId) return targetTechSelectedId;
    if (mode === "tecnico" && activeUser) return activeUser.id;
    return activeUser?.id || "";
  });

  // Auto-select technician from notification click
  React.useEffect(() => {
    if (targetTechSelectedId) {
      setSelectedPessoaId(targetTechSelectedId);
      if (setTargetTechSelectedId) {
        setTargetTechSelectedId("");
      }
    }
  }, [targetTechSelectedId, setTargetTechSelectedId]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);

  // States for the custom simple pointing modal
  const [showPointingModal, setShowPointingModal] = useState(false);
  const [pointingDemanda, setPointingDemanda] = useState<Demanda | null>(null);
  const [pointingTargetStatus, setPointingTargetStatus] = useState<"Pausada" | "Concluída" | null>(null);
  const [pointingHoras, setPointingHoras] = useState<number>(1);
  const [pointingAtividade, setPointingAtividade] = useState<string>("");
  const [pointingError, setPointingError] = useState<string>("");
  const [pointingStep, setPointingStep] = useState<"ask_pointing" | "input_pointing" | "ask_qa">("ask_pointing");

  // Active Technical sub-tabs for 'tecnico' mode
  // "fila" = Fila de Prioridades, "tarefas" = Minhas Tarefas Pessoais
  const [activeSubTab, setActiveSubTab] = useState<"fila" | "tarefas">("fila");

  // Manager indicators states
  const [dataInicioConcluido, setDataInicioConcluido] = useState<string>("");
  const [dataFimConcluido, setDataFimConcluido] = useState<string>("");
  const [bugEnvFilter, setBugEnvFilter] = useState<string>("TODOS");
  const [bugTagFilter, setBugTagFilter] = useState<string>("TODOS");

  // Personal task form modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TarefaPessoal | null>(null);
  
  // Personal task form fields
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDataInicio, setTaskDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [taskDataFim, setTaskDataFim] = useState(new Date().toISOString().split("T")[0]);
  const [taskStatus, setTaskStatus] = useState<"Pendente" | "Em Andamento" | "Pausada" | "Concluída">("Pendente");
  const [taskAddToAgenda, setTaskAddToAgenda] = useState(false);

  // States for manual adding of demands directly from Priority Queue
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [searchAddTerm, setSearchAddTerm] = useState("");
  const [filterAddTipo, setFilterAddTipo] = useState("");
  const [filterAddProjeto, setFilterAddProjeto] = useState("");
  const [modalTab, setModalTab] = useState<string>("resumo");

  // Drag and drop visual indicators states
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingTaskIndex, setDraggingTaskIndex] = useState<number | null>(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);

  // Action Comments state (Approvals and Envio QA)
  const [showCommentDlg, setShowCommentDlg] = useState(false);
  const [commentDlgType, setCommentDlgType] = useState<"aprovar" | "enviar_qa">("aprovar");
  const [commentDlgDemId, setCommentDlgDemId] = useState("");
  const [commentText, setCommentText] = useState("");

  // Sync selectedPessoaId if only technical user is logged in
  React.useEffect(() => {
    if (!isWorkspaceManager && activeUser) {
      setSelectedPessoaId(activeUser.id);
    }
  }, [isWorkspaceManager, activeUser]);

  // Auto-select first technician for manager if selectedPessoaId is not set or is the manager itself
  React.useEffect(() => {
    if (isWorkspaceManager && activeUser && selectedPessoaId === activeUser.id && !targetTechSelectedId) {
      const isTechOrQA = activeUser.tipo === "GMZ" || activeUser.perfil === "QA";
      if (!isTechOrQA) {
        const firstTech = pessoas.find(p => p.tipo === "GMZ" || p.perfil === "QA");
        if (firstTech) {
          setSelectedPessoaId(firstTech.id);
        }
      }
    }
  }, [isWorkspaceManager, activeUser, pessoas, selectedPessoaId, targetTechSelectedId]);

  // List of technical members
  const techPessoas = pessoas.filter(p => p.tipo === "GMZ");

  // Evaluate prioritized demands
  const prioritizedDemands = demandas.filter(d => {
    const isAssigned = d.idDesignado === selectedPessoaId || (d.idDesignados && d.idDesignados.includes(selectedPessoaId));
    const isPrioritized = d.priorizadoFila === true;
    const matchesSearch = d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.numeroChamado.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Hidden from technician if not approved yet
    if (!isWorkspaceManager && d.filaAprovada === false) {
      return false;
    }
    
    // Period filter for completed demands (if date filters are filled)
    if (d.filaConcluida) {
      if (dataInicioConcluido) {
        const complDate = d.filaConcluidaAt ? d.filaConcluidaAt.split("T")[0] : "";
        if (complDate && complDate < dataInicioConcluido) return false;
      }
      if (dataFimConcluido) {
        const complDate = d.filaConcluidaAt ? d.filaConcluidaAt.split("T")[0] : "";
        if (complDate && complDate > dataFimConcluido) return false;
      }
    } else {
      // If a completion date filter is established, and card is not completed, we hide it in report dashboard
      if (dataInicioConcluido || dataFimConcluido) {
        return false;
      }
    }
    
    return isAssigned && isPrioritized && !d.excluido && matchesSearch;
  });

  // Reorder list
  const sortedPrioritizedDemands = [...prioritizedDemands].sort((a, b) => {
    // Determine category indices
    const getCategoryIndex = (d: Demanda) => {
      const isCompleted = !!d.filaConcluida;
      if (isCompleted) return 4; // Concluidas (last)
      
      const isAwaitingApproval = d.coluna === "Aguardando aprovação do Gestor";
      if (isAwaitingApproval) return 3; // Aguardando aprovação do Gestor
      
      const deAndamento = d.coluna === "Desenvolvimento" || d.coluna === "desenvolvimento" || d.coluna === "QA";
      const isEmAndamento = deAndamento && !isCompleted;
      if (isEmAndamento) return 1; // Em andamento (first)
      
      return 2; // Na Fila (all other active items)
    };
    
    const catA = getCategoryIndex(a);
    const catB = getCategoryIndex(b);
    
    if (catA !== catB) {
      return catA - catB;
    }
    
    // Sort items of the same category by updatedAt descending (most recent first)
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  // Calculations for general tallies (on prioritized items)
  const totalPriorizadas = prioritizedDemands.length;
  const totalPausadas = prioritizedDemands.filter(d => d.coluna === "Impedido" || d.coluna === "impedido" || d.coluna === "Pausado").length;
  const totalEmAndamento = prioritizedDemands.filter(d => d.coluna === "Desenvolvimento" || d.coluna === "desenvolvimento" || d.coluna === "QA").length;

  // Scan idle technicians (Technicians with 0 active tasks in development)
  const idleTechs = techPessoas.filter(tech => {
    const activeTasks = demandas.filter(d => {
      const isAssigned = d.idDesignado === tech.id || (d.idDesignados && d.idDesignados.includes(tech.id));
      const isActiveColumn = d.coluna === "Desenvolvimento" || d.coluna === "desenvolvimento" || d.coluna === "QA";
      return isAssigned && isActiveColumn && !d.filaConcluida && !d.excluido;
    });
    return activeTasks.length === 0;
  });

  // Bugs count calculation
  const totalBugs = demandas.filter(d => {
    if (d.tipo !== "BUG" || d.excluido) return false;
    // Check environment filter
    if (bugEnvFilter !== "TODOS") {
      const dbEnv = d.ambiente || "";
      if (dbEnv.toUpperCase() !== bugEnvFilter.toUpperCase()) return false;
    }
    // Check component type filter
    if (bugTagFilter !== "TODOS") {
      const dbAmbType = d.tipoBug || "";
      const tags = d.tags || [];
      const hasTag = tags.some(t => t.toLowerCase() === bugTagFilter.toLowerCase()) || dbAmbType.toLowerCase() === bugTagFilter.toLowerCase();
      if (!hasTag) return false;
    }
    return true;
  }).length;

  const finalizeStatusChange = async (dem: Demanda, status: "Pausada" | "Concluída" | "Aprovacao_QA") => {
    let updatedPayload: Partial<Demanda> = {};
    let statusLabel = "";

    if (status === "Concluída") {
      const isTask = dem.tipo === "Task";
      updatedPayload = {
        filaConcluida: true,
        filaConcluidaAt: new Date().toISOString(),
        coluna: isTask ? "Validação QA" : "Concluído",
        updatedAt: new Date().toISOString(),
        inicioExecucao: null,
        comentarioAprovacaoGestor: "",
        comentarioEnvioQA: ""
      };
      statusLabel = isTask ? "Validação QA" : "Concluída";
    } else if (status === "Pausada") {
      updatedPayload = {
        filaConcluida: false,
        filaConcluidaAt: null,
        coluna: "Pausado",
        updatedAt: new Date().toISOString(),
        inicioExecucao: null
      };
      statusLabel = "Pausada";
    } else if (status === "Aprovacao_QA") {
      updatedPayload = {
        filaConcluida: false,
        filaConcluidaAt: null,
        coluna: "Aguardando aprovação do Gestor",
        updatedAt: new Date().toISOString(),
        idDesignado: dem.idQAManager || dem.idDesignado,
        idDesignados: dem.idQAManager ? [dem.idQAManager] : (dem.idDesignados || []),
        filaAprovada: false, // Needs gestor approval to show in QA's screen queue dropdown
        priorizadoFila: true, // Keep it prioritized so it can be approved and tracked
        inicioExecucao: null
      };
      statusLabel = "Aguardando aprovação do Gestor (QA)";
    }

    await updateDemanda(dem.id, updatedPayload);
    addToast(`Card marcado como ${statusLabel} com sucesso!`, "success");

    const techName = activeUser?.nome || "Técnico";
    const titleText = `Atualização de Fila: ${dem.numeroChamado}`;
    const msgText = `O técnico ${techName} alterou o status do card "${dem.titulo}" (${dem.numeroChamado}) para "${statusLabel.toUpperCase()}" na fila de prioridades.`;

    // Retrieve project and managers
    const proj = projetos.find(p => p.id === dem.idProjeto);
    const gestores = proj?.gestoresIds || [];
    const projNome = proj?.nome || "Desconhecido";

    if (status === "Aprovacao_QA") {
      // Quando o técnico enviar um projeto para a fila do QA também vai avisar ao gestor daquele projeto que ele tem uma demanda para aprovar.
      const qaMsg = `O gestor do projeto ${projNome} tem uma demanda do QA (${dem.numeroChamado}) para aprovar.`;
      if (gestores.length > 0) {
        for (const gId of gestores) {
          await addAlerta({
            titulo: `Aprovação de QA Pendente: ${dem.numeroChamado}`,
            mensagem: qaMsg,
            recipientId: gId,
            type: "prioridade_update",
            targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
          });

          const gestorObj = pessoas.find(p => p.id === gId);
          if (gestorObj?.email) {
            await addEmailFila({
              assunto: `Aprovação de QA Pendente: Demanda ${dem.numeroChamado}`,
              destinatarios: gestorObj.email,
              processo: "Envio para QA"
            });
          }
        }
      } else {
        // Fallback to gerencial
        await addAlerta({
          titulo: `Aprovação de QA Pendente: ${dem.numeroChamado}`,
          mensagem: qaMsg,
          recipientId: "gerencial",
          type: "prioridade_update",
          targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
        });
        const allManagers = pessoas.filter(p => p.perfil === "Gerencial" || p.perfil === "Administrador");
        const managerEmails = allManagers.map(p => p.email).filter(Boolean).join(", ");
        if (managerEmails) {
          await addEmailFila({
            assunto: `Aprovação de QA Pendente: Demanda ${dem.numeroChamado}`,
            destinatarios: managerEmails,
            processo: "Envio para QA"
          });
        }
      }
    } else if (status === "Concluída") {
      // Sempre que um técnico ou QA clicar em 'concluir tarefa' na fila de prioridades, o gestor daquele projeto recebe uma notificação 'A demanda xxxxx foi concluída pelo técnico xxxxx'
      const completeMsg = `A demanda ${dem.numeroChamado} foi concluída pelo técnico ${techName}`;
      if (gestores.length > 0) {
        for (const gId of gestores) {
          await addAlerta({
            titulo: `Tarefa Concluída: ${dem.numeroChamado}`,
            mensagem: completeMsg,
            recipientId: gId,
            type: "prioridade_update",
            targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
          });

          const gestorObj = pessoas.find(p => p.id === gId);
          if (gestorObj?.email) {
            await addEmailFila({
              assunto: `Tarefa Concluída na Fila: ${dem.numeroChamado}`,
              destinatarios: gestorObj.email,
              processo: "Conclusão de Tarefa"
            });
          }
        }
      } else {
        // Fallback to gerencial
        await addAlerta({
          titulo: `Tarefa Concluída: ${dem.numeroChamado}`,
          mensagem: completeMsg,
          recipientId: "gerencial",
          type: "prioridade_update",
          targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
        });
        const allManagers = pessoas.filter(p => p.perfil === "Gerencial" || p.perfil === "Administrador");
        const managerEmails = allManagers.map(p => p.email).filter(Boolean).join(", ");
        if (managerEmails) {
          await addEmailFila({
            assunto: `Tarefa Concluída na Fila: ${dem.numeroChamado}`,
            destinatarios: managerEmails,
            processo: "Conclusão de Tarefa"
          });
        }
      }
    } else {
      if (dem.idResponsavel && dem.idResponsavel !== activeUser?.id) {
        await addAlerta({
          titulo: titleText,
          mensagem: msgText,
          recipientId: dem.idResponsavel,
          type: "prioridade_update",
          targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
        });
      }

      await addAlerta({
        titulo: titleText,
        mensagem: msgText,
        recipientId: "gerencial",
        type: "prioridade_update",
        targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
      });
    }
  };

  const handleMarkStatus = async (dem: Demanda, status: "Concluída" | "Em Andamento" | "Pausada") => {
    // 1. Estimate check guard for Mejoras and Mudanças
    if (status === "Em Andamento") {
      if ((dem.tipo === "Melhoria" || dem.tipo === "Mudança" || dem.tipo === "MEL" || dem.tipo === "MUD") && (!dem.estimativas || dem.estimativas.length === 0)) {
        addToast("Aviso: Melhorias (MEL) e Mudanças (MUD) só podem ser iniciadas se houver estimativas de horas cadastradas!", "error");
        return;
      }

      const topDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const updatedPayload = {
        filaConcluida: false,
        filaConcluidaAt: null,
        coluna: "Desenvolvimento",
        updatedAt: topDate,
        inicioExecucao: new Date().toISOString()
      };
      await updateDemanda(dem.id, updatedPayload);
      addToast(`Card marcado como ${status} com sucesso!`, "success");

      const techName = activeUser?.nome || "Técnico";
      const titleText = `Atualização de Fila: ${dem.numeroChamado}`;
      const msgText = `O técnico ${techName} alterou o status do card "${dem.titulo}" (${dem.numeroChamado}) para "EM ANDAMENTO" na fila de prioridades.`;

      if (dem.idResponsavel && dem.idResponsavel !== activeUser?.id) {
        await addAlerta({
          titulo: titleText,
          mensagem: msgText,
          recipientId: dem.idResponsavel,
          type: "prioridade_update",
          targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
        });
      }

      await addAlerta({
        titulo: titleText,
        mensagem: msgText,
        recipientId: "gerencial",
        type: "prioridade_update",
        targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
      });
      return;
    }

    // Intercept Pausar and Concluir
    setPointingDemanda(dem);
    setPointingTargetStatus(status);
    
    // Calculate execution time since task start/restart (inicioExecucao)
    let suggestedHours = 1.0;
    if (dem.inicioExecucao) {
      const lastUpdate = new Date(dem.inicioExecucao).getTime();
      const diffHours = (Date.now() - lastUpdate) / (1000 * 60 * 60);
      suggestedHours = Math.max(0.1, Math.round(diffHours * 10) / 10);
      if (suggestedHours > 48 || suggestedHours <= 0) {
        suggestedHours = 1.0;
      }
    }
    setPointingHoras(suggestedHours);

    // Fetch allowed activities
    const proj = projetos.find(p => p.id === dem.idProjeto);
    const defaultAct = proj?.atividades && proj.atividades.length > 0 ? proj.atividades[0] : "Desenvolvimento";
    setPointingAtividade(defaultAct);
    setPointingError("");
    setPointingStep("ask_pointing");
    setShowPointingModal(true);
  };

  const handleAprovarFilaComComentario = async (demId: string, comment: string) => {
    const dem = demandas.find(d => d.id === demId);
    if (!dem) return;

    const updatedPayload: any = { 
      filaAprovada: true,
      comentarioAprovacaoGestor: comment.trim() || ""
    };
    if (dem.coluna === "Aguardando aprovação do Gestor") {
      updatedPayload.coluna = "A Fazer";
    }
    
    // Clear any previous QA comments when approved and put into active queue
    updatedPayload.comentarioEnvioQA = "";

    await updateDemanda(demId, updatedPayload);

    // Write permanent comment if typed
    if (comment.trim()) {
      await addComentario(demId, `<strong>Comentário adicionado no momento da aprovação:</strong> ${comment.trim()}`);
    }

    addToast("Demanda aprovada e incluída na fila de prioridades do técnico com sucesso!", "success");

    const targetTechId = dem.idDesignado || dem.idResponsavel;
    if (targetTechId) {
      const gName = activeUser?.nome || "Gestor";
      await addAlerta({
        titulo: "Priorização de Demanda",
        mensagem: `a demanda ${dem.numeroChamado} foi enviada para a sua fila de priorização pelo gestor ${gName}.${comment.trim() ? ` Obs: ${comment.trim()}` : ""}`,
        recipientId: targetTechId,
        type: "prioridade_update"
      });

      const techObj = pessoas.find(p => p.id === targetTechId);
      if (techObj?.email) {
        await addEmailFila({
          assunto: `A demanda ${dem.numeroChamado} foi enviada para a sua fila de priorização pelo gestor ${gName}`,
          destinatarios: techObj.email,
          processo: "Aprovação pelo Gestor"
        });
      }
    }
  };

  const handleAprovarFila = async (demId: string) => {
    const dem = demandas.find(d => d.id === demId);
    if (!dem) return;

    const proj = projetos.find(p => p.id === dem.idProjeto);
    const projNome = proj?.nome || "Desconhecido";
    const projectManagers = proj?.gestoresIds || [];

    // Check project manager permission if managers are assigned
    if (projectManagers.length > 0 && !projectManagers.includes(activeUser?.id || "")) {
      const msg = `Você não é gestor do projeto ${projNome}`;
      addToast(msg, "error");
      alert(msg);
      return;
    }

    // Open comments dialogue for feedback
    setCommentDlgType("aprovar");
    setCommentDlgDemId(demId);
    setCommentText("");
    setShowCommentDlg(true);
  };

  const handleVoltarParaFila = async (demId: string) => {
    const dem = demandas.find(d => d.id === demId);
    if (!dem) return;
    const updatedPayload = {
      filaConcluida: false,
      filaConcluidaAt: null,
      coluna: "A Fazer",
      updatedAt: new Date().toISOString(),
      inicioExecucao: null
    };
    await updateDemanda(demId, updatedPayload);
    addToast(`Card ${dem.numeroChamado} despausado e retornado para a fila com sucesso!`, "success");

    const techName = activeUser?.nome || "Técnico";
    const titleText = `Card Retornado à Fila: ${dem.numeroChamado}`;
    const msgText = `O técnico ${techName} despausou o card "${dem.titulo}" (${dem.numeroChamado}) e o retornou para a fila de "A Fazer".`;

    if (dem.idResponsavel && dem.idResponsavel !== activeUser?.id) {
      await addAlerta({
        titulo: titleText,
        mensagem: msgText,
        recipientId: dem.idResponsavel,
        type: "prioridade_update",
        targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
      });
    }

    try {
      await addAlerta({
        titulo: titleText,
        mensagem: msgText,
        recipientId: "gerencial",
        type: "prioridade_update",
        targetPessoaId: dem.idDesignado || dem.idResponsavel || activeUser?.id || ""
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMovePersonalTask = async (id: string, direction: "up" | "down") => {
    const userTasks = tarefasPessoais.filter(t => t.idPessoa === activeUser?.id);
    const index = userTasks.findIndex(t => t.id === id);
    if (index === -1) return;
    const siblingIndex = direction === "up" ? index - 1 : index + 1;
    if (siblingIndex < 0 || siblingIndex >= userTasks.length) return;
    const current = userTasks[index];
    const sibling = userTasks[siblingIndex];
    if (current && sibling) {
      const cTime = current.createdAt || new Date().toISOString();
      const sTime = sibling.createdAt || new Date().toISOString();
      await updateTarefaPessoal(current.id, { createdAt: sTime });
      await updateTarefaPessoal(sibling.id, { createdAt: cTime });
    }
  };

  const handleMoveDrag = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const items = [...sortedPrioritizedDemands];
    const targetDemanda = items[fromIndex];
    const destinationDemanda = items[toIndex];
    if (targetDemanda && destinationDemanda) {
      const targetTime = targetDemanda.updatedAt || new Date().toISOString();
      const destTime = destinationDemanda.updatedAt || new Date().toISOString();
      await updateDemanda(targetDemanda.id, { updatedAt: destTime });
      await updateDemanda(destinationDemanda.id, { updatedAt: targetTime });
      addToast("Posição na fila técnica reordenada!", "success");
    }
  };

  const handleMovePersonalTaskDrag = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const userTasks = tarefasPessoais.filter(t => t.idPessoa === activeUser?.id);
    const targetTask = userTasks[fromIndex];
    const destinationTask = userTasks[toIndex];
    if (targetTask && destinationTask) {
      const targetTime = targetTask.createdAt || new Date().toISOString();
      const destTime = destinationTask.createdAt || new Date().toISOString();
      await updateTarefaPessoal(targetTask.id, { createdAt: destTime });
      await updateTarefaPessoal(destinationTask.id, { createdAt: targetTime });
      addToast("Atividade pessoal reordenada!", "success");
    }
  };

  const getDemandTypeDetails = (tipo?: string) => {
    switch (tipo) {
      case "BUG":
        return {
          prefix: "BUG",
          label: "Defeito / BUG",
          borderL: "border-l-rose-650",
          cardAccentBg: "bg-rose-700/10",
          badgeClasses: "bg-rose-650/15 border border-rose-650/30 text-rose-350",
          headerColor: "text-rose-400 font-bold",
          badgeDot: "bg-rose-600"
        };
      case "Incidente":
        return {
          prefix: "INC",
          label: "Incidente",
          borderL: "border-l-rose-500",
          cardAccentBg: "bg-rose-500/10",
          badgeClasses: "bg-rose-500/15 border border-rose-500/30 text-rose-400",
          headerColor: "text-rose-450 font-bold",
          badgeDot: "bg-rose-500"
        };
      case "Change":
        return {
          prefix: "MUD",
          label: "Change (Mudança)",
          borderL: "border-l-purple-500",
          cardAccentBg: "bg-purple-500/10",
          badgeClasses: "bg-purple-500/15 border border-purple-500/30 text-purple-400",
          headerColor: "text-purple-400 font-bold",
          badgeDot: "bg-purple-500"
        };
      case "Outros":
        return {
          prefix: "OUT",
          label: "Outros",
          borderL: "border-l-zinc-500",
          cardAccentBg: "bg-zinc-500/10",
          badgeClasses: "bg-zinc-500/15 border border-zinc-500/30 text-zinc-400",
          headerColor: "text-zinc-400 font-bold",
          badgeDot: "bg-zinc-400"
        };
      case "Melhoria":
      default:
        return {
          prefix: "MEL",
          label: "Melhoria",
          borderL: "border-l-emerald-500",
          cardAccentBg: "bg-emerald-500/10",
          badgeClasses: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
          headerColor: "text-emerald-400 font-bold",
          badgeDot: "bg-emerald-500"
        };
    }
  };

  const getCriticalityColorClasses = (crit?: string) => {
    switch (crit) {
      case "ALTA":
        return "bg-rose-500/15 border border-rose-500/30 text-rose-400";
      case "MÉDIA":
        return "bg-amber-500/15 border border-amber-500/30 text-amber-500";
      case "BAIXA":
      default:
        return "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400";
    }
  };

  const handleVisualizarCard = (dem: Demanda) => {
    if (setCurrentModule) {
      const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?demanda=${dem.id}`;
      window.history.pushState({ path: newurl }, "", newurl);
      setCurrentModule("demandas");
    } else {
      setSelectedDemanda(dem);
      setModalTab("resumo");
    }
  };

  // Handle reordering positions
  const handleMovePriority = async (index: number, direction: "up" | "down") => {
    const targetDemanda = sortedPrioritizedDemands[index];
    const swapDemanda = direction === "up" ? sortedPrioritizedDemands[index - 1] : sortedPrioritizedDemands[index + 1];

    if (!targetDemanda || !swapDemanda) return;

    const targetTime = targetDemanda.updatedAt || new Date().toISOString();
    const swapTime = swapDemanda.updatedAt || new Date().toISOString();

    await updateDemanda(targetDemanda.id, { updatedAt: swapTime });
    await updateDemanda(swapDemanda.id, { updatedAt: targetTime });

    addToast("Ordem de prioridade técnica atualizada com sucesso!", "success");
  };

  const handleRemoveFromQueue = async (demandaId: string) => {
    await updateDemanda(demandaId, { priorizadoFila: false });
    addToast("Demanda removida de sua lista de prioridades.", "info");
  };

  const handleToggleFilaConcluida = async (demandaId: string, currentVal: boolean) => {
    const dem = demandas.find(d => d.id === demandaId);
    const isTask = dem?.tipo === "Task";
    await updateDemanda(demandaId, { 
      filaConcluida: !currentVal,
      filaConcluidaAt: !currentVal ? new Date().toISOString() : null,
      ...(isTask && !currentVal ? { coluna: "Validação QA" } : {})
    });
    addToast(!currentVal ? "Fila técnica marcada como concluída de enviada para QA!" : "Demanda reaberta na fila.", "success");
  };

  // Helper initiates execution directly
  const handleStartExecution = async (dem: Demanda) => {
    // moveDemanda has estimate check protected inside dbState, so calling it handles errors natively!
    await moveDemanda(dem.id, "Desenvolvimento");
  };

  // Task MODAL triggers
  const openCreateTaskModal = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDataInicio(new Date().toISOString().split("T")[0]);
    setTaskDataFim(new Date().toISOString().split("T")[0]);
    setTaskStatus("Pendente");
    setTaskAddToAgenda(false);
    setShowTaskModal(true);
  };

  const openEditTaskModal = (t: TarefaPessoal) => {
    setEditingTask(t);
    setTaskTitle(t.titulo);
    setTaskDesc(t.descricao);
    setTaskDataInicio(t.dataInicio);
    setTaskDataFim(t.dataFim);
    setTaskStatus(t.status);
    setTaskAddToAgenda(t.adicionarAgenda);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      addToast("O título da tarefa pessoal é obrigatório.", "error");
      return;
    }

    if (editingTask) {
      await updateTarefaPessoal(editingTask.id, {
        titulo: taskTitle.trim(),
        descricao: taskDesc.trim(),
        dataInicio: taskDataInicio,
        dataFim: taskDataFim,
        status: taskStatus,
        adicionarAgenda: taskAddToAgenda
      });
    } else {
      if (!activeUser) return;
      await addTarefaPessoal({
        idPessoa: activeUser.id,
        titulo: taskTitle.trim(),
        descricao: taskDesc.trim(),
        dataInicio: taskDataInicio,
        dataFim: taskDataFim,
        status: taskStatus,
        adicionarAgenda: taskAddToAgenda
      });
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("Deseja realmente excluir esta atividade pessoal?")) {
      await deleteTarefaPessoal(id);
    }
  };

  // Filter personal tasks
  const filteredPersonalTasks = tarefasPessoais.filter(t => {
    const isMine = t.idPessoa === activeUser?.id;
    const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    return isMine && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left" id="fila-prioridades-view">
      
      {/* Title section */}
      <div className="p-6 bg-neutral-900/40 border border-neutral-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1.5">
            <Zap size={10} className="fill-amber-500 animate-pulse" /> {isWorkspaceManager ? "Área Gerencial - Fila de Prioridades" : "Minha Jornada - Trabalho"}
          </span>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-1">
            {isWorkspaceManager ? "Agenda & Prioridades Corporativas" : "Fila de Prioridades & Tarefas"}
          </h2>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed mt-1">
            {isWorkspaceManager 
              ? "Painel executivo para controle linear de prioridades, análise de ociosidade, acompanhamento de estimativas versus execução real e auditorias de BUGs."
              : "Gerencie suas demandas priorizadas pelo gestor, intercale com suas listas de afazeres pessoais e mantenha seu calendário autônomo atualizado."}
          </p>
        </div>

        {/* Manager criteria select */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <span className="text-xs text-neutral-400 font-semibold self-center">
            {isWorkspaceManager ? "Ver Fila do Técnico:" : "Técnico Selecionado:"}
          </span>
          <select
            value={selectedPessoaId}
            onChange={(e) => setSelectedPessoaId(e.target.value)}
            disabled={!isWorkspaceManager}
            className={`bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl px-4 py-2 cursor-pointer focus:border-amber-500/50 outline-hidden transition ${
              !isWorkspaceManager ? "opacity-65 cursor-not-allowed bg-neutral-900 border-neutral-850" : ""
            }`}
          >
            {pessoas.filter(p => p.tipo === "GMZ" || p.perfil === "QA" || p.id === selectedPessoaId || demandas.some(d => d.priorizadoFila && d.idQAManager === p.id)).map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.perfil || p.tipo || "Técnico"})
              </option>
            ))}
          </select>

          {isWorkspaceManager && (
            <button
              onClick={() => {
                setSearchAddTerm("");
                setFilterAddTipo("");
                setFilterAddProjeto("");
                setShowAddManualModal(true);
              }}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus size={14} /> Adicionar Demanda
            </button>
          )}
        </div>
      </div>

      {/* 2. SUB-TABS ON TECHNICAL MODE */}
      {!isWorkspaceManager && (
        <div className="flex border-b border-neutral-800 gap-1 shrink-0">
          <button
            onClick={() => { setActiveSubTab("fila"); setSearchTerm(""); }}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition duration-150 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "fila" 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Zap size={14} /> Fila de Prioridades
          </button>
          
          <button
            onClick={() => { setActiveSubTab("tarefas"); setSearchTerm(""); }}
            className={`px-5 py-3 text-xs font-semibold border-b-2 transition duration-150 flex items-center gap-2 cursor-pointer ${
              activeSubTab === "tarefas" 
                ? "border-amber-500 text-amber-500" 
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <CheckSquare size={14} /> Minhas Tarefas Pessoais
          </button>
        </div>
      )}

      {/* Idle technicians warning alert block (For Managers) */}
      {isWorkspaceManager && idleTechs.length > 0 && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={17} />
          <div>
            <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wide">Técnicos Sem Tarefas em Andamento</h5>
            <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
              Os colaboradores a seguir estão sem demandas em "Desenvolvimento" ou "QA" no momento:{" "}
              {idleTechs.map((t, idx) => (
                <strong key={t.id} className="text-neutral-100 font-extrabold pr-1">
                  {t.nome}{idx < idleTechs.length - 1 ? "," : ""}
                </strong>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* 3. MANAGER dashboard indicators */}
      {isWorkspaceManager && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Tally indicators */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">Totais de Priorização</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-neutral-950/40 p-2 rounded-xl text-center border border-neutral-850">
                <span className="text-[9px] text-neutral-500 block uppercase font-mono">Fila</span>
                <span className="text-lg font-bold text-amber-500 font-mono block">{totalPriorizadas}</span>
              </div>
              <div className="bg-neutral-950/40 p-2 rounded-xl text-center border border-neutral-850">
                <span className="text-[9px] text-neutral-500 block uppercase font-mono">Ativas</span>
                <span className="text-lg font-bold text-indigo-400 font-mono block">{totalEmAndamento}</span>
              </div>
              <div className="bg-neutral-950/40 p-2 rounded-xl text-center border border-neutral-850">
                <span className="text-[9px] text-neutral-500 block uppercase font-mono">Pausadas</span>
                <span className="text-lg font-bold text-rose-500 font-mono block">{totalPausadas}</span>
              </div>
            </div>
          </div>

          {/* Period of completion filter indicator */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 space-y-2 text-left">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">Período de Conclusão da Fila</span>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div>
                <span className="text-[9px] text-neutral-500 block font-sans">Data Início:</span>
                <input 
                  type="date"
                  value={dataInicioConcluido}
                  onChange={(e) => setDataInicioConcluido(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-[11px] text-neutral-200 focus:outline-hidden"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 block font-sans">Data Fim:</span>
                <input 
                  type="date"
                  value={dataFimConcluido}
                  onChange={(e) => setDataFimConcluido(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-[11px] text-neutral-200 focus:outline-hidden"
                />
              </div>
            </div>
            {(dataInicioConcluido || dataFimConcluido) && (
              <button 
                onClick={() => { setDataInicioConcluido(""); setDataFimConcluido(""); }}
                className="text-[9px] text-amber-500 hover:underline hover:text-amber-400 font-serif"
              >
                Limpar Período
              </button>
            )}
          </div>

          {/* Bug environmental analytics block */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Relatório de Bugs ({totalBugs})</span>
              <Bug size={13} className="text-rose-500" />
            </div>

            {/* Environment Filters */}
            <div className="space-y-1">
              <span className="text-[9px] text-neutral-500 block uppercase font-mono">Ambiente:</span>
              <div className="flex flex-wrap gap-1">
                {(["TODOS", "DEV", "HOMOLOGAÇÃO", "PRODUÇÃO"] as const).map((env) => (
                  <button
                    key={env}
                    onClick={() => setBugEnvFilter(env)}
                    className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition cursor-pointer ${
                      bugEnvFilter === env
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {env === "TODOS" ? "Todos" : env}
                  </button>
                ))}
              </div>
            </div>

            {/* Component type Filters */}
            <div className="space-y-1">
              <span className="text-[9px] text-neutral-500 block uppercase font-mono">Componente:</span>
              <div className="flex flex-wrap gap-1">
                {(["TODOS", "Front", "Back", "Banco"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBugTagFilter(type)}
                    className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition cursor-pointer ${
                      bugTagFilter === type
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                        : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {type === "TODOS" ? "Todos" : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seeding diagnostic and metadata button tool */}
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Suporte Técnico</span>
              <p className="text-[10px] text-neutral-500 mt-1">Auxiliares para testes e validações de cargas completadas.</p>
            </div>
            {dbConnected ? (
              <span className="text-[9px] text-emerald-500 font-mono">Conectado ao Firestore</span>
            ) : (
              <span className="text-[9px] text-amber-500 font-mono">Rodando local offline</span>
            )}
          </div>

        </div>
      )}

      {/* MAIN CONTAINER */}
      {(activeSubTab === "fila" || isWorkspaceManager) ? (
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* List panel details on sidebar filter */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-neutral-900/20 border border-neutral-800 rounded-2xl p-5 space-y-4 text-left">
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">Informações Básicas</h3>
              
              <div className="p-3 bg-neutral-950/50 rounded-xl border border-neutral-850">
                <span className="text-[10px] text-neutral-500 block uppercase font-mono tracking-wider">Atarefado</span>
                <span className="text-xl font-bold text-amber-500 tracking-tight font-mono">{prioritizedDemands.length}</span>
              </div>

              <div className="space-y-2 text-xs text-neutral-400 leading-relaxed">
                <p className="font-semibold text-neutral-300">Entendendo a fila:</p>
                <p className="text-[10px] text-neutral-500">
                  - Cards priorizados pelos gestores aparecem listados de acordo com sua ordem operacional.
                </p>
                <p className="text-[10px] text-neutral-500">
                  - <strong className="text-rose-400">Restrição:</strong> Demandas de "Melhoria" e "Mudança" exigem uma estimativa de horas antes de progredirem ao andamento ativo.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar por título ou CH..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900/60 border border-neutral-800 rounded-xl py-2 px-3 pl-9 text-xs text-neutral-200 placeholder-neutral-500 outline-hidden focus:border-amber-500/40 transition"
              />
              <Search size={13} className="absolute left-3 top-3.5 text-neutral-500" />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 text-neutral-500 hover:text-white"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Main items listing board */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-neutral-400 font-mono tracking-wide">Cards Prioritários do Técnico</span>
              <span className="text-[10px] bg-neutral-900 border border-neutral-850 text-neutral-300 rounded-full px-2.5 py-0.5">
                Alocado: {pessoas.find(p => p.id === selectedPessoaId)?.nome || "Selecione"}
              </span>
            </div>

            {prioritizedDemands.length === 0 ? (
              <div className="bg-neutral-900/10 border border-dashed border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-neutral-905 border border-neutral-800 rounded-full text-neutral-500">
                  <ListOrdered size={22} />
                </div>
                <h4 className="text-xs font-semibold text-neutral-300">Nenhum card priorizado encontrado!</h4>
                <p className="text-[11px] text-neutral-500 max-w-sm leading-relaxed mx-auto">
                  Por favor, certifique-se de vincular demandas a {pessoas.find(p => p.id === selectedPessoaId)?.nome || "este técnico"} e marcar "Fila de Prioridades" usando o rádio ⚡ disponível no Kanban.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPrioritizedDemands.map((dem, idx) => {
                  const proj = projetos.find(p => p.id === dem.idProjeto);
                  const owner = pessoas.find(p => p.id === dem.idResponsavel);
                  const isCompleted = !!dem.filaConcluida;
                  const deAndamento = dem.coluna === "Desenvolvimento" || dem.coluna === "desenvolvimento" || dem.coluna === "QA";
                  const isPausado = dem.coluna === "Pausado" || dem.coluna === "Impedido" || dem.coluna === "impedido";
                  const isEmAndamento = deAndamento && !isCompleted;

                  const isPendingApproval = dem.filaAprovada === false || dem.coluna === "Aguardando aprovação do Gestor";

                  // Dynamic BG Status Highlight
                  const cardBgBorderClass = isPendingApproval
                    ? "bg-amber-950/10 border-amber-500/20 text-neutral-300"
                    : isCompleted
                      ? "bg-emerald-900/10 border-emerald-500/20 opacity-80"
                      : isEmAndamento
                        ? "bg-rose-900/10 border-rose-500/20"
                        : isPausado
                          ? "bg-amber-900/10 border-amber-500/20"
                          : "bg-neutral-900/30 border-neutral-850 hover:border-neutral-800";

                  // Prefix formatting helper
                  const typeLabel = dem.tipo === "Incidente" || dem.tipo === "INC" ? "INC" : dem.tipo === "Melhoria" || dem.tipo === "MEL" ? "MEL" : dem.tipo === "Mudança" || dem.tipo === "MUD" ? "MUD" : dem.tipo === "BUG" ? "BUG" : dem.tipo === "Task" ? "TSK" : "CARD";
                  const internalNumber = `${typeLabel}-${dem.numeroChamado}`;

                  // Parent task for BUG or Task
                  const parentTask = (dem.tipo === "BUG" || dem.tipo === "Task") && dem.relacoes && dem.relacoes.length > 0
                    ? demandas.find(x => dem.relacoes?.some(r => r.idDemanda === x.id && r.tipo === "pai"))
                    : (dem.tipo === "BUG" && dem.tarefasAssociadasIds && dem.tarefasAssociadasIds.length > 0
                      ? demandas.find(x => dem.tarefasAssociadasIds?.includes(x.id))
                      : null);

                  // Execution metric calculation: Sum of pointing times logged
                  const totalHorasExecutadas = apontamentos
                    .filter(a => a.idDemanda === dem.id)
                    .reduce((sum, current) => sum + (current.horas || 0), 0);

                  const meuTotalHoras = apontamentos
                    .filter(a => a.idDemanda === dem.id && a.idPessoa === (activeUser?.id || ""))
                    .reduce((sum, current) => sum + (current.horas || 0), 0);

                  // Drag-and-drop dynamic visual feedback calculation
                  const isDraggingSelf = draggingIndex === idx;
                  const isDragOverSelf = dragOverIndex === idx;
                  const isAffected = draggingIndex !== null && dragOverIndex !== null && 
                    idx >= Math.min(draggingIndex, dragOverIndex) && 
                    idx <= Math.max(draggingIndex, dragOverIndex);

                  let dragStyleClass = "";
                  if (isDraggingSelf) {
                    dragStyleClass = "border-2 border-dashed border-indigo-500 bg-indigo-950/20 text-indigo-300 scale-[0.98] opacity-70 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
                  } else if (isAffected) {
                    if (isDragOverSelf) {
                      dragStyleClass = "border-2 border-dashed border-amber-500 bg-amber-950/15 text-neutral-200 scale-[1.01] shadow-[0_0_15px_rgba(245,158,11,0.25)]";
                    } else {
                      dragStyleClass = "border-2 border-dotted border-indigo-400/60 bg-indigo-950/5 text-neutral-300";
                    }
                  }

                  const finalClass = dragStyleClass ? dragStyleClass : `border ${cardBgBorderClass}`;

                  return (
                    <div 
                      key={dem.id}
                      draggable={isWorkspaceManager}
                      onDragStart={(e) => { 
                        e.dataTransfer.setData("text/plain", idx.toString()); 
                        setDraggingIndex(idx);
                      }}
                      onDragOver={(e) => { 
                        e.preventDefault(); 
                        if (dragOverIndex !== idx) setDragOverIndex(idx);
                      }}
                      onDragEnd={() => {
                        setDraggingIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                        handleMoveDrag(fromIndex, idx);
                        setDraggingIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`group rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-200 cursor-grab active:cursor-grabbing ${finalClass}`}
                    >
                      {/* Left: Position and Meta label details */}
                      <div className="flex items-start gap-3.5 text-left flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          isPendingApproval
                            ? "bg-neutral-850/50 border border-neutral-700/30 text-neutral-500"
                            : isCompleted
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : isEmAndamento
                                ? "bg-rose-500/10 border border-rose-500/20 text-rose-455"
                                : isPausado
                                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-455"
                                  : "bg-neutral-950 border border-neutral-850 text-neutral-450"
                        }`}>
                          #{idx + 1}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-indigo-455 uppercase">{internalNumber}</span>
                            {dem.numeroCliente && (
                              <span className="text-[9px] bg-neutral-950 text-amber-500 border border-amber-900/30 px-1.5 py-0.5 rounded font-mono">
                                CLIENTE: {dem.numeroCliente}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              dem.criticidade === "Alta" || dem.criticidade === "Urgente" || dem.criticidade === "Alto"
                                ? "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                                : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                            }`}>
                              {dem.criticidade}
                            </span>
                            <span className="text-[9px] bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                              {proj?.nome || "Projeto Geral"}
                            </span>
                            {(() => {
                              const getDesejadoStatus = () => {
                                if (isPendingApproval) return { label: "Aguardando Aprovação", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
                                if (isCompleted) return { label: "Concluída", color: "bg-emerald-500/10 text-emerald-455 border border-emerald-500/20" };
                                if (isEmAndamento) return { label: "Em Andamento", color: "bg-rose-500/10 text-rose-455 border border-rose-500/20" };
                                if (isPausado) return { label: "Pausado", color: "bg-amber-500/10 text-amber-500 border border-amber-500/20" };
                                return { label: "Na fila", color: "bg-neutral-800 text-neutral-300 border border-neutral-700" };
                              };
                              const curFilaStatus = getDesejadoStatus();
                              return (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${curFilaStatus.color}`}>
                                  {curFilaStatus.label}
                                </span>
                              );
                            })()}

                            {/* Feedbacks temporários de aprovação ou QA */}
                            {(dem.comentarioAprovacaoGestor || dem.comentarioEnvioQA) && (
                              <div className="relative group/tooltip flex items-center gap-1 bg-indigo-950/50 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 animate-pulse cursor-help">
                                <MessageSquare size={10} className="shrink-0" />
                                <span className="text-[9px] font-bold uppercase font-mono">Feedback</span>
                                {/* Tooltip contendo o feedback do gestor/técnico */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-950 border border-indigo-500/30 text-neutral-200 text-[11px] rounded-xl shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-250 pointer-events-none z-50 text-center font-sans tracking-normal font-normal">
                                  <div className="text-left space-y-1.5 leading-relaxed">
                                    {dem.comentarioAprovacaoGestor && (
                                      <div>
                                        <p className="text-[10px] font-bold text-amber-500 font-mono uppercase">📢 COMENTÁRIO DO GESTOR:</p>
                                        <p className="text-neutral-300 italic">"{dem.comentarioAprovacaoGestor}"</p>
                                      </div>
                                    )}
                                    {dem.comentarioEnvioQA && (
                                      <div>
                                        <p className="text-[10px] font-bold text-indigo-400 font-mono uppercase">🧪 COMENTÁRIO DO TÉCNICO (QA):</p>
                                        <p className="text-neutral-300 italic">"{dem.comentarioEnvioQA}"</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-950"></div>
                                </div>
                              </div>
                            )}
                          </div>

                          <h4 className={`text-xs font-bold uppercase tracking-wide transition break-words ${
                            isCompleted
                              ? "text-neutral-500 line-through"
                              : "text-neutral-200 group-hover:text-amber-400"
                          }`}>
                            {dem.titulo}
                          </h4>

                          {/* List tag chips */}
                          {dem.tags && dem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 py-1">
                              {dem.tags.map(t => (
                                <span key={t} className="text-[8px] bg-neutral-950 border border-neutral-850 text-neutral-400 px-1.5 py-0.5 rounded-md font-mono">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Link parent task for BUG */}
                          {parentTask && (
                            <div className="text-[9px] text-neutral-400 font-mono bg-neutral-950/50 px-2 py-1.5 rounded-lg border border-neutral-850/60 flex items-center gap-1.5 mt-1.5">
                              <span className="text-amber-500 font-bold uppercase shrink-0">🔗 Tarefa Pai Associada:</span>
                              <span className="truncate">{parentTask.tipo.substring(0,3).toUpperCase()}-${parentTask.numeroChamado} ({parentTask.titulo})</span>
                            </div>
                          )}

                          {/* Data final/inicial for Change/Mudança */}
                          {(dem.tipo === "Mudança" || dem.tipo === "MUD") && (
                            <div className="text-[9px] text-neutral-400 font-mono bg-neutral-950/50 px-2 py-1.5 rounded-lg border border-neutral-850/60 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                              <span className="text-purple-400 font-bold uppercase">📅 Período de Mudança:</span>
                              <span>Início: {dem.inicioGeral ? new Date(dem.inicioGeral).toLocaleString("pt-BR") : "N/D"}</span>
                              <span className="text-neutral-700">|</span>
                              <span>Fim: {dem.fimGeral ? new Date(dem.fimGeral).toLocaleString("pt-BR") : "N/D"}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400 font-mono">
                            <span className="flex items-center gap-1 font-bold text-indigo-400 bg-indigo-950/10 px-1 rounded">
                              Fase atual: {dem.coluna}
                            </span>
                            
                            {/* EXIBIÇÃO ESTIMATIVAS & TOTAL DE HORAS EXECUTADAS */}
                            <span className="flex items-center gap-1 text-emerald-400 font-bold bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850" title="Total executado por todos os técnicos nesta demanda">
                              Executado: {totalHorasExecutadas}h
                            </span>
                            {meuTotalHoras > 0 && (
                              <span className="flex items-center gap-1 text-amber-400 font-bold bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850" title="Total de horas que eu registrei nesta demanda">
                                Meu total: {Math.round(meuTotalHoras * 10) / 10}h
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-neutral-450 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-850">
                              Estimado: {dem.estimativaHoras || 0}h
                            </span>

                            {owner && (
                              <span className="flex items-center gap-1">
                                <User size={10} className="text-indigo-400" /> Resp: {owner.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Reordering, viewing and action flow controllers */}
                      <div className="flex items-center justify-end gap-1.5 shrink-0 select-none md:border-l md:border-neutral-900 md:pl-3">
                        
                        {/* Start/Change execution buttons */}
                        {isPendingApproval ? (
                          <button
                            onClick={() => handleAprovarFila(dem.id)}
                            className="p-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase cursor-pointer transition-all active:scale-95 duration-200"
                            title="Aprovar para entrar na fila do técnico"
                          >
                            Aprovar para Fila
                          </button>
                        ) : (
                          <>
                            {!isCompleted && (
                              <div className="flex items-center gap-1.5 bg-neutral-950/40 border border-neutral-800 px-2 py-0.5 rounded-full">
                                {/* Mark Em Andamento (Play button) */}
                                {!isEmAndamento ? (
                                  <button
                                    onClick={() => handleMarkStatus(dem, "Em Andamento")}
                                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-full transition cursor-pointer"
                                    title="Iniciar/Retomar Execução (Play)"
                                  >
                                    <Play size={13} className="fill-rose-500/10" />
                                  </button>
                                ) : (
                                  <span className="p-1 text-rose-400 animate-pulse" title="Em Andamento">
                                    <Play size={13} className="fill-rose-550" />
                                  </span>
                                )}

                                {/* Mark Pausada (Pause button) */}
                                {!isPausado ? (
                                  <button
                                    onClick={() => handleMarkStatus(dem, "Pausada")}
                                    className="p-1 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition cursor-pointer"
                                    title="Pausar execução de card (Pause)"
                                  >
                                    <Pause size={13} className="fill-amber-500/10" />
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="p-1 text-amber-500" title="Pausado">
                                      <Pause size={13} className="fill-amber-550" />
                                    </span>
                                    <button
                                      onClick={() => handleVoltarParaFila(dem.id)}
                                      className="p-1 text-indigo-450 hover:text-indigo-350 hover:bg-indigo-500/15 rounded-full transition cursor-pointer flex items-center justify-center"
                                      title="Voltar para Fila / Despausar"
                                    >
                                      <RotateCcw size={12} className="text-indigo-400 hover:rotate-[-45deg] transition-all" />
                                    </button>
                                  </div>
                                )}

                                {/* Mark Concluída (Check circle button) */}
                                <button
                                  onClick={() => handleMarkStatus(dem, "Concluída")}
                                  className="p-1 text-emerald-450 hover:text-emerald-350 hover:bg-emerald-500/10 rounded-full transition cursor-pointer"
                                  title="Marcar como Concluído (Concluir)"
                                >
                                  <CheckCircle2 size={13} className="fill-emerald-500/10" />
                                </button>
                              </div>
                            )}

                            {isCompleted && (
                              <span className="text-[9px] text-emerald-450 font-bold uppercase tracking-wider font-mono">Card Finalizado</span>
                            )}
                          </>
                        )}

                        {/* Reordering indicators */}
                        {isWorkspaceManager && (
                          <div className="flex items-center gap-1 border-r border-neutral-800 pr-1.5">
                            <button
                              onClick={() => handleMovePriority(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-850 hover:text-white text-neutral-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-neutral-900"
                              title="Subir Prioridade"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              onClick={() => handleMovePriority(idx, "down")}
                              disabled={idx === sortedPrioritizedDemands.length - 1}
                              className="p-1 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-850 hover:text-white text-neutral-450 disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-neutral-900"
                              title="Descer Prioridade"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        )}

                        {/* Visualizar card deep linking button */}
                        <button
                          onClick={() => handleVisualizarCard(dem)}
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded-lg text-[10px] cursor-pointer border border-neutral-850 flex items-center gap-1"
                          title="Visualizar Detalhes iguais ao Kanban"
                        >
                          <Eye size={11} />
                        </button>

                        {isWorkspaceManager && (
                          <button
                            onClick={() => handleRemoveFromQueue(dem.id)}
                            className="p-1.5 bg-rose-950/10 hover:bg-rose-950/20 text-rose-450 rounded-lg text-[10px] border border-rose-900/20 cursor-pointer"
                            title="Remover Fila"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      ) : (

        // 4. PERSONAL TASKS DASHBOARD (TÉCNICO VIEW)
        <div className="space-y-4">
          
          {/* Quick controls bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/40 p-4 border border-neutral-800 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Pesquisar tarefas pessoais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-1.5 px-3 pl-9 text-xs text-neutral-200 placeholder-neutral-500 outline-hidden"
              />
              <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" />
            </div>

            <button
              onClick={openCreateTaskModal}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Registrar Nova Tarefa Pessoal
            </button>
          </div>

          {/* Drag and Drop list layout like priority queue */}
          {filteredPersonalTasks.length === 0 ? (
            <div className="bg-neutral-900/10 border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
              <ClipboardList className="mx-auto text-neutral-600 mb-2" size={24} />
              <h4 className="text-xs font-semibold text-neutral-300">Nenhuma tarefa pessoal encontrada</h4>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed mt-1">
                Você ainda não registrou nenhuma atividade operacional específica nesta aba. Use o botão acima para organizar suas tarefas pessoais, agendar datas e vincular à sua agenda!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPersonalTasks.map((task, idx) => {
                const isCompleted = task.status === "Concluída";
                const isEmAndamento = task.status === "Em Andamento";
                const isPausado = task.status === "Pausada";

                const cardBgBorderClass = isCompleted 
                  ? "bg-emerald-950/10 border-emerald-550/20 text-neutral-300 opacity-60 hover:opacity-100" 
                  : isEmAndamento 
                    ? "bg-rose-950/15 border-rose-500/25" 
                    : isPausado 
                      ? "bg-amber-950/15 border-amber-500/25" 
                      : "bg-neutral-900/40 border-neutral-850 hover:border-neutral-800";
                
                const isDraggingSelf = draggingTaskIndex === idx;
                const isDragOverSelf = dragOverTaskIndex === idx;
                const isAffected = draggingTaskIndex !== null && dragOverTaskIndex !== null && 
                  idx >= Math.min(draggingTaskIndex, dragOverTaskIndex) && 
                  idx <= Math.max(draggingTaskIndex, dragOverTaskIndex);

                let dragStyleClass = "";
                if (isDraggingSelf) {
                  dragStyleClass = "border-2 border-dashed border-indigo-500 bg-indigo-950/20 text-indigo-300 scale-[0.98] opacity-70 shadow-[0_0_15px_rgba(99,102,241,0.15)]";
                } else if (isAffected) {
                  if (isDragOverSelf) {
                    dragStyleClass = "border-2 border-dashed border-amber-500 bg-amber-950/15 text-neutral-200 scale-[1.01] shadow-[0_0_15px_rgba(245,158,11,0.25)]";
                  } else {
                    dragStyleClass = "border-2 border-dotted border-indigo-400/60 bg-indigo-950/5 text-neutral-300";
                  }
                }
                    
                const finalClass = dragStyleClass ? dragStyleClass : `border ${cardBgBorderClass}`;

                return (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => { 
                      e.dataTransfer.setData("text/plain", idx.toString()); 
                      setDraggingTaskIndex(idx);
                    }}
                    onDragOver={(e) => { 
                      e.preventDefault(); 
                      if (dragOverTaskIndex !== idx) setDragOverTaskIndex(idx);
                    }}
                    onDragEnd={() => {
                      setDraggingTaskIndex(null);
                      setDragOverTaskIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      handleMovePersonalTaskDrag(fromIndex, idx);
                      setDraggingTaskIndex(null);
                      setDragOverTaskIndex(null);
                    }}
                    className={`group rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-200 cursor-grab active:cursor-grabbing ${finalClass}`}
                  >
                    {/* Left: Position and Meta details */}
                    <div className="flex items-start gap-4 text-left flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                        task.status === "Concluída"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : task.status === "Em Andamento"
                            ? "bg-rose-500/10 border border-rose-500/20 text-rose-455"
                            : task.status === "Pausada"
                              ? "bg-amber-500/10 border border-amber-500/20 text-amber-550"
                              : "bg-neutral-950 border border-neutral-850 text-neutral-450"
                      }`}>
                        #{idx + 1}
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">Atividade Pessoal</span>
                          {(() => {
                            const getDesejadoStatus = () => {
                              if (task.status === "Concluída") return { label: "Concluída", color: "bg-emerald-500/10 text-emerald-455 border border-emerald-500/20" };
                              if (task.status === "Em Andamento") return { label: "Em Andamento", color: "bg-rose-500/10 text-rose-455 border border-rose-500/20" };
                              if (task.status === "Pausada") return { label: "Pausada", color: "bg-amber-500/10 text-amber-500 border border-amber-500/20" };
                              return { label: "Pendente", color: "bg-neutral-800 text-neutral-300 border border-neutral-700" };
                            };
                            const curStatus = getDesejadoStatus();
                            return (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${curStatus.color}`}>
                                {curStatus.label}
                              </span>
                            );
                          })()}
                          {task.adicionarAgenda && (
                            <span className="text-[9px] text-rose-400 font-sans font-bold flex items-center gap-1 bg-rose-955/20 border border-rose-900/30 px-1.5 py-0.5 rounded">
                              <Calendar size={9} className="fill-rose-400/10 text-rose-400" /> Na Agenda
                            </span>
                          )}
                        </div>

                        <h4 className={`text-xs font-bold uppercase tracking-wide transition break-words ${
                          task.status === "Concluída"
                            ? "text-neutral-500 line-through"
                            : "text-neutral-200 group-hover:text-amber-400"
                        }`}>
                          {task.titulo}
                        </h4>

                        <p className="text-[11px] text-neutral-400 leading-relaxed overflow-y-auto max-h-16 pr-1 select-text whitespace-pre-wrap">
                          {task.descricao || <span className="italic text-neutral-600 font-sans">Sem descrição detalhada.</span>}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> Início: {task.dataInicio}
                          </span>
                          <span className="text-neutral-800">|</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> Fim: {task.dataFim}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Player control panel & administrative edits */}
                    <div className="flex items-center justify-end gap-2.5 shrink-0 select-none md:border-l md:border-neutral-900 md:pl-3">
                      
                      {/* Player status switches */}
                      {task.status !== "Concluída" ? (
                        <div className="flex items-center gap-1.5 bg-neutral-950/40 border border-neutral-800 px-2 py-0.5 rounded-full">
                          
                          {/* Play button */}
                          {task.status !== "Em Andamento" ? (
                            <button
                              onClick={() => updateTarefaPessoal(task.id, { status: "Em Andamento" })}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-full transition cursor-pointer"
                              title="Iniciar Atividade (Play)"
                            >
                              <Play size={13} className="fill-rose-500/10" />
                            </button>
                          ) : (
                            <span className="p-1 text-rose-400 animate-pulse animate-duration-1000" title="Em Andamento">
                              <Play size={13} className="fill-rose-550" />
                            </span>
                          )}

                          {/* Pause button */}
                          {task.status !== "Pausada" ? (
                            <button
                              onClick={() => updateTarefaPessoal(task.id, { status: "Pausada" })}
                              className="p-1 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition cursor-pointer"
                              title="Pausar Atividade (Pause)"
                            >
                              <Pause size={13} className="fill-amber-500/10" />
                            </button>
                          ) : (
                            <span className="p-1 text-amber-500" title="Pausada">
                              <Pause size={13} className="fill-amber-505" />
                            </span>
                          )}

                          {/* Concluir check button */}
                          <button
                            onClick={() => updateTarefaPessoal(task.id, { status: "Concluída" })}
                            className="p-1 text-emerald-450 hover:text-emerald-350 hover:bg-emerald-500/10 rounded-full transition cursor-pointer"
                            title="Despachar / Concluir"
                          >
                            <CheckCircle2 size={13} className="fill-emerald-500/10" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Concluída</span>
                          <button
                            onClick={() => updateTarefaPessoal(task.id, { status: "Pendente" })}
                            className="p-0.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-full transition cursor-pointer"
                            title="Reabrir / Voltar para Pendente"
                          >
                            <RotateCcw size={11} />
                          </button>
                        </div>
                      )}

                      {/* Small action panel */}
                      <div className="flex items-center gap-1 shrink-0 bg-neutral-950/20 border border-neutral-850 px-1 py-0.5 rounded-lg">
                        <button
                          onClick={() => openEditTaskModal(task)}
                          className="p-1 hover:bg-neutral-800 hover:text-white text-neutral-400 rounded-md transition shrink-0 cursor-pointer"
                          title="Editar Tarefa"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 hover:bg-rose-950/30 hover:text-rose-450 text-neutral-400 rounded-md transition shrink-0 cursor-pointer"
                          title="Excluir Tarefa"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

       {/* 5. INDIVIDUAL EMBEDDED MODAL DETAILS */}
      {selectedDemanda && (() => {
        const activeProj = projetos.find(p => p.id === selectedDemanda.idProjeto);
        const typeDetails = getDemandTypeDetails(selectedDemanda.tipo);
        return (
          <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-[96vw] xl:max-w-[94vw] overflow-hidden shadow-2xl scale-in max-h-[90vh] flex flex-col my-8">
              
              {/* Header */}
              <div className="p-6 border-b border-neutral-800 flex items-start justify-between bg-neutral-950/20 shrink-0 select-text">
                <div className="space-y-1.5 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-md text-neutral-200 font-bold uppercase flex items-center gap-2">
                      <span className="text-indigo-400 font-extrabold">{typeDetails.prefix} - {selectedDemanda.numeroChamado}</span>
                      <span className="text-neutral-500 font-light">|</span>
                      <span className="text-neutral-400 font-sans font-medium">{typeDetails.label}</span>
                    </span>
                    {selectedDemanda.tipo !== "Change" && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${getCriticalityColorClasses(selectedDemanda.criticidade)}`}>
                        CRITICIDADE: {selectedDemanda.criticidade || "MÉDIA"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-neutral-100 uppercase tracking-wide">
                    {selectedDemanda.titulo}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Projeto: {activeProj?.nome || "Geral / Integrado"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setSelectedDemanda(null)}
                    className="p-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* TAB SELECTORS */}
              <div className="flex border-b border-neutral-800 bg-neutral-950/20 px-6 overflow-x-auto scroller-none select-none shrink-0">
                {[
                  { id: "resumo", label: "Resumo", icon: <ClipboardList size={14} /> },
                  { id: "detalhes", label: "Descrição & Detalhes", icon: <FileText size={14} /> },
                  ...(selectedDemanda.tipo === "BUG" ? [{ id: "passopasso", label: "Passo a Passo & QA", icon: <Bug size={14} /> }] : []),
                  { id: "tarefas", label: `Tarefas & Relações (${selectedDemanda.tarefasAssociadasIds?.length || 0})`, icon: <Link2 size={14} /> },
                  { id: "anexos", label: `Anexos (${selectedDemanda.anexos?.length || 0})`, icon: <Paperclip size={14} /> },
                  { id: "comentarios", label: `Discussões (${comentarios.filter(c => c.idDemanda === selectedDemanda.id).length})`, icon: <MessageSquare size={14} /> },
                  { id: "apontamentos", label: `Apontamento (${apontamentos.filter(a => a.idDemanda === selectedDemanda.id).length})`, icon: <Clock size={14} /> }
                ].map((tab) => {
                  const active = modalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setModalTab(tab.id)}
                      className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                        active 
                          ? "border-indigo-500 text-indigo-400 bg-neutral-900/40" 
                          : "border-transparent text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-6 font-sans scrollbar-thin">

                {/* TAB 1: RESUMO */}
                {modalTab === "resumo" && (
                  <div className="space-y-6 animate-fade-in text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl space-y-1">
                        <span className="text-[9px] text-neutral-500 uppercase font-mono font-bold">Dono Responsável</span>
                        <p className="text-neutral-200 font-semibold text-xs">
                          {pessoas.find(p => p.id === selectedDemanda.idResponsavel)?.nome || "Geral / Não atribuída"}
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl space-y-1">
                        <span className="text-[9px] text-neutral-500 uppercase font-mono font-bold">Coluna / Fase de Fluxo</span>
                        <p className="text-indigo-400 font-mono font-bold text-xs uppercase">
                          {selectedDemanda.coluna}
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl space-y-1">
                        <span className="text-[9px] text-neutral-500 uppercase font-mono font-bold">Criticidade</span>
                        <p className="text-neutral-200 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCriticalityColorClasses(selectedDemanda.criticidade)}`}>
                            {selectedDemanda.criticidade || "MÉDIA"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-neutral-300 block uppercase tracking-wider font-mono">Descrição Breve</span>
                        <div 
                          className="text-xs text-neutral-300 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin select-text line-clamp-4"
                          dangerouslySetInnerHTML={{ __html: selectedDemanda.descricao || "<p class='text-neutral-500 italic'>Sem descrição cadastrada.</p>" }}
                        />
                      </div>

                      <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-neutral-300 block uppercase tracking-wider font-mono">Esforço & Metas</span>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center bg-neutral-900 border border-neutral-850 p-2.5 rounded-xl">
                            <span className="text-neutral-450 font-mono text-[10px]">PREVISTO (Estimado):</span>
                            <span className="text-neutral-200 font-bold font-mono">{selectedDemanda.estimativaHoras || 0} horas</span>
                          </div>
                          <div className="flex justify-between items-center bg-neutral-900 border border-neutral-850 p-2.5 rounded-xl">
                            <span className="text-neutral-450 font-mono text-[10px]">REALIZADO ATÉ O MOMENTO:</span>
                            <span className="text-amber-500 font-extrabold font-mono">
                              {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).reduce((sum, current) => sum + (current.horas || 0), 0)} horas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DETALHES */}
                {modalTab === "detalhes" && (
                  <div className="space-y-6 animate-fade-in text-left">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-neutral-300 block uppercase tracking-wider font-mono">Descrição Integral da Demanda</span>
                      <div 
                        className="bg-neutral-955 border border-neutral-850 p-5 rounded-2xl text-xs text-neutral-300 leading-relaxed max-h-72 overflow-y-auto scrollbar-thin select-text"
                        dangerouslySetInnerHTML={{ __html: selectedDemanda.descricao || "<p class='text-neutral-500 italic'>Nenhum detalhe inserido na descrição da demanda.</p>" }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Análise Operacional */}
                      <div className="bg-neutral-955 p-4 rounded-xl border border-neutral-850 space-y-3 text-xs">
                        <h5 className="font-bold text-neutral-200 uppercase tracking-wider text-[10px] font-mono border-b border-neutral-850 pb-1.5 text-indigo-400">🔍 Análise Operacional</h5>
                        <div className="space-y-2">
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase font-mono">Impacto / Risco:</span>
                            <p className="text-neutral-250 mt-0.5">
                              Impacto: <strong className="text-indigo-400 font-mono">{selectedDemanda.impacto || "BAIXO"}</strong> | 
                              Risco: <strong className="text-rose-400 font-mono">{selectedDemanda.risco || "BAIXO"}</strong>
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[9px] uppercase font-mono font-bold">Justificativa da Demanda:</span>
                            <p className="text-neutral-250 mt-0.5 italic">"{selectedDemanda.justificativa || "Não informada."}"</p>
                          </div>
                        </div>
                      </div>

                      {/* Custom properties specifications */}
                      {(() => {
                        const selectedCustomType = activeProj?.tiposDemandasCustom?.find(ct => ct.nome === selectedDemanda.tipo);
                        if (!selectedCustomType) return (
                          <div className="bg-neutral-955 p-4 rounded-xl border border-neutral-850 flex items-center justify-center text-neutral-500 italic text-xs">
                            Sem especificações customizadas adicionais cadastrados para o tipo {selectedDemanda.tipo}.
                          </div>
                        );

                        return (
                          <div className="bg-neutral-955 p-4 rounded-xl border border-neutral-850 space-y-3">
                            <h5 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest border-b border-neutral-850 pb-1.5">
                              ✨ Especificações Customizadas ({selectedCustomType.nome})
                            </h5>
                            <div className="space-y-2 text-xs">
                              {selectedCustomType.guias?.map((g) => (
                                <div key={g.id} className="space-y-1.5">
                                  {g.campos?.map((f) => {
                                    const val = selectedDemanda.valoresCamposCustom?.[f.id];
                                    let displayVal = val || "";
                                    if (f.tipo === "lista_coisas") {
                                      if (f.subTipoLista === "empresas") {
                                        const emp = empresas.find(e => e.id === val);
                                        displayVal = emp ? `🏢 ${emp.nome}` : val || "Não definida";
                                      } else {
                                        const pers = pessoas.find(p => p.id === val);
                                        displayVal = pers ? `👥 ${pers.nome}` : val || "Não definida";
                                      }
                                    } else if (f.tipo === "data") {
                                      displayVal = val ? new Date(val).toLocaleDateString("pt-BR") : "Não preenchida";
                                    }
                                    return (
                                      <div key={f.id} className="flex justify-between items-center bg-neutral-950/40 p-2 rounded-lg border border-neutral-900">
                                        <span className="text-neutral-450 font-mono text-[9px]">{f.label}:</span>
                                        <span className="text-neutral-200 font-medium">{displayVal || "—"}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* TAB 3: PASSO A PASSO (BUG CASE) */}
                {modalTab === "passopasso" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <h4 className="text-xs font-mono font-bold text-rose-455 uppercase tracking-wider">📋 Passo a Passo de Reprodução (QA)</h4>
                    {selectedDemanda.passoAPasso ? (
                      <div className="p-4 bg-neutral-955 border border-neutral-855 rounded-2xl">
                        <p className="text-xs text-neutral-300 font-mono whitespace-pre-wrap select-text leading-relaxed">
                          {selectedDemanda.passoAPasso}
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 bg-neutral-955 border border-neutral-855 border-dashed rounded-2xl text-center text-xs text-neutral-500 italic animate-pulse">
                        Roteiro de QA não preenchido.
                      </div>
                    )}

                    {selectedDemanda.statusQA && (
                      <div className="p-3 bg-red-950/10 border border-red-900/30 rounded-xl flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-450 uppercase text-[10px]">Fase Homologação QA:</span>
                        <span className="font-bold text-rose-400 capitalize bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/30">
                          {selectedDemanda.statusQA}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: TAREFAS / LINKAGES */}
                {modalTab === "tarefas" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">🔗 Chamados e Relações Relacionadas no Projeto</h4>
                    
                    {selectedDemanda.tarefasAssociadasIds && selectedDemanda.tarefasAssociadasIds.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDemanda.tarefasAssociadasIds.map((tid) => {
                          const relDem = demandas.find(d => d.id === tid);
                          if (!relDem) return null;
                          const pName = projetos.find(p => p.id === relDem.idProjeto)?.nome || "Geral";
                          const typeDet = getDemandTypeDetails(relDem.tipo);

                          return (
                            <div key={tid} className="flex justify-between items-center p-3.5 bg-neutral-955 border border-neutral-850 rounded-2xl hover:border-neutral-800 transition">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${typeDet.badgeClasses}`}>
                                  {typeDet.prefix}
                                </span>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-neutral-250 truncate hover:text-neutral-100 transition-all select-all">
                                    #{relDem.numeroChamado} - {relDem.titulo}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    Projeto: {pName} • Status: {relDem.coluna}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDemanda(relDem);
                                  setModalTab("resumo");
                                }}
                                className="p-1 px-3 bg-neutral-950 hover:bg-neutral-855 hover:text-neutral-200 border border-neutral-800 text-neutral-450 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 shrink-0"
                              >
                                <Eye size={12} />
                                <span className="text-[9px] font-mono">Abrir</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 bg-neutral-955 border border-neutral-855 border-dashed rounded-3xl text-center text-xs text-neutral-500 italic">
                        Nenhuma demanda correlacionada de forma bidirecional.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: ANEXOS */}
                {modalTab === "anexos" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                      <h5 className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                        <Paperclip size={13} className="text-indigo-400" />
                        Anexos Vinculados à Demanda ({selectedDemanda.anexos?.length || 0})
                      </h5>

                      {/* Attach manual trigger button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById("priority-demand-attach-direct") as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-[10px] uppercase font-mono rounded-xl flex items-center gap-1.5 cursor-pointer border border-indigo-900/40 transition-all shadow-md"
                        >
                          <span>+ Adicionar Arquivo</span>
                        </button>
                        <input
                          id="priority-demand-attach-direct"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;

                            addToast("Fazendo upload e processando anexo...", "info");
                            const currentAnexos = selectedDemanda.anexos || [];
                            
                            const filePromises = Array.from(files).map((f: any) => {
                              return new Promise<AnexoDemanda>((resolve) => {
                                const sizeStr = f.size > 1024 * 1024 
                                  ? `${(f.size / (1024 * 1024)).toFixed(2)} MB`
                                  : `${(f.size / 1024).toFixed(1)} KB`;
                                
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  resolve({
                                    id: `file_${Math.random().toString(36).substr(2, 9)}`,
                                    nome: f.name,
                                    size: sizeStr,
                                    base64: reader.result as string,
                                    uploading: false
                                  });
                                };
                                reader.readAsDataURL(f);
                              });
                            });

                            const newlyCreated = await Promise.all(filePromises);
                            const nextAnexos = [...currentAnexos, ...newlyCreated];

                            const updated = { ...selectedDemanda, anexos: nextAnexos };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, { anexos: nextAnexos });
                            addToast("Anexo carregado e salvo com sucesso!", "success");
                          }}
                        />
                      </div>
                    </div>

                    {selectedDemanda.anexos && selectedDemanda.anexos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                        {selectedDemanda.anexos.map((ax) => {
                          const ext = ax.nome.split('.').pop()?.toUpperCase() || "ARQ";
                          let extColor = "bg-neutral-900 border-neutral-800 text-neutral-400";
                          if (["JPG", "PNG", "GIF", "WEBP", "SVG"].includes(ext)) {
                            extColor = "bg-pink-955 border-pink-900/40 text-pink-400";
                          } else if (["PDF", "DOC", "DOCX", "ODT"].includes(ext)) {
                            extColor = "bg-rose-955 border-rose-900/40 text-rose-400";
                          } else if (["XLS", "XLSX", "CSV"].includes(ext)) {
                            extColor = "bg-emerald-955 border-emerald-900/40 text-emerald-400";
                          } else if (["ZIP", "RAR", "TAR", "GZ"].includes(ext)) {
                            extColor = "bg-amber-955 border-amber-900/40 text-amber-505";
                          }

                          return (
                            <div 
                              key={ax.id} 
                              className="flex items-center justify-between p-3 bg-neutral-955 border border-neutral-850 hover:border-neutral-800 rounded-2xl gap-3 text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-[9px] font-bold font-mono px-2 py-1.5 rounded border ${extColor} shrink-0`}>
                                  {ext}
                                </span>
                                <div className="truncate min-w-0">
                                  <p className="font-semibold truncate text-neutral-200 text-xs" title={ax.nome}>
                                    {ax.nome}
                                  </p>
                                  <p className="text-[10px] font-mono text-neutral-500 leading-none mt-1">{ax.size}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={ax.base64 || "#"}
                                  download={ax.nome}
                                  className="p-1.5 px-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 rounded-lg cursor-pointer transition flex items-center justify-center.5"
                                  title="Fazer download deste item"
                                >
                                  <Download size={11} />
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm("Remover permanentemente este anexo?")) return;
                                    const nextAnexos = (selectedDemanda.anexos || []).filter(a => a.id !== ax.id);
                                    const updated = { ...selectedDemanda, anexos: nextAnexos };
                                    setSelectedDemanda(updated);
                                    await updateDemanda(selectedDemanda.id, { anexos: nextAnexos });
                                    addToast("Anexo desvinculado com sucesso!", "success");
                                  }}
                                  className="p-1.5 px-2.5 bg-neutral-950 hover:bg-rose-955 text-neutral-500 hover:text-rose-400 border border-neutral-800 hover:border-rose-900/30 rounded-lg cursor-pointer transition flex items-center"
                                  title="Excluir"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 bg-neutral-955 border border-neutral-855 border-dashed rounded-3xl text-center text-xs text-neutral-500 italic">
                        Sem correspondentes anexados nesta demanda.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: DISCUSSÕES (COMENTÁRIOS) */}
                {modalTab === "comentarios" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">💬 Histórico de Discussões Ativas</h4>
                    
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {comentarios.filter(c => c.idDemanda === selectedDemanda.id).map((com) => {
                        const pic = pessoas.find(p => p.id === com.idPessoa)?.foto;
                        return (
                          <div key={com.id} className="p-3.5 rounded-2xl bg-neutral-955 border border-neutral-850 flex items-start gap-3 text-left">
                            <div className="w-6.5 h-6.5 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
                              {pic ? (
                                <img src={pic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[8px] font-bold uppercase">{com.nomeAutor.substring(0, 2)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-300">{com.nomeAutor}</span>
                                <span className="text-[8px] text-neutral-500">{new Date(com.createdAt).toLocaleString("pt-BR")}</span>
                              </div>
                              <p className="text-[11px] text-neutral-300 mt-1.5 whitespace-pre-wrap leading-relaxed select-text" dangerouslySetInnerHTML={{ __html: com.textoHTML }} />
                            </div>
                          </div>
                        );
                      })}

                      {comentarios.filter(c => c.idDemanda === selectedDemanda.id).length === 0 && (
                        <p className="text-xs text-neutral-500 italic text-center py-8">Nenhuma mensagem registrada. Deixe uma mensagem abaixo para alinhamento.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-neutral-850">
                      <input
                        type="text"
                        id="input_fp_comment_modal_v3"
                        placeholder="Comunique alinhamentos, recados operacionais..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = document.getElementById("input_fp_comment_modal_v3") as HTMLInputElement;
                            if (input && input.value.trim()) {
                              addComentario(selectedDemanda.id, input.value.trim());
                              input.value = "";
                            }
                          }
                        }}
                        className="flex-1 bg-neutral-950 border border-neutral-850 rounded-xl p-3 text-xs text-neutral-200 outline-hidden focus:border-indigo-500 font-sans"
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById("input_fp_comment_modal_v3") as HTMLInputElement;
                          if (input && input.value.trim()) {
                            addComentario(selectedDemanda.id, input.value.trim());
                            input.value = "";
                          }
                        }}
                        className="px-4 py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer transition shrink-0 uppercase font-mono tracking-wider text-[10px]"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 7: APONTAMENTOS */}
                {modalTab === "apontamentos" && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">⏱️ Histórico de Lançamentos</h4>
                      <span className="text-amber-500 font-extrabold font-mono text-xs">
                        Esforço Acumulado: {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).reduce((sum, current) => sum + (current.horas || 0), 0)}h
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Form Lançar Horas */}
                      <div className="md:col-span-5 bg-neutral-955 border border-neutral-850 p-4 rounded-2xl space-y-3 shrink-0">
                        <h5 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider border-b border-neutral-900 pb-1.5 flex items-center justify-between">
                          <span>REGISTRAR APONTAMENTO</span>
                          <span className="text-neutral-500 text-[8px]">Novo lançamento</span>
                        </h5>

                        <div className="space-y-2.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[9px] text-neutral-400 uppercase font-mono block">Horas Gastas *</label>
                            <input
                              type="number"
                              id="fp_pointing_hours_v2"
                              defaultValue={1}
                              min={1}
                              max={24}
                              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-neutral-400 uppercase font-mono block">Tipo de Trabalho</label>
                            <input
                              type="text"
                              id="fp_pointing_activity_v2"
                              placeholder="Ex: Desenvolvimento, Planejamento, QA"
                              defaultValue="Desenvolvimento"
                              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg p-2 outline-none font-sans"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-neutral-400 uppercase font-mono block">Descrição do Serviço *</label>
                            <textarea
                              id="fp_pointing_desc_v2"
                              rows={2.5}
                              placeholder="Foco prioritário ou tarefas realizadas no período..."
                              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-250 rounded-lg p-2 outline-none font-sans"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const hrsInput = document.getElementById("fp_pointing_hours_v2") as HTMLInputElement;
                              const actInput = document.getElementById("fp_pointing_activity_v2") as HTMLInputElement;
                              const descInput = document.getElementById("fp_pointing_desc_v2") as HTMLInputElement;

                              const h = parseFloat(hrsInput?.value || "1");
                              const act = actInput?.value || "Desenvolvimento";
                              const desc = descInput?.value?.trim() || "";

                              if (!desc) {
                                addToast("Adicione um resumo do que foi realizado no apontamento!", "error");
                                return;
                              }

                              addApontamento(selectedDemanda.id, h, act, desc);
                              addToast("Horas adicionadas com sucesso!", "success");
                              if (descInput) descInput.value = "";
                            }}
                            className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer transition mt-2 font-mono uppercase tracking-wider text-[10px]"
                          >
                            Lançar Esforço
                          </button>
                        </div>
                      </div>

                      {/* Lista de registros */}
                      <div className="md:col-span-7 space-y-2 border border-neutral-850 p-4 bg-neutral-950/20 rounded-2xl h-[310px] overflow-y-auto scrollbar-thin">
                        {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).map(ap => (
                          <div key={ap.id} className="p-3 border border-neutral-850 bg-neutral-955 rounded-xl text-left select-text">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-indigo-400">{ap.nomePessoa}</span>
                              <span className="font-bold font-mono text-neutral-200">
                                {ap.horas}h <span className="text-[10px] font-normal text-neutral-500">({ap.atividade || "Desenvolvimento"})</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-300 italic mt-1.5 font-sans leading-relaxed">"{ap.descricao}"</p>
                          </div>
                        ))}

                        {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).length === 0 && (
                          <p className="text-xs text-neutral-500 italic text-center py-10">Nenhum esforço apontado.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-800 flex justify-end gap-2 bg-neutral-950/20 shrink-0">
                <button
                  onClick={() => setSelectedDemanda(null)}
                  className="px-5 py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition hover:bg-neutral-850"
                >
                  Fechar Visualizador
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 6. PERSONAL TASK FORM MODAL (CREATE / EDIT) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left scale-in">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/20">
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-widest font-mono">
                {editingTask ? "Editar Atividade Pessoal" : "Nova Atividade Pessoal"}
              </h3>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="p-1 hover:bg-neutral-800 hover:text-white text-neutral-400 rounded-full transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-mono">Título do Afazer *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atualizar planilhas corporativas"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-250 rounded-xl p-2.5 focus:border-amber-500/50 outline-hidden transition font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-mono">Descrição do que será realizado</label>
                <textarea
                  rows={3}
                  placeholder="Detalhamento operacional da tarefa para organização pessoal..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-250 rounded-xl p-2.5 focus:border-amber-500/50 outline-hidden transition font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 font-mono">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-sans">Data Inicio</label>
                  <input
                    type="date"
                    required
                    value={taskDataInicio}
                    onChange={(e) => setTaskDataInicio(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 focus:border-amber-500/50 outline-hidden"
                  />
                </div>
                <div className="space-y-1 font-mono">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-sans">Data Fim</label>
                  <input
                    type="date"
                    required
                    value={taskDataFim}
                    onChange={(e) => setTaskDataFim(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 focus:border-amber-500/50 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-mono">Status Operacional</label>
                  <select
                    value={taskStatus}
                    onChange={(e: any) => setTaskStatus(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl p-2.5 focus:border-amber-500/50 cursor-pointer outline-hidden"
                  >
                    <option value="Pendente">Pendente / Backlog</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Concluída">Concluída / Feito</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 translate-y-3 shrink-0">
                  <input
                    type="checkbox"
                    id="checkbox_agenda_link"
                    checked={taskAddToAgenda}
                    onChange={(e) => setTaskAddToAgenda(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="checkbox_agenda_link" className="text-[10px] text-neutral-350 cursor-pointer block font-bold font-sans leading-none">
                    Vincular à minha agenda
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-800 cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Salvar Atividade
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CAPTURE POINTING MODAL */}
      {showPointingModal && pointingDemanda && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-fade-in font-sans">
          <div className="bg-neutral-905 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 text-left">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider font-mono">
                  {pointingStep === "ask_pointing" ? "⏳ Apontamento de Horas" :
                   pointingStep === "input_pointing" ? "📝 Registrar Horas Trabalhadas" :
                   "👤 Controle de Fluxo QA"}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                  {pointingDemanda.numeroChamado} - {pointingDemanda.titulo}
                </p>
              </div>
              <button 
                onClick={() => setShowPointingModal(false)}
                className="text-neutral-550 hover:text-neutral-250 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step 1: Ask if they want to point */}
            {pointingStep === "ask_pointing" && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  A tarefa foi colocada em execução anteriormente. Deseja realizar o apontamento das horas que ela ficou em execução antes de alterar o status para <span className="font-bold text-amber-400 uppercase">"{pointingTargetStatus}"</span>?
                </p>
                <div className="pt-4 border-t border-neutral-800/80 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setPointingStep("input_pointing")}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl cursor-pointer transition text-center"
                  >
                    Sim, apontar horas da tarefa
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (pointingTargetStatus === "Pausada") {
                        await finalizeStatusChange(pointingDemanda, "Pausada");
                        setShowPointingModal(false);
                      } else {
                        // Concluída - check idQAManager
                        if (pointingDemanda.idQAManager) {
                          setPointingStep("ask_qa");
                        } else {
                          await finalizeStatusChange(pointingDemanda, "Concluída");
                          setShowPointingModal(false);
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer transition text-center"
                  >
                    Não, apenas alterá-la para "{pointingTargetStatus}"
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Input Pointing */}
            {pointingStep === "input_pointing" && (
              <div className="space-y-4">
                {(() => {
                  const meuTotal = apontamentos
                    .filter(a => a.idDemanda === pointingDemanda.id && a.idPessoa === (activeUser?.id || ""))
                    .reduce((sum, current) => sum + (current.horas || 0), 0);
                  return meuTotal > 0 ? (
                    <div className="text-[11px] text-amber-400 font-mono p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 flex justify-between items-center">
                      <span>👤 Seu total acumulado nesta tarefa:</span>
                      <span className="font-bold">{Math.round(meuTotal * 10) / 10}h</span>
                    </div>
                  ) : null;
                })()}

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-mono">
                    Horas Trabalhadas
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={pointingHoras}
                    onChange={(e) => setPointingHoras(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-xl p-2.5 focus:border-amber-500/50 outline-none"
                    placeholder="Ex: 1.5, 2.0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold font-mono">
                    Selecione a Atividade
                  </label>
                  <select
                    value={pointingAtividade}
                    onChange={(e) => setPointingAtividade(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl p-2.5 focus:border-amber-500/50 outline-none cursor-pointer"
                  >
                    <option value="">Selecione uma atividade...</option>
                    {(projetos.find(p => p.id === pointingDemanda.idProjeto)?.atividades || [
                      "Desenvolvimento", "Análise de Requisitos", "Testes", "Reunião", "Correção de Bugs", "Suporte"
                    ]).map((act) => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>

                {pointingError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{pointingError}</p>
                )}

                <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPointingStep("ask_pointing")}
                    className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-800 cursor-pointer transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!pointingHoras || pointingHoras <= 0) {
                        setPointingError("As horas devem ser preenchidas com valor maior que 0");
                        return;
                      }
                      if (!pointingAtividade) {
                        setPointingError("É necessário selecionar uma atividade");
                        return;
                      }

                      await addApontamento({
                        idDemanda: pointingDemanda.id,
                        idPessoa: activeUser?.id || "",
                        horas: pointingHoras,
                        atividade: pointingAtividade,
                        descricao: `Apontamento via Fila ao alterar para ${pointingTargetStatus}`,
                        data: new Date().toISOString()
                      } as any);

                      addToast("Horas apontadas com sucesso!", "success");

                      if (pointingTargetStatus === "Pausada") {
                        await finalizeStatusChange(pointingDemanda, "Pausada");
                        setShowPointingModal(false);
                      } else {
                        // Concluída
                        if (pointingDemanda.idQAManager) {
                          setPointingStep("ask_qa");
                        } else {
                          await finalizeStatusChange(pointingDemanda, "Concluída");
                          setShowPointingModal(false);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl cursor-pointer transition"
                  >
                    Registrar Horas e Continuar
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Send to QA Queue Option */}
            {pointingStep === "ask_qa" && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Como esta tarefa possui um QA Manager associado (<span className="text-indigo-400 font-semibold">{pessoas.find(p => p.id === pointingDemanda.idQAManager)?.nome || "Analista"}</span>), deseja enviá-la para a fila de prioridades do QA, aguardando a aprovação do gestor?
                </p>
                <div className="pt-4 border-t border-neutral-800/80 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCommentDlgType("enviar_qa");
                      setCommentDlgDemId(pointingDemanda.id);
                      setCommentText("");
                      setShowCommentDlg(true);
                      setShowPointingModal(false);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition text-center"
                  >
                    Sim, enviar para fila da QA - {pessoas.find(p => p.id === pointingDemanda.idQAManager)?.nome || "QA"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await finalizeStatusChange(pointingDemanda, "Concluída");
                      setShowPointingModal(false);
                    }}
                    className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer transition text-center"
                  >
                    Não, apenas concluir de imediato
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MANUALLY ADD DEMAND TO TECHNICAL PRIORITY QUEUE MODAL */}
      {showAddManualModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-fade-in font-sans">
          <div className="bg-neutral-905 border border-neutral-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative space-y-4 text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase flex items-center gap-1.5">
                  ⚡ Gestão Operacional
                </span>
                <h3 className="text-base font-bold text-neutral-100 tracking-tight mt-0.5">
                  Adicionar Demanda à Fila de Prioridades
                </h3>
                <p className="text-xs text-neutral-450 mt-0.5">
                  Vincular demanda ao técnico <span className="text-amber-400 font-bold">{pessoas.find(p => p.id === selectedPessoaId)?.nome || "Técnico"}</span>. A demanda será aprovada automaticamente.
                </p>
              </div>
              <button 
                onClick={() => setShowAddManualModal(false)}
                className="text-neutral-550 hover:text-neutral-250 cursor-pointer p-1 rounded-lg hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Smart Filters section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-950 p-4 border border-neutral-850 rounded-2xl shrink-0">
              {/* Project Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase font-black">Projeto</label>
                <select
                  value={filterAddProjeto}
                  onChange={(e) => setFilterAddProjeto(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none cursor-pointer"
                >
                  <option value="">Todos os Projetos</option>
                  {projetos.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.nome}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase font-black">Tipo de Demanda</label>
                <select
                  value={filterAddTipo}
                  onChange={(e) => setFilterAddTipo(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none cursor-pointer"
                >
                  <option value="">Todos os Tipos</option>
                  <option value="BUG">BUG (Bugo)</option>
                  <option value="Incidente">Incidente (SLA)</option>
                  <option value="Melhoria">Melhoria (MEL)</option>
                  <option value="Mudança">Mudança (RFC)</option>
                </select>
              </div>

              {/* Text Search Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono tracking-wider text-neutral-400 uppercase font-black">Buscar por Texto</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchAddTerm}
                    onChange={(e) => setSearchAddTerm(e.target.value)}
                    placeholder="CH, Título, Sigla..."
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-500/50 rounded-xl pl-8 pr-3 py-2 text-xs text-neutral-200 outline-none"
                  />
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
              </div>
            </div>

            {/* Candidates list viewport */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {(() => {
                const candidates = demandas.filter(d => {
                  if (d.excluido) return false;
                  // Skip if already prioritized, approved, not finished and assigned to this exact person
                  const isAssignedToThisPessoa = d.idDesignado === selectedPessoaId || (d.idDesignados && d.idDesignados.includes(selectedPessoaId));
                  const inActiveFila = d.priorizadoFila && isAssignedToThisPessoa && !d.filaConcluida;
                  if (inActiveFila) return false;

                  if (filterAddProjeto && d.idProjeto !== filterAddProjeto) return false;
                  if (filterAddTipo && d.tipo !== filterAddTipo) return false;

                  if (searchAddTerm) {
                    const s = searchAddTerm.toLowerCase();
                    const titleMatch = d.titulo.toLowerCase().includes(s);
                    const chMatch = d.numeroChamado && d.numeroChamado.toLowerCase().includes(s);
                    const typeMatch = d.tipo && d.tipo.toLowerCase().includes(s);
                    return titleMatch || chMatch || typeMatch;
                  }
                  return true;
                });

                if (candidates.length === 0) {
                  return (
                    <div className="py-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-1.5 h-full">
                      <span className="text-2xl">⚡</span>
                      <p className="text-xs font-semibold">Nenhuma demanda elegível encontrada.</p>
                      <p className="text-[10px] text-neutral-600">Altere seus filtros inteligentes acima.</p>
                    </div>
                  );
                }

                return candidates.map((cand) => {
                  // Determine type badge styles
                  let badgeClass = "border border-neutral-800 bg-neutral-900 text-neutral-300";
                  let siglaLabel = cand.tipo?.substring(0, 3).toUpperCase() || "DEM";
                  
                  if (cand.tipo === "BUG") {
                    badgeClass = "border border-rose-900/50 bg-rose-950/20 text-rose-400";
                    siglaLabel = "BUG";
                  } else if (cand.tipo === "Incidente") {
                    badgeClass = "border border-amber-900/50 bg-amber-950/20 text-amber-500";
                    siglaLabel = "INC";
                  } else if (cand.tipo === "Melhoria") {
                    badgeClass = "border border-emerald-950 bg-emerald-950/20 text-emerald-400";
                    siglaLabel = "MEL";
                  } else if (cand.tipo === "Mudança") {
                    badgeClass = "border border-indigo-900/50 bg-indigo-950/10 text-indigo-400";
                    siglaLabel = "MUD";
                  } else if (cand.tipo === "Task") {
                    badgeClass = "border border-cyan-900/50 bg-cyan-950/20 text-cyan-400";
                    siglaLabel = "TSK";
                  }

                  return (
                    <div 
                      key={cand.id}
                      className="p-3 bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-850/70 hover:border-neutral-800 rounded-xl flex items-center justify-between gap-4 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Type & Code Badge */}
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase shrink-0 ${badgeClass}`}>
                          {siglaLabel} • {cand.numeroChamado}
                        </span>

                        {/* Title and Project */}
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-semibold text-neutral-250 truncate group-hover:text-neutral-100 transition-colors">
                            {cand.titulo}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            {projetos.find(p => p.id === cand.idProjeto)?.nome || "Projeto Geral/Integrado"} • {cand.coluna}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Eye visualizer button */}
                        <button
                          type="button"
                          onClick={() => { setSelectedDemanda(cand); setModalTab("resumo"); }}
                          className="p-1 px-1.5 bg-neutral-950 hover:bg-neutral-850 hover:text-neutral-200 border border-neutral-800 text-neutral-450 rounded-lg cursor-pointer transition flex items-center justify-center gap-1"
                          title="Visualizar Informações no Visualizador Principal"
                        >
                          <Eye size={12} />
                          <span className="text-[9px] font-mono">Detalhes</span>
                        </button>

                        {/* Add button */}
                        <button
                          type="button"
                          onClick={async () => {
                            // Find active/waiting priority items for the tech to calculate oldest updatedAt for append
                            const naFilaItems = demandas.filter(item => {
                              const isAssigned = item.idDesignado === selectedPessoaId || (item.idDesignados && item.idDesignados.includes(selectedPessoaId));
                              if (!isAssigned || !item.priorizadoFila || item.excluido || item.filaConcluida) return false;
                              
                              const isAwaitingApproval = item.coluna === "Aguardando aprovação do Gestor";
                              const deAndamento = item.coluna === "Desenvolvimento" || item.coluna === "desenvolvimento" || item.coluna === "QA";
                              const isEmAndamento = deAndamento;
                              return !isAwaitingApproval && !isEmAndamento;
                            });

                            let finalOldestDate = new Date().toISOString();
                            if (naFilaItems.length > 0) {
                              const times = naFilaItems.map(item => new Date(item.updatedAt || 0).getTime());
                              const minTime = Math.min(...times);
                              finalOldestDate = new Date(minTime - 60000).toISOString(); // 1 minute older than the oldest Na Fila item
                            }

                            // Update payload to assign tech, prioritize, auto approve, and sort to end of "Na Fila"
                            await updateDemanda(cand.id, {
                              priorizadoFila: true,
                              filaAprovada: true,
                              filaConcluida: false,
                              filaConcluidaAt: null,
                              idDesignado: selectedPessoaId,
                              idDesignados: [selectedPessoaId],
                              coluna: "A Fazer", // Always push back to "A Fazer" column dynamically
                              updatedAt: finalOldestDate,
                              inicioExecucao: null
                            });

                            const techName = pessoas.find(p => p.id === selectedPessoaId)?.nome || "Técnico";
                            addToast(`Demanda ${cand.numeroChamado} adicionada com sucesso já aprovada ao final da fila de ${techName}!`, "success");
                            setShowAddManualModal(false);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm"
                        >
                          <Plus size={11} className="stroke-[3]" /> Adicionar
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-neutral-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-800 cursor-pointer transition"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FEEDBACK ACTION COMMENT MODAL */}
      {showCommentDlg && (() => {
        const targetDem = demandas.find(d => d.id === commentDlgDemId);
        if (!targetDem) return null;
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[90] animate-fade-in font-sans">
            <div className="bg-neutral-905 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 text-left">
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider font-mono">
                    {commentDlgType === "aprovar" ? "📢 Adicionar comentário ao Técnico?" : "🧪 Adicionar comentário para QA?"}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                    {targetDem.numeroChamado} - {targetDem.titulo}
                  </p>
                </div>
                <button 
                  onClick={() => setShowCommentDlg(false)}
                  className="text-neutral-550 hover:text-neutral-250 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                {commentDlgType === "aprovar" 
                  ? "Se desejar, adicione um comentário que ficará visível na fila de prioridades do técnico de forma temporária. Esse comentário também será anexado de forma permanente aos comentários da demanda."
                  : "Se desejar, envie uma mensagem com o passo a passo ou observações para o analista responsável pelo QA. O comentário ficará visível de forma temporária na fila do QA e será registrado para sempre na discussão da demanda."
                }
              </p>

              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Digite seu comentário aqui... (Opcional)"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 min-h-[100px] leading-relaxed resize-none font-sans"
              />

              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (commentDlgType === "aprovar") {
                      await handleAprovarFilaComComentario(commentDlgDemId, commentText);
                      setShowCommentDlg(false);
                    } else {
                      // Execute Envio QA transition
                      const qamId = targetDem.idQAManager || targetDem.idDesignado;
                      let updatedPayload: Partial<Demanda> = {
                        filaConcluida: false,
                        filaConcluidaAt: null,
                        coluna: "Aguardando aprovação do Gestor",
                        updatedAt: new Date().toISOString(),
                        idDesignado: qamId,
                        idDesignados: qamId ? [qamId] : (targetDem.idDesignados || []),
                        filaAprovada: false, 
                        priorizadoFila: true, 
                        inicioExecucao: null,
                        comentarioEnvioQA: commentText.trim() || ""
                      };
                      if (targetDem.comentarioAprovacaoGestor) {
                        updatedPayload.comentarioAprovacaoGestor = "";
                      }
                      await updateDemanda(commentDlgDemId, updatedPayload);

                      if (commentText.trim()) {
                        await addComentario(commentDlgDemId, `<strong>Comentário adicionado no momento do envio para QA:</strong> ${commentText.trim()}`);
                      }

                      setShowCommentDlg(false);
                      addToast("Card enviado para aprovação do Gestor (QA) com sucesso!", "success");

                      const proj = projetos.find(p => p.id === targetDem.idProjeto);
                      const projNome = proj?.nome || "Desconhecido";
                      const qaMsg = `O gestor do projeto ${projNome} tem uma demanda do QA (${targetDem.numeroChamado}) para aprovar.`;

                      const projectManagers = proj?.gestoresIds || [];
                      for (const pmId of projectManagers) {
                        await addAlerta({
                          titulo: `Aprovação de QA Pendente: ${targetDem.numeroChamado}`,
                          mensagem: qaMsg,
                          recipientId: pmId,
                          type: "qa_aprovacao_pendente"
                        });
                        const mgrObj = pessoas.find(p => p.id === pmId);
                        if (mgrObj?.email) {
                          await addEmailFila({
                            assunto: `Aprovação de QA Pendente: Demanda ${targetDem.numeroChamado}`,
                            destinatarios: mgrObj.email,
                            processo: "Envio para QA"
                          });
                        }
                      }
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition text-center"
                >
                  Confirmar e Continuar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    // Confirms WITHOUT any comment text
                    if (commentDlgType === "aprovar") {
                      await handleAprovarFilaComComentario(commentDlgDemId, "");
                      setShowCommentDlg(false);
                    } else {
                      // Execute Envio QA transition without comment
                      const qamId = targetDem.idQAManager || targetDem.idDesignado;
                      let updatedPayload: Partial<Demanda> = {
                        filaConcluida: false,
                        filaConcluidaAt: null,
                        coluna: "Aguardando aprovação do Gestor",
                        updatedAt: new Date().toISOString(),
                        idDesignado: qamId,
                        idDesignados: qamId ? [qamId] : (targetDem.idDesignados || []),
                        filaAprovada: false, 
                        priorizadoFila: true, 
                        inicioExecucao: null,
                        comentarioEnvioQA: ""
                      };
                      if (targetDem.comentarioAprovacaoGestor) {
                        updatedPayload.comentarioAprovacaoGestor = "";
                      }
                      await updateDemanda(commentDlgDemId, updatedPayload);

                      setShowCommentDlg(false);
                      addToast("Card enviado para aprovação do Gestor (QA) com sucesso!", "success");

                      const proj = projetos.find(p => p.id === targetDem.idProjeto);
                      const projNome = proj?.nome || "Desconhecido";
                      const qaMsg = `O gestor do projeto ${projNome} tem uma demanda do QA (${targetDem.numeroChamado}) para aprovar.`;

                      const projectManagers = proj?.gestoresIds || [];
                      for (const pmId of projectManagers) {
                        await addAlerta({
                          titulo: `Aprovação de QA Pendente: ${targetDem.numeroChamado}`,
                          mensagem: qaMsg,
                          recipientId: pmId,
                          type: "qa_aprovacao_pendente"
                        });
                        const mgrObj = pessoas.find(p => p.id === pmId);
                        if (mgrObj?.email) {
                          await addEmailFila({
                            assunto: `Aprovação de QA Pendente: Demanda ${targetDem.numeroChamado}`,
                            destinatarios: mgrObj.email,
                            processo: "Envio para QA"
                          });
                        }
                      }
                    }
                  }}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer transition text-center"
                >
                  Pular Comentário
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommentDlg(false)}
                  className="w-full py-2.5 bg-transparent hover:bg-neutral-900 border-none text-neutral-450 hover:text-neutral-300 text-xs font-medium cursor-pointer transition text-center"
                >
                  Cancelar Ação
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
