/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useDB } from "../dbState";
import { Demanda, Pessoa, Projeto, Contrato, EstimativaItem, AnexoDemanda, TarefaMudanca } from "../types";
import { 
  Plus, Search, Calendar, User, Eye, Edit, Trash2, 
  Settings, CheckSquare, MessageSquare, Clock, Filter, 
  ExternalLink, Maximize2, Trash, Check, UserCheck, Tag, X, FileText, Sparkles,
  Copy, Link2, Paperclip, ChevronLeft, MoreHorizontal, Zap, ListOrdered,
  ArrowUp, ArrowDown, Shield, RefreshCw, Bug, CheckCircle2, Play, Shuffle, ClipboardList, CreditCard
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

export const KanbanModule: React.FC = () => {
  const { 
    demandas, projetos, pessoas, contratos, comentarios, apontamentos, activeUser, activeUserAcessos, empresas,
    addDemanda, updateDemanda, deleteDemanda, restoreDemanda, moveDemanda, addComentario, deleteComentario, addApontamento, deleteApontamento, addToast, addAlerta, addEmailFila
  } = useDB();

  const isWorkspaceManager = activeUser?.tipo === "GMZ" || (activeUserAcessos && (activeUserAcessos.includes("rh_admin") || activeUserAcessos.includes("rrhh") || activeUserAcessos.includes("gestor")));

  const activeUserAcessosList = activeUserAcessos || [];

  const [activeProjetoId, setActiveProjetoId] = useState("");
  const [search, setSearch] = useState("");
  const [filterCriticidade, setFilterCriticidade] = useState("");
  
  // Modal controllers
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTab, setModalTab] = useState<string>("resumo");

  // Billing features
  const [formCobrarEmContrato, setFormCobrarEmContrato] = useState<boolean>(false);
  const [formCobrarContratoMes, setFormCobrarContratoMes] = useState<string>("");

  // Rich reconstructed types fields
  const [formPassosQA, setFormPassosQA] = useState<{ id: string; text: string; images: string[] }[]>([]);
  const [draftStepText, setDraftStepText] = useState("");
  const [draftStepImages, setDraftStepImages] = useState<string[]>([]);
  const [draftStepImageUrl, setDraftStepImageUrl] = useState("");
  const [galleryStep, setGalleryStep] = useState<{ id: string; text: string; images: string[] } | null>(null);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState<number>(0);
  const [formStatusQA, setFormStatusQA] = useState<"Reproduzido" | "Corrigido" | "Validado">("Reproduzido");
  const [formAmbiente, setFormAmbiente] = useState<string>("DEV");
  const [formSubTipoBug, setFormSubTipoBug] = useState<string>("Front");
  const [formStatusProposta, setFormStatusProposta] = useState<string>("Em análise");
  const [formClienteResponsavelId, setFormClienteResponsavelId] = useState<string>("");
  const [activeStepGalleryId, setActiveStepGalleryId] = useState<string | null>(null);

  // Helper parser for custom QA steps array
  const parseSteps = (rawSteps: string | undefined): { id: string; text: string; images: string[] }[] => {
    if (!rawSteps) return [];
    try {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed)) {
        return parsed.map((step, idx) => ({
          id: step.id || `step_${idx}_${Math.random()}`,
          text: step.text || "",
          images: Array.isArray(step.images) ? step.images : []
        }));
      }
    } catch (_) {}
    return [{ id: "1", text: rawSteps, images: [] }];
  };

  // Create/Edit form state
  const [tagAutocompleteOpen, setTagAutocompleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formTipo, setFormTipo] = useState<string>("Melhoria");
  const [formDescricao, setFormDescricao] = useState("");
  const [formNumeroChamado, setFormNumeroChamado] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [rawTag, setRawTag] = useState("");
  const [formCriticidade, setFormCriticidade] = useState<any>("Padrão");
  const [formColuna, setFormColuna] = useState("");
  const [formDesignado, setFormDesignado] = useState("");
  const [formDesignados, setFormDesignados] = useState<string[]>([]);
  const [formResponsavelId, setFormResponsavelId] = useState("");
  const [formEstimativa, setFormEstimativa] = useState(8);
  const [formAtividadeEstimativa, setFormAtividadeEstimativa] = useState("");
  const [formEstimativas, setFormEstimativas] = useState<EstimativaItem[]>([]);
  const [formContratoId, setFormContratoId] = useState("");
  const [formEmpresaId, setFormEmpresaId] = useState("");
  const [formEmpresas, setFormEmpresas] = useState<string[]>([]);
  const [formAnexos, setFormAnexos] = useState<AnexoDemanda[]>([]);
  const [formIdQAManager, setFormIdQAManager] = useState("");

  // Inline/View-mode editing states for Melhoria
  const [viewRawTag, setViewRawTag] = useState("");
  const [viewTagAutocompleteOpen, setViewTagAutocompleteOpen] = useState(false);
  const [viewFormEstimativaHoras, setViewFormEstimativaHoras] = useState(8);
  const [viewFormEstimativaAtividade, setViewFormEstimativaAtividade] = useState("");
  const [viewIsOpenEmpresasDropdown, setViewIsOpenEmpresasDropdown] = useState(false);
  const [viewFilterEmpresasText, setViewFilterEmpresasText] = useState("");
  const [viewIsOpenPessoasDropdown, setViewIsOpenPessoasDropdown] = useState(false);
  const [viewFilterPessoasText, setViewFilterPessoasText] = useState("");

  // Custom smart card constructor states
  const [formvaloresCamposCustom, setFormvaloresCamposCustom] = useState<Record<string, any>>({});
  const [activeDemandFormTab, setActiveDemandFormTab] = useState<string>("geral");

  const getPrefixForType = (tipo: string) => {
    switch (tipo) {
      case "Incidente": return "INC";
      case "Melhoria": return "MEL";
      case "Change": return "MUD";
      case "BUG": return "BUG";
      default:
        const matchTypeObj = activeProj?.tiposDemandasCustom?.find(x => x.nome === tipo);
        return matchTypeObj?.sigla || "DEM";
    }
  };

  const getFormTabs = () => {
    const activeCustomType = activeProj?.tiposDemandasCustom?.find(ct => ct.nome === formTipo);
    if (activeCustomType && (activeCustomType.guias?.length || 0) > 0) {
      return [
        { id: "geral", label: "Informações Gerais" },
        ...activeCustomType.guias.map(g => ({ id: g.id, label: g.nome })),
        { id: "anexos", label: "Anexos" }
      ];
    }

    switch (formTipo) {
      case "Incidente":
      case "BUG":
        return [
          { id: "resumo", label: "Resumo" },
          { id: "detalhes", label: "Detalhes do BUG" },
          { id: "passopasso", label: "Passo a Passo e Status QA" },
          { id: "tarefas", label: "Tarefas Associadas" },
          { id: "anexos", label: "Anexos" }
        ];
      case "Melhoria":
        return [
          { id: "resumo", label: "Resumo" },
          { id: "detalhes", label: "Detalhes da Melhoria" },
          { id: "passopasso", label: "Passo a Passo e Status QA" },
          { id: "tarefas", label: "Tarefas Associadas" },
          { id: "anexos", label: "Anexos" }
        ];
      case "Change":
        return [
          { id: "resumo", label: "Resumo" },
          { id: "detalhes", label: "Detalhes da Mudança" },
          { id: "passopasso", label: "Passo a Passo e Status QA" },
          { id: "tarefas", label: "Tarefas Associadas" },
          { id: "anexos", label: "Anexos" }
        ];
      default:
        return [
          { id: "resumo", label: "Geral" },
          { id: "detalhes", label: "Outros Detalhes" },
          { id: "passopasso", label: "Passo a Passo e Status QA" },
          { id: "anexos", label: "Anexos" }
        ];
    }
  };

  // Persistent Demand Type Filter (stored in cache)
  const [filterTipoDemanda, setFilterTipoDemanda] = useState<string>(() => {
    return localStorage.getItem("kanban_filter_tipo_demanda") || "";
  });

  const handleSetFilterTipoDemanda = (val: string) => {
    setFilterTipoDemanda(val);
    localStorage.setItem("kanban_filter_tipo_demanda", val);
  };

  // Stack of viewed demands to support "window on top of window" associated tasks navigation
  const [demandaStack, setDemandaStack] = useState<Demanda[]>([]);

  // Customer Number for all 4/5 demand types
  const [formNumeroCliente, setFormNumeroCliente] = useState("");

  // BUG step-by-step
  const [formPassoAPasso, setFormPassoAPasso] = useState("");

  // Change management fields
  const [formJustificativa, setFormJustificativa] = useState("");
  const [formServicosAfetados, setFormServicosAfetados] = useState("");
  const [formImpacto, setFormImpacto] = useState<"BAIXO" | "MÉDIO" | "ALTO">("BAIXO");
  const [formRisco, setFormRisco] = useState<"BAIXO" | "MÉDIO" | "ALTO">("BAIXO");
  const [formPrioridade, setFormPrioridade] = useState<"BAIXO" | "MÉDIO" | "ALTO">("BAIXO");
  const [formIndisponibilidade, setFormIndisponibilidade] = useState<"Sim" | "Não" | "Parcial">("Não");
  const [formPlanoImplementacao, setFormPlanoImplementacao] = useState("");
  const [formPlanoRollback, setFormPlanoRollback] = useState("");
  const [formResponsavelGeral, setFormResponsavelGeral] = useState("");
  const [formInicioGeral, setFormInicioGeral] = useState("");
  const [formFimGeral, setFormFimGeral] = useState("");
  const [formTarefasMudanca, setFormTarefasMudanca] = useState<TarefaMudanca[]>([]);

  // Associated Demand IDs for BUG/Change
  const [formTarefasAssociadasIds, setFormTarefasAssociadasIds] = useState<string[]>([]);
  const [formRelacoes, setFormRelacoes] = useState<{ idDemanda: string; tipo: "filha" | "pai" | "irma" }[]>([]);
  const [formSelectedRelOption, setFormSelectedRelOption] = useState<"filha" | "pai" | "irma">("irma");

  // Search filters for the new "Demandas Relacionadas" detail tab
  const [relSearchText, setRelSearchText] = useState("");
  const [relSearchType, setRelSearchType] = useState("Todos");
  const [relSearchProject, setRelSearchProject] = useState("Corrente"); // "Corrente" = Active, "Todos" = All
  
  // Custom relationship builder states
  const [selectedRelOption, setSelectedRelOption] = useState<"filha" | "pai" | "irma">("irma");
  const [linkingParentId, setLinkingParentId] = useState<string | null>(null);

  // Search filters for the Create/Edit form relation list
  const [formRelSearchText, setFormRelSearchText] = useState("");
  const [formRelSearchType, setFormRelSearchType] = useState("Todos");

  // Associated Task manual fields entry
  const [tempTaskResponsavel, setTempTaskResponsavel] = useState("");
  const [tempTaskDescricao, setTempTaskDescricao] = useState("");
  const [tempTaskInicio, setTempTaskInicio] = useState("");
  const [tempTaskFim, setTempTaskFim] = useState("");

  // Searchable Multi-Select Combobox Dropdown States
  const [filterPessoasText, setFilterPessoasText] = useState("");
  const [isOpenPessoasDropdown, setIsOpenPessoasDropdown] = useState(false);
  const [filterEmpresasText, setFilterEmpresasText] = useState("");
  const [isOpenEmpresasDropdown, setIsOpenEmpresasDropdown] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);

  // Collapsed columns state
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  // Individual card's active three-dot shortcut menu dropdown ID tracker
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

  // Comments state
  const [newCommentHTML, setNewCommentHTML] = useState("");
  const [selectedCommentForPreview, setSelectedCommentForPreview] = useState<any>(null);
  const [isFullscreenComment, setIsFullscreenComment] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Pointings form state
  const [pointingAtividade, setPointingAtividade] = useState("");
  const [pointingHoras, setPointingHoras] = useState(2);
  const [pointingError, setPointingError] = useState("");

  // States and helpers for Bug/QA steps reordering & feedback
  const [copiedStepsFeedback, setCopiedStepsFeedback] = useState(false);
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);

  // Get unique environments on the fly
  const existingAmbientes = Array.from(new Set([
    "DEV", "QA", "PROD",
    ...(demandas || []).map(d => d.ambiente).filter(Boolean) as string[]
  ]));

  // Get unique sub-types on the fly
  const existingSubTipos = Array.from(new Set([
    "Back", "Front", "Banco",
    ...(demandas || []).map(d => d.subTipoBug).filter(Boolean) as string[]
  ]));

  // Get unique tags on the fly
  const existingTags = Array.from(new Set([
    "SaaS", "Core", "Dev",
    ...(demandas || []).flatMap(d => d.tags || [])
  ]));

  // Get projects with visual access permissions
  const allowedProjetos = (projetos || []).filter((p) => {
    if (!p.acessosPessoasIds || p.acessosPessoasIds.length === 0) return true;
    if (!activeUser) return false;
    if (activeUser.tipo === "GMZ") return true;
    if (activeUserAcessos && activeUserAcessos.includes("rh_admin")) return true;
    return p.acessosPessoasIds.includes(activeUser.id);
  });

  // Get current project details
  const activeProj = allowedProjetos.find((p) => p.id === activeProjetoId) || allowedProjetos[0] || { id: "", nome: "", atividades: ["Desenvolvimento", "Reunião", "Análise"], contratoIds: [] };

  useEffect(() => {
    if (allowedProjetos.length > 0 && !activeProjetoId) {
      setActiveProjetoId(allowedProjetos[0].id);
    }
  }, [allowedProjetos]);

  useEffect(() => {
    const tabs = getFormTabs();
    if (!tabs.find((t) => t.id === activeDemandFormTab)) {
      setActiveDemandFormTab(tabs[0]?.id || "resumo");
    }
    if (!editId && (formTipo === "BUG" || formTipo === "Incidente")) {
      setFormDesignado("");
      setFormDesignados([]);
    }
  }, [formTipo, activeProj, editId]);

  // DEEP LINK LOGIC ?demanda=ID
  useEffect(() => {
    const handleDeepLink = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const idDemandaStr = urlParams.get("demanda");
      if (idDemandaStr) {
        const found = demandas.find((d) => d.id === idDemandaStr);
        if (found) {
          setSelectedDemanda(found);
          const relatedProj = allowedProjetos.find((p) => p.id === found.idProjeto);
          if (relatedProj) {
            setActiveProjetoId(relatedProj.id);
          }
        }
      }
    };
    handleDeepLink();
  }, [demandas, allowedProjetos]);

  // Update url on select/deselect demanda
  const handleSelectDemanda = (dem: Demanda) => {
    setSelectedDemanda(dem);
    setModalTab("resumo");
    const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?demanda=${dem.id}`;
    window.history.pushState({ path: newurl }, "", newurl);
  };

  const handleCloseDetailModal = () => {
    setSelectedDemanda(null);
    setDemandaStack([]);
    const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: newurl }, "", newurl);
  };

  const handleNavigateToDemanda = (dem: Demanda) => {
    if (selectedDemanda) {
      setDemandaStack((prev) => [...prev, selectedDemanda]);
    }
    if (dem.idProjeto && dem.idProjeto !== activeProjetoId) {
      setActiveProjetoId(dem.idProjeto);
    }
    setSelectedDemanda(dem);
    setModalTab("resumo");
    const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?demanda=${dem.id}`;
    window.history.pushState({ path: newurl }, "", newurl);
  };

  if (!activeProj) {
    return (
      <div className="py-12 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
        <Sparkles className="mx-auto text-neutral-600 mb-3 animate-pulse" size={40} />
        <h3 className="text-neutral-200 font-bold mb-1">Crie um Projeto e configure seu workflow primeiro!</h3>
        <p className="text-neutral-400 text-xs">Visite a aba "Workflow Projetos" no menu lateral.</p>
      </div>
    );
  }

  // Filter demands for active project (excluding soft-deleted ones)
  const projectDemands = demandas.filter((d) => d.idProjeto === activeProj.id && !d.excluido);

  const filteredDemands = projectDemands.filter((d) => {
    const sMatch = d.titulo.toLowerCase().includes(search.toLowerCase()) || 
                   d.numeroChamado.toLowerCase().includes(search.toLowerCase()) ||
                   (d.numeroCliente && d.numeroCliente.toLowerCase().includes(search.toLowerCase())) ||
                   d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    
    const cMatch = filterCriticidade ? d.criticidade === filterCriticidade : true;
    const tMatch = filterTipoDemanda ? (d.tipo || "Melhoria") === filterTipoDemanda : true;
    return sMatch && cMatch && tMatch;
  });

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      moveDemanda(id, colName);
    }
  };

  // Tag list helper
  const handleAddTag = () => {
    if (rawTag.trim() && !formTags.includes(rawTag.trim())) {
      setFormTags([...formTags, rawTag.trim()]);
      setRawTag("");
    }
  };

  const handleRemoveTag = (idx: number) => {
    setFormTags((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyLink = (d: Demanda) => {
    const link = `${window.location.protocol}//${window.location.host}${window.location.pathname}?demanda=${d.id}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        addToast(`Link do chamado #${d.numeroChamado} copiado com sucesso!`, "success");
      })
      .catch(() => {
        addToast("Erro ao tentar copiar o link.", "error");
      });
  };

  const handleDuplicateDemanda = (d: Demanda) => {
    const maxNumber = demandas.reduce((max, x) => {
      const parsed = parseInt(x.numeroChamado, 10);
      return !isNaN(parsed) && parsed > max ? parsed : max;
    }, 10000);
    const newSeq = (maxNumber + 1).toString();

    const clonePayload: Omit<Demanda, "id" | "createdAt" | "updatedAt"> = {
      titulo: `${d.titulo} (Duplicado)`,
      tipo: d.tipo || "Melhoria",
      descricao: d.descricao || "",
      numeroChamado: newSeq,
      numeroCliente: d.numeroCliente || "",
      tags: d.tags || [],
      criticidade: d.criticidade || "Padrão",
      idProjeto: d.idProjeto,
      coluna: d.coluna,
      idDesignado: d.idDesignado,
      idDesignados: d.idDesignados || [],
      estimativaHoras: d.estimativaHoras,
      atividade: d.atividade,
      estimativas: d.estimativas || [],
      idEmpresa: d.idEmpresa,
      idEmpresas: d.idEmpresas || [],
      anexos: d.anexos || [],
      passoAPasso: d.passoAPasso || "",
      justificativa: d.justificativa || "",
      servicosAfetados: d.servicosAfetados || "",
      impacto: d.impacto || "BAIXO",
      risco: d.risco || "BAIXO",
      prioridade: d.prioridade || "BAIXO",
      indisponibilidade: d.indisponibilidade || "Não",
      planoImplementacao: d.planoImplementacao || "",
      planoRollback: d.planoRollback || "",
      responsavelGeral: d.responsavelGeral || "",
      inicioGeral: d.inicioGeral || "",
      fimGeral: d.fimGeral || "",
      tarefasMudanca: d.tarefasMudanca || [],
      tarefasAssociadasIds: d.tarefasAssociadasIds || []
    };
    addDemanda(clonePayload);
  };

  const handleAddEstimativaItem = () => {
    if (!formAtividadeEstimativa) {
      addToast("Selecione uma atividade para a estimativa!", "error");
      return;
    }
    if (!formEstimativa || formEstimativa <= 0) {
      addToast("Insira uma quantidade de horas válida!", "error");
      return;
    }
    const newItem: EstimativaItem = {
      id: `est_${Date.now()}`,
      horas: Number(formEstimativa),
      atividade: formAtividadeEstimativa
    };
    setFormEstimativas((prev) => [...prev, newItem]);
    setFormEstimativa(8);
  };

  const handleAddStepQA = () => {
    if (!draftStepText.trim()) return;
    const newStep = {
      id: `step_${Date.now()}_${Math.random()}`,
      text: draftStepText.trim(),
      images: [...draftStepImages]
    };
    setFormPassosQA((prev) => [...prev, newStep]);
    setDraftStepText("");
    setDraftStepImages([]);
  };

  const handleRemoveStepQA = (id: string) => {
    setFormPassosQA((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddDraftStepImageUrlComp = () => {
    if (!draftStepImageUrl.trim()) return;
    setDraftStepImages((prev) => [...prev, draftStepImageUrl.trim()]);
    setDraftStepImageUrl("");
  };

  const handleDraftStepFileChangeComp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setDraftStepImages((prev) => [...prev, b64]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleRemoveImageFromStep = (stepId: string, imgIdx: number) => {
    setFormPassosQA((prev) => 
      prev.map((step) => 
        step.id === stepId 
          ? { ...step, images: step.images.filter((_, idx) => idx !== imgIdx) } 
          : step
      )
    );
  };

  const handleAddImageToExistingStep = (stepId: string, imgUrlOrBase64: string) => {
    setFormPassosQA((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? { ...step, images: [...step.images, imgUrlOrBase64] }
          : step
      )
    );
  };

  const handleMoveStep = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === formPassosQA.length - 1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...formPassosQA];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setFormPassosQA(updated);
  };

  const handleStepDragStart = (idx: number) => {
    setDraggedStepIdx(idx);
  };

  const handleStepDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
  };

  const handleStepDrop = (targetIdx: number) => {
    if (draggedStepIdx === null || draggedStepIdx === targetIdx) return;
    const reordered = [...formPassosQA];
    const [draggedItem] = reordered.splice(draggedStepIdx, 1);
    reordered.splice(targetIdx, 0, draggedItem);
    setFormPassosQA(reordered);
    setDraggedStepIdx(null);
  };

  const handleRemoveEstimativaItem = (idToDelete: string) => {
    setFormEstimativas((prev) => prev.filter((item) => item.id !== idToDelete));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAnexos: AnexoDemanda[] = (Array.from(files) as File[]).map((f: File) => {
      const tempId = `file_${Math.random().toString(36).substr(2, 9)}`;
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setFormAnexos((prev) => 
          prev.map((ax) => 
            ax.id === tempId 
              ? { ...ax, base64: base64String, uploading: false } 
              : ax
          )
        );
      };
      reader.readAsDataURL(f);

      const sizeStr = f.size > 1024 * 1024 
        ? `${(f.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(f.size / 1024).toFixed(1)} KB`;

      return {
        id: tempId,
        nome: f.name,
        size: sizeStr,
        base64: "",
        uploading: true
      };
    });

    setFormAnexos((prev) => [...prev, ...newAnexos]);
  };

  const handleRemoveAnexo = (idToDelete: string) => {
    setFormAnexos((prev) => prev.filter((ax) => ax.id !== idToDelete));
  };

  const addRelationBidirectional = async (idA: string, idB: string, tipoRelativetoA: "filha" | "pai" | "irma") => {
    const demA = demandas.find(d => d.id === idA);
    const demB = demandas.find(d => d.id === idB);
    if (!demA || !demB) return;

    const inverseTipoMap = {
      filha: "pai" as const,
      pai: "filha" as const,
      irma: "irma" as const
    };
    const tipoRelativetoB = inverseTipoMap[tipoRelativetoA];

    // For Dem A
    const assocIdsA = Array.from(new Set([...(demA.tarefasAssociadasIds || []), idB]));
    const relsA = [...(demA.relacoes || [])];
    const existingRelIndexA = relsA.findIndex(r => r.idDemanda === idB);
    if (existingRelIndexA >= 0) {
      relsA[existingRelIndexA] = { idDemanda: idB, tipo: tipoRelativetoA };
    } else {
      relsA.push({ idDemanda: idB, tipo: tipoRelativetoA });
    }

    // For Dem B
    const assocIdsB = Array.from(new Set([...(demB.tarefasAssociadasIds || []), idA]));
    const relsB = [...(demB.relacoes || [])];
    const existingRelIndexB = relsB.findIndex(r => r.idDemanda === idA);
    if (existingRelIndexB >= 0) {
      relsB[existingRelIndexB] = { idDemanda: idA, tipo: tipoRelativetoB };
    } else {
      relsB.push({ idDemanda: idA, tipo: tipoRelativetoB });
    }

    // DB Updates
    await updateDemanda(idA, { tarefasAssociadasIds: assocIdsA, relacoes: relsA });
    await updateDemanda(idB, { tarefasAssociadasIds: assocIdsB, relacoes: relsB });
    
    // Update local selected states if currently open
    if (selectedDemanda && selectedDemanda.id === idA) {
      setSelectedDemanda(prev => prev ? { ...prev, tarefasAssociadasIds: assocIdsA, relacoes: relsA } : null);
    } else if (selectedDemanda && selectedDemanda.id === idB) {
      setSelectedDemanda(prev => prev ? { ...prev, tarefasAssociadasIds: assocIdsB, relacoes: relsB } : null);
    }
  };

  const removeRelationBidirectional = async (idA: string, idB: string) => {
    const demA = demandas.find(d => d.id === idA);
    const demB = demandas.find(d => d.id === idB);

    if (demA) {
      const assocIdsA = (demA.tarefasAssociadasIds || []).filter(id => id !== idB);
      const relsA = (demA.relacoes || []).filter(r => r.idDemanda !== idB);
      await updateDemanda(idA, { tarefasAssociadasIds: assocIdsA, relacoes: relsA });
      if (selectedDemanda && selectedDemanda.id === idA) {
        setSelectedDemanda(prev => prev ? { ...prev, tarefasAssociadasIds: assocIdsA, relacoes: relsA } : null);
      }
    }

    if (demB) {
      const assocIdsB = (demB.tarefasAssociadasIds || []).filter(id => id !== idA);
      const relsB = (demB.relacoes || []).filter(r => r.idDemanda !== idA);
      await updateDemanda(idB, { tarefasAssociadasIds: assocIdsB, relacoes: relsB });
      if (selectedDemanda && selectedDemanda.id === idB) {
        setSelectedDemanda(prev => prev ? { ...prev, tarefasAssociadasIds: assocIdsB, relacoes: relsB } : null);
      }
    }
  };

  // Open creation modal
  const handleOpenCreateDemand = (col: string) => {
    setEditId(null);
    setFormTitulo("");
    setFormTipo("Melhoria");
    setFormDescricao("");
    
    // Auto-calculate structural sequential ticket number
    const maxNumber = demandas.reduce((max, x) => {
      const parsed = parseInt(x.numeroChamado, 10);
      return !isNaN(parsed) && parsed > max ? parsed : max;
    }, 10000);
    const newSeq = (maxNumber + 1).toString();
    setFormNumeroChamado(newSeq);

    setFormTags(["SaaS", "Core", "Dev"]);
    setFormCriticidade("Padrão");
    setFormColuna(col || (activeProj?.workflow && activeProj.workflow.length > 0 ? activeProj.workflow[0] : "A Fazer"));
    
    // Reset specific sub-fields for Bug and Change
    setFormNumeroCliente("");
    setFormPassoAPasso("");
    setFormJustificativa("");
    setFormServicosAfetados("");
    setFormImpacto("BAIXO");
    setFormRisco("BAIXO");
    setFormPrioridade("BAIXO");
    setFormIndisponibilidade("Não");
    setFormPlanoImplementacao("");
    setFormPlanoRollback("");
    setFormResponsavelGeral("");
    setFormInicioGeral("");
    setFormFimGeral("");
    setFormTarefasMudanca([]);
    setFormTarefasAssociadasIds([]);
    setFormRelacoes([]);
    setFormSelectedRelOption("irma");
    setTempTaskResponsavel("");
    setTempTaskDescricao("");
    setTempTaskInicio("");
    setTempTaskFim("");

    // Reset billing info
    setFormCobrarEmContrato(false);
    setFormCobrarContratoMes("");

    // Custom form reset
    setFormvaloresCamposCustom({});
    setFormPassosQA([]);
    setFormStatusQA("Reproduzido");
    setFormAmbiente("DEV");
    setFormSubTipoBug("Front");
    setFormStatusProposta("Em análise");
    setFormClienteResponsavelId("");
    setFormIdQAManager("");
    setActiveDemandFormTab("resumo");

    // Choose first GMZ user by default
    const gmzList = pessoas.filter((p) => p.tipo === "GMZ");
    const initialDesignado = gmzList.length > 0 ? gmzList[0].id : "";
    setFormDesignado(initialDesignado);
    setFormDesignados(initialDesignado ? [initialDesignado] : []);
    setFormResponsavelId(activeUser?.id || "");
    setFormEstimativa(8);
    setFormAtividadeEstimativa(activeProj?.atividades && activeProj.atividades.length > 0 ? activeProj.atividades[0] : "");
    setFormEstimativas([]);
    setFormAnexos([]);
    setFormContratoId(contratos.length > 0 ? contratos[0].id : "");
    
    // Select first business associated with the contracts of active project
    const projectContracts = contratos.filter((c) => activeProj?.contratoIds?.includes(c.id));
    const allowedEmpresaIds = Array.from(new Set(projectContracts.flatMap((c) => c.empresaIds || [])));
    const allowedEmpresas = empresas.filter((emp) => allowedEmpresaIds.includes(emp.id));
    const initialEmpresa = allowedEmpresas.length > 0 ? allowedEmpresas[0].id : "";
    setFormEmpresaId(initialEmpresa);
    setFormEmpresas(initialEmpresa ? [initialEmpresa] : []);
    
    // Reset combobox dropdown states
    setFilterPessoasText("");
    setIsOpenPessoasDropdown(false);
    setFilterEmpresasText("");
    setIsOpenEmpresasDropdown(false);

    setShowCreateModal(true);
  };

  const handleOpenEditDemand = (dem: Demanda) => {
    setEditId(dem.id);
    setFormTitulo(dem.titulo);
    setFormTipo((dem.tipo || "Melhoria") as any);
    setFormDescricao(dem.descricao);
    setFormNumeroChamado(dem.numeroChamado);
    setFormTags(dem.tags || []);
    setFormCriticidade(dem.criticidade);
    setFormColuna(dem.coluna);
    setFormDesignado(dem.idDesignado || "");
    setFormDesignados(dem.idDesignados && dem.idDesignados.length > 0 ? dem.idDesignados : (dem.idDesignado ? [dem.idDesignado] : []));
    setFormResponsavelId(dem.idResponsavel || dem.idDesignado || activeUser?.id || "");
    setFormEstimativa(8);
    setFormAtividadeEstimativa(activeProj?.atividades && activeProj.atividades.length > 0 ? activeProj.atividades[0] : "");

    // Load BUG/Change specific parameters
    setFormNumeroCliente(dem.numeroCliente || "");
    const parsedSteps = parseSteps(dem.passoAPasso);
    setFormPassosQA(parsedSteps);
    setFormStatusQA(dem.statusQA || "Reproduzido");
    setFormAmbiente(dem.ambiente || "DEV");
    setFormSubTipoBug(dem.subTipoBug || "Front");
    setFormStatusProposta(dem.statusProposta || "Em análise");
    setFormClienteResponsavelId(dem.idClienteResponsavel || "");
    setFormIdQAManager(dem.idQAManager || "");

    setFormPassoAPasso(dem.passoAPasso || "");
    setFormJustificativa(dem.justificativa || "");
    setFormServicosAfetados(dem.servicosAfetados || "");
    setFormImpacto(dem.impacto || "BAIXO");
    setFormRisco(dem.risco || "BAIXO");
    setFormPrioridade(dem.prioridade || "BAIXO");
    setFormIndisponibilidade(dem.indisponibilidade || "Não");
    setFormPlanoImplementacao(dem.planoImplementacao || "");
    setFormPlanoRollback(dem.planoRollback || "");
    setFormResponsavelGeral(dem.responsavelGeral || "");
    setFormInicioGeral(dem.inicioGeral || "");
    setFormFimGeral(dem.fimGeral || "");
    setFormTarefasMudanca(dem.tarefasMudanca || []);
    setFormTarefasAssociadasIds(dem.tarefasAssociadasIds || []);
    setFormRelacoes(dem.relacoes || []);
    setFormSelectedRelOption("irma");
    setTempTaskResponsavel("");
    setTempTaskDescricao("");
    setTempTaskInicio("");
    setTempTaskFim("");

    if (dem.estimativas && dem.estimativas.length > 0) {
      setFormEstimativas(dem.estimativas);
    } else {
      setFormEstimativas([
        {
          id: "initial",
          horas: dem.estimativaHoras || 8,
          atividade: dem.atividade || (activeProj?.atividades?.[0] || "Desenvolvimento")
        }
      ]);
    }
    
    // Auto find associated contract if we saved it (or first)
    setFormContratoId(contratos.length > 0 ? contratos[0].id : "");
    setFormEmpresaId(dem.idEmpresa || "");
    setFormEmpresas(dem.idEmpresas && dem.idEmpresas.length > 0 ? dem.idEmpresas : (dem.idEmpresa ? [dem.idEmpresa] : []));
    setFormAnexos(dem.anexos || []);

    // Load billing info
    setFormCobrarEmContrato(dem.cobrarEmContrato || false);
    setFormCobrarContratoMes(dem.cobrarContratoMes || "");

    // Reset combobox dropdown states
    setFilterPessoasText("");
    setIsOpenPessoasDropdown(false);
    setFilterEmpresasText("");
    setIsOpenEmpresasDropdown(false);

    // Custom form load
    setFormvaloresCamposCustom(dem.valoresCamposCustom || {});
    setActiveDemandFormTab("resumo");

    setShowCreateModal(true);
  };

  const handleSaveDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) return;

    const isBugOrIncidente = formTipo === "BUG" || formTipo === "Incidente" || formTipo === "Task";
    if (!isBugOrIncidente && formDesignados.length === 0) {
      addToast("Selecione pelo menos um responsável!", "error");
      return;
    }

    // Auto-populate fallback companies if none are selected, avoiding blocking the user
    let finalEmpresas = [...formEmpresas];
    if (formTipo !== "Change" && finalEmpresas.length === 0) {
      const projectContracts = contratos.filter((c) => activeProj?.contratoIds?.includes(c.id));
      const allowedEmpIdList = Array.from(new Set(projectContracts.flatMap((c) => c.empresaIds || [])));
      const fallbackEmpId = allowedEmpIdList[0] || (empresas && empresas[0]?.id) || "";
      if (fallbackEmpId) {
        finalEmpresas = [fallbackEmpId];
      } else {
        addToast("Aviso: Nenhuma empresa cliente configurada no sistema. Associando sem empresa.", "success");
      }
    }

    // Auto-populate fallback estimation if empty, so the user doesn't get blocked
    let finalEstimativas = [...formEstimativas];
    if (finalEstimativas.length === 0) {
      finalEstimativas = [
        {
          id: "default_" + Date.now(),
          horas: Number(formEstimativa) || 8,
          atividade: formAtividadeEstimativa || (activeProj?.atividades?.[0] || "Desenvolvimento")
        }
      ];
    }

    const totalEstimativaHoras = finalEstimativas.reduce((acc, curr) => acc + curr.horas, 0);

    const customTypeMatch = activeProj?.tiposDemandasCustom?.find(ct => ct.nome === formTipo);
    const tipoCustomId = customTypeMatch ? customTypeMatch.id : undefined;

    const payload: Partial<Demanda> = {
      titulo: formTitulo,
      tipo: formTipo,
      tipoCustomId,
      valoresCamposCustom: formvaloresCamposCustom,
      descricao: formDescricao,
      numeroChamado: formNumeroChamado,
      numeroCliente: formNumeroCliente,
      tags: formTipo === "Change" ? [] : formTags,
      criticidade: formTipo === "Change" ? "Padrão" : formCriticidade,
      idProjeto: activeProj?.id || "",
      coluna: formColuna,
      idDesignado: formDesignados[0] || "",
      idDesignados: formDesignados,
      idResponsavel: formResponsavelId || activeUser?.id || "",
      priorizadoFila: editId ? (demandas.find(d => d.id === editId)?.priorizadoFila || false) : false,
      cobrarEmContrato: formCobrarEmContrato,
      cobrarContratoMes: formCobrarContratoMes,
      estimativaHoras: totalEstimativaHoras,
      atividade: finalEstimativas[0]?.atividade || "",
      estimativas: finalEstimativas,
      idEmpresa: formTipo === "Change" ? "" : (finalEmpresas[0] || ""),
      idEmpresas: formTipo === "Change" ? [] : finalEmpresas,
      anexos: formAnexos,
      passoAPasso: JSON.stringify(formPassosQA),
      justificativa: formTipo === "Change" ? formJustificativa : "",
      servicosAfetados: formTipo === "Change" ? formServicosAfetados : "",
      impacto: formTipo === "Change" ? formImpacto : "BAIXO",
      risco: formTipo === "Change" ? formRisco : "BAIXO",
      prioridade: formTipo === "Change" ? formPrioridade : "BAIXO",
      indisponibilidade: formTipo === "Change" ? formIndisponibilidade : "Não",
      planoImplementacao: formTipo === "Change" ? formPlanoImplementacao : "",
      planoRollback: formTipo === "Change" ? formPlanoRollback : "",
      responsavelGeral: formTipo === "Change" ? formResponsavelGeral : "",
      inicioGeral: formTipo === "Change" ? formInicioGeral : "",
      fimGeral: formTipo === "Change" ? formFimGeral : "",
      tarefasMudanca: formTipo === "Change" ? formTarefasMudanca : [],
      tarefasAssociadasIds: formTarefasAssociadasIds,
      statusQA: formStatusQA,
      idQAManager: formIdQAManager,
      ambiente: (formTipo === "BUG" || formTipo === "Incidente" || formTipo === "Task") ? formAmbiente : undefined,
      subTipoBug: (formTipo === "BUG" || formTipo === "Incidente" || formTipo === "Task") ? formSubTipoBug : undefined,
      statusProposta: formTipo === "Melhoria" ? formStatusProposta : undefined,
      idClienteResponsavel: formTipo === "Melhoria" ? formClienteResponsavelId : undefined,
      relacoes: formRelacoes
    };

    const inverseTipoMap = {
      filha: "pai" as const,
      pai: "filha" as const,
      irma: "irma" as const
    };

    if (editId) {
      await updateDemanda(editId, payload);
      
      // Update other side's relationships
      const previousDem = demandas.find(d => d.id === editId);
      const previousIds = previousDem?.tarefasAssociadasIds || [];
      const addedIds = formTarefasAssociadasIds.filter(id => !previousIds.includes(id));
      const removedIds = previousIds.filter(id => !formTarefasAssociadasIds.includes(id));

      // Handle removed
      for (const removedId of removedIds) {
        const demObj = demandas.find(d => d.id === removedId);
        if (demObj) {
          const otherIds = (demObj.tarefasAssociadasIds || []).filter(id => id !== editId);
          const otherRels = (demObj.relacoes || []).filter(r => r.idDemanda !== editId);
          await updateDemanda(removedId, { tarefasAssociadasIds: otherIds, relacoes: otherRels });
        }
      }

      // Handle added / updated relations
      for (const linkedId of formTarefasAssociadasIds) {
        const demObj = demandas.find(d => d.id === linkedId);
        if (demObj) {
          const otherIds = Array.from(new Set([...(demObj.tarefasAssociadasIds || []), editId]));
          
          // Find relation detail we chose
          const relEntry = formRelacoes.find(r => r.idDemanda === linkedId) || { idDemanda: linkedId, tipo: "irma" as const };
          const invTipo = inverseTipoMap[relEntry.tipo];

          const otherRels = [...(demObj.relacoes || [])];
          const existIdx = otherRels.findIndex(r => r.idDemanda === editId);
          if (existIdx >= 0) {
            otherRels[existIdx] = { idDemanda: editId, tipo: invTipo };
          } else {
            otherRels.push({ idDemanda: editId, tipo: invTipo });
          }

          await updateDemanda(linkedId, { tarefasAssociadasIds: otherIds, relacoes: otherRels });
        }
      }

      // Update selected Demanda view live if it matches the edited one
      if (selectedDemanda && selectedDemanda.id === editId) {
        setSelectedDemanda({ ...selectedDemanda, ...payload });
      }
    } else {
      let finalPayload = { ...payload };
      if (linkingParentId) {
        const currentAssoc = Array.from(new Set([...(payload.tarefasAssociadasIds || []), linkingParentId]));
        const currentRels = [...(payload.relacoes || [])];
        if (!currentRels.some(r => r.idDemanda === linkingParentId)) {
          currentRels.push({ idDemanda: linkingParentId, tipo: "pai" as const });
        }
        finalPayload.tarefasAssociadasIds = currentAssoc;
        finalPayload.relacoes = currentRels;
      }

      const newId = await addDemanda(finalPayload as any);
      
      // Reset filters so the newly created task immediately shows up!
      setSearch("");
      setFilterCriticidade("");
      setFilterTipoDemanda("");
      localStorage.removeItem("kanban_filter_tipo_demanda");

      if (newId && linkingParentId) {
        const demA = demandas.find(d => d.id === linkingParentId);
        if (demA) {
          const assocIdsA = Array.from(new Set([...(demA.tarefasAssociadasIds || []), newId]));
          const relsA = [...(demA.relacoes || [])];
          const existingRelIndexA = relsA.findIndex(r => r.idDemanda === newId);
          if (existingRelIndexA >= 0) {
            relsA[existingRelIndexA] = { idDemanda: newId, tipo: "filha" as const };
          } else {
            relsA.push({ idDemanda: newId, tipo: "filha" as const });
          }
          await updateDemanda(linkingParentId, { tarefasAssociadasIds: assocIdsA, relacoes: relsA });
        }
        setLinkingParentId(null);
        addToast("Nova Demanda do tipo BUG vinculada automaticamente como filha!", "success");
      }

      // Link other side
      for (const linkedId of formTarefasAssociadasIds) {
        const demObj = demandas.find(d => d.id === linkedId);
        if (demObj) {
          const otherIds = Array.from(new Set([...(demObj.tarefasAssociadasIds || []), newId]));
          
          const relEntry = formRelacoes.find(r => r.idDemanda === linkedId) || { idDemanda: linkedId, tipo: "irma" as const };
          const invTipo = inverseTipoMap[relEntry.tipo];

          const otherRels = [...(demObj.relacoes || [])];
          const existIdx = otherRels.findIndex(r => r.idDemanda === newId);
          if (existIdx >= 0) {
            otherRels[existIdx] = { idDemanda: newId, tipo: invTipo };
          } else {
            otherRels.push({ idDemanda: newId, tipo: invTipo });
          }

          await updateDemanda(linkedId, { tarefasAssociadasIds: otherIds, relacoes: otherRels });
        }
      }
    }
    setShowCreateModal(false);
    setLinkingParentId(null);
  };

  // Color classes for solidity of cards based on criticality
  const getCriticalityColorClasses = (crit: string) => {
    switch (crit) {
      case "Baixa":
        return "bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white";
      case "Média":
        return "bg-amber-500 border-amber-400 hover:bg-amber-400 text-neutral-950";
      case "Alta":
        return "bg-rose-600 border-rose-500 hover:bg-rose-500 text-white";
      case "Urgente":
        return "bg-pink-600 border-pink-500 hover:bg-pink-500 text-white";
      case "Padrão":
      default:
        return "bg-blue-600 border-blue-500 hover:bg-blue-500 text-white";
    }
  };

  const getRelationDisplayDetails = (type: "filha" | "pai" | "irma") => {
    switch (type) {
      case "filha":
        return { 
          label: "Filha (Subtarefa)", 
          badgeClasses: "bg-pink-950/40 text-pink-400 border border-pink-900/40" 
        };
      case "pai":
        return { 
          label: "Pai (Predecessora)", 
          badgeClasses: "bg-indigo-950/40 text-indigo-400 border border-indigo-900/40" 
        };
      case "irma":
      default:
        return { 
          label: "Irmã (Relacionada)", 
          badgeClasses: "bg-teal-950/40 text-teal-400 border border-teal-900/40" 
        };
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
      case "Task":
        return {
          prefix: "TSK",
          label: "Task",
          borderL: "border-l-cyan-500",
          cardAccentBg: "bg-cyan-500/10",
          badgeClasses: "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400",
          headerColor: "text-cyan-400 font-bold",
          badgeDot: "bg-cyan-500"
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

  // Helper rich editing injection actions
  const injectHTMLTag = (tagOpen: string, tagClose: string) => {
    // Basic text append for simplified Quill style input
    setFormDescricao((prev) => `${prev}${tagOpen}Nova Palavra${tagClose}`);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Board controls heading */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl">
        <div className="space-y-1.5 flex-1 w-full">
          <label className="text-[10px] font-bold text-indigo-400 tracking-wider font-mono uppercase">Módulo Kanban Interativo</label>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              Quadro de Demandas:
            </h2>
            <select
              value={activeProjetoId}
              onChange={(e) => setActiveProjetoId(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm font-bold rounded-xl py-1.5 px-3 focus:outline-hidden cursor-pointer"
            >
              {allowedProjetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters strip */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 sm:max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Pesquisar Chamado, Tag ou Título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-neutral-200 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <select
            value={filterCriticidade}
            onChange={(e) => setFilterCriticidade(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs rounded-xl py-2 px-3 outline-none"
          >
            <option value="">Criticidades (Todas)</option>
            <option value="Baixa">Baixa (Verde)</option>
            <option value="Média">Média (Amarelo)</option>
            <option value="Alta">Alta (Vermelho)</option>
            <option value="Urgente">Urgente (Rosa)</option>
            <option value="Padrão">Padrão (Azul)</option>
          </select>

          <select
            value={filterTipoDemanda}
            onChange={(e) => handleSetFilterTipoDemanda(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs rounded-xl py-2 px-3 outline-none"
          >
            <option value="">Tipos (Todos)</option>
            <option value="Melhoria">Melhoria</option>
            <option value="Incidente">Incidente</option>
            <option value="Change">Change (Mudança)</option>
            <option value="BUG">Defeito / BUG</option>
            <option value="Outros">Outros</option>
          </select>

          <button
            onClick={() => setShowTrashModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-950 border border-neutral-800 hover:border-rose-500/50 hover:bg-rose-955/20 text-neutral-400 hover:text-rose-400 text-xs rounded-xl transition-all cursor-pointer font-bold shrink-0"
            title="Visualizar lixeira de itens excluídos para este projeto"
          >
            <Trash2 size={13} className="text-rose-500" />
            <span>Lixeira</span>
            {(() => {
              const count = demandas.filter((d) => d.idProjeto === activeProj.id && d.excluido).length;
              if (count > 0) {
                return (
                  <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold animate-pulse">
                    {count}
                  </span>
                );
              }
              return null;
            })()}
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none items-start">
        {activeProj?.workflow?.map((colName) => {
          const colDemands = filteredDemands.filter((d) => d.coluna === colName);
          const isCollapsed = !!collapsedColumns[colName];

          if (isCollapsed) {
            return (
              <div
                key={colName}
                onClick={() => setCollapsedColumns(prev => ({ ...prev, [colName]: false }))}
                className="bg-neutral-900/40 border border-neutral-800/80 hover:bg-neutral-900/60 hover:border-neutral-700/60 transition-all rounded-2xl p-2 w-12 min-w-[48px] flex flex-col h-[650px] items-center cursor-pointer select-none"
                title="Clique para expandir esta coluna"
              >
                <div className="flex flex-col items-center gap-2 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold bg-neutral-950 border border-neutral-800 text-indigo-400 px-1.5 py-0.5 rounded-full font-mono">
                    {colDemands.length}
                  </span>
                </div>
                
                <div className="flex-1 flex justify-center items-center">
                  <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono select-none" style={{ writingMode: "vertical-rl" }}>
                    {colName}
                  </h3>
                </div>

                <div className="text-neutral-500 hover:text-indigo-400 p-1 rounded-lg">
                  <Plus size={12} />
                </div>
              </div>
            );
          }

          return (
            <div
              key={colName}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colName)}
              className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 min-w-[300px] max-w-[310px] flex-1 flex flex-col h-[650px] transition-all"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-850">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-widest">{colName}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold bg-neutral-950 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full font-mono">
                    {colDemands.length}
                  </span>
                  
                  {/* Create item shortcut */}
                  <button
                    onClick={() => handleOpenCreateDemand(colName)}
                    className="p-1 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-950 border border-transparent hover:border-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Adicionar Demanda nesta coluna"
                  >
                    <Plus size={13} />
                  </button>

                  {/* Collapse column trigger */}
                  <button
                    onClick={() => setCollapsedColumns(prev => ({ ...prev, [colName]: true }))}
                    className="p-1 text-neutral-500 hover:text-indigo-400 hover:bg-neutral-950 border border-transparent hover:border-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Minimizar Coluna"
                  >
                    <ChevronLeft size={13} />
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {colDemands.map((d) => {
                  const assignee = pessoas.find((p) => p.id === d.idDesignado);
                  const typeDetails = getDemandTypeDetails(d.tipo);
                  
                  return (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, d.id)}
                      onDoubleClick={() => handleSelectDemanda(d)}
                      className={`group p-4 shadow-md hover:scale-[1.01] hover:-rotate-1 active:rotate-1 hover:shadow-lg transition-all duration-200 relative select-none cursor-grab active:cursor-grabbing border border-l-[6px] ${typeDetails.borderL} ${getCriticalityColorClasses(
                        d.criticidade
                      )}`}
                      style={{ borderRadius: "3px" }}
                      title="Dê duplo clique para visualizar detalhes completos"
                    >
                      {/* Optimistic UI indicator */}
                      {d.sincronizando && (
                        <div className="absolute inset-0 bg-neutral-950/70 block backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[3px]">
                          <span className="animate-pulse font-mono text-[9px] uppercase tracking-widest text-indigo-400 font-bold bg-neutral-900 px-2 py-1 rounded border border-indigo-500/20">
                            Sincronizando...
                          </span>
                        </div>
                      )}

                      {/* Header tags with light overlays */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span 
                            className="text-[9px] font-mono font-bold uppercase py-0.5 px-1.5 rounded bg-black/35 text-white border border-white/10 shrink-0"
                            title={`Tipo: ${typeDetails.label}`}
                          >
                            {typeDetails.prefix}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-white/90 bg-black/15 px-1.5 py-0.5 rounded-sm shrink-0">
                            {d.numeroChamado}
                          </span>
                          {d.numeroCliente && (
                            <span className="text-[8px] font-mono font-bold text-indigo-200 bg-indigo-950/40 px-1 py-0.5 rounded border border-indigo-700/25 truncate max-w-[70px]" title={`Nº do Cliente: ${d.numeroCliente}`}>
                              Nº: {d.numeroCliente}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const isPrioritized = !d.priorizadoFila;
                              const isManager = activeUser?.perfil === "Administrador" || activeUser?.perfil === "Gerencial";
                              
                              if (isPrioritized) {
                                await updateDemanda(d.id, { 
                                  priorizadoFila: true, 
                                  filaAprovada: isManager ? true : false 
                                });
                                
                                const proj = projetos.find(p => p.id === d.idProjeto);
                                const currentGestores = proj?.gestoresIds || [];
                                const creatorName = activeUser?.nome || "Colaborador";

                                if (!isManager) {
                                  // Send awaiting manager approval notifications & emails
                                  const baseMessage = `A demanda ${d.numeroChamado} enviada por ${creatorName} está aguardando sua aprovação`;
                                  if (currentGestores.length > 0) {
                                    for (const gId of currentGestores) {
                                      await addAlerta({
                                        titulo: `Aprovação Pendente: ${d.numeroChamado}`,
                                        mensagem: baseMessage,
                                        recipientId: gId,
                                        type: "prioridade_update",
                                        targetPessoaId: d.idDesignado || d.idResponsavel || activeUser?.id || ""
                                      });
                                      
                                      const gestorObj = pessoas.find(p => p.id === gId);
                                      if (gestorObj?.email) {
                                        await addEmailFila({
                                          assunto: `Aprovação Pendente de Fila: Demanda ${d.numeroChamado}`,
                                          destinatarios: gestorObj.email,
                                          processo: "Priorização de Demanda"
                                        });
                                      }
                                    }
                                  } else {
                                    // Fallback to gerencial alerts and emails
                                    await addAlerta({
                                      titulo: `Aprovação Pendente: ${d.numeroChamado}`,
                                      mensagem: baseMessage,
                                      recipientId: "gerencial",
                                      type: "prioridade_update",
                                      targetPessoaId: d.idDesignado || d.idResponsavel || activeUser?.id || ""
                                    });
                                    // Queue email to all gerenciais
                                    const allManagers = pessoas.filter(p => p.perfil === "Gerencial" || p.perfil === "Administrador");
                                    const managerEmails = allManagers.map(p => p.email).filter(Boolean).join(", ");
                                    if (managerEmails) {
                                      await addEmailFila({
                                        assunto: `Aprovação Pendente de Fila: Demanda ${d.numeroChamado}`,
                                        destinatarios: managerEmails,
                                        processo: "Priorização de Demanda"
                                      });
                                    }
                                  }
                                } else {
                                  // Manager approved direct prioritize
                                  if (d.idDesignado && d.idDesignado !== activeUser?.id) {
                                    await addAlerta({
                                      titulo: "Priorização de Demanda",
                                      mensagem: `a demanda ${d.numeroChamado} foi enviada para a sua fila de priorização pelo gestor ${activeUser?.nome || "Gestor"}`,
                                      recipientId: d.idDesignado,
                                      type: "prioridade_update"
                                    });
                                    const techP = pessoas.find(p => p.id === d.idDesignado);
                                    if (techP?.email) {
                                      await addEmailFila({
                                        assunto: `Nova Demanda Priorizada na Fila: ${d.numeroChamado}`,
                                        destinatarios: techP.email,
                                        processo: "Aprovação pelo Gestor"
                                      });
                                    }
                                  }
                                }

                                addToast(
                                  isManager 
                                    ? "Enviado e Aprovado para a Fila de Prioridades do Técnico!" 
                                    : "Enviado para a fila de prioridades! Pendente de aprovação do Gestor.", 
                                  "success"
                                );
                              } else {
                                await updateDemanda(d.id, { 
                                  priorizadoFila: false,
                                  filaAprovada: false
                                });
                                addToast("Removido da Fila de Prioridades!", "success");
                              }
                            }}
                            className={`p-1 rounded-sm cursor-pointer transition flex items-center justify-center ${
                              d.priorizadoFila 
                                ? d.filaAprovada === false
                                  ? "bg-neutral-600/30 text-neutral-400 border border-neutral-600/40 hover:bg-neutral-600/40 animate-pulse"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/35" 
                                : "text-white/60 hover:text-white bg-black/10 hover:bg-black/15"
                            }`}
                            title={
                              d.priorizadoFila 
                                ? d.filaAprovada === false
                                  ? "Fila de Prioridades (Pendente de Aprovação do Gestor) - Clique para remover"
                                  : "Fila de Prioridades (Aprovado e Ativo) - Clique para remover"
                                : "Enviar para Fila de Prioridades do Técnico"
                            }
                          >
                            <Zap size={11} className={d.priorizadoFila ? d.filaAprovada === false ? "text-neutral-400" : "fill-amber-400 animate-pulse text-amber-400" : ""} />
                          </button>

                          {/* Three-dots menu popover trigger */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCardMenuId(activeCardMenuId === d.id ? null : d.id);
                              }}
                              className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1 rounded-sm cursor-pointer transition"
                              title="Opções"
                            >
                              <MoreHorizontal size={12} />
                            </button>

                            {activeCardMenuId === d.id && (
                            <>
                              {/* Backdrop glass click catcher */}
                              <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveCardMenuId(null); }}></div>
                              <div className="absolute right-0 top-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1.5 shadow-2 network-popover z-30 min-w-[150px] flex flex-col text-left">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleSelectDemanda(d); setActiveCardMenuId(null); }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 text-[10px] font-semibold w-full text-left"
                                >
                                  <Eye size={11} className="text-neutral-400" /> Ver Detalhes
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditDemand(d); setActiveCardMenuId(null); }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 text-neutral-300 text-[10px] font-semibold w-full text-left"
                                >
                                  <Edit size={11} className="text-neutral-400" /> Editar Registro
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDuplicateDemanda(d); setActiveCardMenuId(null); }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 text-indigo-400 text-[10px] font-semibold w-full text-left"
                                >
                                  <Copy size={11} className="text-indigo-450" /> Clonar Card
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCopyLink(d); setActiveCardMenuId(null); }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-800 text-cyan-400 text-[10px] font-semibold w-full text-left"
                                >
                                  <Link2 size={11} className="text-cyan-455" /> Copiar Link
                                </button>
                                <div className="border-t border-neutral-800/80 my-1"></div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCardMenuId(null);
                                    setConfirmState({
                                      isOpen: true,
                                      title: "Enviar para a Lixeira",
                                      description: `Deseja enviar essa Demanda "${d.titulo}" para a Lixeira? Você poderá restaurá-la a qualquer momento.`,
                                      onConfirm: () => deleteDemanda(d.id, false)
                                    });
                                  }}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-rose-950/25 text-rose-400 text-[10px] font-semibold w-full text-left"
                                >
                                  <Trash2 size={11} className="text-rose-500" /> Excluir Card
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold leading-relaxed mb-3 pr-2 break-words">
                        {d.titulo}
                      </h4>

                      {/* Bottom line layout */}
                      <div className="flex items-center justify-between border-t border-black/10 pt-2.5 mt-2.5 text-white/80 font-sans text-[10px] gap-1">
                        <span className="flex items-center gap-1 shrink-0" title={d.atividade ? `Atividade da Estimativa: ${d.atividade}` : ""}>
                          <Clock size={10} /> Est: {d.estimativaHoras}h {d.atividade && `(${d.atividade})`}
                        </span>

                        {(() => {
                          const associatedEmpresas = d.idEmpresas && d.idEmpresas.length > 0 
                            ? empresas.filter(e => d.idEmpresas?.includes(e.id))
                            : (d.idEmpresa ? empresas.filter(e => e.id === d.idEmpresa) : []);

                          if (associatedEmpresas.length === 0) return null;
                          const names = associatedEmpresas.map(e => e.nome).join(", ");
                          const displayName = associatedEmpresas[0].nome;
                          const count = associatedEmpresas.length;

                          return (
                            <span 
                              className="font-bold bg-white/15 px-1.5 py-0.5 rounded uppercase tracking-wide text-[8px] truncate max-w-[95px] shrink" 
                              title={`Empresas: ${names}`}
                            >
                              🏢 {displayName}{count > 1 ? ` +${count - 1}` : ""}
                            </span>
                          );
                        })()}

                        {(() => {
                          const owner = pessoas.find(p => p.id === d.idResponsavel);
                          if (!owner) return null;
                          const getInitials = (nome: string) => {
                            const parts = nome.trim().split(/\s+/);
                            if (parts.length === 0) return "";
                            if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          };
                          const getAvatarColor = (name: string) => {
                            const colors = [
                              "bg-red-500/20 border-red-500/45 text-red-300",
                              "bg-orange-500/20 border-orange-500/45 text-orange-300",
                              "bg-yellow-500/20 border-yellow-500/45 text-yellow-300",
                              "bg-green-500/20 border-green-500/45 text-green-300",
                              "bg-teal-500/20 border-teal-500/45 text-teal-300",
                              "bg-blue-500/20 border-blue-500/45 text-blue-300",
                              "bg-indigo-500/20 border-indigo-500/45 text-indigo-300",
                              "bg-purple-500/20 border-purple-500/45 text-purple-300",
                              "bg-pink-500/20 border-pink-500/45 text-pink-300",
                            ];
                            let hash = 0;
                            for (let i = 0; i < name.length; i++) {
                              hash = name.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const index = Math.abs(hash) % colors.length;
                            return colors[index];
                          };
                          const initials = getInitials(owner.nome);
                          const colorClasses = getAvatarColor(owner.nome);
                          return (
                            <span 
                              className={`flex items-center justify-center w-5 h-5 rounded-full border text-[9px] font-extrabold font-mono tracking-tighter shrink-0 cursor-help shadow-sm ${colorClasses}`}
                              title={`Responsável Principal: ${owner.nome}`}
                            >
                              {initials}
                            </span>
                          );
                        })()}

                        {(() => {
                          const associatedDesignados = d.idDesignados && d.idDesignados.length > 0
                            ? pessoas.filter(p => d.idDesignados?.includes(p.id))
                            : (d.idDesignado ? pessoas.filter(p => p.id === d.idDesignado) : []);

                          if (associatedDesignados.length === 0) return null;
                          const getInitials = (nome: string) => {
                            const parts = nome.trim().split(/\s+/);
                            if (parts.length === 0) return "";
                            if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          };
                          const getAvatarColor = (name: string) => {
                            const colors = [
                              "bg-sky-500/20 border-sky-500/45 text-sky-300",
                              "bg-emerald-500/20 border-emerald-500/45 text-emerald-300",
                              "bg-violet-500/20 border-violet-500/45 text-violet-300",
                              "bg-rose-500/20 border-rose-500/45 text-rose-300",
                              "bg-amber-500/20 border-amber-500/45 text-amber-300",
                              "bg-cyan-500/20 border-cyan-500/45 text-cyan-300",
                            ];
                            let hash = 0;
                            for (let i = 0; i < name.length; i++) {
                              hash = name.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            const index = Math.abs(hash) % colors.length;
                            return colors[index];
                          };

                          return (
                            <div className="flex -space-x-1 overflow-hidden shrink-0">
                              {associatedDesignados.map((p) => {
                                const initials = getInitials(p.nome);
                                const colorClasses = getAvatarColor(p.nome);
                                return (
                                  <span 
                                    key={p.id}
                                    className={`flex items-center justify-center w-5 h-5 rounded-full border text-[9px] font-extrabold font-mono tracking-tighter cursor-help shadow-sm ${colorClasses}`}
                                    title={`Designado: ${p.nome}`}
                                  >
                                    {initials}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Chips tags container */}
                      {d.tags && d.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {d.tags.map((tag) => (
                            <span key={tag} className="text-[8px] font-mono font-bold tracking-wide py-0.5 px-1 bg-white/10 text-white rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colDemands.length === 0 && (
                  <div className="border border-dashed border-neutral-800 text-center py-6 rounded-xl text-neutral-500 font-sans text-[11px] italic">
                    Nenhuma demanda nesta etapa.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED PANEL OVERLAY MODAL */}
      {selectedDemanda && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-[96vw] xl:max-w-[94vw] overflow-hidden shadow-2xl animate-scale-in my-8 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 text-neutral-100 flex items-start justify-between border-b border-neutral-800">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {demandaStack.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...demandaStack];
                        const last = copy.pop();
                        setDemandaStack(copy);
                        if (last) {
                          if (last.idProjeto && last.idProjeto !== activeProjetoId) {
                            setActiveProjetoId(last.idProjeto);
                          }
                          setSelectedDemanda(last);
                          setModalTab("tarefas");
                          const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?demanda=${last.id}`;
                          window.history.pushState({ path: newurl }, "", newurl);
                        } else {
                          handleCloseDetailModal();
                        }
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-900 hover:border-indigo-800 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition mr-2"
                      title="Voltar para a demanda anterior"
                    >
                      ← Voltar ({demandaStack.length})
                    </button>
                  )}
                  {(() => {
                    const typeDetails = getDemandTypeDetails(selectedDemanda.tipo);
                    return (
                      <span className="text-xs font-mono bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-md text-neutral-200 font-bold uppercase flex items-center gap-2">
                        <span className="text-indigo-400 font-extrabold">{typeDetails.prefix} - {selectedDemanda.numeroChamado}</span>
                        <span className="text-neutral-500 font-light">|</span>
                        <span className="text-neutral-400 font-sans font-medium">{typeDetails.label}</span>
                      </span>
                    );
                  })()}
                  {selectedDemanda.tipo !== "Change" && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${getCriticalityColorClasses(selectedDemanda.criticidade)}`}>
                      CRITICIDADE: {selectedDemanda.criticidade}
                    </span>
                  )}
                  {selectedDemanda.sincronizando && (
                    <span className="text-[10px] animate-pulse uppercase tracking-wider text-indigo-400 font-bold bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                      Sincronizando...
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-neutral-100 uppercase tracking-wide pt-1">
                  {selectedDemanda.titulo}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Concluir / Reiniciar */}
                <button
                  type="button"
                  onClick={async () => {
                    const currentVal = !!selectedDemanda.filaConcluida;
                    const newVal = !currentVal;
                    
                    let updatedPayload: any = {};
                    if (newVal) {
                      // Concluir
                      const lastCol = activeProj?.workflow && activeProj.workflow.length > 0 
                        ? activeProj.workflow[activeProj.workflow.length - 1] 
                        : "Concluído";
                      const now = new Date();
                      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                      
                      updatedPayload = {
                        filaConcluida: true,
                        filaConcluidaAt: now.toISOString(),
                        coluna: lastCol,
                        cobrarContratoMes: selectedDemanda.cobrarContratoMes || (selectedDemanda.cobrarEmContrato ? currentMonthYear : "")
                      };
                    } else {
                      // Reiniciar
                      const firstCol = activeProj?.workflow && activeProj.workflow.length > 0 
                        ? activeProj.workflow[0] 
                        : "A Fazer";
                      
                      updatedPayload = {
                        filaConcluida: false,
                        filaConcluidaAt: null,
                        coluna: firstCol,
                        cobrarEmContrato: false,
                        cobrarContratoMes: ""
                      };
                    }

                    await updateDemanda(selectedDemanda.id, updatedPayload);
                    setSelectedDemanda({ ...selectedDemanda, ...updatedPayload });
                    addToast(newVal ? "Demanda marcada como concluída na fila técnica!" : "Trabalho reiniciado na demanda.", "success");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    selectedDemanda.filaConcluida
                      ? "bg-amber-600/15 hover:bg-amber-600/30 text-amber-400 border-amber-900/40"
                      : "bg-emerald-600/15 hover:bg-emerald-650 text-emerald-400 hover:text-white border-emerald-900"
                  }`}
                >
                  {selectedDemanda.filaConcluida ? (
                    <>
                      <Play size={13} />
                      <span>Reiniciar Demanda</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Concluir Demanda</span>
                    </>
                  )}
                </button>

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditDemand(selectedDemanda);
                    setSelectedDemanda(null); // transition seamlessly to editing modal
                  }}
                  className="px-3 py-1.5 bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit size={13} />
                  <span>Editar</span>
                </button>

                <button 
                  onClick={handleCloseDetailModal} 
                  className="text-neutral-400 hover:text-neutral-100 transition-colors p-1 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg shrink-0 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/20 px-6 overflow-x-auto scroller-none select-none">
              {[
                { id: "resumo", label: "Resumo", icon: <ClipboardList size={14} /> },
                { id: "detalhes", label: selectedDemanda.tipo === "Melhoria" ? "Detalhes da Melhoria" : "Descrição & Detalhes", icon: <FileText size={14} /> },
                { id: "passopasso", label: "Passo a Passo & QA", icon: <Bug size={14} /> },
                { id: "tarefas", label: selectedDemanda.tipo === "Melhoria" ? `Tarefas Associadas (${selectedDemanda.tarefasAssociadasIds?.length || 0})` : `Tarefas & Relações (${selectedDemanda.tarefasAssociadasIds?.length || 0})`, icon: <Link2 size={14} /> },
                { id: "anexos", label: `Anexos (${selectedDemanda.anexos?.length || 0})`, icon: <Paperclip size={14} /> },
                { id: "comentarios", label: selectedDemanda.tipo === "Melhoria" ? "Comentários" : "Discussões (Aba Dupla)", icon: <MessageSquare size={14} /> },
                { id: "apontamentos", label: selectedDemanda.tipo === "Melhoria" ? "Apontamentos" : "Apontamento & Estimativas", icon: <Clock size={14} /> }
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
            <div className="flex-1 overflow-y-auto p-6 font-sans">

              {/* SUBTAB 0 RESUMO */}
              {modalTab === "resumo" && (
                selectedDemanda.tipo === "Melhoria" ? (
                  <div className="space-y-6 animate-fade-in text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                      <div className="space-y-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Número Interno</span>
                        <p className="text-sm font-semibold font-mono text-indigo-400">{selectedDemanda.numeroChamado}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Chamado do Cliente</span>
                        <p className="text-sm font-semibold text-neutral-200">{selectedDemanda.numeroCliente || <span className="text-neutral-600 italic">Nenhum</span>}</p>
                      </div>

                      <div className="space-y-1 col-span-2">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Título / Assunto Principal</span>
                        <p className="text-sm text-neutral-100 font-bold leading-relaxed">{selectedDemanda.titulo}</p>
                      </div>

                      <div className="space-y-1 col-span-2">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Descrição</span>
                        <div 
                          className="bg-neutral-950 border border-neutral-850/85 p-4 rounded-xl text-neutral-350 text-xs min-h-24 leading-relaxed font-sans select-text prose prose-invert max-w-none text-left"
                          dangerouslySetInnerHTML={{ __html: selectedDemanda.descricao || "<p class='text-neutral-600 italic'>Nenhum detalhe inserido.</p>" }}
                        />
                      </div>

                      <div className="col-span-2 py-3 mt-2 border-t border-neutral-850/50 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditDemand(selectedDemanda);
                              setSelectedDemanda(null);
                            }}
                            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Edit size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const currentVal = !selectedDemanda.filaConcluida;
                              
                              let updatedPayload: any = {};
                              if (currentVal) {
                                // Concluir
                                const lastCol = activeProj?.workflow && activeProj.workflow.length > 0 
                                  ? activeProj.workflow[activeProj.workflow.length - 1] 
                                  : "Concluído";
                                const now = new Date();
                                const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                
                                updatedPayload = {
                                  filaConcluida: true,
                                  filaConcluidaAt: now.toISOString(),
                                  coluna: lastCol,
                                  cobrarContratoMes: selectedDemanda.cobrarContratoMes || (selectedDemanda.cobrarEmContrato ? currentMonthYear : "")
                                };
                              } else {
                                // Reiniciar
                                const firstCol = activeProj?.workflow && activeProj.workflow.length > 0 
                                  ? activeProj.workflow[0] 
                                  : "A Fazer";
                                
                                updatedPayload = {
                                  filaConcluida: false,
                                  filaConcluidaAt: null,
                                  coluna: firstCol,
                                  cobrarEmContrato: false,
                                  cobrarContratoMes: ""
                                };
                              }

                              await updateDemanda(selectedDemanda.id, updatedPayload);
                              setSelectedDemanda({ ...selectedDemanda, ...updatedPayload });
                              addToast(currentVal ? "Demanda concluída na fila técnica!" : "Trabalho reiniciado na melhoria.", "success");
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                              selectedDemanda.filaConcluida
                                ? "bg-amber-600/15 hover:bg-amber-600/30 text-amber-400 border-amber-900/40"
                                : "bg-emerald-600/15 hover:bg-emerald-650 text-emerald-400 hover:text-white border-emerald-900"
                            }`}
                          >
                            {selectedDemanda.filaConcluida ? (
                              <>
                                <Play size={13} />
                                <span>Reiniciar Demanda</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} />
                                <span>Concluir Demanda</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div>
                          {selectedDemanda.filaConcluida ? (
                            <span className="text-xs bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 font-bold px-2.5 py-1 rounded-xl">
                              ✓ Concluída
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-900/10 border border-amber-800/25 text-amber-400 font-bold px-2.5 py-1 rounded-xl">
                              🕒 Pendente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedDemanda.filaConcluida && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-850 animate-slide-down text-left">
                        <div className="col-span-2 border-b border-neutral-800 pb-2 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                            <CreditCard size={14} className="text-emerald-400" />
                            Faturamento de Melhoria em Contrato
                          </h4>
                          {selectedDemanda.filaConcluidaAt && (
                            <span className="text-[10px] font-mono text-neutral-500">Conclusão em: {new Date(selectedDemanda.filaConcluidaAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Slide toggle button */}
                        <div className="flex flex-col gap-2 p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl justify-center">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-300">Cobrança em Contrato:</span>
                            <button
                              type="button"
                              onClick={async () => {
                                const updatedVal = !selectedDemanda.cobrarEmContrato;
                                const payload = { cobrarEmContrato: updatedVal };
                                await updateDemanda(selectedDemanda.id, payload);
                                setSelectedDemanda({ ...selectedDemanda, ...payload });
                                addToast(updatedVal ? "Faturamento de contrato habilitado!" : "Faturamento desabilitado.", "success");
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                selectedDemanda.cobrarEmContrato ? "bg-emerald-600" : "bg-neutral-800"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  selectedDemanda.cobrarEmContrato ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-[9px] text-neutral-500 pl-1 leading-relaxed">Habilite/desabilite a cobrança para esta melhoria integrada no faturamento.</p>
                        </div>

                        {/* Billing Month input */}
                        <div className="space-y-1.5 p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Mês-Referência de Cobrança</label>
                          <div className="flex gap-2">
                            <select
                              value={selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0')}
                              onChange={async (e) => {
                                const currentY = selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[0] : String(new Date().getFullYear());
                                const nextVal = `${currentY}-${e.target.value}`;
                                const updated = { ...selectedDemanda, cobrarContratoMes: nextVal };
                                setSelectedDemanda(updated);
                                await updateDemanda(selectedDemanda.id, { cobrarContratoMes: nextVal });
                              }}
                              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none hover:border-emerald-500/50 cursor-pointer w-1/2 font-sans"
                            >
                              <option value="01">Janeiro</option>
                              <option value="02">Fevereiro</option>
                              <option value="03 font-sans">Março</option>
                              <option value="04">Abril</option>
                              <option value="05">Maio</option>
                              <option value="06">Junho</option>
                              <option value="07">Julho</option>
                              <option value="08">Agosto</option>
                              <option value="09">Setembro</option>
                              <option value="10">Outubro</option>
                              <option value="11">Novembro</option>
                              <option value="12">Dezembro</option>
                            </select>

                            <select
                              value={selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[0] : String(new Date().getFullYear())}
                              onChange={async (e) => {
                                const currentM = selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0');
                                const nextVal = `${e.target.value}-${currentM}`;
                                const updated = { ...selectedDemanda, cobrarContratoMes: nextVal };
                                setSelectedDemanda(updated);
                                await updateDemanda(selectedDemanda.id, { cobrarContratoMes: nextVal });
                              }}
                              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none hover:border-emerald-500/50 cursor-pointer w-1/2 font-sans"
                            >
                              {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                    <div className="space-y-1 col-span-2">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Título / Assunto Principal</span>
                      <p className="text-sm text-neutral-105 font-semibold leading-relaxed">{selectedDemanda.titulo}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Tipo de Demanda</span>
                      <div className="text-sm text-neutral-250 font-bold flex items-center gap-1.5">
                        <span>{selectedDemanda.tipo}</span>
                        {selectedDemanda.tipoCustomId && (
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1 rounded">Custom</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Nº do Chamado</span>
                      <p className="text-sm font-mono text-indigo-400 font-bold">{selectedDemanda.numeroChamado}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Nº do Cliente para a Demanda</span>
                      <p className="text-sm text-neutral-200">{selectedDemanda.numeroCliente || <span className="text-neutral-600 italic">Nenhum</span>}</p>
                    </div>

                    {selectedDemanda.tipo !== "Change" && (
                      <div className="space-y-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Criticidade da Demanda</span>
                        <div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getCriticalityColorClasses(selectedDemanda.criticidade)}`}>
                            {selectedDemanda.criticidade}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Responsável (Dono ou Criador)</span>
                      <p className="text-sm text-neutral-200">
                        {pessoas.find(p => p.id === selectedDemanda.idResponsavel)?.nome || <span className="text-neutral-600 italic">Geral / Sem Atribuição</span>}
                      </p>
                    </div>

                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Responsável Técnico (Para Execução)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedDemanda.idDesignados && selectedDemanda.idDesignados.length > 0 ? (
                          selectedDemanda.idDesignados.map((id) => {
                            const p = pessoas.find((pers) => pers.id === id);
                            if (!p) return null;
                            return (
                              <span key={id} className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-semibold">
                                {p.nome}
                              </span>
                            );
                          })
                        ) : selectedDemanda.idDesignado ? (
                          (() => {
                            const p = pessoas.find((pers) => pers.id === selectedDemanda.idDesignado);
                            return p ? (
                              <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-semibold">
                                {p.nome}
                              </span>
                            ) : <span className="text-neutral-600 text-xs italic">Não atribuído</span>;
                          })()
                        ) : (
                          <span className="text-neutral-600 text-xs italic">Não atribuído</span>
                        )}
                      </div>
                    </div>

                    {selectedDemanda.tipo !== "Change" && (
                      <div className="space-y-1 col-span-2 md:col-span-1">
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Empresas Clientes Associadas</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedDemanda.idEmpresas && selectedDemanda.idEmpresas.length > 0 ? (
                            selectedDemanda.idEmpresas.map((id) => {
                              const emp = empresas.find((e) => e.id === id);
                              if (!emp) return null;
                              return (
                                <span key={id} className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-semibold">
                                  🏢 {emp.nome}
                                </span>
                              );
                            })
                          ) : selectedDemanda.idEmpresa ? (
                            (() => {
                              const emp = empresas.find((e) => e.id === selectedDemanda.idEmpresa);
                              return emp ? (
                                <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-semibold">
                                  🏢 {emp.nome}
                                </span>
                              ) : <span className="text-neutral-600 text-xs italic">Não associada</span>;
                            })()
                          ) : (
                            <span className="text-neutral-600 text-xs italic">Não associada</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Displaying system tags tags */}
                    <div className="space-y-1 col-span-2">
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">Etiquetas (Tags)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedDemanda.tags && selectedDemanda.tags.length > 0 ? (
                          selectedDemanda.tags.map((t, idx) => (
                            <span key={idx} className="bg-indigo-950 border border-indigo-900 text-indigo-300 text-[11px] px-2 py-0.5 rounded-md font-mono">
                              #{t}
                            </span>
                          ))
                        ) : (
                          <span className="text-neutral-600 text-xs italic">Nenhuma tag cadastrada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Faturamento e Status da Fila */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-850">
                    <div className="col-span-2 border-b border-neutral-800 pb-2 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Clock size={14} className="text-indigo-400" />
                        Faturamento & Cobrança de Contrato
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-500">Ações em tempo real</span>
                    </div>

                    <div className="flex flex-col gap-2 p-3 bg-neutral-900/40 border border-neutral-800/60 rounded-xl justify-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="viewCobrarEmContrato"
                          checked={!!selectedDemanda.cobrarEmContrato}
                          onChange={async (e) => {
                            const activeVal = e.target.checked;
                            let refMonth = selectedDemanda.cobrarContratoMes;
                            if (activeVal) {
                              const now = new Date();
                              refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            } else {
                              refMonth = "";
                            }
                            const payload = { cobrarEmContrato: activeVal, cobrarContratoMes: refMonth };
                            const updated = { ...selectedDemanda, ...payload };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, payload);
                          }}
                          className="w-4 h-4 text-indigo-600 bg-neutral-950 border-neutral-800 rounded focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="viewCobrarEmContrato" className="text-xs font-bold text-neutral-300 cursor-pointer select-none">
                          Cobrar demanda em contrato?
                        </label>
                      </div>
                      <p className="text-[9px] text-neutral-500 pl-6 leading-relaxed">Pressione a caixa para salvar imediatamente as alterações no banco de faturamento.</p>
                    </div>

                    {selectedDemanda.cobrarEmContrato && (
                      <div className="space-y-1.5 p-3 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Mês-Referência de Faturamento</label>
                        <div className="flex gap-2 font-sans">
                          <select
                            value={selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0')}
                            onChange={async (e) => {
                              const currentY = selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[0] : String(new Date().getFullYear());
                              const nextVal = `${currentY}-${e.target.value}`;
                              const updated = { ...selectedDemanda, cobrarContratoMes: nextVal };
                              setSelectedDemanda(updated);
                              await updateDemanda(selectedDemanda.id, { cobrarContratoMes: nextVal });
                            }}
                            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none hover:border-indigo-500/50 cursor-pointer w-1/2 font-sans"
                          >
                            <option value="01">Janeiro</option>
                            <option value="02">Fevereiro</option>
                            <option value="03">Março</option>
                            <option value="04">Abril</option>
                            <option value="05">Maio</option>
                            <option value="06">Junho</option>
                            <option value="07">Julho</option>
                            <option value="08">Agosto</option>
                            <option value="09">Setembro</option>
                            <option value="10">Outubro</option>
                            <option value="11">Novembro</option>
                            <option value="12">Dezembro</option>
                          </select>

                          <select
                            value={selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[0] : String(new Date().getFullYear())}
                            onChange={async (e) => {
                              const currentM = selectedDemanda.cobrarContratoMes ? selectedDemanda.cobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0');
                              const nextVal = `${e.target.value}-${currentM}`;
                              const updated = { ...selectedDemanda, cobrarContratoMes: nextVal };
                              setSelectedDemanda(updated);
                              await updateDemanda(selectedDemanda.id, { cobrarContratoMes: nextVal });
                            }}
                            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none hover:border-indigo-500/50 cursor-pointer w-1/2 font-sans"
                          >
                            {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="col-span-2 pt-2 border-t border-neutral-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Status da Fila Técnica</span>
                        <div className="text-xs font-semibold text-neutral-350">
                          {selectedDemanda.filaConcluida ? (
                            <span className="text-emerald-400 font-bold">✓ Concluída</span>
                          ) : (
                            <span className="text-yellow-500">🕒 Pendente de Conclusão</span>
                          )}
                          {selectedDemanda.filaConcluidaAt && (
                            <span className="text-neutral-500 font-mono text-[10px] block mt-0.5">Fechamento em: {new Date(selectedDemanda.filaConcluidaAt).toLocaleString("pt-BR")}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const currentVal = !!selectedDemanda.filaConcluida;
                          const newVal = !currentVal;
                          const updatedPayload = {
                            filaConcluida: newVal,
                            filaConcluidaAt: newVal ? new Date().toISOString() : null,
                            coluna: newVal ? "Concluído" : "A Fazer"
                          };
                          await updateDemanda(selectedDemanda.id, updatedPayload);
                          setSelectedDemanda({ ...selectedDemanda, ...updatedPayload });
                          addToast(newVal ? "Demanda marcada como concluída na fila técnica!" : "Trabalho reiniciado na demanda.", "success");
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                          selectedDemanda.filaConcluida
                            ? "bg-amber-600 hover:bg-amber-500 text-neutral-100 border-amber-500/80 shadow-md shadow-amber-600/15"
                            : "bg-emerald-600 hover:bg-emerald-500 text-neutral-100 border-emerald-500/80 shadow-md shadow-emerald-600/15"
                        }`}
                      >
                        {selectedDemanda.filaConcluida ? (
                          <>
                            <Play size={14} />
                            <span>Reiniciar Trabalho (Reabrir)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Concluir e Finalizar Demanda</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

              {/* SUBTAB 1 DETALHES */}
              {modalTab === "detalhes" && (
                selectedDemanda.tipo === "Melhoria" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
                    {/* Col 1: Basic Configs */}
                    <div className="space-y-6 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest border-b border-neutral-850 pb-2 flex items-center justify-between">
                        <span>⚙️ Atributos da Melhoria</span>
                        <span className="text-[10px] text-indigo-400 font-mono font-bold">(Edição em Tempo Real)</span>
                      </h4>

                      {/* Status da Proposta */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Status da Proposta</label>
                        <select
                          value={selectedDemanda.statusProposta || "Em análise"}
                          onChange={async (e) => {
                            const updated = { ...selectedDemanda, statusProposta: e.target.value };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, { statusProposta: e.target.value });
                            addToast("Status da proposta atualizado!", "success");
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:border-indigo-500 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                        >
                          <option value="Em análise">Em análise</option>
                          <option value="Proposta Enviada">Proposta Enviada</option>
                          <option value="Aprovada">Aprovada</option>
                          <option value="Re-análise">Re-análise</option>
                          <option value="Reprovada">Reprovada</option>
                        </select>
                      </div>

                      {/* Criticidade */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Criticidade da Melhoria</label>
                        <select
                          value={selectedDemanda.criticidade || "Média"}
                          onChange={async (e) => {
                            const updated = { ...selectedDemanda, criticidade: e.target.value };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, { criticidade: e.target.value });
                            addToast("Criticidade atualizada!", "success");
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:border-indigo-500 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                        >
                          <option value="Baixa">Baixa</option>
                          <option value="Média">Média</option>
                          <option value="Alta">Alta</option>
                        </select>
                      </div>

                      {/* Ticket Manager */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Ticket Manager (Responsável)</label>
                        <select
                          value={selectedDemanda.idResponsavel || ""}
                          onChange={async (e) => {
                            const updated = { ...selectedDemanda, idResponsavel: e.target.value };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, { idResponsavel: e.target.value });
                            addToast("Ticket Manager atualizado!", "success");
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:border-indigo-500 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                        >
                          <option value="">Selecione o Responsável...</option>
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Cliente Responsável */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Cliente Responsável</label>
                        <select
                          value={selectedDemanda.idClienteResponsavel || ""}
                          onChange={async (e) => {
                            const updated = { ...selectedDemanda, idClienteResponsavel: e.target.value };
                            setSelectedDemanda(updated);
                            await updateDemanda(selectedDemanda.id, { idClienteResponsavel: e.target.value });
                            addToast("Cliente responsável atualizado!", "success");
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:border-indigo-500 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                        >
                          <option value="">Selecione o Cliente Responsável...</option>
                          {pessoas.filter(p => p.tipo === "Cliente").map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Col 2: Técnico + Empresas */}
                    <div className="space-y-6 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest border-b border-neutral-850 pb-2">
                        🏢 Empresas & Execução
                      </h4>

                      {/* Técnico Responsável */}
                      <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-neutral-300 flex justify-between items-center">
                          <span>Responsável Técnico (Para Execução)</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(selectedDemanda.idDesignados || []).length} selecionado(s)
                          </span>
                        </label>

                        {/* Selected badges list */}
                        <div className="flex flex-wrap gap-1.5 mb-2 bg-neutral-950 p-2 rounded-xl border border-neutral-850">
                          {(selectedDemanda.idDesignados || []).map((id) => {
                            const p = pessoas.find((pers) => pers.id === id);
                            if (!p) return null;
                            return (
                              <span 
                                key={id} 
                                className="inline-flex items-center gap-1.5 bg-indigo-950 border border-indigo-900 text-indigo-300 text-xs px-2 py-0.5 rounded-lg font-medium animate-scale-in"
                              >
                                <span>{p.nome}</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextDesignados = (selectedDemanda.idDesignados || []).filter((dId) => dId !== id);
                                    const updated = { ...selectedDemanda, idDesignados: nextDesignados };
                                    setSelectedDemanda(updated);
                                    await updateDemanda(selectedDemanda.id, { idDesignados: nextDesignados });
                                    addToast("Responsável técnico removido!", "success");
                                  }}
                                  className="text-indigo-400 hover:text-rose-450 font-bold text-xs pl-0.5 cursor-pointer"
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })}
                          {(selectedDemanda.idDesignados || []).length === 0 && (
                            <span className="text-[11px] text-neutral-500 italic">Disponível / Sem técnico designado</span>
                          )}
                        </div>

                        {/* Dropdown triggers */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setViewIsOpenPessoasDropdown(!viewIsOpenPessoasDropdown);
                              setViewIsOpenEmpresasDropdown(false);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 focus:border-indigo-500/50 rounded-xl px-4 py-2 text-xs text-neutral-200 flex items-center justify-between outline-none cursor-pointer text-left transition-all"
                          >
                            <span className="text-neutral-400">
                              {viewIsOpenPessoasDropdown ? "Buscando integrantes..." : "🔍 Vincular equipe técnica..."}
                            </span>
                          </button>

                          {viewIsOpenPessoasDropdown && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-slide-down">
                              <input
                                type="text"
                                placeholder="Filtrar por nome..."
                                value={viewFilterPessoasText}
                                onChange={(e) => setViewFilterPessoasText(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-indigo-500 font-medium font-sans"
                                autoFocus
                              />
                              <div className="max-h-36 overflow-y-auto space-y-1">
                                {pessoas
                                  .filter((p) => p.tipo !== "Cliente" && p.nome.toLowerCase().includes(viewFilterPessoasText.toLowerCase()))
                                  .map((p) => {
                                    const isLinked = (selectedDemanda.idDesignados || []).includes(p.id);
                                    return (
                                      <button
                                        type="button"
                                        key={p.id}
                                        onClick={async () => {
                                          let nextDesignados = [];
                                          if (isLinked) {
                                            nextDesignados = (selectedDemanda.idDesignados || []).filter((id) => id !== p.id);
                                          } else {
                                            nextDesignados = [...(selectedDemanda.idDesignados || []), p.id];
                                          }
                                          const updated = { ...selectedDemanda, idDesignados: nextDesignados };
                                          setSelectedDemanda(updated);
                                          await updateDemanda(selectedDemanda.id, { idDesignados: nextDesignados });
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between bg-neutral-950/40 hover:bg-neutral-800 cursor-pointer text-neutral-305 hover:text-white"
                                      >
                                        <span>{p.nome} ({p.tipo})</span>
                                        <span className={isLinked ? "text-rose-450 font-bold" : "text-indigo-400 font-bold"}>
                                          {isLinked ? "[ REMOVER ]" : "[ RETER ]"}
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Empresas Clientes Associadas */}
                      <div className="space-y-2 relative">
                        <label className="text-xs font-semibold text-neutral-300 flex justify-between items-center">
                          <span>Empresas Clientes Associadas</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(selectedDemanda.idEmpresas || []).length} selecionada(s)
                          </span>
                        </label>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2 bg-neutral-950 p-2 rounded-xl border border-neutral-850">
                          {(selectedDemanda.idEmpresas || []).map((id) => {
                            const emp = empresas.find((e) => e.id === id);
                            if (!emp) return null;
                            return (
                              <span 
                                key={id} 
                                className="inline-flex items-center gap-1.5 bg-indigo-950 border border-indigo-900 text-indigo-300 text-xs px-2 py-0.5 rounded-lg font-medium animate-scale-in"
                              >
                                <span>🏢 {emp.nome}</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextEmpresas = (selectedDemanda.idEmpresas || []).filter((eId) => eId !== id);
                                    const updated = { ...selectedDemanda, idEmpresas: nextEmpresas };
                                    setSelectedDemanda(updated);
                                    await updateDemanda(selectedDemanda.id, { idEmpresas: nextEmpresas });
                                    addToast("Empresa associada removida!", "success");
                                  }}
                                  className="text-indigo-400 hover:text-rose-450 font-bold text-xs pl-0.5 cursor-pointer"
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })}
                          {(selectedDemanda.idEmpresas || []).length === 0 && (
                            <span className="text-[11px] text-neutral-500 italic">Nenhuma empresa cliente associada</span>
                          )}
                        </div>

                        {/* Dropdown triggers */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setViewIsOpenEmpresasDropdown(!viewIsOpenEmpresasDropdown);
                              setViewIsOpenPessoasDropdown(false);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 focus:border-indigo-500/50 rounded-xl px-4 py-2 text-xs text-neutral-200 flex items-center justify-between outline-none cursor-pointer text-left transition-all"
                          >
                            <span className="text-neutral-400">
                              {viewIsOpenEmpresasDropdown ? "Buscando empresas..." : "🏢 Associar empresas clientes..."}
                            </span>
                          </button>

                          {viewIsOpenEmpresasDropdown && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-slide-down">
                              <input
                                type="text"
                                placeholder="Filtrar por nome empresa..."
                                value={viewFilterEmpresasText}
                                onChange={(e) => setViewFilterEmpresasText(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-indigo-500 font-medium font-sans"
                                autoFocus
                              />
                              <div className="max-h-36 overflow-y-auto space-y-1">
                                {(() => {
                                  // filter empresas that belong to active project's contracts
                                  const projectContracts = contratos.filter((c) => activeProj?.contratoIds?.includes(c.id));
                                  const allowedEmpresaIds = Array.from(new Set(projectContracts.flatMap((c) => c.empresaIds || [])));
                                  const allowedEmpresas = allowedEmpresaIds.length > 0 
                                    ? empresas.filter((emp) => allowedEmpresaIds.includes(emp.id))
                                    : empresas;

                                  return allowedEmpresas
                                    .filter((emp) => emp.nome.toLowerCase().includes(viewFilterEmpresasText.toLowerCase()))
                                    .map((emp) => {
                                      const isLinked = (selectedDemanda.idEmpresas || []).includes(emp.id);
                                      return (
                                        <button
                                          type="button"
                                          key={emp.id}
                                          onClick={async () => {
                                            let nextEmpresas = [];
                                            if (isLinked) {
                                              nextEmpresas = (selectedDemanda.idEmpresas || []).filter((id) => id !== emp.id);
                                            } else {
                                              nextEmpresas = [...(selectedDemanda.idEmpresas || []), emp.id];
                                            }
                                            const updated = { ...selectedDemanda, idEmpresas: nextEmpresas };
                                            setSelectedDemanda(updated);
                                            await updateDemanda(selectedDemanda.id, { idEmpresas: nextEmpresas });
                                          }}
                                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between bg-neutral-950/40 hover:bg-neutral-800 cursor-pointer text-neutral-305 hover:text-white"
                                        >
                                          <span>🏢 {emp.nome}</span>
                                          <span className={isLinked ? "text-rose-450 font-bold" : "text-indigo-400 font-bold"}>
                                            {isLinked ? "[ REMOVER ]" : "[ VINCULAR ]"}
                                          </span>
                                        </button>
                                      );
                                    });
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 3: Estimativas (Col Span 2 in details screen) */}
                    <div className="md:col-span-2 space-y-4 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                      <h4 className="text-xs font-bold text-neutral-350 uppercase tracking-widest border-b border-neutral-850 pb-2 flex justify-between items-center">
                        <span>⌛ Estimativas de Esforço / Atividades</span>
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/20 font-bold">
                          Soma Total: {selectedDemanda.estimativaHoras || 0} horas
                        </span>
                      </h4>

                      {/* Display existing with Delete Button */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(selectedDemanda.estimativas || []).map((est, idx) => (
                          <div key={est.id || idx} className="bg-neutral-950/80 p-2.5 border border-neutral-850 rounded-xl flex items-center justify-between text-xs font-sans animate-scale-in">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-900 border border-indigo-800/80 text-indigo-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md">
                                {est.horas} horas
                              </span>
                              <span className="text-neutral-300 font-medium font-sans uppercase tracking-wide text-[10.5px]">
                                {est.atividade}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const nextEstimativas = (selectedDemanda.estimativas || []).filter((item, i) => item.id ? item.id !== est.id : i !== idx);
                                const totalHours = nextEstimativas.reduce((acc, current) => acc + (current.horas || 0), 0);
                                const updated = { ...selectedDemanda, estimativas: nextEstimativas, estimativaHoras: totalHours };
                                setSelectedDemanda(updated);
                                await updateDemanda(selectedDemanda.id, { estimativas: nextEstimativas, estimativaHoras: totalHours });
                                addToast("Estimativa removida!", "success");
                              }}
                              className="text-neutral-500 hover:text-rose-450 font-bold text-sm px-2 cursor-pointer transition-colors"
                              title="Remover esta estimativa"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {(selectedDemanda.estimativas || []).length === 0 && (
                          <p className="text-xs text-neutral-500 italic sm:col-span-2 py-3 bg-neutral-950/20 border border-neutral-900 rounded-xl text-center">Nenhuma estimativa adicionada.</p>
                        )}
                      </div>

                      {/* Add Inline Estimates Controls */}
                      <div className="flex flex-col sm:flex-row gap-3 bg-neutral-950/30 p-3.5 border border-neutral-850/60 rounded-xl">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Horas Estimadas:</label>
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            placeholder="Ex: 8"
                            value={viewFormEstimativaHoras}
                            onChange={(e) => setViewFormEstimativaHoras(parseFloat(e.target.value) || 0)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                          />
                        </div>

                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Atividade:</label>
                          <select
                            value={viewFormEstimativaAtividade}
                            onChange={(e) => setViewFormEstimativaAtividade(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 outline-none focus:border-indigo-500 focus:outline"
                          >
                            <option value="">Selecione a Atividade...</option>
                            <option value="Desenvolvimento">Desenvolvimento</option>
                            <option value="Testes & QA">Testes & QA</option>
                            <option value="Arquitetura de Software">Arquitetura de Software</option>
                            <option value="Gestão de Atividades">Gestão de Atividades</option>
                            <option value="Homologação Tecnológica">Homologação Tecnológica</option>
                            <option value="Análise de Requisitos">Análise de Requisitos</option>
                            <option value="Plano de Deploy">Plano de Deploy</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (viewFormEstimativaHoras <= 0 || !viewFormEstimativaAtividade) {
                                addToast("Preencha as horas e escolha a atividade!", "error");
                                return;
                              }
                              const newItem = {
                                id: `est_${Math.random().toString(36).substr(2, 9)}`,
                                horas: viewFormEstimativaHoras,
                                atividade: viewFormEstimativaAtividade
                              };
                              const nextEstimativas = [...(selectedDemanda.estimativas || []), newItem];
                              const totalHours = nextEstimativas.reduce((acc, current) => acc + (current.horas || 0), 0);
                              
                              const updated = { ...selectedDemanda, estimativas: nextEstimativas, estimativaHoras: totalHours };
                              setSelectedDemanda(updated);
                              await updateDemanda(selectedDemanda.id, { estimativas: nextEstimativas, estimativaHoras: totalHours });
                              
                              // Reset triggers
                              setViewFormEstimativaHoras(8);
                              setViewFormEstimativaAtividade("");
                              addToast("Nova estimativa inserida!", "success");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
                          >
                            + Inserir Estimativa
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Col 4: Tags / Etiquetas (Col Span 2 in details screen) */}
                    <div className="md:col-span-2 space-y-4 bg-neutral-955 p-5 rounded-2xl border border-neutral-850">
                      <h4 className="text-xs font-bold text-neutral-350 uppercase tracking-widest border-b border-neutral-850 pb-2">
                        🔖 Etiquetas & Tags da Melhoria
                      </h4>

                      {/* Active Tags badges list */}
                      <div className="flex flex-wrap gap-1.5 mb-2 bg-neutral-950 p-3 rounded-xl border border-neutral-850">
                        {(selectedDemanda.tags || []).map((tag) => (
                          <span key={tag} className="flex items-center gap-1 bg-indigo-950 border border-indigo-900 text-indigo-305 text-[10.5px] font-bold font-mono px-2.5 py-1 rounded-md">
                            #{tag}
                            <button
                              type="button"
                              onClick={async () => {
                                const nextTags = (selectedDemanda.tags || []).filter((t) => t !== tag);
                                const updated = { ...selectedDemanda, tags: nextTags };
                                setSelectedDemanda(updated);
                                await updateDemanda(selectedDemanda.id, { tags: nextTags });
                              }}
                              className="text-indigo-400 hover:text-rose-450 font-bold ml-1 text-xs cursor-pointer"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {(selectedDemanda.tags || []).length === 0 && (
                          <span className="text-[11px] text-neutral-500 italic py-1 font-sans">Nenhuma etiqueta ativa nesta melhoria.</span>
                        )}
                      </div>

                      {/* Tags Adding Autocomplete Input */}
                      <div className="flex gap-2 relative">
                        <input
                          type="text"
                          placeholder="Buscar ou cadastrar novas tags do banco de etiquetas..."
                          value={viewRawTag}
                          onChange={(e) => {
                            setViewRawTag(e.target.value);
                            setViewTagAutocompleteOpen(true);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const clean = viewRawTag.trim();
                              if (clean) {
                                const currentTags = selectedDemanda.tags || [];
                                if (!currentTags.includes(clean)) {
                                  const nextTags = [...currentTags, clean];
                                  const updated = { ...selectedDemanda, tags: nextTags };
                                  setSelectedDemanda(updated);
                                  await updateDemanda(selectedDemanda.id, { tags: nextTags });
                                }
                                setViewRawTag("");
                              }
                            }
                          }}
                          className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const clean = viewRawTag.trim();
                            if (clean) {
                              const currentTags = selectedDemanda.tags || [];
                              if (!currentTags.includes(clean)) {
                                const nextTags = [...currentTags, clean];
                                const updated = { ...selectedDemanda, tags: nextTags };
                                setSelectedDemanda(updated);
                                await updateDemanda(selectedDemanda.id, { tags: nextTags });
                              }
                              setViewRawTag("");
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 rounded-lg transition-colors cursor-pointer font-sans"
                        >
                          Atribuir
                        </button>

                        {/* Dropdown list tag autocompletes */}
                        {viewTagAutocompleteOpen && viewRawTag.trim() && (
                          <div className="absolute top-full left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl max-h-36 overflow-y-auto mt-1 z-50 p-1 space-y-0.5">
                            {existingTags
                              .filter(t => t.toLowerCase().includes(viewRawTag.toLowerCase()) && !(selectedDemanda.tags || []).includes(t))
                              .map(tag => (
                                <button
                                  type="button"
                                  key={tag}
                                  onClick={async () => {
                                    const nextTags = [...(selectedDemanda.tags || []), tag];
                                    const updated = { ...selectedDemanda, tags: nextTags };
                                    setSelectedDemanda(updated);
                                    await updateDemanda(selectedDemanda.id, { tags: nextTags });
                                    setViewRawTag("");
                                    setViewTagAutocompleteOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-sm font-semibold flex items-center gap-1.5 cursor-pointer font-sans"
                                >
                                  <span className="text-indigo-400">#</span> {tag}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column Descricão */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-850 pb-2">
                      Descrição da Demanda (HTML Render)
                    </h4>
                    
                    {/* HTML viewing inside custom border style container */}
                    <div 
                      className="bg-neutral-950 border border-neutral-850 hover:border-neutral-800 p-5 rounded-2xl text-sm leading-relaxed text-neutral-300 min-h-36 font-sans select-text prose"
                      dangerouslySetInnerHTML={{ __html: selectedDemanda.descricao || "<p className='text-neutral-600 italic'>Nenhum detalhe inserido.</p>" }}
                    />

                    {/* Attachments Section in details tab */}
                    <div className="pt-4 space-y-2">
                      <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-850 pb-2">
                        <Paperclip size={13} className="text-indigo-400" />
                        Arquivos e Anexos Vinculados ({selectedDemanda.anexos?.length || 0})
                      </h5>
                      {selectedDemanda.anexos && selectedDemanda.anexos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedDemanda.anexos.map((ax) => (
                            <div 
                              key={ax.id} 
                              className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-850 rounded-xl text-neutral-300 text-xs gap-3 group/item animate-scale-in"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip size={14} className="text-indigo-400 shrink-0" />
                                <div className="truncate">
                                  <p className="font-semibold truncate text-neutral-200 text-[11px]" title={ax.nome}>
                                    {ax.nome}
                                  </p>
                                  <p className="text-[9px] font-mono text-neutral-500">{ax.size}</p>
                                </div>
                              </div>
                              {ax.base64 ? (
                                <a 
                                  href={ax.base64} 
                                  download={ax.nome}
                                  className="px-3 py-1.5 bg-neutral-900 hover:bg-indigo-600 border border-neutral-800 hover:border-indigo-500 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold font-sans tracking-wide shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Baixar
                                </a>
                              ) : (
                                <span className="text-[10px] text-yellow-500 bg-yellow-500/5 border border-yellow-500/10 px-2 py-1 rounded font-medium">Lendo...</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500 italic">Nenhum arquivo anexo para esta demanda.</p>
                      )}
                    </div>

                    {/* BUG & Incidente Step-by-Step logs */}
                    {(selectedDemanda.tipo === "BUG" || selectedDemanda.tipo === "Incidente" || selectedDemanda.tipo === "Task") && selectedDemanda.passoAPasso && (
                      <div className="pt-4 space-y-3 border-t border-indigo-950/40 mt-4">
                        <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-neutral-850/50">
                          📝 PASSO A PASSO PARA REPRODUÇÃO
                        </h5>
                        <div className="space-y-3 mt-2">
                          {parseSteps(selectedDemanda.passoAPasso).map((step, idx) => {
                            const sequentialLabel = `${idx + 1}º`;
                            return (
                              <div key={step.id || idx} className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl space-y-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-scale-in">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-indigo-600 font-bold text-[10px] text-white font-mono w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                      {sequentialLabel}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono tracking-wider">Passo</span>
                                  </div>
                                  <p className="text-xs text-neutral-250 leading-relaxed font-sans whitespace-pre-wrap pl-1">{step.text || <span className="text-neutral-600 italic">Sem descrição neste passo.</span>}</p>
                                </div>

                                {step.images && step.images.length > 0 && (
                                  <div className="flex items-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGalleryStep(step);
                                        setGalleryActiveIndex(0);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-slate-800 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
                                      title="Abrir galeria de imagens"
                                    >
                                      <Eye size={13} />
                                      <span>Galeria ({step.images.length})</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Change specifications view logs */}
                    {selectedDemanda.tipo === "Change" && (
                      <div className="pt-4 space-y-4 border-t border-purple-950/40 mt-4">
                        <h5 className="text-xs font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-purple-955/20">
                          ⚙️ Especificações de Mudança (Change)
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-955/5 border border-purple-900/25 p-4 rounded-xl text-neutral-300">
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Justificativa:</span>
                            <p className="text-neutral-250">{selectedDemanda.justificativa || "Não informada."}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Serviços Afetados:</span>
                            <p className="text-neutral-250">{selectedDemanda.servicosAfetados || "Nenhum mapeado."}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Impacto / Risco / Prioridade:</span>
                            <p className="text-neutral-250">
                              Impacto: <strong className="text-indigo-400 font-mono">{selectedDemanda.impacto || "BAIXO"}</strong> | 
                              Risco: <strong className="text-rose-400 font-mono">{selectedDemanda.risco || "BAIXO"}</strong> | 
                              Prioridade: <strong className="text-amber-400 font-mono">{selectedDemanda.prioridade || "BAIXO"}</strong>
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Indisponibilidade Presumida:</span>
                            <p className="text-neutral-250 font-bold">{selectedDemanda.indisponibilidade || "Não"}</p>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Plano de Implementação:</span>
                            <p className="text-neutral-250 bg-neutral-950/60 p-3 rounded border border-neutral-850 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">{selectedDemanda.planoImplementacao || "Não cadastrado."}</p>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Plano de Rollback / Reversão:</span>
                            <p className="text-neutral-250 bg-neutral-950/60 p-3 rounded border border-neutral-850 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">{selectedDemanda.planoRollback || "Não cadastrado."}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Responsável Geral:</span>
                            <p className="text-neutral-250 font-bold text-indigo-400">{selectedDemanda.responsavelGeral || "N/D"}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">Previsão Geral:</span>
                            <p className="text-neutral-250 font-mono">
                              {selectedDemanda.inicioGeral ? new Date(selectedDemanda.inicioGeral).toLocaleString("pt-BR") : "N/D"} até 
                              {selectedDemanda.fimGeral ? new Date(selectedDemanda.fimGeral).toLocaleString("pt-BR") : "N/D"}
                            </p>
                          </div>
                        </div>

                        {/* List of completed change tasks with check boxes */}
                        <div className="space-y-2 mt-2">
                          <h6 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tarefas Específicas da Mudança ({selectedDemanda.tarefasMudanca?.length || 0})</h6>
                          {selectedDemanda.tarefasMudanca && selectedDemanda.tarefasMudanca.length > 0 ? (
                            <div className="space-y-1.5">
                              {selectedDemanda.tarefasMudanca.map((task) => (
                                <div key={task.id} className="bg-neutral-950/80 border border-neutral-850 rounded-xl p-3 text-xs flex items-start gap-2.5">
                                  <div className="bg-indigo-500/10 text-indigo-400 p-1 rounded-md shrink-0 text-[10px] font-bold">
                                    ✓
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-neutral-200 leading-relaxed">{task.descricao}</p>
                                    <p className="text-[10px] text-neutral-500">Responsável: <strong className="text-neutral-400">{task.responsavel}</strong> | Período: {task.inicio ? new Date(task.inicio).toLocaleString("pt-BR") : "N/D"} - {task.fim ? new Date(task.fim).toLocaleString("pt-BR") : "N/D"}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 italic">Nenhuma mudança de tarefa mapeada.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CUSTOM DEMAND TYPE SPECIFICATIONS (CONSTRUTOR CARD INTELIGENTE RENDERER) */}
                    {(() => {
                      const selectedCustomType = activeProj?.tiposDemandasCustom?.find(ct => ct.nome === selectedDemanda.tipo);
                      if (!selectedCustomType) return null;

                      return (
                        <div className="pt-4 space-y-4 border-t border-neutral-800 mt-4 animate-fade-in animate-duration-150">
                          <h5 className="text-[12px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-neutral-850">
                            ✨ Especificações Customizadas ({selectedCustomType.nome})
                          </h5>

                          <div className="space-y-4">
                            {selectedCustomType.guias?.map((g) => {
                              const hasFields = g.campos && g.campos.length > 0;
                              if (!hasFields) return null;

                              return (
                                <div key={g.id} className="bg-neutral-950/80 border border-neutral-850 p-4 rounded-xl space-y-3">
                                  <h6 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-900 pb-1.5 font-mono">
                                    📁 {g.nome}
                                  </h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {g.campos?.map((f) => {
                                      const val = selectedDemanda.valoresCamposCustom?.[f.id];
                                      let displayVal = val || "";

                                      if (f.tipo === "lista_coisas") {
                                        if (f.subTipoLista === "empresas") {
                                          const emp = empresas.find(e => e.id === val);
                                          displayVal = emp ? `🏢 ${emp.nome}` : val || "Não definida";
                                        } else {
                                          const pers = pessoas.find(p => p.id === val);
                                          displayVal = pers ? `👥 ${pers.nome} (${pers.tipo})` : val || "Não definida";
                                        }
                                      } else if (f.tipo === "data") {
                                        displayVal = val ? new Date(val).toLocaleDateString("pt-BR") : "Não preenchida";
                                      } else if (!val) {
                                        displayVal = "Não preenchida";
                                      }

                                      if (f.tipo === "imagem") {
                                        return (
                                          <div key={f.id} className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`}>
                                            <span className="text-neutral-500 block font-bold uppercase tracking-wider text-[10px]">{f.label}:</span>
                                            <div className="bg-neutral-900 border border-neutral-850 p-3 rounded-lg flex flex-col items-center justify-center">
                                              {f.imagemUrl ? (
                                                <img src={f.imagemUrl} alt={f.label} className="max-h-40 object-contain rounded border border-neutral-800" referrerPolicy="no-referrer" />
                                              ) : (
                                                <span className="text-xs italic text-neutral-600">Sem imagem anexada</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div key={f.id} className={`space-y-1 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`}>
                                          <span className="text-neutral-500 block font-semibold text-[10.5px]">{f.label}:</span>
                                          <p className="text-neutral-200 select-text bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 text-xs font-mono font-medium leading-relaxed whitespace-pre-wrap">
                                            {displayVal}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Associated tasks list inside viewer with clicking navigations stacked */}
                    {(selectedDemanda.tipo === "BUG" || selectedDemanda.tipo === "Change" || selectedDemanda.tipo === "Task") && (
                      <div className="pt-4 space-y-2 border-t border-neutral-850 mt-4">
                        <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 pb-1 select-none font-mono">
                          🔗 Demandas Correlacionadas & Relações ({selectedDemanda.tarefasAssociadasIds?.length || 0})
                        </h5>
                        {selectedDemanda.tarefasAssociadasIds && selectedDemanda.tarefasAssociadasIds.length > 0 ? (
                          <div className="space-y-2.5">
                            {selectedDemanda.tarefasAssociadasIds.map((tid) => {
                              const dem = demandas.find(x => x.id === tid);
                              if (!dem) return null;
                              const details = getDemandTypeDetails(dem.tipo);
                              return (
                                <div 
                                  key={tid} 
                                  onClick={() => handleNavigateToDemanda(dem)}
                                  className="flex items-center justify-between p-3 bg-neutral-950/80 hover:bg-neutral-955 border border-neutral-855 hover:border-neutral-800 rounded-xl cursor-pointer select-none transition-all group/task animate-scale-in"
                                  title="Clique para abrir esta demanda associada"
                                >
                                  <div className="min-w-0 flex items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 text-indigo-400 shrink-0">
                                      {details.prefix} - {dem.numeroChamado}
                                    </span>
                                    <span className="text-xs font-semibold text-neutral-200 truncate group-hover/task:text-indigo-400 transition-colors">
                                      {dem.titulo}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-neutral-500 group-hover/task:text-indigo-400 shrink-0">
                                    <Eye size={12} />
                                    <span className="text-[10px] font-bold">
                                      Visualizar ↗
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic">Nenhum chamado linkado a este registro.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right metadata drawer */}
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-4">
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-1.5 border-b border-neutral-850">
                      Painel Executivo
                    </h4>

                    <div className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-neutral-500">Responsáveis Atribuídos:</span>
                        {(() => {
                          const associated = selectedDemanda.idDesignados && selectedDemanda.idDesignados.length > 0
                            ? pessoas.filter(p => selectedDemanda.idDesignados?.includes(p.id))
                            : (selectedDemanda.idDesignado ? pessoas.filter(p => p.id === selectedDemanda.idDesignado) : []);

                          if (associated.length === 0) {
                            return (
                              <div className="bg-neutral-900 p-2 border border-neutral-800 rounded-lg text-neutral-400 italic">
                                Não designado
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {associated.map((p) => (
                                <div key={p.id} className="bg-neutral-900 p-1.5 border border-neutral-800 rounded-lg text-neutral-300 flex items-center justify-between gap-1 text-[11px]">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <User size={12} className="text-indigo-400 shrink-0" />
                                    <span className="truncate">{p.nome}</span>
                                  </div>
                                  <span className="text-[8px] font-mono font-bold tracking-wider px-1 rounded bg-indigo-500/10 text-indigo-400 shrink-0 uppercase">
                                    {p.tipo}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-neutral-500 text-xs">Estimativas por Atividade:</span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {(selectedDemanda.estimativas && selectedDemanda.estimativas.length > 0
                            ? selectedDemanda.estimativas
                            : [{ id: "legacy", horas: selectedDemanda.estimativaHoras || 8, atividade: selectedDemanda.atividade || "Desenvolvimento" }]
                          ).map((est, idx) => (
                            <div key={est.id || idx} className="bg-neutral-900 p-2 border border-neutral-800 rounded-lg text-neutral-300 flex items-center justify-between gap-2 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-indigo-400" />
                                <span>{est.horas}h</span>
                              </div>
                              <span className="text-[9px] tracking-wide font-sans bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                                {est.atividade}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center bg-indigo-950/40 border border-indigo-900/40 p-2 rounded-lg text-xs font-mono font-bold text-indigo-300">
                          <span>SOMA TOTAL:</span>
                          <span>{selectedDemanda.estimativaHoras} horas</span>
                        </div>
                      </div>

                      {selectedDemanda.tipo !== "Change" && (
                        <div className="space-y-1">
                          <span className="text-neutral-500">Empresas Clientes:</span>
                          {(() => {
                            const associated = selectedDemanda.idEmpresas && selectedDemanda.idEmpresas.length > 0 
                              ? empresas.filter(e => selectedDemanda.idEmpresas?.includes(e.id))
                              : (selectedDemanda.idEmpresa ? empresas.filter(e => e.id === selectedDemanda.idEmpresa) : []);

                            if (associated.length === 0) {
                              return (
                                <div className="bg-neutral-900 p-2 border border-neutral-800 rounded-lg text-neutral-400 italic">
                                  Nenhuma empresa associada
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {associated.map((e) => (
                                  <div key={e.id} className="bg-neutral-900 p-1.5 border border-neutral-800 rounded-lg text-neutral-300 flex items-center gap-1.5 text-[11px] truncate" title={e.nome}>
                                    <span className="text-indigo-400 shrink-0">🏢</span>
                                    <span className="truncate">{e.nome}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Tag list within metadata draw */}
                      {selectedDemanda.tipo !== "Change" && selectedDemanda.tags && selectedDemanda.tags.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-neutral-500">Sistemas / Tags:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDemanda.tags.map(t => (
                              <span key={t} className="bg-indigo-950 border border-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded font-mono text-[10px]">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

              {/* SUBTAB 1.5 PASSO A PASSO */}
              {modalTab === "passopasso" && (
                <div className="space-y-4 animate-fade-in text-left">
                  {selectedDemanda.idQAManager && (
                    <div className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-xl text-xs leading-relaxed flex items-center gap-3">
                      <span className="p-1 px-2 bg-indigo-950 text-indigo-400 font-bold rounded-lg font-mono tracking-wider uppercase text-[10px]">👤 QA MANAGER</span>
                      <span className="text-neutral-200">
                        {pessoas.find(p => p.id === selectedDemanda.idQAManager)?.nome || "Não encontrado"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                      📋 PASSO A PASSO PARA REPRODUÇÃO
                    </h5>
                    
                    <div className="flex items-center gap-2">
                      {selectedDemanda.statusQA && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider font-mono ${
                          selectedDemanda.statusQA === "Reproduzido" ? "bg-orange-600/15 border-orange-550/30 text-orange-400" :
                          selectedDemanda.statusQA === "Corrigido" ? "bg-yellow-600/15 border-yellow-550/30 text-yellow-500 font-bold" :
                          "bg-emerald-600/15 border-emerald-555/30 text-emerald-400"
                        }`}>
                          STATUS QA: {selectedDemanda.statusQA}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const steps = parseSteps(selectedDemanda.passoAPasso);
                          const stepsText = steps
                            .map((step, sIdx) => `${sIdx + 1}º Passo: ${step.text}`)
                            .join("\n");
                          const clipboardBody = `KABAN PASSO A PASSO:\n\n${stepsText}\n\nStatus QA: ${selectedDemanda.statusQA || "N/A"}`;
                          navigator.clipboard.writeText(clipboardBody);
                          setCopiedStepsFeedback(true);
                          setTimeout(() => setCopiedStepsFeedback(false), 2000);
                        }}
                        className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none"
                      >
                        <span>{copiedStepsFeedback ? "📋 Copiado!" : "📋 Copiar passos"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mt-2">
                    {parseSteps(selectedDemanda.passoAPasso).map((step, idx) => {
                      const sequentialLabel = `${idx + 1}º`;
                      return (
                        <div key={step.id || idx} className="bg-neutral-955 border border-neutral-850 p-4 rounded-xl space-y-3 flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-scale-in">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-600 font-bold text-[10px] text-white font-mono w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                {sequentialLabel}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono tracking-wider">Passo</span>
                            </div>
                            <p className="text-xs text-neutral-255 leading-relaxed font-sans whitespace-pre-wrap pl-1">{step.text || <span className="text-neutral-600 italic">Sem descrição neste passo.</span>}</p>
                          </div>

                          {step.images && step.images.length > 0 && (
                            <div className="flex items-center shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setGalleryStep(step);
                                  setGalleryActiveIndex(0);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
                              >
                                <Eye size={13} />
                                <span>Galeria ({step.images.length})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(!selectedDemanda.passoAPasso || parseSteps(selectedDemanda.passoAPasso).length === 0) && (
                      <p className="text-xs text-neutral-500 italic">Nenhum passo a passo cadastrado para este registro.</p>
                    )}
                  </div>
                </div>
              )}



              {/* UPGRADED SUBTAB ANEXOS */}
              {modalTab === "anexos" && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Paperclip size={13} className="text-indigo-400" />
                      Anexos Vinculados à Demanda ({selectedDemanda.anexos?.length || 0})
                    </h5>

                    {/* Add attachment small button at top */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById("direct-modal-file-attach") as HTMLInputElement;
                          if (input) input.click();
                        }}
                        className="px-3 py-1.5 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-400 hover:text-neutral-100 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 transition-all font-sans border border-indigo-900/50"
                      >
                        <span>+ Adicionar Anexo</span>
                      </button>
                      <input
                        id="direct-modal-file-attach"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;

                          addToast("Carregando novos anexos...", "info");
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
                          addToast("Novos anexos vinculados com sucesso!", "success");
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
                          extColor = "bg-pink-950/30 border-pink-900/45 text-pink-400";
                        } else if (["PDF", "DOC", "DOCX", "ODT"].includes(ext)) {
                          extColor = "bg-rose-950/30 border-rose-900/45 text-rose-450";
                        } else if (["XLS", "XLSX", "CSV"].includes(ext)) {
                          extColor = "bg-emerald-950/30 border-emerald-900/45 text-emerald-400";
                        } else if (["ZIP", "RAR", "TAR", "GZ"].includes(ext)) {
                          extColor = "bg-amber-950/30 border-amber-900/45 text-amber-400";
                        } else if (["JS", "TS", "JSON", "HTML", "CSS"].includes(ext)) {
                          extColor = "bg-indigo-950/30 border-indigo-900/45 text-indigo-400";
                        }

                        return (
                          <div 
                            key={ax.id} 
                            className="flex items-center justify-between p-3 bg-neutral-955 border border-neutral-850 hover:border-neutral-800 rounded-xl gap-3 group/item animate-scale-in"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[9px] font-bold font-mono px-2 py-1 rounded-lg border ${extColor} shrink-0`}>
                                {ext}
                              </span>
                              <div className="truncate">
                                <p className="font-semibold truncate text-neutral-200 text-xs" title={ax.nome}>
                                  {ax.nome}
                                </p>
                                <p className="text-[10px] font-mono text-neutral-500 leading-none mt-0.5">{ax.size}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ax.base64 ? (
                                <a 
                                  href={ax.base64} 
                                  download={ax.nome}
                                  className="px-2.5 py-1.5 bg-neutral-905 hover:bg-indigo-650 border border-neutral-800 hover:border-indigo-600 text-neutral-300 hover:text-white rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer font-sans"
                                >
                                  Baixar
                                </a>
                              ) : (
                                <span className="text-[10px] text-yellow-500 bg-yellow-500/5 px-2 py-1 rounded font-medium">Lendo...</span>
                              )}
                              
                              {/* Excluir button */}
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextAnexos = (selectedDemanda.anexos || []).filter(a => a.id !== ax.id);
                                  const updated = { ...selectedDemanda, anexos: nextAnexos };
                                  setSelectedDemanda(updated);
                                  await updateDemanda(selectedDemanda.id, { anexos: nextAnexos });
                                  addToast("Anexo excluído!", "success");
                                }}
                                className="p-1.5 border border-neutral-800 hover:border-rose-900/50 hover:bg-rose-950/15 text-neutral-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                  title="Excluir este anexo permanentemente"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-neutral-950/20 border border-dashed border-neutral-850 rounded-2xl text-center">
                        <Paperclip size={24} className="text-neutral-605 mb-2" />
                        <p className="text-xs text-neutral-500 italic font-sans">Nenhum arquivo anexo para esta demanda.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById("direct-modal-file-attach") as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="mt-3 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 font-bold text-xs text-neutral-300 rounded-xl cursor-pointer hover:text-white font-sans"
                        >
                          Fazer Primeiro Upload
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {/* SUBTAB 2 COMENTARIOS (SISTEMA DE DISCUSSÃO EM ABAS DUPLAS MANDADO) */}
              {modalTab === "comentarios" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Fórum de Discussão com Visualizador HTML</h4>
                    <p className="text-[11px] text-neutral-500">Aba dupla: Lista de comentários à esquerda e visualizador de elemento selecionado à direita.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950/20 h-[380px]">
                    
                    {/* LEFT PANEL: LIST OF COMMENTS */}
                    <div className="lg:col-span-5 border-r border-neutral-800 flex flex-col h-full bg-neutral-950/40">
                      <div className="p-3 bg-neutral-900/70 border-b border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex justify-between">
                        <span>Discussões Ativas</span>
                        <span>{comentarios.filter(c => c.idDemanda === selectedDemanda.id).length} comentários</span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[320px]">
                        {comentarios.filter(c => c.idDemanda === selectedDemanda.id).map((com) => {
                          const isCommentSelected = selectedCommentForPreview?.id === com.id;
                          return (
                            <div 
                              key={com.id}
                              onClick={() => {
                                setSelectedCommentForPreview(com);
                                setIsFullscreenComment(false);
                              }}
                              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left ${
                                isCommentSelected 
                                  ? "bg-indigo-650/15 border-indigo-500/20 shadow-neutral-950" 
                                  : "bg-neutral-900 border-neutral-850 hover:bg-neutral-850"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <h5 className="text-xs font-bold text-neutral-300">{com.nomeAutor}</h5>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmState({
                                        isOpen: true,
                                        title: "Excluir Comentário",
                                        description: "Deseja excluir permanentemente este comentário?",
                                        onConfirm: () => {
                                          deleteComentario(com.id);
                                          if (selectedCommentForPreview?.id === com.id) setSelectedCommentForPreview(null);
                                        }
                                      });
                                    }}
                                    className="text-neutral-500 hover:text-rose-400 p-0.5 transition-all text-[11px]"
                                    title="Excluir Comentário"
                                  >
                                    Deletar
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                {new Date(com.createdAt).toLocaleString()}
                              </p>
                              {/* Truncated line preview */}
                              <div className="text-xs text-neutral-400 mt-2 truncate line-clamp-1">
                                Ver preview HTML...
                              </div>
                            </div>
                          );
                        })}

                        {comentarios.filter(c => c.idDemanda === selectedDemanda.id).length === 0 && (
                          <p className="text-xs text-neutral-500 italic text-center py-6">Nenhuma mensagem registrada.</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT PANEL: WEBPACK/HTML CONTENT VIEWER */}
                    <div className="lg:col-span-7 flex flex-col h-full bg-neutral-950">
                      <div className="p-3 bg-neutral-900/75 border-b border-neutral-800 flex items-center justify-between text-xs">
                        <span className="text-neutral-400 flex items-center gap-1 font-mono uppercase text-[10px] font-bold">
                          Visualizador HTML do Comentário Selecionado
                        </span>
                        
                        {selectedCommentForPreview && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setIsFullscreenComment(true);
                              }}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1.5 bg-neutral-900 px-2 py-0.5 rounded cursor-pointer"
                            >
                              <Maximize2 size={10} /> Maximizar
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-5 overflow-y-auto select-text prose">
                        {selectedCommentForPreview ? (
                          <div className="space-y-4">
                            <div className="border-b border-neutral-850 pb-2">
                              <h5 className="text-sm font-bold text-neutral-200">Autor: {selectedCommentForPreview.nomeAutor}</h5>
                              <span className="text-[10px] font-mono text-neutral-500">Publicado em: {new Date(selectedCommentForPreview.createdAt).toLocaleString()}</span>
                            </div>
                            <div 
                              className="text-sm text-neutral-300 leading-relaxed font-sans"
                              dangerouslySetInnerHTML={{ __html: selectedCommentForPreview.textoHTML }} 
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-600 space-y-1.5">
                            <MessageSquare size={24} />
                            <p className="text-xs">Selecione um comentário à esquerda para ver a formatação de dados HTML renderizada aqui.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Comment Insertion rich editor mock bar */}
                  <div className="bg-neutral-950 p-4 border border-neutral-805 rounded-xl space-y-2.5">
                    <span className="text-xs font-bold text-neutral-300">Novo Comentário (Estilo Rich Editor HTML)</span>
                    
                    <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                      <button 
                        type="button" 
                        onClick={() => injectHTMLTag("<strong>", "</strong>")}
                        className="px-2 py-1 bg-neutral-950 text-neutral-200 hover:bg-neutral-800 rounded font-bold text-xs select-none"
                        title="Negrito"
                      >
                        B
                      </button>
                      <button 
                        type="button" 
                        onClick={() => injectHTMLTag("<em>", "</em>")}
                        className="px-2 py-1 bg-neutral-950 text-neutral-200 hover:bg-neutral-800 rounded italic text-xs select-none"
                        title="Itálico"
                      >
                        I
                      </button>
                      <button 
                        type="button" 
                        onClick={() => injectHTMLTag("<code>", "</code>")}
                        className="px-2 py-1 bg-neutral-950 text-neutral-400 hover:bg-neutral-800 rounded text-xs px-2 font-mono"
                        title="Código"
                      >
                        {"</>"}
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <textarea
                        value={newCommentHTML}
                        onChange={(e) => setNewCommentHTML(e.target.value)}
                        placeholder="Digite o comentário. Você pode adicionar tags HTML como <strong>Negrito</strong>..."
                        rows={2}
                        className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-sm rounded-xl px-4 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-hidden resize-none"
                      />
                      <button
                        onClick={() => {
                          if (newCommentHTML.trim()) {
                            addComentario(selectedDemanda.id, newCommentHTML);
                            setNewCommentHTML("");
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium text-xs rounded-xl flex items-center justify-center cursor-pointer select-none"
                      >
                        Comentar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3 APONTAMENTOS DE HORAS E ESTIMATIVAS */}
              {modalTab === "apontamentos" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column calculations and pointers tracker */}
                  <div className="space-y-4">
                    <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-850 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-indigo-500/10">
                        <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={14} className="text-indigo-400" />
                          Painel de Horas Mapeado
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase">
                          Modo: {activeProj.contabilizarPorEmpresa ? "Múltipla Empresa" : "Simples"}
                        </span>
                      </div>

                      {/* Calculations summary board */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Metrificação Estimada</span>
                          <span className="text-xl font-bold font-mono text-neutral-100 block">
                            {selectedDemanda.estimativaHoras}h
                          </span>
                        </div>

                        {/* Automatic sum calculation */}
                        {(() => {
                          // Find total raw pointed hours
                          const activeApontamentos = apontamentos.filter(a => a.idDemanda === selectedDemanda.id);
                          const totalRaw = activeApontamentos.reduce((acc, current) => acc + current.horas, 0);
                          
                          // Look up companies linked to active demand (instead of project contracts)
                          const demandCompanies = Array.from(new Set([
                            ...(selectedDemanda.idEmpresas || []),
                            ...(selectedDemanda.idEmpresa ? [selectedDemanda.idEmpresa] : [])
                          ]));
                          const demandCompanyCount = demandCompanies.length || 1;
                          
                          const adjustedHours = activeProj.contabilizarPorEmpresa 
                            ? totalRaw * demandCompanyCount 
                            : totalRaw;

                          return (
                            <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1 relative overflow-hidden">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Horas Apontadas</span>
                              <span className="text-xl font-bold font-mono text-neutral-100 block">
                                {adjustedHours}h
                              </span>
                              {activeProj.contabilizarPorEmpresa && (
                                <span className="absolute bottom-1 right-2 text-[8px] text-indigo-400 font-mono" title="Faturamento por Empresa">
                                  x{demandCompanyCount} empresas (Raw: {totalRaw}h)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Project multiplier explanation box */}
                      {activeProj.contabilizarPorEmpresa && (
                        (() => {
                          const demandCompanies = Array.from(new Set([
                            ...(selectedDemanda.idEmpresas || []),
                            ...(selectedDemanda.idEmpresa ? [selectedDemanda.idEmpresa] : [])
                          ]));
                          const demandCompanyCount = demandCompanies.length || 1;
                          return (
                            <div className="p-3 bg-indigo-500/5 text-xs text-indigo-300 border border-indigo-500/10 rounded-xl leading-normal mt-2">
                              💡 <strong>Regra de Cálculo Ativa do Projeto:</strong> Como a flag "Contabilizar por Empresa" é <em>true</em>, o sistema calcula as horas multiplicando o total bruto apontado pelo número de empresas atreladas diretamente a esta demanda ({demandCompanyCount} empresas).
                            </div>
                          );
                        })()
                      )}

                      {/* Comparativo de Estimado x Apontado por Atividade */}
                      {(() => {
                        const activeApontamentos = apontamentos.filter(a => a.idDemanda === selectedDemanda.id);
                        const matchedEstimativas = selectedDemanda.estimativas && selectedDemanda.estimativas.length > 0
                          ? selectedDemanda.estimativas
                          : [{ id: "legacy", horas: selectedDemanda.estimativaHoras || 8, atividade: selectedDemanda.atividade || "Desenvolvimento" }];

                        // Find all activities involved in estimates and/or pointings
                        const allActiveActivities = Array.from(new Set([
                          ...matchedEstimativas.map(e => e.atividade),
                          ...activeApontamentos.map(a => a.atividade)
                        ])).filter(Boolean);

                        if (allActiveActivities.length === 0) return null;

                        return (
                          <div className="pt-3 border-t border-neutral-800 space-y-2 mt-4">
                            <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Comparativo por Atividade (Estimado x Apontado)</h5>
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              {allActiveActivities.map((act) => {
                                // Estimated hours for this activity
                                const estHours = matchedEstimativas
                                  .filter(e => e.atividade === act)
                                  .reduce((sum, e) => sum + e.horas, 0);

                                // Pointed hours for this activity
                                const rawApTimes = activeApontamentos.filter(a => a.atividade === act);
                                const rawApHours = rawApTimes.reduce((sum, a) => sum + a.horas, 0);

                                // If contabilizarPorEmpresa is true, adjust the pointed hours
                                const demandCompanies = Array.from(new Set([
                                  ...(selectedDemanda.idEmpresas || []),
                                  ...(selectedDemanda.idEmpresa ? [selectedDemanda.idEmpresa] : [])
                                ]));
                                const demandCompanyCount = demandCompanies.length || 1;
                                const adjustedApHours = activeProj.contabilizarPorEmpresa 
                                  ? rawApHours * demandCompanyCount 
                                  : rawApHours;

                                const isOver = adjustedApHours > estHours && estHours > 0;
                                const percent = estHours > 0 ? Math.min(100, (adjustedApHours / estHours) * 100) : 100;

                                return (
                                  <div key={act} className="bg-neutral-900 border border-neutral-850 p-2.5 rounded-xl space-y-1.5 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-neutral-300 uppercase text-[10px] tracking-wide">{act}</span>
                                      <span className="font-mono text-[11px] font-bold flex gap-1">
                                        <span className={isOver ? "text-rose-450" : "text-emerald-400"}>{adjustedApHours}h</span>
                                        <span className="text-neutral-500">/</span>
                                        <span className="text-neutral-400">{estHours}h est.</span>
                                      </span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1.5 w-full bg-neutral-950 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${isOver ? "bg-rose-500" : percent === 100 ? "bg-indigo-500" : "bg-emerald-500"}`}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Pointings registry card */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Lançamentos deste Chamado</h4>
                      <div className="bg-neutral-950 p-1 border border-neutral-850 rounded-xl max-h-48 overflow-y-auto space-y-1.5">
                        {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).map((ap) => {
                          const demandCompanies = Array.from(new Set([
                            ...(selectedDemanda.idEmpresas || []),
                            ...(selectedDemanda.idEmpresa ? [selectedDemanda.idEmpresa] : [])
                          ]));
                          const demandCompanyCount = demandCompanies.length || 1;
                          const calculatedOutput = activeProj.contabilizarPorEmpresa ? ap.horas * demandCompanyCount : ap.horas;

                          return (
                            <div key={ap.id} className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-850 text-xs">
                              <div>
                                <h5 className="font-bold text-neutral-300">{ap.nomePessoa}</h5>
                                <span className="text-[10px] font-mono text-neutral-500">Atividade: {ap.atividade} | Lançado {new Date(ap.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-neutral-200">
                                  {calculatedOutput}h 
                                  {activeProj.contabilizarPorEmpresa && (
                                    <span className="text-[9px] text-neutral-500 font-medium"> (Raw: {ap.horas}h)</span>
                                  )}
                                </span>
                                <button
                                  onClick={() => deleteApontamento(ap.id)}
                                  className="text-neutral-500 hover:text-rose-400 p-1"
                                >
                                  <Trash size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {apontamentos.filter(a => a.idDemanda === selectedDemanda.id).length === 0 && (
                          <p className="text-xs text-neutral-500 italic text-center py-6">Nenhum lançamento de horas realizado.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Record Pointings form representing project Activities list! */}
                  <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-850 space-y-4">
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider pb-1.5 border-b border-neutral-850 flex items-center justify-between">
                      <span>Registrar Nova Atividade</span>
                      <span className="text-[10px] text-neutral-500">Permitidas da Grade</span>
                    </h4>

                    <div className="space-y-4">
                      {/* Select validated from Project activities list directly! */}
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Selecione a atividade realizada</label>
                        <select
                          value={pointingAtividade}
                          onChange={(e) => setPointingAtividade(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-lg py-2.5 px-3 focus:outline-hidden"
                        >
                          <option value="">Atividade...</option>
                          {activeProj.atividades?.map((at) => (
                            <option key={at} value={at}>
                              {at}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Duração / Bruto de Horas</label>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={pointingHoras}
                          onChange={(e) => setPointingHoras(Number(e.target.value))}
                          className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs rounded-lg py-2 px-3 font-mono"
                        />
                      </div>

                      {pointingError && (
                        <p className="text-[10px] font-semibold text-rose-400">{pointingError}</p>
                      )}

                      <button
                        onClick={() => {
                          if (!pointingAtividade) {
                            setPointingError("Por favor selecione a Atividade Permitida.");
                            return;
                          }
                          setPointingError("");
                          addApontamento({
                            idDemanda: selectedDemanda.id,
                            idPessoa: activeUser?.id || "p1",
                            nomePessoa: activeUser?.nome || "Daniel Thaylor",
                            atividade: pointingAtividade,
                            horas: pointingHoras
                          });
                          setPointingAtividade("");
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer select-none shadow-md"
                      >
                        Lançar Apontamento
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === "tarefas" && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left panel: List of currently associated tasks (Col-span 2) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-850 pb-2 flex items-center justify-between">
                        <span>Demandas Vinculadas Atuais</span>
                        <span className="text-[10px] bg-indigo-505/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono">
                          {selectedDemanda.tarefasAssociadasIds?.length || 0}
                        </span>
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Qualquer demanda do ERP pode ser relacionada para mapeamento de dependências e rastreabilidade transversal.
                      </p>

                      {/* Buttons to Create & Link a Bug or Task directly if the current demand is Incidente, Melhoria, Change or Task */}
                      {(selectedDemanda.tipo === "Incidente" || selectedDemanda.tipo === "Melhoria" || selectedDemanda.tipo === "Change" || selectedDemanda.tipo === "Mudança" || selectedDemanda.tipo === "Task") && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              // 1. Identify current selectedDemanda as the Parent of the Bug
                              setLinkingParentId(selectedDemanda.id);
                              
                              // 2. Open clean registration form
                              handleOpenCreateDemand(selectedDemanda.coluna || "Aprovado Gerencial");
                              
                              // 3. Set type specifically to BUG and set descriptive default title
                              setFormTipo("BUG");
                              setFormTitulo(`Bug relacionado à ${selectedDemanda.tipo}: ${selectedDemanda.titulo}`);
                              setFormDescricao(`Este BUG foi gerado de forma coordenada e vinculada a partir da demanda "${selectedDemanda.titulo}" (${selectedDemanda.numeroChamado}).`);
                              
                              // Inherit matching fields from parent
                              if (selectedDemanda.idResponsavel) setFormResponsavelId(selectedDemanda.idResponsavel);
                              if (selectedDemanda.idDesignados && selectedDemanda.idDesignados.length > 0) {
                                setFormDesignados(selectedDemanda.idDesignados);
                                if (selectedDemanda.idDesignados[0]) setFormDesignado(selectedDemanda.idDesignados[0]);
                              } else if (selectedDemanda.idDesignado) {
                                setFormDesignados([selectedDemanda.idDesignado]);
                                setFormDesignado(selectedDemanda.idDesignado);
                              }
                              if (selectedDemanda.idEmpresas && selectedDemanda.idEmpresas.length > 0) {
                                setFormEmpresas(selectedDemanda.idEmpresas);
                                if (selectedDemanda.idEmpresas[0]) setFormEmpresaId(selectedDemanda.idEmpresas[0]);
                              } else if (selectedDemanda.idEmpresa) {
                                setFormEmpresas([selectedDemanda.idEmpresa]);
                                setFormEmpresaId(selectedDemanda.idEmpresa);
                              }
                              if (selectedDemanda.ambiente) setFormAmbiente(selectedDemanda.ambiente);
                              if (selectedDemanda.subTipoBug) setFormSubTipoBug(selectedDemanda.subTipoBug);
                              if (selectedDemanda.idQAManager) setFormIdQAManager(selectedDemanda.idQAManager);

                              // 4. Force modal tab of the form to "resumo"
                              setActiveDemandFormTab("resumo");
                              
                              // 5. Open Modal
                              setShowCreateModal(true);
                              
                              // Display quick notice
                              addToast("Modo de Vínculo: O BUG criado será anexado como SUBTAREFA (Filha) desta demanda!", "info");
                            }}
                            className="w-full py-2 px-3 bg-red-950/40 hover:bg-red-900/40 border border-red-950 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            🐞 Criar Bug
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // 1. Identify current selectedDemanda as the Parent of the Task
                              setLinkingParentId(selectedDemanda.id);
                              
                              // 2. Open clean registration form
                              handleOpenCreateDemand(selectedDemanda.coluna || "Aprovado Gerencial");
                              
                              // 3. Set type specifically to Task and set descriptive default title
                              setFormTipo("Task");
                              setFormTitulo(`Task relacionada à ${selectedDemanda.tipo}: ${selectedDemanda.titulo}`);
                              setFormDescricao(`Esta Task foi gerada de forma coordenada e vinculada a partir da demanda "${selectedDemanda.titulo}" (${selectedDemanda.numeroChamado}).`);
                              
                              // Inherit matching fields from parent
                              if (selectedDemanda.idResponsavel) setFormResponsavelId(selectedDemanda.idResponsavel);
                              if (selectedDemanda.idDesignados && selectedDemanda.idDesignados.length > 0) {
                                setFormDesignados(selectedDemanda.idDesignados);
                                if (selectedDemanda.idDesignados[0]) setFormDesignado(selectedDemanda.idDesignados[0]);
                              } else if (selectedDemanda.idDesignado) {
                                setFormDesignados([selectedDemanda.idDesignado]);
                                setFormDesignado(selectedDemanda.idDesignado);
                              }
                              if (selectedDemanda.idEmpresas && selectedDemanda.idEmpresas.length > 0) {
                                setFormEmpresas(selectedDemanda.idEmpresas);
                                if (selectedDemanda.idEmpresas[0]) setFormEmpresaId(selectedDemanda.idEmpresas[0]);
                              } else if (selectedDemanda.idEmpresa) {
                                setFormEmpresas([selectedDemanda.idEmpresa]);
                                setFormEmpresaId(selectedDemanda.idEmpresa);
                              }
                              if (selectedDemanda.ambiente) setFormAmbiente(selectedDemanda.ambiente);
                              if (selectedDemanda.subTipoBug) setFormSubTipoBug(selectedDemanda.subTipoBug);
                              if (selectedDemanda.idQAManager) setFormIdQAManager(selectedDemanda.idQAManager);

                              // 4. Force modal tab of the form to "resumo"
                              setActiveDemandFormTab("resumo");
                              
                              // 5. Open Modal
                              setShowCreateModal(true);
                              
                              // Display quick notice
                              addToast("Modo de Vínculo: A Task criada será anexada como SUBTAREFA (Filha) desta demanda!", "info");
                            }}
                            className="w-full py-2 px-3 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-950 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            ➕ Criar Task (TSK)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {selectedDemanda.tarefasAssociadasIds && selectedDemanda.tarefasAssociadasIds.length > 0 ? (
                        selectedDemanda.tarefasAssociadasIds.map((tid) => {
                          const dem = demandas.find(x => x.id === tid);
                          if (!dem) return null;
                          const details = getDemandTypeDetails(dem.tipo);
                          
                          // Determine relation details
                          const relEntry = selectedDemanda.relacoes?.find(r => r.idDemanda === tid);
                          const rType = relEntry ? relEntry.tipo : "irma";
                          const rDetails = getRelationDisplayDetails(rType);

                          return (
                            <div 
                              key={tid}
                              className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-850 hover:border-neutral-800 rounded-xl transition-all group/rel animate-scale-in"
                            >
                              <div 
                                onClick={() => handleNavigateToDemanda(dem)}
                                className="min-w-0 flex-1 mr-3 cursor-pointer"
                                title="Clique para navegar e abrir esta demanda"
                              >
                                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${details.badgeClasses || 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}>
                                    {details.prefix} - {dem.numeroChamado}
                                  </span>
                                  <span className="text-[9px] text-neutral-500 font-medium bg-neutral-900/40 px-1 py-0.5 rounded">
                                    {dem.coluna}
                                  </span>
                                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono ${rDetails.badgeClasses}`}>
                                    {rDetails.label}
                                  </span>
                                </div>
                                <h5 className="text-xs font-bold text-neutral-200 truncate group-hover/rel:text-indigo-400 transition-colors">
                                  {dem.titulo}
                                </h5>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleNavigateToDemanda(dem)}
                                  className="text-neutral-500 hover:text-indigo-400 p-1.5 hover:bg-neutral-900/60 rounded-lg transition-colors cursor-pointer"
                                  title="Visualizar Demanda"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const isParentOfTask = selectedDemanda.tipo === "Task" && 
                                                           selectedDemanda.relacoes?.some(r => r.idDemanda === tid && r.tipo === "pai");
                                    if (isParentOfTask) {
                                      addToast("O pai de uma Task de trabalho não pode ser removido!", "error");
                                      return;
                                    }
                                    await removeRelationBidirectional(selectedDemanda.id, tid);
                                    addToast("Associação removida com sucesso", "success");
                                  }}
                                  className="text-neutral-500 hover:text-rose-450 p-1.5 hover:bg-neutral-900/60 rounded-lg transition-colors cursor-pointer"
                                  title="Remover Associação"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-neutral-850 rounded-2xl text-center">
                          <Link2 className="text-neutral-600 mb-2 animate-pulse" size={24} />
                          <p className="text-xs text-neutral-400 font-semibold">Sem Demandas Relacionadas</p>
                          <p className="text-[10px] text-neutral-500 mt-1 max-w-[200px] leading-relaxed">
                            Utilize o painel ao lado para pesquisar e associar outras demandas de forma simplificada.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right panel: Find and Link Panel (Col-span 3) */}
                  <div className="lg:col-span-3 space-y-4 bg-neutral-950/40 border border-neutral-850 p-5 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest border-b border-neutral-800 pb-2">
                        Vincular Nova Demanda
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Selecione o tipo, filtre ou pesquise o título/ID para criar o relacionamento entre chamados instantaneamente.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                      {/* Intelligent Text Filter */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase block">Filtro de Texto Inteligente</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 text-neutral-500" size={13} />
                          <input
                            type="text"
                            value={relSearchText}
                            onChange={(e) => setRelSearchText(e.target.value)}
                            placeholder="Buscar título, ID ou descrição de demanda..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-neutral-200 outline-none placeholder-neutral-600 focus:border-indigo-500 transition-all font-sans"
                          />
                        </div>
                      </div>

                      {/* Filter by Type Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase block">Tipo de Demanda</label>
                        <select
                          value={relSearchType}
                          onChange={(e) => setRelSearchType(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Todos">📦 Todos os Tipos</option>
                          <option value="Melhoria">⭐ Melhoria</option>
                          <option value="Incidente">🚨 Incidente</option>
                          <option value="Change">⚙️ Change (Mudança)</option>
                          <option value="BUG">🐞 Defeito / BUG</option>
                          <option value="Outros">🛡️ Outros</option>
                        </select>
                      </div>

                      {/* Filter by Project / Search Scope Selector */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase block">Escopo da Relação</label>
                        <div className="flex gap-2">
                          {[
                            { id: "Corrente", label: `Projeto Atual (${activeProj?.nome || "Corrente"})` },
                            { id: "Todos", label: "Pesquisar em Todos os Projetos" }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setRelSearchProject(opt.id)}
                              className={`flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                                relSearchProject === opt.id 
                                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-400" 
                                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                              }`}
                            >
                               {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Relationship Type Selection before linking */}
                      <div className="space-y-1.5 md:col-span-2 bg-neutral-950 p-3 rounded-xl border border-neutral-850">
                        <label className="text-[10px] text-indigo-400 font-bold uppercase block tracking-wider font-mono">
                          ⚡ Escolher Relação antes de Vincular
                        </label>
                        <span className="text-[9.5px] text-neutral-400 leading-normal block">
                          Ao clicar em <b>+ Vincular</b>, a nova demanda relacionada será vinculada como:
                        </span>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { id: "filha", label: "Filha (Subtarefa)", desc: "Como dependente", color: "hover:border-pink-500/40 text-pink-400 bg-pink-955/20 border-pink-900/30" },
                            { id: "pai", label: "Pai (Predecessora)", desc: "Como origem", color: "hover:border-indigo-500/40 text-indigo-400 bg-indigo-955/20 border-indigo-900/30" },
                            { id: "irma", label: "Irmã (Relacionada)", desc: "Como paralelo", color: "hover:border-teal-500/40 text-teal-400 bg-teal-955/20 border-teal-900/30" }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSelectedRelOption(opt.id as any)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                selectedRelOption === opt.id 
                                  ? `border-indigo-550 ring-1 ring-indigo-505/50 ${opt.color}` 
                                  : "border-neutral-900 bg-neutral-900/40 text-neutral-400"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase">{selectedRelOption === opt.id ? "● " : ""}{opt.label.split(" ")[0]}</span>
                              <span className="text-[8px] text-neutral-500 mt-0.5 block leading-tight">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Results Container list */}
                    <div className="border-t border-neutral-850 pt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {(() => {
                        const results = demandas.filter(d => {
                          if (!selectedDemanda) return false;
                          if (d.id === selectedDemanda.id) return false;
                          if (d.excluido) return false;
                          
                          // Project filter
                          if (relSearchProject === "Corrente" && d.idProjeto !== selectedDemanda.idProjeto) {
                            return false;
                          }
                          
                          // Type filter
                          if (relSearchType !== "Todos" && d.tipo !== relSearchType) {
                            return false;
                          }
                          
                          // Smart text match
                          if (relSearchText.trim()) {
                            const q = relSearchText.toLowerCase();
                            const matchTitle = (d.titulo || "").toLowerCase().includes(q);
                            const matchNum = (d.numeroChamado || "").toLowerCase().includes(q);
                            const matchDesc = (d.descricao || "").toLowerCase().includes(q);
                            const matchTags = (d.tags || []).some(t => t.toLowerCase().includes(q));
                            
                            if (!matchTitle && !matchNum && !matchDesc && !matchTags) {
                              return false;
                            }
                          }
                          
                          return true;
                        });

                        if (results.length === 0) {
                          return (
                            <p className="text-center text-[11px] text-neutral-500 italic py-6">
                              Nenhuma outra demanda corresponde aos filtros aplicados.
                            </p>
                          );
                        }

                        return results.slice(0, 15).map(d => {
                          const isLinked = (selectedDemanda.tarefasAssociadasIds || []).includes(d.id);
                          const dDetails = getDemandTypeDetails(d.tipo);
                          
                          return (
                            <div 
                              key={d.id} 
                              className="flex items-center justify-between p-2.5 bg-neutral-900/60 border border-neutral-850 hover:bg-neutral-900/80 rounded-xl transition-all"
                            >
                              <div className="min-w-0 mr-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${dDetails.badgeClasses || 'bg-neutral-950 border border-neutral-800 text-neutral-400'}`}>
                                    {dDetails.prefix} - {d.numeroChamado}
                                  </span>
                                  {d.idProjeto !== selectedDemanda.idProjeto && (
                                    <span className="text-[8px] bg-neutral-950 text-neutral-500 border border-neutral-850 rounded px-1.5 py-0.5">
                                      {projetos.find(p => p.id === d.idProjeto)?.nome || "Outro Projeto"}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-neutral-500 font-medium">
                                    {d.coluna}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-neutral-300 truncate mt-1">{d.titulo}</p>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (isLinked) {
                                    const isParentOfTask = selectedDemanda.tipo === "Task" && 
                                                           selectedDemanda.relacoes?.some(r => r.idDemanda === d.id && r.tipo === "pai");
                                    if (isParentOfTask) {
                                      addToast("O pai de uma Task de trabalho não pode ser removido!", "error");
                                      return;
                                    }
                                    await removeRelationBidirectional(selectedDemanda.id, d.id);
                                    addToast("Associação removida com sucesso", "success");
                                  } else {
                                    await addRelationBidirectional(selectedDemanda.id, d.id, selectedRelOption);
                                    addToast(`Demanda vinculada com sucesso como ${selectedRelOption === "filha" ? "Filha" : selectedRelOption === "pai" ? "Pai" : "Irmã"}!`, "success");
                                  }
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer shrink-0 ${
                                  isLinked 
                                    ? selectedDemanda.tipo === "Task" && selectedDemanda.relacoes?.some(r => r.idDemanda === d.id && r.tipo === "pai")
                                      ? "bg-neutral-900 border-neutral-800 text-neutral-550 cursor-not-allowed opacity-60"
                                      : "bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500" 
                                    : "bg-indigo-650 border-indigo-600 text-white hover:bg-indigo-505"
                                }`}
                              >
                                {isLinked ? "✕ Desvincular" : "+ Vincular"}
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN EXCLUDED VIEW OF THE COMMENT ON MAXIMIZED */}
      {isFullscreenComment && selectedCommentForPreview && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md z-[60] flex flex-col justify-between p-6">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-850">
            <div>
              <h4 className="text-md font-bold text-neutral-200">{selectedCommentForPreview.nomeAutor}</h4>
              <span className="text-xs font-mono text-neutral-500">{new Date(selectedCommentForPreview.createdAt).toLocaleString()}</span>
            </div>
            <button 
              onClick={() => setIsFullscreenComment(false)}
              className="text-neutral-400 hover:text-neutral-100 p-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg"
            >
              Fechar Visualização
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-8 px-4 prose max-w-4xl mx-auto select-text">
            <div 
              className="text-lg text-neutral-300 leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: selectedCommentForPreview.textoHTML }} 
            />
          </div>
          <div className="text-center text-xs text-neutral-600 font-mono">
            Mapeamento de banco de dados NoSQL Firestore - GMZ SOLUTIONS ERP
          </div>
        </div>
      )}

      {/* DETAILED FORM: CREATE & EDIT DEMAND */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-[96vw] xl:max-w-[94vw] overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-955">
              <div>
                <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest font-mono">CADASTRO DE DEMANDA</h3>
                <h3 className="text-lg font-bold text-neutral-100">
                  {editId ? "Ajustar Cadastro de Demanda" : "Registrar Nova Demanda Kanban"}
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            {(() => {
              const activeCustomType = activeProj?.tiposDemandasCustom?.find(ct => ct.nome === formTipo);
              const showResumoFields = activeDemandFormTab === "resumo" || (activeCustomType && activeDemandFormTab === "geral");
              const showDetalhesFields = activeDemandFormTab === "detalhes" || (activeCustomType && activeDemandFormTab === "geral");
              const showPassoPassoFields = activeDemandFormTab === "passopasso";
              const showTarefasFields = activeDemandFormTab === "tarefas" || (activeCustomType && activeDemandFormTab === "geral");
              const showAnexosFields = activeDemandFormTab === "anexos" || (activeCustomType && activeDemandFormTab === "anexos");
              return (
                <form onSubmit={handleSaveDemand} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
                  
                  {/* Dynamic Tabs (Abas) Header */}
                  <div className="flex flex-wrap border-b border-neutral-800 gap-2 pb-1.5 p-2 rounded-xl border border-neutral-850 bg-neutral-950/30">
                    {getFormTabs().map((tab) => (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => {
                          setActiveDemandFormTab(tab.id);
                        }}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                          activeDemandFormTab === tab.id 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15" 
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
                        }`}
                      >
                        {tab.id === "resumo" ? "📁" : tab.id === "detalhes" ? "🔧" : tab.id === "passopasso" ? "📝" : tab.id === "tarefas" ? "🌿" : "📎"} {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-neutral-300">Título / Assunto Principal</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Refatorar controle de acessos da API"
                        value={formTitulo}
                        onChange={(e) => setFormTitulo(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                      />
                    </div>

                <div className="space-y-1.5 col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-955 p-4 rounded-xl border border-neutral-805/60 mb-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono">Tipo de Demanda</label>
                    <select
                      value={formTipo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormTipo(val);
                        const matchTypeObj = activeProj?.tiposDemandasCustom?.find(x => x.nome === val);
                        if (matchTypeObj && matchTypeObj.sigla) {
                          const rawNum = formNumeroChamado.includes("-") ? formNumeroChamado.split("-")[1] : formNumeroChamado;
                          setFormNumeroChamado(`${matchTypeObj.sigla}-${rawNum}`);
                        } else {
                          const rawNum = formNumeroChamado.includes("-") ? formNumeroChamado.split("-")[1] : formNumeroChamado;
                          setFormNumeroChamado(rawNum);
                        }
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none hover:border-indigo-500/50 transition-colors cursor-pointer font-semibold"
                    >
                      <option value="Melhoria">Melhoria</option>
                      <option value="Incidente">Incidente</option>
                      <option value="Change">Change (Mudança)</option>
                      <option value="BUG">Defeito / BUG</option>
                      {(formTipo === "Task" || linkingParentId) && (
                        <option value="Task">Task (TSK)</option>
                      )}
                      <option value="Outros">Outros</option>
                      {activeProj?.tiposDemandasCustom?.map((ct) => (
                        <option key={ct.id} value={ct.nome}>
                          ✨ {ct.nome} ({ct.sigla})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 select-text opacity-90">
                    <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <span>Nº do Chamado (Criado Automaticamente)</span>
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.5 rounded font-mono font-bold">NÃO ALTERÁVEL</span>
                    </label>
                    <input
                      type="text"
                      required
                      readOnly
                      title="Este número é gerado de forma sequencial automático e não pode ser editado manualmente"
                      value={formNumeroChamado}
                      className="w-full bg-neutral-900 border border-neutral-800/80 rounded-xl px-4 py-2.5 text-sm text-indigo-400 font-mono font-bold cursor-not-allowed outline-none select-all focus:ring-0"
                    />
                  </div>
                </div>

                {showResumoFields && (
                  <>
                    {/* Campos Específicos de Melhoria (Status Proposta, Cliente Responsável) */}
                    {formTipo === "Melhoria" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2 bg-indigo-950/20 border border-indigo-900/35 p-4 rounded-xl">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                            <span>Status da Proposta</span>
                          </label>
                          <select
                            value={formStatusProposta}
                            onChange={(e) => setFormStatusProposta(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                          >
                            <option value="Em análise">Em análise</option>
                            <option value="Proposta Enviada">Proposta Enviada</option>
                            <option value="Aprovada">Aprovada</option>
                            <option value="Re-análise">Re-análise</option>
                            <option value="Reprovada">Reprovada</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                            <span>Cliente Responsável</span>
                          </label>
                          <select
                            value={formClienteResponsavelId}
                            onChange={(e) => setFormClienteResponsavelId(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-neutral-200 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer"
                          >
                            <option value="">Selecione o Cliente Responsável...</option>
                            {pessoas.filter(p => p.tipo === "Cliente").map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                        <span>Nº do Cliente para a Demanda (Opcional)</span>
                        <span className="text-[10px] text-neutral-500 font-mono">Presente em todas demandas</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: CLT-4927-PR"
                        value={formNumeroCliente}
                        onChange={(e) => setFormNumeroCliente(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                      />
                    </div>

                {formTipo !== "Change" && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold text-neutral-300">Criticidade da Demanda</label>
                    <select
                      value={formCriticidade}
                      onChange={(e) => setFormCriticidade(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none hover:border-indigo-500/50 transition-colors cursor-pointer"
                    >
                      <option value="Baixa">Baixa (Verde)</option>
                      <option value="Média">Média (Amarelo)</option>
                      <option value="Alta">Alta (Vermelho)</option>
                      <option value="Urgente">Urgente (Rosa)</option>
                      <option value="Padrão">Padrão (Azul)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    Responsável (Dono ou Criador do Card)
                  </label>
                  <select
                    value={formResponsavelId}
                    onChange={(e) => setFormResponsavelId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none hover:border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <option value="">Selecione o Responsável</option>
                    {pessoas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 relative">
                  <label className="text-xs font-semibold text-neutral-300 flex justify-between items-center">
                    <span>Responsável Técnico (Para Execução)</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{formDesignados.length} selecionado(s)</span>
                  </label>
                  
                  {/* Selected badges list */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formDesignados.map((id) => {
                      const p = pessoas.find((pers) => pers.id === id);
                      if (!p) return null;
                      return (
                        <span 
                          key={id} 
                          className="inline-flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-medium animate-scale-in"
                        >
                          <span>{p.nome}</span>
                          <button
                            type="button"
                            onClick={() => setFormDesignados((prev) => prev.filter((dId) => dId !== id))}
                            className="text-indigo-400 hover:text-rose-450 font-bold text-xs pl-0.5 cursor-pointer"
                            title="Remover responsável"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                    {formDesignados.length === 0 && (
                      <span className="text-xs text-neutral-500 italic">Nenhum responsável selecionado</span>
                    )}
                  </div>

                  {/* Trigger / Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpenPessoasDropdown(!isOpenPessoasDropdown);
                        setIsOpenEmpresasDropdown(false);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 flex items-center justify-between outline-none cursor-pointer text-left transition-all"
                    >
                      <span className="text-neutral-400 text-xs truncate">
                        {isOpenPessoasDropdown ? "Digitando busca..." : "🔍 Buscar e associar pessoas..."}
                      </span>
                      <span className="text-neutral-500 text-[11px] font-bold font-mono tracking-wide bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                        {isOpenPessoasDropdown ? "FECHAR" : "ABRIR FILTRO"}
                      </span>
                    </button>

                    {isOpenPessoasDropdown && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-slide-down">
                        {/* Search Input inside the dropdown popover */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Pesquisar por nome..."
                            value={filterPessoasText}
                            onChange={(e) => setFilterPessoasText(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-medium"
                            autoFocus
                          />
                          {filterPessoasText && (
                            <button
                              type="button"
                              onClick={() => setFilterPessoasText("")}
                              className="absolute right-2.5 top-1.5 text-neutral-500 hover:text-neutral-300 text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* List of filtered options */}
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                          {(() => {
                            const filtered = pessoas
                              .filter((p) => p.tipo === "GMZ")
                              .filter((p) => activeUser?.perfil === "Técnico" ? p.id === activeUser.id : true)
                              .filter((p) => p.nome.toLowerCase().includes(filterPessoasText.toLowerCase()));

                            if (filtered.length === 0) {
                              return (
                                <p className="text-center text-xs text-neutral-500 italic py-3">
                                  Nenhuma pessoa autorizada para seu perfil.
                                </p>
                              );
                            }

                            return filtered.map((p) => {
                              const isChecked = formDesignados.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setFormDesignados((prev) => prev.filter((id) => id !== p.id));
                                    } else {
                                      setFormDesignados((prev) => [...prev, p.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all border ${
                                    isChecked 
                                      ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-200" 
                                      : "border-transparent hover:bg-neutral-950 hover:border-neutral-800 text-neutral-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                      isChecked ? "border-indigo-500 bg-indigo-600 text-white" : "border-neutral-700"
                                    }`}>
                                      {isChecked && <Check size={10} className="stroke-[3]" />}
                                    </div>
                                    <span className="truncate">{p.nome}</span>
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 shrink-0 uppercase">
                                    {p.tipo}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Dropdown footer actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[10px]">
                          <div className="flex gap-2">
                            {activeUser?.perfil !== "Técnico" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allGmzIds = pessoas.filter((p) => p.tipo === "GMZ").map((p) => p.id);
                                    setFormDesignados(allGmzIds);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                                >
                                  Selecionar Todos
                                </button>
                                <span className="text-neutral-700">|</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setFormDesignados([])}
                              className="text-neutral-500 hover:text-rose-400 font-bold cursor-pointer"
                            >
                              Limpar
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsOpenPessoasDropdown(false)}
                            className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 px-2 py-1 rounded font-bold cursor-pointer"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {formDesignados.length === 0 && (
                    <p className="text-[10px] text-yellow-500/80 italic">⚠️ Selecione pelo menos um responsável atribuído.</p>
                  )}
                </div>

                {formTipo !== "Change" && (
                  <div className="space-y-1.5 col-span-2 relative">
                    <label className="text-xs font-semibold text-neutral-300 flex justify-between items-center">
                      <span>Empresas Clientes Associadas</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{formEmpresas.length} selecionada(s)</span>
                    </label>

                    {/* Selected badges list */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formEmpresas.map((id) => {
                        const emp = empresas.find((e) => e.id === id);
                        if (!emp) return null;
                        return (
                          <span 
                            key={id} 
                            className="inline-flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-lg font-medium animate-scale-in"
                          >
                            <span>🏢 {emp.nome}</span>
                            <button
                              type="button"
                              onClick={() => setFormEmpresas((prev) => prev.filter((eId) => eId !== id))}
                              className="text-indigo-400 hover:text-rose-450 font-bold text-xs pl-0.5 cursor-pointer"
                              title="Remover empresa"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                      {formEmpresas.length === 0 && (
                        <span className="text-xs text-neutral-500 italic">Nenhuma empresa cliente selecionada</span>
                      )}
                    </div>

                    {/* Trigger / Selector Dropdown */}
                    {(() => {
                      const projectContracts = contratos.filter((c) => activeProj?.contratoIds?.includes(c.id));
                      const allowedEmpresaIds = Array.from(new Set(projectContracts.flatMap((c) => c.empresaIds || [])));
                      const allowedEmpresas = empresas.filter((emp) => allowedEmpresaIds.includes(emp.id));

                      if (allowedEmpresas.length === 0) {
                        return (
                          <div className="text-xs text-neutral-500 bg-neutral-950 border border-neutral-850 rounded-xl p-4 text-center italic w-full">
                            ⚠️ Vincule contratos a este projeto na aba de projetos primeiro!
                          </div>
                        );
                      }

                      return (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpenEmpresasDropdown(!isOpenEmpresasDropdown);
                              setIsOpenPessoasDropdown(false);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 flex items-center justify-between outline-none cursor-pointer text-left transition-all"
                          >
                            <span className="text-neutral-400 text-xs truncate">
                              {isOpenEmpresasDropdown ? "Digitando busca..." : "🏢 Buscar e associar empresas..."}
                            </span>
                            <span className="text-neutral-500 text-[11px] font-bold font-mono tracking-wide bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                              {isOpenEmpresasDropdown ? "FECHAR" : "ABRIR FILTRO"}
                            </span>
                          </button>

                          {isOpenEmpresasDropdown && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-slide-down font-sans">
                              {/* Search Input inside the dropdown popover */}
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Pesquisar por nome de empresa..."
                                  value={filterEmpresasText}
                                  onChange={(e) => setFilterEmpresasText(e.target.value)}
                                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-medium"
                                  autoFocus
                                />
                                {filterEmpresasText && (
                                  <button
                                    type="button"
                                    onClick={() => setFilterEmpresasText("")}
                                    className="absolute right-2.5 top-1.5 text-neutral-500 hover:text-neutral-300 text-xs font-bold"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              {/* List of filtered business options */}
                              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                {(() => {
                                  const filtered = allowedEmpresas.filter((emp) =>
                                    emp.nome.toLowerCase().includes(filterEmpresasText.toLowerCase())
                                  );

                                  if (filtered.length === 0) {
                                    return (
                                      <p className="text-center text-xs text-neutral-500 italic py-3">
                                        Nenhuma empresa encontrada with essa busca.
                                      </p>
                                    );
                                  }

                                  return filtered.map((emp) => {
                                    const isChecked = formEmpresas.includes(emp.id);
                                    return (
                                      <div
                                        key={emp.id}
                                        onClick={() => {
                                          if (isChecked) {
                                            setFormEmpresas((prev) => prev.filter((id) => id !== emp.id));
                                          } else {
                                            setFormEmpresas((prev) => [...prev, emp.id]);
                                          }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all border ${
                                          isChecked 
                                            ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-200" 
                                            : "border-transparent hover:bg-neutral-950 hover:border-neutral-800 text-neutral-300"
                                        }`}
                                      >
                                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                          isChecked ? "border-indigo-500 bg-indigo-600 text-white" : "border-neutral-700"
                                        }`}>
                                          {isChecked && <Check size={10} className="stroke-[3]" />}
                                        </div>
                                        <span className="truncate">{emp.nome}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Dropdown footer actions */}
                              <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[10px]">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allAllowedIds = allowedEmpresas.map((e) => e.id);
                                      setFormEmpresas(allAllowedIds);
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                                  >
                                    Selecionar Todas
                                  </button>
                                  <span className="text-neutral-700">|</span>
                                  <button
                                    type="button"
                                    onClick={() => setFormEmpresas([])}
                                    className="text-neutral-500 hover:text-rose-450 font-bold cursor-pointer"
                                  >
                                    Limpar
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIsOpenEmpresasDropdown(false)}
                                  className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 text-neutral-300 px-2 py-1 rounded font-bold cursor-pointer"
                                >
                                  Fechar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {formEmpresas.length === 0 && (
                      <p className="text-[10px] text-yellow-500/80 italic">⚠️ Selecione pelo menos uma empresa cliente associada.</p>
                    )}
                  </div>
                )}

                <div className="col-span-2 space-y-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-805">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <Clock size={14} className="text-indigo-400" />
                      Estimativas de Atividades
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 font-medium">Soma Estimada:</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-950/85 border border-indigo-900 text-indigo-300">
                        {formEstimativas.reduce((acc, c) => acc + c.horas, 0)}h
                      </span>
                    </div>
                  </div>

                  {/* List of currently added estimativas */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {formEstimativas.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-neutral-950 px-3.5 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 transition">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-neutral-300">{item.horas}h</span>
                          <span className="text-xs text-neutral-400">em</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200 uppercase tracking-wider text-[10px]">
                            {item.atividade}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEstimativaItem(item.id)}
                          className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-neutral-900 transition cursor-pointer"
                          title="Remover estimativa"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {formEstimativas.length === 0 && (
                      <div className="text-center py-4 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-lg">
                        <p className="text-xs text-neutral-500 italic font-mono text-[11px]">Nenhuma estimativa de horas cadastrada para este chamado.</p>
                      </div>
                    )}
                  </div>

                  {/* Addition section */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-neutral-800">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Horas Estimadas</label>
                      <input
                        type="number"
                        min={1}
                        value={formEstimativa}
                        onChange={(e) => setFormEstimativa(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-neutral-100 font-mono"
                        placeholder="Ex: 8"
                      />
                    </div>
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Atividade correspondente</label>
                      <select
                        value={formAtividadeEstimativa}
                        onChange={(e) => setFormAtividadeEstimativa(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-neutral-100 outline-none cursor-pointer"
                      >
                        <option value="">Selecione uma atividade...</option>
                        {activeProj?.atividades?.map((at) => (
                          <option key={at} value={at}>
                            {at}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3 flex items-end">
                      <button
                        type="button"
                        onClick={handleAddEstimativaItem}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition active:scale-[0.98]"
                      >
                        <Plus size={14} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {showPassoPassoFields && (
                  <div className="space-y-4 col-span-2 bg-neutral-900/40 border border-neutral-800 p-5 rounded-2xl">
                    
                    {/* QA Manager Selector */}
                    <div className="space-y-2 border-b border-neutral-800/80 pb-4 mb-4">
                      <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center gap-1">
                        <span>👤 QA MANAGER / ANALISTA DE QA</span>
                      </label>
                      <select
                        value={formIdQAManager}
                        onChange={(e) => setFormIdQAManager(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-neutral-200 outline-none hover:border-indigo-550/50 transition-colors cursor-pointer font-sans"
                      >
                        <option value="">Nenhum QA Manager selecionado...</option>
                        {pessoas.filter(p => p.tipo === "GMZ" || p.tipo === "Outros" || p.perfil === "QA" || p.tipo === "Cliente").map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({p.tipo})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Status QA Toggle Selection */}
                    <div className="space-y-2 border-b border-neutral-800/80 pb-4 mb-4">
                      <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center gap-1">
                        <span>🛠️ STATUS QA ATUAL DO REGISTRO</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Reproduzido", "Corrigido", "Validado"].map((statusOption) => {
                          const isActive = formStatusQA === statusOption;
                          const activeColorMap: Record<string, string> = {
                            "Reproduzido": "bg-orange-600 border-orange-500 text-white shadow-md shadow-orange-500/15",
                            "Corrigido": "bg-yellow-600 border-yellow-500 text-neutral-950 shadow-md shadow-yellow-500/15 font-bold",
                            "Validado": "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/15"
                          };

                          return (
                            <button
                              type="button"
                              key={statusOption}
                              onClick={() => setFormStatusQA(statusOption as any)}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                                isActive 
                                  ? activeColorMap[statusOption] 
                                  : `bg-neutral-950 border-neutral-850 text-neutral-450 hover:text-neutral-200 hover:bg-neutral-900`
                              }`}
                            >
                              {statusOption}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-2.5">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5 select-none">
                        📋 DESCRIÇÃO PASSO A PASSO (1º, 2º ...)
                      </h4>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const stepsText = formPassosQA
                              .map((step, sIdx) => `${sIdx + 1}º Passo: ${step.text}`)
                              .join("\n");
                            const clipboardBody = `KABAN PASSO A PASSO:\n\n${stepsText}\n\nStatus QA: ${formStatusQA}`;
                            navigator.clipboard.writeText(clipboardBody);
                            setCopiedStepsFeedback(true);
                            setTimeout(() => setCopiedStepsFeedback(false), 2000);
                          }}
                          className="flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none"
                        >
                          <span>{copiedStepsFeedback ? "📋 Copiado!" : "📋 Copiar passos"}</span>
                        </button>

                        <span className="text-[10px] font-semibold bg-indigo-950 font-mono text-indigo-300 border border-indigo-900 px-2 py-1 rounded-md">
                          {formPassosQA.length} Passo(s)
                        </span>
                      </div>
                    </div>

                    {/* Step list already created - support interactive Drag & Drop */}
                    <div className="space-y-3">
                      {formPassosQA.map((step, idx) => {
                        const sequentialLabel = `${idx + 1}º`;
                        return (
                          <div 
                            key={step.id} 
                            draggable={true}
                            onDragStart={() => handleStepDragStart(idx)}
                            onDragOver={(e) => handleStepDragOver(e, idx)}
                            onDrop={() => handleStepDrop(idx)}
                            className={`relative bg-neutral-950 border p-4 rounded-xl space-y-2 animate-scale-in group transition-all ${
                              draggedStepIdx === idx 
                                ? "border-dashed border-indigo-500 bg-neutral-900/50 opacity-40" 
                                : "border-neutral-850 hover:border-neutral-750"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 select-none">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing font-mono text-xs font-bold p-1 hover:bg-neutral-900 rounded select-none"
                                  title="Arraste para reordenar os passos"
                                >
                                  ⠿
                                </span>
                                <span className="bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-[11px] font-mono w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-md">
                                  {sequentialLabel}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">Passo</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Eye Icon - Opens Gallery Walkthrough */}
                                {step.images && step.images.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGalleryStep(step);
                                      setGalleryActiveIndex(0);
                                    }}
                                    className="p-1 rounded hover:bg-neutral-850 hover:text-indigo-400 text-neutral-500 transition-colors cursor-pointer flex items-center gap-1"
                                    title="Visualizar galeria de imagens"
                                  >
                                    <Eye size={13} />
                                    <span className="text-[9px] font-bold font-mono">Ver ({step.images.length})</span>
                                  </button>
                                )}

                                {/* Manual Order buttons */}
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveStep(idx, "up")}
                                  className="p-1 rounded hover:bg-neutral-850 hover:text-white text-neutral-500 disabled:opacity-20 cursor-pointer"
                                  title="Subir ordem"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formPassosQA.length - 1}
                                  onClick={() => handleMoveStep(idx, "down")}
                                  className="p-1 rounded hover:bg-neutral-850 hover:text-white text-neutral-500 disabled:opacity-20 cursor-pointer"
                                  title="Descer ordem"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStepQA(step.id)}
                                  className="text-neutral-500 hover:text-rose-450 p-1 text-xs font-bold transition-colors cursor-pointer"
                                  title="Remover este passo"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Editable textarea directly in step list */}
                            <textarea
                              value={step.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setFormPassosQA((prev) =>
                                  prev.map((s) => (s.id === step.id ? { ...s, text: newText } : s))
                                );
                              }}
                              placeholder="Descreva o que fazer e o que observar nesta etapa..."
                              rows={2}
                              className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-650 focus:outline-hidden mt-1"
                            />

                            {/* Step custom images view & direct added file helper */}
                            <div className="space-y-1.5 pt-1.5">
                              <span className="text-[9px] text-neutral-500 block uppercase font-mono tracking-wider select-none">Imagens deste passo ({step.images?.length || 0})</span>
                              
                              <div className="flex flex-wrap gap-2 items-center">
                                {step.images?.map((img, imgIdx) => (
                                  <div key={imgIdx} className="relative group/img w-16 h-16 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center shrink-0 select-none">
                                    <img src={img} alt="passo" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImageFromStep(step.id, imgIdx)}
                                      className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-[10px] font-extrabold transition-all cursor-pointer"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                ))}

                                {/* Direct Add Image To Existing Step helper */}
                                <label className="w-16 h-16 rounded-lg border border-dashed border-neutral-800 hover:border-indigo-500 hover:bg-neutral-950/40 flex flex-col items-center justify-center text-neutral-550 hover:text-indigo-400 cursor-pointer transition text-center p-1 font-mono select-none">
                                  <span className="text-xs font-bold font-sans">+</span>
                                  <span className="text-[8px] tracking-tight leading-none uppercase">Local</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      const files = e.target.files;
                                      if (!files) return;
                                      Array.from(files).forEach((file: any) => {
                                        const r = new FileReader();
                                        r.onload = () => {
                                          handleAddImageToExistingStep(step.id, r.result as string);
                                        };
                                        r.readAsDataURL(file);
                                      });
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                
                                {/* URL paste input to existing step */}
                                <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shrink-0 h-10 w-44">
                                  <input
                                    type="text"
                                    placeholder="Adicionar url..."
                                    id={`input-url-step-${step.id}`}
                                    className="px-2 py-1 text-[9px] w-full bg-transparent border-none text-neutral-350 focus:outline-hidden font-mono"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const inputEl = document.getElementById(`input-url-step-${step.id}`) as HTMLInputElement;
                                        if (inputEl && inputEl.value.trim()) {
                                          handleAddImageToExistingStep(step.id, inputEl.value.trim());
                                          inputEl.value = "";
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {formPassosQA.length === 0 && (
                        <p className="text-xs text-neutral-500 italic text-center p-4 bg-neutral-950/20 border border-dashed border-neutral-850 rounded-xl select-none">Nenhum passo adicionado ainda. Preencha o construtor abaixo para criar o 1º Passo!</p>
                      )}
                    </div>

                    {/* Step builder panel for NEW passo */}
                    <div className="bg-neutral-950/60 border border-dashed border-neutral-800 p-4 rounded-xl space-y-3 mt-4">
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                          ➕ CRIAR {formPassosQA.length + 1}º PASSO
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Descrição do Passo</label>
                        <textarea
                          placeholder="Ex: Abrir a página de checkout, preencher as informações de pagamento falsas de teste e observar que..."
                          value={draftStepText}
                          onChange={(e) => setDraftStepText(e.target.value)}
                          rows={2}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <span className="text-[9px] text-neutral-500 block uppercase tracking-wider">Adicionar Imagens a este novo passo</span>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                          {draftStepImages.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-neutral-850 bg-neutral-950 flex items-center justify-center shrink-0">
                              <img src={img} alt="Draft step" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                              <button
                                type="button"
                                onClick={() => setDraftStepImages(prev => prev.filter((_, idx) => idx !== imgIdx))}
                                className="absolute inset-0 bg-rose-950/85 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          ))}

                          {/* Trigger file picker upload */}
                          <label className="w-14 h-14 rounded-lg border border-dashed border-neutral-805 hover:border-indigo-500 hover:bg-neutral-905 flex flex-col items-center justify-center text-neutral-550 hover:text-indigo-400 cursor-pointer transition text-center p-1">
                            <span className="text-xs font-bold font-sans">+</span>
                            <span className="text-[8px] tracking-tight leading-none uppercase">Local</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handleDraftStepFileChangeComp}
                            />
                          </label>

                          {/* Image paste url field */}
                          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden h-9 w-40">
                            <input
                              type="text"
                              placeholder="Adicionar por URL..."
                              value={draftStepImageUrl}
                              onChange={(e) => setDraftStepImageUrl(e.target.value)}
                              className="px-2 py-1 text-[9px] w-full bg-transparent border-none text-neutral-300 focus:outline-hidden"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddDraftStepImageUrlComp();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleAddDraftStepImageUrlComp}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs p-1 px-2.5 transition shrink-0 cursor-pointer h-full"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleAddStepQA}
                          disabled={!draftStepText.trim()}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer"
                        >
                          Confirmar e Inserir {formPassosQA.length + 1}º Passo
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showDetalhesFields && formTipo === "Change" && (
                  <div className="space-y-4 col-span-2 bg-purple-950/10 border border-purple-900/35 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest font-mono">
                      ⚙️ CONFIGURAÇÕES DE MUDANÇA (CHANGE MANAGEMENT)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Justificativa da Mudança</label>
                        <textarea
                          placeholder="Por que essa alteração é necessária?"
                          value={formJustificativa}
                          onChange={(e) => setFormJustificativa(e.target.value)}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Serviços Afetados</label>
                        <textarea
                          placeholder="Quais microsserviços ou módulos serão impactados?"
                          value={formServicosAfetados}
                          onChange={(e) => setFormServicosAfetados(e.target.value)}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Impacto</label>
                        <select
                          value={formImpacto}
                          onChange={(e) => setFormImpacto(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        >
                          <option value="BAIXO">BAIXO</option>
                          <option value="MÉDIO">MÉDIO</option>
                          <option value="ALTO">ALTO</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Risco</label>
                        <select
                          value={formRisco}
                          onChange={(e) => setFormRisco(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        >
                          <option value="BAIXO">BAIXO</option>
                          <option value="MÉDIO">MÉDIO</option>
                          <option value="ALTO">ALTO</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Prioridade</label>
                        <select
                          value={formPrioridade}
                          onChange={(e) => setFormPrioridade(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        >
                          <option value="BAIXO">BAIXO</option>
                          <option value="MÉDIO">MÉDIO</option>
                          <option value="ALTO">ALTO</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Indisponibilidade Presumida</label>
                        <select
                          value={formIndisponibilidade}
                          onChange={(e) => setFormIndisponibilidade(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        >
                          <option value="Não">Não (Sem downtime)</option>
                          <option value="Sim">Sim (Completa)</option>
                          <option value="Parcial">Parcial (Downtime degradado)</option>
                        </select>
                      </div>

                      <div className="space-y-1 col-span-2">
                        <label className="text-[11px] font-semibold text-neutral-300">Plano de Implementação</label>
                        <textarea
                          placeholder="Passo-a-passo técnico para colocar em produção..."
                          value={formPlanoImplementacao}
                          onChange={(e) => setFormPlanoImplementacao(e.target.value)}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1 col-span-2">
                        <label className="text-[11px] font-semibold text-neutral-300">Plano de Rollback / Retorno</label>
                        <textarea
                          placeholder="Como reverter caso ocorram falhas durante a transição..."
                          value={formPlanoRollback}
                          onChange={(e) => setFormPlanoRollback(e.target.value)}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Responsável Geral</label>
                        <input
                          type="text"
                          placeholder="Nome do líder da mudança"
                          value={formResponsavelGeral}
                          onChange={(e) => setFormResponsavelGeral(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Início Estimado Geral</label>
                        <input
                          type="datetime-local"
                          value={formInicioGeral}
                          onChange={(e) => setFormInicioGeral(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-300">Fim Estimado Geral</label>
                        <input
                          type="datetime-local"
                          value={formFimGeral}
                          onChange={(e) => setFormFimGeral(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* Change Tasks List */}
                    <div className="border-t border-neutral-800/80 pt-3 mt-2">
                      <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Tarefas Específicas da Mudança</h5>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {formTarefasMudanca.map((task) => (
                          <div key={task.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-850 p-2 rounded-lg text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-200 text-[11px]">{task.descricao}</p>
                              <p className="text-[10px] text-neutral-400">Lead: {task.responsavel} | {task.inicio ? new Date(task.inicio).toLocaleString("pt-BR") : "N/D"} - {task.fim ? new Date(task.fim).toLocaleString("pt-BR") : "N/D"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormTarefasMudanca(prev => prev.filter(t => t.id !== task.id))}
                              className="text-neutral-500 hover:text-rose-400 p-1 font-bold text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {formTarefasMudanca.length === 0 && (
                          <p className="text-[10px] text-neutral-500 italic">Nenhuma tarefa associada a esta mudança específica.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 border-t border-neutral-850/50 mt-2">
                        <input
                          type="text"
                          placeholder="Responsável..."
                          value={tempTaskResponsavel}
                          onChange={(e) => setTempTaskResponsavel(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-neutral-100 placeholder-neutral-600 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Tarefa / Descrição..."
                          value={tempTaskDescricao}
                          onChange={(e) => setTempTaskDescricao(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-neutral-100 placeholder-neutral-600 outline-none md:col-span-2"
                        />
                        <div className="flex gap-1">
                          <input
                            type="datetime-local"
                            value={tempTaskInicio}
                            onChange={(e) => setTempTaskInicio(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 rounded p-1.5 text-[10px] text-neutral-300 outline-none"
                          />
                          <input
                            type="datetime-local"
                            value={tempTaskFim}
                            onChange={(e) => setTempTaskFim(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 rounded p-1.5 text-[10px] text-neutral-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!tempTaskDescricao.trim() || !tempTaskResponsavel.trim()) {
                                addToast("Preencha descrição e responsável da tarefa!", "error");
                                return;
                              }
                              const newTask: TarefaMudanca = {
                                id: `${Date.now()}-${Math.random()}`,
                                responsavel: tempTaskResponsavel,
                                descricao: tempTaskDescricao,
                                inicio: tempTaskInicio || new Date().toISOString().substring(0, 16),
                                fim: tempTaskFim || new Date().toISOString().substring(0, 16)
                              };
                              setFormTarefasMudanca(prev => [...prev, newTask]);
                              setTempTaskResponsavel("");
                              setTempTaskDescricao("");
                              setTempTaskInicio("");
                              setTempTaskFim("");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-505 font-bold text-white px-2.5 rounded text-xs shrink-0 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Associated tasks stack linking section */}
                 {showTarefasFields && (
                  <div className="space-y-4 col-span-2 bg-neutral-950/65 border border-neutral-850 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
                      🔗 TAREFAS ASSOCIADAS / RELAÇÕES (PAI, FILHO E IRMÃ)
                    </h4>
                    
                    {/* List of currently associated */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formTarefasAssociadasIds.map((tid) => {
                        const linkedDem = demandas.find(d => d.id === tid);
                        if (!linkedDem) return null;
                        const dDetails = getDemandTypeDetails(linkedDem.tipo);
                        
                        // Parse or fallback relationship type
                        const rel = formRelacoes.find(r => r.idDemanda === tid) || { idDemanda: tid, tipo: "irma" as const };

                        return (
                          <div key={tid} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-900 border border-neutral-800/85 px-3 py-2.5 rounded-lg text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-indigo-400 font-bold shrink-0">[{dDetails.prefix} - {linkedDem.numeroChamado}]</span>
                              <span className="text-neutral-300 font-medium truncate">{linkedDem.titulo}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-neutral-500 uppercase font-bold font-mono">Tipo:</span>
                              <select
                                value={rel.tipo}
                                onChange={(e) => {
                                  const newType = e.target.value as "filha" | "pai" | "irma";
                                  setFormRelacoes(prev => {
                                    const index = prev.findIndex(r => r.idDemanda === tid);
                                    if (index >= 0) {
                                      const copy = [...prev];
                                      copy[index] = { idDemanda: tid, tipo: newType };
                                      return copy;
                                    } else {
                                      return [...prev, { idDemanda: tid, tipo: newType }];
                                    }
                                  });
                                }}
                                className="bg-neutral-950 border border-neutral-800 text-xs text-indigo-400 font-semibold rounded px-2 py-1 focus:border-indigo-500 cursor-pointer outline-none"
                              >
                                <option value="filha">Filha (Subtarefa)</option>
                                <option value="pai">Pai (Predecessora)</option>
                                <option value="irma">Irmã (Relacionada)</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setFormTarefasAssociadasIds(prev => prev.filter(x => x !== tid));
                                  setFormRelacoes(prev => prev.filter(r => r.idDemanda !== tid));
                                }}
                                className="text-neutral-450 hover:text-rose-400 p-1 font-bold text-sm cursor-pointer transition-colors ml-1"
                                title="Desvincular"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {formTarefasAssociadasIds.length === 0 && (
                        <p className="text-[10px] text-neutral-500 italic">Nenhum chamado ou incidente associado a esta demanda.</p>
                      )}
                    </div>

                    {/* Pre-select relationship type */}
                    <div className="space-y-1.5 bg-neutral-955 p-3.5 rounded-xl border border-neutral-850/60 my-1">
                      <label className="text-[10px] text-indigo-400 font-bold uppercase block tracking-wider font-mono">
                        ⚡ Tipo de Relação para novos Vínculos
                      </label>
                      <p className="text-[9.5px] text-neutral-400 leading-normal">
                        Escolha como associar o chamado de destino no clique de <b>+ Vincular</b>:
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[
                          { id: "filha", label: "Filha (Sub)", desc: "Esta é filha daquela", color: "text-pink-400 border-pink-900/35 bg-pink-955/20" },
                          { id: "pai", label: "Pai (Origem)", desc: "Esta é pai daquela", color: "text-indigo-400 border-indigo-900/35 bg-indigo-955/20" },
                          { id: "irma", label: "Irmã (Paralela)", desc: "Paralela", color: "text-teal-400 border-teal-900/35 bg-teal-955/20" }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormSelectedRelOption(opt.id as any)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              formSelectedRelOption === opt.id 
                                ? `border-indigo-500 ring-1 ring-indigo-500/35 ${opt.color}` 
                                : "border-neutral-900 bg-neutral-900/30 text-neutral-500 hover:text-neutral-300"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase">{formSelectedRelOption === opt.id ? "● " : ""}{opt.label}</span>
                            <span className="text-[8px] opacity-80 mt-0.5 block leading-tight">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector search to associate demands of this project with filters */}
                    <div className="pt-3 border-t border-neutral-800/85 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase">Pesquisar & Vincular Outra Demanda</span>
                        <span className="text-[9px] text-neutral-500 italic">Filtro inteligente ativo</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {/* Text Filter */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 text-neutral-500" size={12} />
                          <input
                            type="text"
                            value={formRelSearchText}
                            onChange={(e) => setFormRelSearchText(e.target.value)}
                            placeholder="Filtrar por título, ID..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-8 py-1.5 text-xs text-neutral-300 outline-none placeholder-neutral-600 focus:border-indigo-500"
                          />
                        </div>

                        {/* Type Filter */}
                        <div>
                          <select
                            value={formRelSearchType}
                            onChange={(e) => setFormRelSearchType(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="Todos">📦 Todos os Tipos</option>
                            <option value="Melhoria">⭐ Melhoria</option>
                            <option value="Incidente">🚨 Incidente</option>
                            <option value="Change">⚙️ Change (Mudança)</option>
                            <option value="BUG">🐞 Defeito / BUG</option>
                            <option value="Outros">🛡️ Outros</option>
                          </select>
                        </div>
                      </div>

                      {/* Display matched demands to easily associate */}
                      <div className="max-h-36 overflow-y-auto space-y-1 border border-neutral-800/65 rounded-lg p-1.5 bg-neutral-950/40">
                        {(() => {
                          const matched = demandas.filter(d => {
                            if (d.id === editId) return false;
                            if (d.excluido) return false;
                            if (d.idProjeto !== activeProj.id) return false;
                            
                            // Type check
                            if (formRelSearchType !== "Todos" && d.tipo !== formRelSearchType) return false;
                            
                            // Text check
                            if (formRelSearchText.trim()) {
                              const q = formRelSearchText.toLowerCase();
                              const mTitle = (d.titulo || "").toLowerCase().includes(q);
                              const mNum = (d.numeroChamado || "").toLowerCase().includes(q);
                              if (!mTitle && mNum === false && (d.numeroChamado || "").toLowerCase().includes(q) === false) return false;
                            }
                            
                            return true;
                          });

                          if (matched.length === 0) {
                            return <p className="text-[10px] text-neutral-500 italic text-center py-2.5">Nenhuma demanda encontrada neste projeto.</p>;
                          }

                          return matched.slice(0, 10).map(d => {
                            const isLinked = formTarefasAssociadasIds.includes(d.id);
                            const details = getDemandTypeDetails(d.tipo);
                            return (
                              <div key={d.id} className="flex items-center justify-between p-1 px-2 hover:bg-neutral-900 rounded text-[11px] transition-colors">
                                <span className="truncate text-neutral-300 mr-2">
                                  <strong className="text-indigo-400 font-mono text-[10px] mr-1">[{details.prefix} - {d.numeroChamado}]</strong>
                                  {d.titulo}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isLinked) {
                                      setFormTarefasAssociadasIds(prev => prev.filter(x => x !== d.id));
                                      setFormRelacoes(prev => prev.filter(r => r.idDemanda !== d.id));
                                    } else {
                                      setFormTarefasAssociadasIds(prev => [...prev, d.id]);
                                      setFormRelacoes(prev => {
                                        const exist = prev.some(r => r.idDemanda === d.id);
                                        if (exist) return prev;
                                        return [...prev, { idDemanda: d.id, tipo: formSelectedRelOption }];
                                      });
                                    }
                                  }}
                                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                                    isLinked 
                                      ? "bg-rose-900/40 hover:bg-rose-600 border border-rose-500/20 text-rose-300 hover:text-white" 
                                      : "bg-indigo-600 text-white hover:bg-indigo-550"
                                  }`}
                                >
                                  {isLinked ? "✕ Remover" : "+ Vincular"}
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Descrição using rich element simulation injection HTML Editor Quill style */}
                {showDetalhesFields && (formTipo === "BUG" || formTipo === "Incidente" || formTipo === "Task") && (
                  <div className="col-span-2 space-y-4 bg-indigo-950/10 border border-indigo-900/40 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 border-b border-indigo-900/20 pb-2.5 mb-2">
                      <span className="text-xl">{formTipo === "Task" ? "➕" : "🐞"}</span>
                      <div>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
                          {formTipo === "Task" ? "DETALHES DA TASK" : "DETALHES DO BUG / INCIDENTE"}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-medium">Configure as informações de triagem sobre esta demanda</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Empresas Clientes Associadas */}
                      <div className="col-span-2 md:col-span-1 space-y-1.5 relative">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex justify-between items-center">
                          <span>🏢 Empresas Clientes Associadas</span>
                          <span className="text-[9px] text-neutral-500 font-mono">{formEmpresas.length} selecionada(s)</span>
                        </label>
                        
                        <div className="flex flex-wrap gap-1 bg-neutral-950 p-2.5 rounded-xl border border-neutral-850 min-h-11">
                          {formEmpresas.map((id) => {
                            const emp = empresas.find((e) => e.id === id);
                            if (!emp) return null;
                            return (
                              <span key={id} className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-2.5 py-1 rounded-lg">
                                {emp.nome}
                                <button
                                  type="button"
                                  onClick={() => setFormEmpresas((prev) => prev.filter((eId) => eId !== id))}
                                  className="text-neutral-500 hover:text-rose-400 font-bold ml-1 text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          {formEmpresas.length === 0 && (
                            <span className="text-xs text-neutral-600 italic py-1">Nenhuma empresa associada.</span>
                          )}
                        </div>

                        {/* Search and drop list style standard empresas */}
                        {(() => {
                          const projectContracts = contratos.filter((c) => activeProj?.contratoIds?.includes(c.id));
                          const allowedEmpresaIds = Array.from(new Set(projectContracts.flatMap((c) => c.empresaIds || [])));
                          const allowedEmpresas = empresas.filter((emp) => allowedEmpresaIds.includes(emp.id));

                          return (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => setIsOpenEmpresasDropdown(!isOpenEmpresasDropdown)}
                                className="w-full text-left bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer"
                              >
                                <span>{isOpenEmpresasDropdown ? "Digitando busca..." : "🏢 Buscar e associar empresas..."}</span>
                                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900">{isOpenEmpresasDropdown ? "FECHAR" : "ABRIR"}</span>
                              </button>

                              {isOpenEmpresasDropdown && (
                                <div className="absolute left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2.5 mt-1.5 z-50 space-y-2 animate-scale-in">
                                  <input
                                    type="text"
                                    placeholder="Comece a digitar o nome da empresa..."
                                    value={filterEmpresasText}
                                    onChange={(e) => setFilterEmpresasText(e.target.value)}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:border-indigo-500/50 outline-hidden font-mono"
                                  />
                                  <div className="max-h-36 overflow-y-auto space-y-1 select-none">
                                    {allowedEmpresas
                                      .filter((emp) => emp.nome.toLowerCase().includes(filterEmpresasText.toLowerCase()))
                                      .map((emp) => {
                                        const isChecked = formEmpresas.includes(emp.id);
                                        return (
                                          <label key={emp.id} className="flex items-center gap-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-855 p-2 rounded-lg cursor-pointer text-xs text-neutral-250 transition-colors">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                if (isChecked) {
                                                  setFormEmpresas((prev) => prev.filter((id) => id !== emp.id));
                                                } else {
                                                  setFormEmpresas((prev) => [...prev, emp.id]);
                                                }
                                              }}
                                              className="accent-indigo-600 rounded"
                                            />
                                            <span className="font-semibold">{emp.nome}</span>
                                          </label>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Criticidade */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-sans">⚡ Criticidade</label>
                        <select
                          value={formCriticidade}
                          onChange={(e) => setFormCriticidade(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-hidden cursor-pointer"
                        >
                          <option value="Baixa">Baixo</option>
                          <option value="Média">Médio</option>
                          <option value="Alta">Alto</option>
                          <option value="Urgente">Urgente (Rosa)</option>
                        </select>
                      </div>

                      {/* Quality Manager */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-sans">🛡️ Quality Manager (Criador)</label>
                        <select
                          value={formResponsavelId}
                          onChange={(e) => setFormResponsavelId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-hidden cursor-pointer"
                        >
                          <option value="">Selecione o Quality Manager...</option>
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.tipo})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Técnico (Executor) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-sans">💻 Técnico (Executor)</label>
                        <select
                          value={formDesignado}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormDesignado(val);
                            setFormDesignados(val ? [val] : []);
                          }}
                          className="w-full bg-neutral-950 border border-neutral-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-hidden cursor-pointer"
                        >
                          <option value="">(Deixar em branco por padrão / Sem atribuição)</option>
                          {pessoas.filter(p => p.tipo === "GMZ").map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <span className="text-[9px] text-neutral-550 italic leading-none">Fica inicialmente em branco, selecione se já houver executor definido</span>
                      </div>

                      {/* Ambiente */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-sans">🖧 Ambiente afetado</label>
                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                          {existingAmbientes.map((amb) => (
                            <button
                              type="button"
                              key={amb}
                              onClick={() => setFormAmbiente(amb)}
                              className={`px-2.5 py-1 text-[10px] font-extrabold font-mono rounded-lg transition-all cursor-pointer ${
                                formAmbiente === amb
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-550/15 font-bold"
                                  : "bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 text-neutral-400 hover:text-neutral-200"
                              }`}
                            >
                              {amb}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Ou digite outro ambiente customizado..."
                          value={formAmbiente}
                          onChange={(e) => setFormAmbiente(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-750 font-mono mt-1 focus:border-indigo-500 outline-hidden"
                        />
                      </div>

                      {/* Tipo / Subtipo */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-sans">🏷️ Tipo de Pane / Bug</label>
                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                          {existingSubTipos.map((st) => (
                            <button
                              type="button"
                              key={st}
                              onClick={() => setFormSubTipoBug(st)}
                              className={`px-2.5 py-1 text-[10px] font-extrabold font-mono rounded-lg transition-all cursor-pointer ${
                                formSubTipoBug === st
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-550/15 font-bold"
                                  : "bg-neutral-955 hover:bg-neutral-850 border border-neutral-850 text-neutral-400 hover:text-neutral-200"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Ou digite outro tipo customizado..."
                          value={formSubTipoBug}
                          onChange={(e) => setFormSubTipoBug(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-750 font-mono mt-1 focus:border-indigo-500 outline-hidden"
                        />
                      </div>

                      {/* Tags Auto-completável */}
                      <div className="col-span-2 space-y-2 bg-neutral-955 border border-neutral-850 p-4 rounded-xl mt-1.5">
                        <label className="text-[11px] font-bold text-neutral-300 flex justify-between tracking-wider uppercase font-sans">
                          <span>🔖 Etiquetas & Tags</span>
                          <span className="text-[9px] text-neutral-500 font-mono">Pressione Enter ou clique no autocomplete para vincular</span>
                        </label>
                        
                        <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-2.5 rounded-lg border border-neutral-855 min-h-11">
                          {formTags.map((tag) => (
                            <span key={tag} className="flex items-center gap-1 bg-indigo-950 border border-indigo-900 text-indigo-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md">
                              #{tag}
                              <button
                                type="button"
                                onClick={() => setFormTags((prev) => prev.filter((t) => t !== tag))}
                                className="text-indigo-400 hover:text-rose-450 font-bold ml-1 text-xs cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {formTags.length === 0 && (
                            <span className="text-xs text-neutral-600 italic py-1">Nenhuma tag ativa.</span>
                          )}
                        </div>

                        <div className="flex gap-2 relative">
                          <input
                            type="text"
                            placeholder="Buscar ou cadastrar tags no banco de tags..."
                            value={rawTag}
                            onChange={(e) => {
                              setRawTag(e.target.value);
                              setTagAutocompleteOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const clean = rawTag.trim();
                                if (clean && !formTags.includes(clean)) {
                                  setFormTags((prev) => [...prev, clean]);
                                  setRawTag("");
                                }
                              }
                            }}
                            className="flex-1 bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-indigo-500/50"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const clean = rawTag.trim();
                              if (clean && !formTags.includes(clean)) {
                                setFormTags((prev) => [...prev, clean]);
                                setRawTag("");
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 rounded-lg font-bold font-sans transition-colors cursor-pointer"
                          >
                            + Adicionar
                          </button>

                          {/* Tag autocomplete drop down */}
                          {tagAutocompleteOpen && rawTag.trim() && (
                            <div className="absolute top-full left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl max-h-36 overflow-y-auto mt-1 z-50 p-1 space-y-0.5">
                              {existingTags
                                .filter(t => t.toLowerCase().includes(rawTag.toLowerCase()) && !formTags.includes(t))
                                .map(tag => (
                                  <button
                                    type="button"
                                    key={tag}
                                    onClick={() => {
                                      setFormTags((prev) => [...prev, tag]);
                                      setRawTag("");
                                      setTagAutocompleteOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-350 hover:text-white hover:bg-neutral-800 rounded-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="text-indigo-400">#</span> {tag}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Descrição using rich element simulation injection HTML Editor Quill style */}
                {showDetalhesFields && (
                  <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300 flex justify-between">
                    <span>Descrição / Detalhes Científicos (HTML Editor Quill style)</span>
                    <span className="text-[10px] text-neutral-500">Suporta tags tag-inject de negrito/itálico</span>
                  </label>
                  
                  <div className="flex gap-1.5 bg-neutral-950 p-2 rounded-t-xl border border-b-0 border-neutral-805">
                    <button 
                      type="button" 
                      onClick={() => setFormDescricao((prev) => `${prev}<strong>Negrito</strong>`)}
                      className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 hover:text-white text-[10px] font-bold"
                    >
                      Negrito
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormDescricao((prev) => `${prev}<em>Itálico</em>`)}
                      className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 hover:text-white text-[10px] italic"
                    >
                      Itálico
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormDescricao((prev) => `${prev}<pre><code>Código</code></pre>`)}
                      className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 hover:text-white text-[10px] font-mono"
                    >
                      Bloco Código
                    </button>
                  </div>
                  <textarea
                    required
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Escreva em formato HTML para o Firestore..."
                    rows={4}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-b-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden font-mono"
                  />
                </div>
                )}

                {/* Sytem of chips for Tags */}
                {showResumoFields && (
                  <div className="space-y-1.5 col-span-2 border border-neutral-850 p-4 rounded-xl">
                  <label className="text-xs font-bold text-neutral-300 flex justify-between">
                    <span>Mapear Etiquetas de Sistema (Chips System)</span>
                    <span className="text-[10px] text-neutral-500">{formTags.length} tags ativas</span>
                  </label>

                  <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-2 rounded-lg border border-neutral-855 min-h-12">
                    {formTags.map((t, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-indigo-950 border border-indigo-900 text-indigo-300 text-xs px-2.5 py-1 rounded-md font-semibold font-mono">
                        #{t}
                        <button type="button" onClick={() => handleRemoveTag(idx)} className="text-indigo-400 hover:text-rose-450 ml-1 font-bold">×</button>
                      </span>
                    ))}
                    {formTags.length === 0 && <span className="text-xs text-neutral-600 italic py-1">Insira tags abaixo para organizar cards...</span>}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tag (Ex: Refactoring)"
                      value={rawTag}
                      onChange={(e) => setRawTag(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Fixar Tag
                    </button>
                  </div>
                </div>
              )}

              {showResumoFields && (
                <div className="space-y-3 col-span-2 border border-neutral-850 p-4 rounded-xl bg-neutral-900/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-neutral-350 flex items-center gap-1.5 uppercase tracking-wider">
                      💼 Faturamento & Cobrança de Contrato
                    </h4>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                    {/* Toggle: Cobrar no Contrato */}
                    <div className="flex flex-1 items-center justify-between p-3 bg-neutral-950/40 border border-neutral-800 rounded-xl font-sans">
                      <div>
                        <span className="text-xs font-semibold text-neutral-300 block">Cobrar demanda em contrato?</span>
                        <span className="text-[10px] text-neutral-500">Habilita esta demanda no fechamento de horas do contrato.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !formCobrarEmContrato;
                          setFormCobrarEmContrato(nextVal);
                          if (nextVal) {
                            const now = new Date();
                            const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            setFormCobrarContratoMes(currentMonthYear);
                          } else {
                            setFormCobrarContratoMes("");
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formCobrarEmContrato ? 'bg-indigo-600' : 'bg-neutral-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            formCobrarEmContrato ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Combos de Mês e Ano: Somente se Cobrar em Contrato for true */}
                    {formCobrarEmContrato && (
                      <div className="flex flex-1 gap-2 items-center bg-neutral-950/40 border border-neutral-800 p-3 rounded-xl font-sans text-xs">
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide block">Mês Faturamento</label>
                          <select
                            value={formCobrarContratoMes ? formCobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0')}
                            onChange={(e) => {
                              const currentY = formCobrarContratoMes ? formCobrarContratoMes.split("-")[0] : String(new Date().getFullYear());
                              setFormCobrarContratoMes(`${currentY}-${e.target.value}`);
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-350 bg-neutral-950 hover:border-indigo-505 cursor-pointer outline-none font-sans"
                          >
                            <option value="01">Janeiro</option>
                            <option value="02">Fevereiro</option>
                            <option value="03">Março</option>
                            <option value="04">Abril</option>
                            <option value="05">Maio</option>
                            <option value="06">Junho</option>
                            <option value="07">Julho</option>
                            <option value="08">Agosto</option>
                            <option value="09">Setembro</option>
                            <option value="10">Outubro</option>
                            <option value="11">Novembro</option>
                            <option value="12">Dezembro</option>
                          </select>
                        </div>

                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide block">Ano Faturamento</label>
                          <select
                            value={formCobrarContratoMes ? formCobrarContratoMes.split("-")[0] : String(new Date().getFullYear())}
                            onChange={(e) => {
                              const currentM = formCobrarContratoMes ? formCobrarContratoMes.split("-")[1] : String(new Date().getMonth() + 1).padStart(2, '0');
                              setFormCobrarContratoMes(`${e.target.value}-${currentM}`);
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-350 bg-neutral-950 hover:border-indigo-505 cursor-pointer outline-none font-sans"
                          >
                            {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

                {/* Visualizer and Drop Area for Attachments */}
                {showAnexosFields && (
                  <div id="guia-anexos" className="space-y-1.5 col-span-2 border border-neutral-850 p-4 rounded-xl">
                  <label className="text-xs font-bold text-neutral-300 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Paperclip size={14} className="text-indigo-400 animate-pulse" />
                      Anexos de Suporte (Banco Base64 em Background)
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">{formAnexos.length} anexo(s)</span>
                  </label>

                  {/* Dropzone field */}
                  <div className="relative group/dropzone border border-dashed border-neutral-800 hover:border-indigo-500 bg-neutral-950 p-6 rounded-xl transition-all text-center flex flex-col items-center justify-center cursor-pointer">
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <Paperclip size={24} className="text-neutral-500 group-hover/dropzone:scale-110 group-hover/dropzone:text-indigo-400 transition-all duration-300 mb-2" />
                    <p className="text-xs text-neutral-300 font-medium group-hover/dropzone:text-indigo-300">
                      Arraste arquivos ou <span className="text-indigo-400 underline">clique para selecionar</span>
                    </p>
                    <p className="text-[9px] text-neutral-600 mt-1 uppercase font-mono tracking-wider">
                      Conversão automática em base64 preservada no banco
                    </p>
                  </div>

                  {/* List of attachments being uploaded/read or completed */}
                  {formAnexos.length > 0 && (
                    <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto pr-1">
                      {formAnexos.map((ax) => (
                        <div 
                          key={ax.id} 
                          className="flex items-center justify-between p-2.5 bg-neutral-905 border border-neutral-850 rounded-lg text-xs font-sans transition-all hover:bg-neutral-950/40 animate-scale-in"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                              {ax.uploading ? (
                                <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Paperclip size={14} className="text-emerald-400" />
                              )}
                            </div>
                            <div className="truncate space-y-0.5">
                              <p className="text-neutral-200 font-semibold truncate text-[11px]">{ax.nome}</p>
                              <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500">
                                <span>{ax.size}</span>
                                {ax.uploading ? (
                                  <span className="text-yellow-500 animate-pulse font-sans">Lendo Base64...</span>
                                ) : (
                                  <span className="text-emerald-500 font-sans font-bold">✔️ Background Pronto</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAnexo(ax.id)}
                            className="bg-neutral-955 border border-neutral-800 text-neutral-500 hover:text-rose-450 hover:border-neutral-700 hover:bg-neutral-800 p-1.5 rounded-lg shrink-0 transition-all cursor-pointer font-bold"
                            title="Remover anexo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                {/* Dynamically Created Tabs & Custom Fields Form Blocks */}
                {activeDemandFormTab !== "geral" && activeCustomType && (
                  <div className="col-span-2 grid grid-cols-2 gap-4 bg-neutral-950/20 p-4 rounded-xl border border-neutral-850 animate-fade-in">
                    {activeCustomType.guias
                      ?.find((g) => g.id === activeDemandFormTab)
                      ?.campos?.map((f) => {
                        if (f.tipo === "texto_curto") {
                          return (
                            <div className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`} key={f.id}>
                              <label className="text-xs font-semibold text-neutral-300">{f.label}</label>
                              <input
                                type="text"
                                value={formvaloresCamposCustom[f.id] || ""}
                                onChange={(e) => setFormvaloresCamposCustom(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder={`Insira ${f.label.toLowerCase()}`}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                              />
                            </div>
                          );
                        }
                        if (f.tipo === "texto_longo") {
                          return (
                            <div className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`} key={f.id}>
                              <label className="text-xs font-semibold text-neutral-300">{f.label}</label>
                              <textarea
                                value={formvaloresCamposCustom[f.id] || ""}
                                onChange={(e) => setFormvaloresCamposCustom(prev => ({ ...prev, [f.id]: e.target.value }))}
                                placeholder="Fique livre para preencher..."
                                rows={4}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                              />
                            </div>
                          );
                        }
                        if (f.tipo === "data") {
                          return (
                            <div className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`} key={f.id}>
                              <label className="text-xs font-semibold text-neutral-300">{f.label}</label>
                              <input
                                type="date"
                                value={formvaloresCamposCustom[f.id] || ""}
                                onChange={(e) => setFormvaloresCamposCustom(prev => ({ ...prev, [f.id]: e.target.value }))}
                                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-100 focus:outline-hidden"
                              />
                            </div>
                          );
                        }
                        if (f.tipo === "lista_coisas") {
                          return (
                            <div className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`} key={f.id}>
                              <label className="text-xs font-semibold text-neutral-300">{f.label}</label>
                              {f.subTipoLista === "empresas" ? (
                                <select
                                  value={formvaloresCamposCustom[f.id] || ""}
                                  onChange={(e) => setFormvaloresCamposCustom(prev => ({ ...prev, [f.id]: e.target.value }))}
                                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
                                >
                                  <option value="">Selecione a empresa...</option>
                                  {empresas.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                      🏢 {emp.nome} ({emp.recorrenciaChamados})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={formvaloresCamposCustom[f.id] || ""}
                                  onChange={(e) => setFormvaloresCamposCustom(prev => ({ ...prev, [f.id]: e.target.value }))}
                                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none"
                                >
                                  <option value="">Selecione o profissional...</option>
                                  {pessoas.map((pers) => (
                                    <option key={pers.id} value={pers.id}>
                                      👥 {pers.nome} ({pers.tipo})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        }
                        if (f.tipo === "imagem") {
                          return (
                            <div className={`space-y-1.5 ${f.gridSpan === 2 ? "col-span-2" : "col-span-1"}`} key={f.id}>
                              <label className="text-xs font-semibold text-neutral-400">{f.label}</label>
                              <div className="bg-neutral-950 border border-neutral-855 rounded-xl p-3 flex flex-col items-center justify-center space-y-2 col-span-2">
                                {f.imagemUrl ? (
                                  <img src={f.imagemUrl} alt={f.label} className="max-h-36 object-contain rounded border border-neutral-800" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="text-xs italic text-neutral-600">Nenhum banner anexado para mostrar</div>
                                )}
                                <span className="text-[10px] text-indigo-400 font-mono font-bold">Guia de Ajuda Técnica</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                  </div>
                )}

              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                >
                  {editId ? "Confirmar Alteraçôes" : "Confirmar Lançamento no Board"}
                </button>
              </div>
            </form>
              );
            })()}
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          description={confirmState.description}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* TRASH CAN (LIXEIRA) OVERLAY MODAL */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="p-6 text-neutral-100 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center border border-rose-500/20">
                  <Trash2 size={18} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                    Lixeira de Geral ({activeProj?.nome})
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Visualize, restaure ou remova permanentemente os cards excluídos deste board.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowTrashModal(false)}
                className="text-neutral-400 hover:text-neutral-100 p-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 pr-4 scrollbar-thin">
              {(() => {
                const deletedDemands = demandas.filter((d) => d.idProjeto === activeProj.id && d.excluido);

                if (deletedDemands.length === 0) {
                  return (
                    <div className="py-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
                      <Trash2 size={32} className="text-neutral-700 stroke-[1.5]" />
                      <p className="text-sm italic font-medium">Sua lixeira está vazia!</p>
                      <p className="text-[10px] text-neutral-600 font-sans max-w-xs leading-normal">
                        Mova cards para a lixeira usando a ação rápida "Remover" presente no rodapé do respectivo card.
                      </p>
                    </div>
                  );
                }

                return deletedDemands.map((d) => {
                  const typeDetails = getDemandTypeDetails(d.tipo);
                  return (
                    <div 
                      key={d.id} 
                      className="p-4 bg-neutral-950 rounded-2xl border border-neutral-850 hover:border-neutral-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-scale-in"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 font-bold uppercase shrink-0">
                            {typeDetails.prefix} - {d.numeroChamado}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-500">
                            Excluído em: {d.excluidoAt ? new Date(d.excluidoAt).toLocaleString("pt-BR") : "N/D"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-200 truncate pr-4">
                          {d.titulo}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            restoreDemanda(d.id);
                          }}
                          className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-900 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                          title="Recuperar e devolver este card de volta para o board ativo"
                        >
                          Restaurar
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Deseja realmente excluir permanentemente? Esta ação é irreversível e apagará comentários e apontamentos vinculados.")) {
                              deleteDemanda(d.id, true);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-900 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                          title="Remover definitivamente do banco de dados (Ação Irreversível)"
                        >
                          Excluir Totalmente
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer actions */}
            <div className="p-4 bg-neutral-950/40 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTrashModal(false)}
                className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-750 text-neutral-400 text-xs rounded-xl font-bold transition-all cursor-pointer"
              >
                Fechar Lixeira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RICH FLOATING IMAGE GALLERY MODAL */}
      {galleryStep && (
        <div 
          className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-[100] flex flex-col justify-between p-4 animate-fade-in font-sans"
          onClick={() => setGalleryStep(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.stopPropagation();
              setGalleryActiveIndex((prev) => (prev > 0 ? prev - 1 : galleryStep.images.length - 1));
            } else if (e.key === "ArrowRight") {
              e.stopPropagation();
              setGalleryActiveIndex((prev) => (prev < galleryStep.images.length - 1 ? prev + 1 : 0));
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setGalleryStep(null);
            }
          }}
          tabIndex={0}
        >
          {/* Header */}
          <div className="flex items-center justify-between w-full max-w-5xl mx-auto py-2 border-b border-neutral-800/40" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 font-mono">Galeria de Imagens</span>
              <h4 className="text-xs font-semibold text-neutral-200">
                Imagens do Passo a Passo
              </h4>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-850 px-2.5 py-1 rounded-md">
                {galleryActiveIndex + 1} de {galleryStep.images.length}
              </span>
              <button
                type="button"
                onClick={() => setGalleryStep(null)}
                className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Active Image Container */}
          <div className="flex-1 flex items-center justify-center relative w-full max-w-5xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
            {/* Prev arrow */}
            {galleryStep.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryActiveIndex((prev) => (prev > 0 ? prev - 1 : galleryStep.images.length - 1));
                }}
                className="absolute left-2 z-10 w-11 h-11 rounded-full bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-center text-neutral-300 hover:bg-neutral-900 hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold shadow-lg"
              >
                ◀
              </button>
            )}

            {/* Image */}
            <div className="max-h-[70vh] flex items-center justify-center relative rounded-2xl overflow-hidden p-1 select-none">
              <img 
                src={galleryStep.images[galleryActiveIndex]} 
                alt={`Imagem ${galleryActiveIndex + 1}`}
                className="max-h-[66vh] max-w-full object-contain rounded-xl shadow-2xl border border-neutral-800/60"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Next arrow */}
            {galleryStep.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryActiveIndex((prev) => (prev < galleryStep.images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 z-10 w-11 h-11 rounded-full bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-center text-neutral-300 hover:bg-neutral-900 hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-bold shadow-lg"
              >
                ▶
              </button>
            )}
          </div>

          {/* Thumbnail timeline */}
          <div className="w-full max-w-5xl mx-auto py-3 border-t border-neutral-800/45 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-neutral-500 max-w-md line-clamp-1 italic text-[10px]" title={galleryStep.text}>
              {galleryStep.text}
            </p>
            
            {galleryStep.images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto max-w-xs sm:max-w-md py-1">
                {galleryStep.images.map((img, idx) => {
                  const isActive = idx === galleryActiveIndex;
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setGalleryActiveIndex(idx)}
                      className={`relative w-8 h-8 rounded-md overflow-hidden border transition-all shrink-0 cursor-pointer ${
                        isActive ? "border-indigo-500 scale-105 shadow-md ring-1 ring-indigo-500" : "border-neutral-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
