/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Plus, Edit2, Trash2, Settings, List, PlusCircle, MinusCircle, HelpCircle, ToggleLeft, ToggleRight, CheckSquare, Square,
  Copy, ArrowLeft, ChevronRight, MessageSquare, Paperclip, Clock, Calendar, Users, Briefcase, Eye
} from "lucide-react";
import { Projeto, TipoDemandaCustom, GuiaCustom, CampoCustom } from "../types";
import { ConfirmModal } from "./ConfirmModal";

export const ProjetosModule: React.FC = () => {
  const { projetos, contratos, pessoas, addProjeto, updateProjeto, deleteProjeto, addToast } = useDB();

  const [nome, setNome] = useState("");
  const [workflow, setWorkflow] = useState<string[]>(["Backlog", "Em análise", "Desenvolvimento", "Done"]);
  const [atividades, setAtividades] = useState<string[]>(["Desenvolvimento", "Reunião", "Análise"]);
  const [contabilizarPorEmpresa, setContabilizarPorEmpresa] = useState(false);
  const [contratoIds, setContratoIds] = useState<string[]>([]);
  const [acessosPessoasIds, setAcessosPessoasIds] = useState<string[]>([]);
  const [gestoresIds, setGestoresIds] = useState<string[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<"geral" | "atividades" | "permissoes" | "construtor">("geral");

  // Custom demand builder state arrays
  const [tiposDemandasCustom, setTiposDemandasCustom] = useState<TipoDemandaCustom[]>([]);

  // Selection sub-panel states inside the "construtor" tab
  const [selectedTypeIndex, setSelectedTypeIndex] = useState<number | null>(null); // null = list, -1 = new, >=0 = editing type index
  const [typeName, setTypeName] = useState("");
  const [typeSigla, setTypeSigla] = useState("");
  const [typePreBuilt, setTypePreBuilt] = useState<Record<string, boolean>>({
    apontamentos: true,
    anexos: true,
    lista_pessoas: true,
    estimativas: true,
    lista_empresas: true,
    comentarios: true,
  });
  const [typeGuias, setTypeGuias] = useState<GuiaCustom[]>([]);

  // Sub-forms inside custom demand type (guia and fields creation)
  const [activeTypeTabId, setActiveTypeTabId] = useState<string>(""); // Track selected tab/guide we are building fields for
  const [editingGuiaId, setEditingGuiaId] = useState<string | null>(null);
  const [newGuiaNome, setNewGuiaNome] = useState("");

  const [editingCampoId, setEditingCampoId] = useState<string | null>(null);
  const [formCampoLabel, setFormCampoLabel] = useState("");
  const [formCampoTipo, setFormCampoTipo] = useState<"texto_curto" | "texto_longo" | "data" | "lista_coisas" | "imagem">("texto_curto");
  const [formCampoSubTipoLista, setFormCampoSubTipoLista] = useState<"empresas" | "pessoas">("pessoas");
  const [formCampoGridSpan, setFormCampoGridSpan] = useState<1 | 2>(1);
  const [formCampoImagemUrl, setFormCampoImagemUrl] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Column input additions
  const [newCol, setNewCol] = useState("");
  const [newAtiv, setNewAtiv] = useState("");

  const handleOpenCreate = () => {
    setEditId(null);
    setNome("");
    setWorkflow(["Backlog", "Em análise", "Desenvolvimento", "Done"]);
    setAtividades(["Desenvolvimento", "Reunião", "Análise", "Design"]);
    setContabilizarPorEmpresa(true);
    setContratoIds([]);
    setAcessosPessoasIds([]);
    setGestoresIds([]);
    setTiposDemandasCustom([]);
    setSelectedTypeIndex(null);
    setActiveModalTab("geral");
    setShowModal(true);
  };

  const handleEdit = (p: Projeto) => {
    setEditId(p.id);
    setNome(p.nome);
    setWorkflow(p.workflow || []);
    setAtividades(p.atividades || []);
    setContabilizarPorEmpresa(p.contabilizarPorEmpresa || false);
    setContratoIds(p.contratoIds || []);
    setAcessosPessoasIds(p.acessosPessoasIds || []);
    setGestoresIds(p.gestoresIds || []);
    setTiposDemandasCustom(p.tiposDemandasCustom || []);
    setSelectedTypeIndex(null);
    setActiveModalTab("geral");
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const payload = {
      nome,
      workflow,
      atividades,
      contabilizarPorEmpresa,
      contratoIds,
      acessosPessoasIds,
      gestoresIds,
      tiposDemandasCustom
    };

    if (editId) {
      updateProjeto(editId, payload);
      addToast(`Projeto "${nome}" atualizado com sucesso!`, "success");
    } else {
      addProjectWithAccess(payload);
      addToast(`Projeto "${nome}" criado com sucesso!`, "success");
    }
    setShowModal(false);
  };

  const addProjectWithAccess = (payload: any) => {
    addProjeto(payload);
  };

  const handleCloneProject = (projectToClone: Projeto) => {
    const clonedPayload = {
      nome: `Cópia de ${projectToClone.nome}`,
      workflow: [...(projectToClone.workflow || [])],
      atividades: [...(projectToClone.atividades || [])],
      contabilizarPorEmpresa: projectToClone.contabilizarPorEmpresa,
      contratoIds: [...(projectToClone.contratoIds || [])],
      acessosPessoasIds: [...(projectToClone.acessosPessoasIds || [])],
      gestoresIds: [...(projectToClone.gestoresIds || [])],
      tiposDemandasCustom: projectToClone.tiposDemandasCustom ? JSON.parse(JSON.stringify(projectToClone.tiposDemandasCustom)) : []
    };
    addProjeto(clonedPayload);
    addToast(`Projeto "${projectToClone.nome}" clonado com sucesso!`, "success");
  };

  // Workflow columns helpers
  const handleAddCol = () => {
    if (newCol.trim() && !workflow.includes(newCol.trim())) {
      setWorkflow((prev) => [...prev, newCol.trim()]);
      setNewCol("");
    }
  };

  const handleRemoveCol = (colIndex: number) => {
    setWorkflow((prev) => prev.filter((_, idx) => idx !== colIndex));
  };

  // Activities helpers
  const handleAddAtiv = () => {
    if (newAtiv.trim() && !atividades.includes(newAtiv.trim())) {
      setAtividades((prev) => [...prev, newAtiv.trim()]);
      setNewAtiv("");
    }
  };

  const handleRemoveAtiv = (ativIndex: number) => {
    setAtividades((prev) => prev.filter((_, idx) => idx !== ativIndex));
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Parametrização de Projetos & Workflow</h2>
          <p className="text-sm text-neutral-400">Defina o fluxo de colunas do Kanban, as atividades permitidas de apontamento e a lógica fiscal de faturamento.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Criar Novo Projeto
        </button>
      </div>

      {/* Grid of projects config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projetos.map((p) => (
          <div
            key={p.id}
            className="bg-neutral-900 border border-neutral-800 hover:border-neutral-750 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-xs"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-xl">
                    <Settings size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">PROJETO CONFIGURADO</span>
                    <h3 className="text-base font-bold text-neutral-100">{p.nome}</h3>
                  </div>
                </div>
              </div>

              {/* Restrição de Acesso */}
              <div className="space-y-1 bg-neutral-950/40 p-3 rounded-xl border border-neutral-850">
                {p.acessosPessoasIds && p.acessosPessoasIds.length > 0 ? (
                  <>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      🔒 Visualização Restrita ({p.acessosPessoasIds.length} Colaboradores)
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.acessosPessoasIds.map((pid) => {
                        const pess = pessoas?.find(px => px.id === pid);
                        return pess ? (
                          <span key={pid} className="text-[9px] bg-indigo-500/10 border border-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded">
                            {pess.nome}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-emerald-500/80 uppercase tracking-wider flex items-center gap-1">
                    🌐 Acesso Público (Todos do time)
                  </span>
                )}
              </div>

              {/* Kanban columns Workflow representation */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
                  <List size={13} className="text-indigo-400" />
                  Workflow do Kanban (Colunas)
                </span>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  {p.workflow?.map((col, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 text-xs font-medium bg-neutral-900 border border-neutral-805 text-neutral-300 px-3 py-1.5 rounded-lg font-sans"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>{col}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({idx + 1})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contratos Vinculados */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
                  <List size={13} className="text-indigo-400" />
                  Contratos Vinculados
                </span>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  {p.contratoIds && p.contratoIds.length > 0 ? (
                    p.contratoIds.map((cid) => {
                      const contract = contratos.find((c) => c.id === cid);
                      if (!contract) return null;
                      return (
                        <div 
                          key={cid} 
                          className="flex items-center gap-1.5 text-xs font-medium bg-neutral-900 border border-neutral-805 text-neutral-300 px-3 py-1.5 rounded-lg font-sans shrink-0"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          <span>{contract.nome}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">({contract.numero})</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-neutral-600 italic">Nenhum contrato vinculado.</span>
                  )}
                </div>
              </div>

              {/* Pointing configuration row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Atividades de Apontamento</span>
                  <div className="p-3 bg-neutral-950/40 rounded-xl border border-neutral-850 max-h-24 overflow-y-auto space-y-1">
                    {p.atividades?.map((ativ, idx) => (
                      <div key={idx} className="text-xs text-neutral-300 flex items-center gap-1.5">
                        <span className="text-indigo-500">•</span>
                        <span>{ativ}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multiply calculations helper */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
                    Modificador Fiscal
                  </span>
                  <div className="p-3.5 bg-neutral-950/40 rounded-xl border border-neutral-850 h-24 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-neutral-300">Multiplicar por Empresa</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        p.contabilizarPorEmpresa 
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                          : "bg-neutral-800 border-neutral-700 text-neutral-500"
                      }`}>
                        {p.contabilizarPorEmpresa ? "ATIVADO" : "DESATIVADO"}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-normal">
                      Se Ativo, multiplica o total de horas apontadas na demanda pelo número de empresas vinculadas à tarefa.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions button list */}
            <div className="flex items-center justify-end gap-2 border-t border-neutral-850 mt-6 pt-4">
              <button
                onClick={() => handleCloneProject(p)}
                className="p-2 cursor-pointer bg-neutral-955 hover:bg-emerald-500/10 border border-neutral-800 hover:border-emerald-500/20 rounded-lg text-neutral-400 hover:text-emerald-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
                title="Clonar Projeto (Copia fluxos, atividades, contratos e construtores de demandas)"
              >
                <Copy size={13} />
                Clonar
              </button>
              <button
                onClick={() => handleEdit(p)}
                className="p-2 cursor-pointer bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-neutral-400 hover:text-indigo-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
              >
                <Edit2 size={13} />
                Ajustar Configurações
              </button>
              <button
                onClick={() => {
                  setConfirmState({
                    isOpen: true,
                    title: "Excluir Projeto",
                    description: `Tem certeza que deseja deletar as configurações do Projeto "${p.nome}"? Todas as demandas vinculadas continuarão existindo, mas sem parâmetros de workflow.`,
                    onConfirm: () => deleteProjeto(p.id)
                  });
                }}
                className="p-2 cursor-pointer bg-neutral-955 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 rounded-lg text-neutral-500 hover:text-rose-400 transition-all flex items-center gap-1.5 text-xs"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            </div>
          </div>
        ))}

        {projetos.length === 0 && (
          <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-neutral-850 rounded-2xl">
            <Settings className="mx-auto text-neutral-600 mb-3" size={32} />
            <p className="text-neutral-400 text-sm">Nenhum projeto parametrizado ainda.</p>
          </div>
        )}
      </div>

      {/* CONFIGURATION DIALOG */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl w-full ${activeModalTab === 'construtor' ? 'max-w-3xl' : 'max-w-xl'} overflow-hidden shadow-2xl transition-all duration-300 animate-scale-in my-8`}>
            <div className="p-6 border-b border-neutral-800 bg-neutral-955">
              <h3 className="text-lg font-bold text-neutral-100">
                {editId ? "Ajustar Parâmetros de Projeto" : "Configurar Novo Fluxo Kanban"}
              </h3>
              <p className="text-xs text-neutral-400">Desenhe as colunas de drag-drop e libere atividades do time comercial/dev.</p>
            </div>

            {/* Tabs List */}
            <div className="flex flex-wrap border-b border-neutral-805 bg-neutral-955 px-6 gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => setActiveModalTab("geral")}
                className={`py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeModalTab === "geral" ? "border-indigo-500 text-indigo-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                ⚙️ Ajustes Gerais
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("atividades")}
                className={`py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeModalTab === "atividades" ? "border-indigo-500 text-indigo-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                📝 Atividades
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("permissoes")}
                className={`py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeModalTab === "permissoes" ? "border-indigo-500 text-indigo-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                🔒 Guia de Permissões
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("construtor")}
                className={`py-3 text-xs font-bold border-b-2 cursor-pointer transition-all ${
                  activeModalTab === "construtor" ? "border-indigo-500 text-indigo-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                📋 Construtor de Demandas
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {activeModalTab === "geral" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">Título do Projeto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Refatoração Core API"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                    />
                  </div>

                  {/* GESTORES DO PROJETO MULTISELECT */}
                  <div className="border border-neutral-850 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                      <span>Gestores do Projeto (Selecionar perfis gestores/gerentes)</span>
                      <span className="text-[10px] text-indigo-400">{gestoresIds.length} selecionado(s)</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-855">
                      {pessoas
                        .filter((p) => {
                          const pLower = (p.perfil || "").toLowerCase();
                          return (
                            pLower.includes("gestor") ||
                            pLower.includes("gerencial") ||
                            pLower.includes("administrador") ||
                            p.tipo === "GMZ"
                          );
                        })
                        .map((g) => {
                          const isSelected = gestoresIds.includes(g.id);
                          return (
                            <button
                              type="button"
                              key={g.id}
                              onClick={() => {
                                if (isSelected) {
                                  setGestoresIds((prev) => prev.filter((gid) => gid !== g.id));
                                } else {
                                  setGestoresIds((prev) => [...prev, g.id]);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-indigo-650/15 border border-indigo-500 text-indigo-300"
                                  : "bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-neutral-400"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <CheckSquare className={`w-4 h-4 shrink-0 transition-all ${isSelected ? "text-indigo-400 opacity-100 scale-100" : "opacity-30"}`} />
                                <div>
                                  <span className="font-bold text-neutral-200 block text-xs">{g.nome}</span>
                                  <span className="font-mono text-[9px] text-neutral-500">{g.email} | Perfil: {g.perfil}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* VINCULAR CONTRATOS - APENAS 1 CONTRATO */}
                  <div className="border border-neutral-850 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                      <span>Vincular Contrato ao qual o Projeto pertence (Apenas 1 por projeto)</span>
                      <span className="text-[10px] text-indigo-400">{contratoIds.length > 0 ? "Contrato selecionado" : "Nenhum contrato selecionado"}</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-1.5 bg-neutral-950/60 rounded-lg border border-neutral-855 font-sans">
                      {contratos.map((c) => {
                        const isSelected = contratoIds.includes(c.id);
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              if (isSelected) {
                                setContratoIds([]);
                              } else {
                                setContratoIds([c.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              isSelected 
                                ? "bg-indigo-650/15 border border-indigo-500 text-indigo-300"
                                : "bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-neutral-400"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckSquare className={`w-4 h-4 shrink-0 transition-all ${isSelected ? "text-indigo-400 opacity-100 scale-100" : "opacity-30"}`} />
                              <div>
                                <span className="font-bold text-neutral-200 block text-xs">{c.nome}</span>
                                <span className="font-mono text-[9px] text-neutral-500">Nº {c.numero} | SLA: {c.sla}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {contratos.length === 0 && (
                        <span className="text-xs text-neutral-500 italic p-2">Nenhum contrato cadastrado no ERP.</span>
                      )}
                    </div>
                  </div>

                  {/* BOOLEAN FLAG CONFIG: Contabilizar por Empresa */}
                  <div className="flex items-start justify-between bg-neutral-950/40 p-4 rounded-xl border border-neutral-850 gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-neutral-200">Contabilizar Apontamentos por Empresa</h4>
                      <p className="text-[10px] text-neutral-400 leading-normal">
                        Fórmula inteligente: Se marcado como real, as horas computadas pelo operador GMZ na demanda serão automaticamente multiplicadas pelo número de empresas vinculadas ao contrato do projeto.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setContabilizarPorEmpresa(!contabilizarPorEmpresa)}
                      className="text-neutral-400 hover:text-neutral-200 cursor-pointer text-indigo-500"
                    >
                      {contabilizarPorEmpresa ? (
                        <span className="flex items-center gap-1 font-bold text-indigo-400 font-sans text-xs">
                          Ativo <ToggleRight size={28} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-neutral-500 font-sans text-xs">
                          Inativo <ToggleLeft size={28} />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* COLUMNS LIST CONFIG */}
                  <div className="border border-neutral-850 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                      <span>Colunas Kanban (Workflow Sequencial)</span>
                      <span className="text-[10px] text-indigo-400">{workflow.length} colunas</span>
                    </label>
                    
                    <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-2.5 rounded-lg min-h-12 border border-neutral-855">
                      {workflow.map((col, colIdx) => (
                        <div key={colIdx} className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-2.5 py-1 rounded-md">
                          <span>{col}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCol(colIdx)}
                            className="text-neutral-500 hover:text-rose-400 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {workflow.length === 0 && <span className="text-xs text-neutral-500 italic py-1">Nenhuma coluna definida.</span>}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da coluna (Ex: Validação)"
                        value={newCol}
                        onChange={(e) => setNewCol(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddCol}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === "atividades" && (
                <div className="space-y-4 animate-fade-in">
                  {/* OUTCOME POINTINGS CONFIG */}
                  <div className="border border-neutral-850 p-4 rounded-xl space-y-3">
                    <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                      <span>Atividades Liberadas para Lançamentos</span>
                      <span className="text-[10px] text-indigo-400">{atividades.length} itens</span>
                    </label>

                    <div className="flex flex-wrap gap-1.5 bg-neutral-950 p-2.5 rounded-lg min-h-12 border border-neutral-855">
                      {atividades.map((ativ, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-2.5 py-1 rounded-md">
                          <span>{ativ}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAtiv(idx)}
                            className="text-neutral-500 hover:text-rose-400 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {atividades.length === 0 && <span className="text-xs text-neutral-500 italic py-1">Sem atividades mapeadas.</span>}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Atividade (Ex: Reunião de Alinhamento)"
                        value={newAtiv}
                        onChange={(e) => setNewAtiv(e.target.value)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleAddAtiv}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === "permissoes" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-1.5 text-xs leading-normal">
                    <h4 className="font-bold text-neutral-200 flex items-center gap-1.5">
                      🔒 Guia de Permissões de Visualização
                    </h4>
                    <p className="text-neutral-400">
                      Por padrão, se você não selecionar nenhuma pessoa abaixo, <strong>todos os usuários do sistema</strong> terão acesso total para visualizar e interagir com este projeto.
                    </p>
                    <p className="text-indigo-400 font-medium">
                      Ao selecionar uma ou mais pessoas, <strong>somente elas e os administradores do sistema (tipo GMZ ou rh_admin)</strong> poderão enxergar este projeto nos workflows e Kanban.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-300 block">Selecione quem pode visualizar este projeto:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1.5 bg-neutral-950/40 rounded-xl border border-neutral-850">
                      {pessoas?.map((p) => {
                        const isSelected = acessosPessoasIds?.includes(p.id) || false;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              if (isSelected) {
                                setAcessosPessoasIds(prev => prev.filter(id => id !== p.id));
                              } else {
                                setAcessosPessoasIds(prev => [...prev, p.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors border cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 ring-1 ring-blue-500/20"
                                : "bg-neutral-900 border-neutral-850 hover:bg-neutral-850 text-neutral-400"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <CheckSquare className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isSelected ? "text-indigo-400 opacity-100" : "opacity-30"}`} />
                              <div className="truncate">
                                <span className="font-bold text-neutral-200 block truncate leading-tight">{p.nome}</span>
                                <span className="text-[9px] text-neutral-500 truncate block leading-tight">{p.email}</span>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 shrink-0 select-none">
                              {p.tipo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === "construtor" && (
                <div className="space-y-6 animate-fade-in text-neutral-200">
                  {selectedTypeIndex === null ? (
                    /* LIST OF DEMAND TYPES */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-850">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">Tipos de Demandas Customizadas</h4>
                          <p className="text-[11px] text-neutral-400">Configure formulários, abas de preenchimento e relatórios por projeto.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTypeName("");
                            setTypeSigla("");
                            setTypePreBuilt({
                              apontamentos: true,
                              anexos: true,
                              lista_pessoas: true,
                              estimativas: true,
                              lista_empresas: true,
                              comentarios: true,
                            });
                            setTypeGuias([]);
                            setActiveTypeTabId("");
                            setSelectedTypeIndex(-1); // -1 means new
                          }}
                          className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-neutral-100 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all"
                        >
                          <Plus size={14} />
                          Novo Tipo de Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tiposDemandasCustom.map((ct, idx) => (
                          <div key={idx} className="bg-neutral-950/65 border border-neutral-850 p-4 rounded-xl flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/15">
                                    {ct.sigla}
                                  </span>
                                  <h5 className="text-sm font-bold text-neutral-200 mt-1">{ct.nome}</h5>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTypeName(ct.nome);
                                      setTypeSigla(ct.sigla);
                                      setTypePreBuilt(ct.camposPreConstruidos || {});
                                      setTypeGuias(ct.guias || []);
                                      setActiveTypeTabId(ct.guias?.[0]?.id || "");
                                      setSelectedTypeIndex(idx);
                                    }}
                                    className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-indigo-400 rounded-lg hover:border-indigo-500/20"
                                    title="Editar Tipo de Demanda"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTiposDemandasCustom(prev => prev.filter((_, i) => i !== idx));
                                      addToast("Tipo de demanda excluído da lista!", "info");
                                    }}
                                    className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-rose-400 rounded-lg hover:border-rose-500/20"
                                    title="Excluir"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-neutral-500 mt-1 leading-normal">
                                {ct.guias?.length || 0} Abas customizadas, {ct.guias?.reduce((acc, g) => acc + (g.campos?.length || 0), 0) || 0} campos dinâmicos configurados.
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 text-[9px] text-neutral-400 bg-neutral-900 border border-neutral-855 rounded p-1.5">
                              {ct.camposPreConstruidos?.apontamentos && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">🕒 Tempos</span>}
                              {ct.camposPreConstruidos?.anexos && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">📁 Anexos</span>}
                              {ct.camposPreConstruidos?.lista_pessoas && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">👥 Responsaveis</span>}
                              {ct.camposPreConstruidos?.estimativas && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">📊 Estimativa</span>}
                              {ct.camposPreConstruidos?.lista_empresas && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">🏢 Clientes</span>}
                              {ct.camposPreConstruidos?.comentarios && <span className="bg-neutral-950 border border-neutral-800 px-1 py-0.5 rounded">💬 Comentários</span>}
                            </div>
                          </div>
                        ))}
                        {tiposDemandasCustom.length === 0 && (
                          <div className="col-span-full py-8 text-center bg-neutral-955 border border-dashed border-neutral-850 rounded-xl">
                            <PlusCircle className="mx-auto text-neutral-600 mb-2" size={24} />
                            <p className="text-xs text-neutral-500 italic">Nenhum Tipo de Demanda customizado criado para este projeto ainda.</p>
                            <span className="text-[10px] text-neutral-500 block mt-1">Os tipos padrão (Melhoria, Incidente etc.) continuam ativos.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* EDITING / CREATING A DEMAND TYPE */
                    <div className="space-y-4 border border-neutral-805 p-5 rounded-2xl bg-neutral-950/30">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTypeIndex(null)}
                          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-100 cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          Voltar para Lista
                        </button>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          {selectedTypeIndex === -1 ? "Novo Tipo de Card" : `Editando: ${typeName}`}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-neutral-300">Nome do Tipo</label>
                          <input
                            type="text"
                            placeholder="Ex: Chamado Técnico, Mudança, Homologação"
                            value={typeName}
                            onChange={(e) => setTypeName(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-neutral-300">Sigla/Prefixo (para chamado ex: ATC-10042)</label>
                          <input
                            type="text"
                            placeholder="Ex: COM, HOM, SUP"
                            maxLength={4}
                            value={typeSigla}
                            onChange={(e) => setTypeSigla(e.target.value.toUpperCase())}
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* BLOCKS / PRE-BUILT FIELDS */}
                      <div className="space-y-2 border border-neutral-850 p-3.5 rounded-xl bg-neutral-950/50">
                        <span className="text-xs font-semibold text-neutral-300 block">Ativar Seções e Módulos Integrados do Kanban:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.keys(typePreBuilt).map((key) => (
                            <button
                              type="button"
                              key={key}
                              onClick={() => setTypePreBuilt(prev => ({ ...prev, [key]: !prev[key] }))}
                              className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors border cursor-pointer ${
                                typePreBuilt[key]
                                  ? "bg-indigo-650/10 border-indigo-500 text-indigo-300"
                                  : "bg-neutral-900 border-neutral-850 text-neutral-500 hover:text-neutral-400"
                              }`}
                            >
                              <CheckSquare className={`w-3.5 h-3.5 ${typePreBuilt[key] ? "opacity-100" : "opacity-30"}`} />
                              <span className="capitalize">{key.replace("_", " ")}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* TABS (GUIAS) CONSTRUCTOR */}
                      <div className="border border-neutral-805 p-4 rounded-xl space-y-4">
                        <div className="flex justify-between items-center bg-neutral-950/40 p-2 rounded-lg border border-neutral-850">
                          <label className="text-xs font-bold text-indigo-400">Layout de Guias / Abas Internas</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Nome da Aba (Ex: Dados extras)"
                              value={newGuiaNome}
                              onChange={(e) => setNewGuiaNome(e.target.value)}
                              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-neutral-200 focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newGuiaNome.trim()) {
                                  const id = "guia_" + Date.now();
                                  const newGuia: GuiaCustom = { id, nome: newGuiaNome.trim(), campos: [] };
                                  setTypeGuias(prev => [...prev, newGuia]);
                                  setNewGuiaNome("");
                                  setActiveTypeTabId(id);
                                  addToast(`Aba "${newGuia.nome}" criada! Adicione os campos logo abaixo.`, "success");
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-500 text-neutral-100 text-[10px] font-bold px-2 py-1 rounded-lg select-none cursor-pointer"
                            >
                              + Aba
                            </button>
                          </div>
                        </div>

                        {typeGuias.length > 0 ? (
                          <div className="space-y-3">
                            {/* Horizontal selection of guides inside constructor */}
                            <div className="flex flex-wrap border-b border-neutral-805 gap-2 pb-1.5">
                              {typeGuias.map((g) => (
                                <div key={g.id} className="flex items-center bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTypeTabId(g.id)}
                                    className={`text-xs font-bold mr-1.5 cursor-pointer ${
                                      activeTypeTabId === g.id ? "text-indigo-400" : "text-neutral-400 hover:text-neutral-200"
                                    }`}
                                  >
                                    📂 {g.nome}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTypeGuias(prev => prev.filter(pg => pg.id !== g.id));
                                      if (activeTypeTabId === g.id) {
                                        setActiveTypeTabId("");
                                      }
                                    }}
                                    className="text-[10px] text-neutral-500 hover:text-rose-450"
                                    title="Remover Aba"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Render active tabs fields and fields creation form */}
                            {activeTypeTabId && (
                              <div className="space-y-4 pt-1 bg-neutral-955 p-3 rounded-lg border border-neutral-855 animate-fade-in animate-duration-150">
                                <span className="text-[11px] text-neutral-400 font-mono block">Nova Aba: Adicionar/Posicionar Campos na Grade:</span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-850">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-400 block font-semibold">Rótulo / Label</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: Versão do App, Data de Homologação"
                                      value={formCampoLabel}
                                      onChange={(e) => setFormCampoLabel(e.target.value)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] text-neutral-200 placeholder-neutral-600 focus:outline-hidden"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-400 block font-semibold">Tipo de Campo</label>
                                    <select
                                      value={formCampoTipo}
                                      onChange={(e) => setFormCampoTipo(e.target.value as any)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                                    >
                                      <option value="texto_curto">Texto Curto</option>
                                      <option value="texto_longo">HTML Rico (Texto Longo)</option>
                                      <option value="data">Data</option>
                                      <option value="lista_coisas">Lista do Projeto</option>
                                      <option value="imagem">Imagem Estática</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] text-neutral-400 block font-semibold">Formato Layout / Grade</label>
                                    <select
                                      value={formCampoGridSpan}
                                      onChange={(e) => setFormCampoGridSpan(Number(e.target.value) as any)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-hidden"
                                    >
                                      <option value={1}>Metade da Largura (50%)</option>
                                      <option value={2}>Largura Inteira (100%)</option>
                                    </select>
                                  </div>

                                  {formCampoTipo === "lista_coisas" && (
                                    <div className="space-y-1 col-span-full">
                                      <label className="text-[10px] text-indigo-400 block font-semibold">Qual registro listar do Projeto?</label>
                                      <div className="flex gap-4 p-2 bg-neutral-900/60 rounded border border-neutral-800">
                                        <label className="flex items-center gap-1.5 text-xs text-neutral-300">
                                          <input
                                            type="radio"
                                            checked={formCampoSubTipoLista === "empresas"}
                                            onChange={() => setFormCampoSubTipoLista("empresas")}
                                          />
                                          Lista de Empresas Clientes
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-neutral-300">
                                          <input
                                            type="radio"
                                            checked={formCampoSubTipoLista === "pessoas"}
                                            onChange={() => setFormCampoSubTipoLista("pessoas")}
                                          />
                                          Lista de Colaboradores / Pessoas
                                        </label>
                                      </div>
                                    </div>
                                  )}

                                  {formCampoTipo === "imagem" && (
                                    <div className="space-y-1 col-span-full">
                                      <label className="text-[10px] text-indigo-400 block font-semibold">URL/Imagem Estática (Opcional - link ou base64)</label>
                                      <input
                                        type="text"
                                        placeholder="Cola a URL da imagem informativa ou instrucional para mostrar no cartão"
                                        value={formCampoImagemUrl}
                                        onChange={(e) => setFormCampoImagemUrl(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 placeholder-neutral-700 focus:outline-hidden"
                                      />
                                    </div>
                                  )}

                                  <div className="col-span-full flex justify-end gap-2 pt-1.5 border-t border-neutral-800/65">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!formCampoLabel.trim()) {
                                          addToast("Informe o rótulo/label do campo!", "error");
                                          return;
                                        }
                                        const newField: CampoCustom = {
                                          id: "fc_" + Date.now(),
                                          label: formCampoLabel.trim(),
                                          tipo: formCampoTipo,
                                          gridSpan: formCampoGridSpan,
                                          subTipoLista: formCampoTipo === "lista_coisas" ? formCampoSubTipoLista : undefined,
                                          imagemUrl: formCampoTipo === "imagem" ? (formCampoImagemUrl.trim() || undefined) : undefined
                                        };

                                        setTypeGuias(prev => prev.map(g => {
                                          if (g.id === activeTypeTabId) {
                                            return { ...g, campos: [...(g.campos || []), newField] };
                                          }
                                          return g;
                                        }));

                                        setFormCampoLabel("");
                                        setFormCampoImagemUrl("");
                                        addToast(`Campo "${newField.label}" adicionado ao grid!`, "success");
                                      }}
                                      className="bg-indigo-650 hover:bg-indigo-600 text-neutral-100 text-xs px-3 py-1 rounded-lg font-bold"
                                    >
                                      Adicionar ao Grid
                                    </button>
                                  </div>
                                </div>

                                {/* Visual dynamic 2-column grid representing layout positioning inside tab */}
                                <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Disposição Visual do Formulário (Visual Grid):</span>
                                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950/70 border border-neutral-850 rounded-xl min-h-16">
                                    {typeGuias.find(g => g.id === activeTypeTabId)?.campos?.map((f) => (
                                      <div
                                        key={f.id}
                                        className={`bg-neutral-900 border border-neutral-850 hover:border-indigo-500/20 p-3 rounded-lg flex flex-col justify-between transition-colors shadow-xs ${
                                          f.gridSpan === 2 ? "col-span-2" : "col-span-1"
                                        }`}
                                      >
                                        <div>
                                          <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold text-neutral-300">{f.label}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setTypeGuias(prev => prev.map(g => {
                                                  if (g.id === activeTypeTabId) {
                                                    return { ...g, campos: (g.campos || []).filter(cp => cp.id !== f.id) };
                                                  }
                                                  return g;
                                                }));
                                                addToast("Campo removido!", "info");
                                              }}
                                              className="text-[10px] text-neutral-500 hover:text-rose-400 font-bold"
                                            >
                                              Remover
                                            </button>
                                          </div>
                                          
                                          {/* Render a mock of the customized field type */}
                                          <div className="mt-2 text-neutral-400">
                                            {f.tipo === "texto_curto" && (
                                              <input disabled placeholder="[Entrada do usuário: texto curto]" className="w-full bg-neutral-950 border border-neutral-850 rounded px-2 py-1 text-[10px] text-neutral-500 cursor-not-allowed" />
                                            )}
                                            {f.tipo === "texto_longo" && (
                                              <textarea disabled placeholder="[Entrada do usuário: editor rico HTML]" className="w-full h-12 bg-neutral-950 border border-neutral-850 rounded p-1 text-[10px] text-neutral-500 cursor-not-allowed resize-none" />
                                            )}
                                            {f.tipo === "data" && (
                                              <input type="date" disabled className="w-full bg-neutral-950 border border-neutral-850 rounded px-2 py-0.5 text-[10px] text-neutral-500 cursor-not-allowed" />
                                            )}
                                            {f.tipo === "lista_coisas" && (
                                              <div className="text-[9px] bg-neutral-950/50 border border-neutral-850 p-2 rounded text-neutral-500 font-mono">
                                                🔍 Buscar relacional de {f.subTipoLista === "empresas" ? "Empresas" : "Colaboradores"}
                                              </div>
                                            )}
                                            {f.tipo === "imagem" && (
                                              <div className="text-[9px] text-indigo-300 italic bg-indigo-500/10 p-2 rounded border border-indigo-500/15 flex items-center gap-1">
                                                🖼️ Imagem estática instrutiva configurada
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex justify-between items-center text-[9px] text-neutral-550 border-t border-neutral-850/60 mt-2 pt-1 font-mono">
                                          <span>Grade: {f.gridSpan === 2 ? "100%" : "50%"}</span>
                                          <span className="capitalize">{f.tipo.replace("_", " ")}</span>
                                        </div>
                                      </div>
                                    ))}
                                    {(typeGuias.find(g => g.id === activeTypeTabId)?.campos?.length || 0) === 0 && (
                                      <p className="col-span-full text-xs text-neutral-500 italic text-center py-4">Nenhum campo adicionado nesta aba ainda. Preencha o formulário acima para adicionar.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic text-center py-6 border border-dashed border-neutral-850 rounded bg-neutral-950/30">Nenhuma Aba/Guia criada para este tipo. Crie um nome e adicione acima.</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3 mt-4">
                        <button
                          type="button"
                          onClick={() => setSelectedTypeIndex(null)}
                          className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs px-3 py-1.5 rounded-lg"
                        >
                          Cancelar Edição
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!typeName.trim() || !typeSigla.trim()) {
                              addToast("Informe Nome e Sigla para o tipo!", "error");
                              return;
                            }
                            const newType: TipoDemandaCustom = {
                              id: selectedTypeIndex === -1 ? ("tc_" + Date.now()) : (tiposDemandasCustom[selectedTypeIndex!].id),
                              nome: typeName.trim(),
                              sigla: typeSigla.trim().toUpperCase(),
                              camposPreConstruidos: typePreBuilt as any,
                              guias: typeGuias
                            };

                            if (selectedTypeIndex === -1) {
                              setTiposDemandasCustom(prev => [...prev, newType]);
                              addToast(`Tipo de demanda "${newType.nome}" adicionado com sucesso!`, "success");
                            } else {
                              setTiposDemandasCustom(prev => prev.map((ct, i) => i === selectedTypeIndex ? newType : ct));
                              addToast(`Tipo de demanda "${newType.nome}" atualizado!`, "success");
                            }
                            setSelectedTypeIndex(null);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-550/25 text-neutral-100 text-xs px-3.5 py-1.5 rounded-lg font-bold"
                        >
                          Salvar Tipo de Demanda
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editId ? "Salvar Parâmetros" : "Confirmar Projeto"}
                </button>
              </div>
            </form>
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
    </div>
  );
};
