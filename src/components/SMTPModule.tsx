/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Plus, Edit, Trash2, Settings, User, Mail, Send, CheckCheck, FileText, 
  Paperclip, Key, ShieldAlert, ArrowRight, Eye, RefreshCw, Layers, Search, Clock, 
  AlertTriangle, Users, CheckSquare, Square, X, Calendar, Info
} from "lucide-react";
import { SMTPConfig, GrupoEmail, Pessoa, FilaEmail } from "../types";
import { ConfirmModal } from "./ConfirmModal";

export const SMTPModule: React.FC = () => {
  const { 
    pessoas, 
    smtpConfig, 
    updateSMTPConfig, 
    addToast, 
    filaEmails, 
    updateEmailFila,
    deleteEmailFila,
    grupoEmails,
    addGrupoEmail,
    updateGrupoEmail,
    deleteGrupoEmail,
    activeUser 
  } = useDB();

  // Active sub-tab state (1: grupos, 2: fila, 3: smtp, 4: modelos, 5: testador)
  const [activeTab, setActiveTab] = useState<"grupos" | "fila" | "smtp" | "modelos" | "testador">("grupos");

  // ================= TAB 1: GRUPOS DE EMAILS STATES & FUNCTIONS =================
  const [searchGrupo, setSearchGrupo] = useState("");
  const [grupoNome, setGrupoNome] = useState("");
  const [grupoDescricao, setGrupoDescricao] = useState("");
  const [grupoStatus, setGrupoStatus] = useState<"Ativo" | "Inativo">("Ativo");
  const [selectedPessoas, setSelectedPessoas] = useState<string[]>([]);
  const [editGrupoId, setEditGrupoId] = useState<string | null>(null);
  const [showGrupoModal, setShowGrupoModal] = useState(false);

  const handleGrupoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoNome.trim()) return;

    const payload = {
      nome: grupoNome,
      descricao: grupoDescricao || "",
      participantesIds: selectedPessoas,
      status: grupoStatus
    };

    if (editGrupoId) {
      updateGrupoEmail(editGrupoId, payload);
    } else {
      addGrupoEmail(payload);
    }

    // Reset fields
    setGrupoNome("");
    setGrupoDescricao("");
    setGrupoStatus("Ativo");
    setSelectedPessoas([]);
    setEditGrupoId(null);
    setShowGrupoModal(false);
  };

  const handleEditGrupo = (g: GrupoEmail) => {
    setEditGrupoId(g.id);
    setGrupoNome(g.nome);
    setGrupoDescricao(g.descricao || "");
    setGrupoStatus(g.status || "Ativo");
    setSelectedPessoas(g.participantesIds || []);
    setShowGrupoModal(true);
  };

  const togglePessoaSelection = (pid: string) => {
    setSelectedPessoas((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const toggleGrupoStatus = (g: GrupoEmail) => {
    const nextStatus = g.status === "Inativo" ? "Ativo" : "Inativo";
    updateGrupoEmail(g.id, { status: nextStatus });
    addToast(
      `Grupo "${g.nome}" foi ${nextStatus === "Ativo" ? "ativado" : "inativado"}.`, 
      nextStatus === "Ativo" ? "success" : "info"
    );
  };

  const filteredGroups = grupoEmails.filter((g) => {
    const nomeVal = (g.nome || "").toLowerCase();
    const descVal = (g.descricao || "").toLowerCase();
    const term = searchGrupo.toLowerCase();
    return nomeVal.includes(term) || descVal.includes(term);
  });

  // ================= TAB 2: FILA DE EMAILS STATES & FUNCTIONS =================
  const [activeFilaStatusTab, setActiveFilaStatusTab] = useState<"Todos" | "Pendente" | "Enviado" | "Erro">("Todos");
  const [searchFilaTerm, setSearchFilaTerm] = useState("");
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Date filters (Pre-fill: Start of current month to end of next week)
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    // Format to YYYY-MM-DD
    const y = startOfMonth.getFullYear();
    const m = String(startOfMonth.getMonth() + 1).padStart(2, "0");
    const d = String(startOfMonth.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [dataFim, setDataFim] = useState<string>(() => {
    const today = new Date();
    // Add 7 days to today
    const endRange = new Date(today.setDate(today.getDate() + 7));
    const y = endRange.getFullYear();
    const m = String(endRange.getMonth() + 1).padStart(2, "0");
    const d = String(endRange.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Filter emails in the queue
  const filteredFilaEmails = (filaEmails || []).filter(email => {
    // 1. Status Filter
    if (activeFilaStatusTab !== "Todos" && email.status !== activeFilaStatusTab) {
      return false;
    }

    // 2. Date filters check
    if (email.dataCriacao) {
      const createdDate = new Date(email.dataCriacao);
      
      if (dataInicio) {
        const start = new Date(dataInicio);
        start.setHours(0, 0, 0, 0);
        if (createdDate < start) return false;
      }
      
      if (dataFim) {
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);
        if (createdDate > end) return false;
      }
    }

    // 3. Search text term check
    const term = searchFilaTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (email.assunto || "").toLowerCase().includes(term) ||
      (email.destinatarios || "").toLowerCase().includes(term) ||
      (email.processo || "").toLowerCase().includes(term)
    );
  });

  // Manual trigger for dispatching queue with dates filter
  const handleManualProcessQueue = async () => {
    // Filter pending/errors strictly in the selected date range
    const manuallyTargeted = (filaEmails || []).filter(email => {
      const isTargetStatus = email.status === "Pendente" || email.status === "Erro";
      if (!isTargetStatus) return false;

      if (email.dataCriacao) {
        const createdDate = new Date(email.dataCriacao);
        if (dataInicio) {
          const start = new Date(dataInicio);
          start.setHours(0, 0, 0, 0);
          if (createdDate < start) return false;
        }
        if (dataFim) {
          const end = new Date(dataFim);
          end.setHours(23, 59, 59, 999);
          if (createdDate > end) return false;
        }
      }
      return true;
    });

    if (manuallyTargeted.length === 0) {
      addToast("Nenhum e-mail pendente ou com erro foi encontrado no período selecionado!", "info");
      return;
    }

    setIsProcessingQueue(true);
    addToast(`Disparando lote de ${manuallyTargeted.length} e-mail(s) pendente/erro do período selecionado...`, "info");

    for (let i = 0; i < manuallyTargeted.length; i++) {
      const email = manuallyTargeted[i];
      // Simulated small network latency
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const simulateSuccess = Math.random() > 0.04; // 96% success in simulation
      if (simulateSuccess) {
        await updateEmailFila(email.id, {
          status: "Enviado",
          dataEnvio: new Date().toISOString(),
          erro: ""
        });
      } else {
        await updateEmailFila(email.id, {
          status: "Erro",
          erro: "Falha de autenticação TLS com o servidor ou limite de dispatch excedido."
        });
      }
    }

    setIsProcessingQueue(false);
    addToast("Processamento manual do período concluído com sucesso!", "success");
  };

  const handleDeleteSingleEmail = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este e-mail da fila?")) {
      await deleteEmailFila(id);
      setSelectedEmailIds((prev) => prev.filter((item) => item !== id));
      addToast("E-mail removido da fila!", "success");
    }
  };

  const handleDeleteSelectedEmails = async () => {
    if (selectedEmailIds.length === 0) {
      addToast("Nenhum e-mail selecionado para excluir.", "info");
      return;
    }
    if (confirm(`Tem certeza que deseja excluir os ${selectedEmailIds.length} e-mail(s) selecionado(s)?`)) {
      for (const id of selectedEmailIds) {
        await deleteEmailFila(id);
      }
      setSelectedEmailIds([]);
      addToast("E-mails selecionados excluídos com sucesso!", "success");
    }
  };

  // ================= TAB 3: CONFIG SMTP STATES & FUNCTIONS =================
  const [host, setHost] = useState(smtpConfig.host);
  const [port, setPort] = useState(smtpConfig.port);
  const [user, setUser] = useState(smtpConfig.user);
  const [secure, setSecure] = useState(smtpConfig.secure);
  const [password, setPassword] = useState("• • • • • • • • • • • •");

  const handleSaveSMTP = (e: React.FormEvent) => {
    e.preventDefault();
    updateSMTPConfig({
      host,
      port: Number(port),
      user,
      secure,
      preloads
    });
  };

  // ================= TAB 4: EMAIL CONFIG MODELS STATES & FUNCTIONS =================
  const [activeServiceTab, setActiveServiceTab] = useState<string>("Melhoria");
  const [preloads, setPreloads] = useState(smtpConfig.preloads);

  const handlePreloadChange = (field: "titulo" | "descricao" | "anexoNome", val: string) => {
    const updated = {
      ...preloads,
      [activeServiceTab]: {
        ...preloads[activeServiceTab],
        [field]: val
      }
    };
    setPreloads(updated);
  };

  const handleLoadPreloadToTest = () => {
    const data = preloads[activeServiceTab];
    if (data) {
      setSimSubject(data.titulo);
      setSimDescription(data.descricao);
      setSimAttachmentName(data.anexoNome + ".pdf");
      setActiveTab("testador");
      addToast(`Modelo [${activeServiceTab}] carregado no Testador de Envio!`, "info");
    }
  };

  // ================= TAB 5: TESTER STATES & FUNCTIONS =================
  const [simSelectedRecipientType, setSimSelectedRecipientType] = useState<"select" | "manual">("select");
  const [simSelectedRecipientId, setSimSelectedRecipientId] = useState("");
  const [simManualRecipientEmail, setSimManualRecipientEmail] = useState("");
  const [simFilterRecipientText, setSimFilterRecipientText] = useState("");
  const [simSubject, setSimSubject] = useState("");
  const [simDescription, setSimDescription] = useState("");
  const [simAttachmentName, setSimAttachmentName] = useState("");
  const [isSendingSim, setIsSendingSim] = useState(false);

  const handleSendEmailTest = (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetEmail = "";
    if (simSelectedRecipientType === "select") {
      const p = pessoas.find((u) => u.id === simSelectedRecipientId);
      if (!p) {
        addToast("Por favor, selecione um destinatário do ERP!", "error");
        return;
      }
      targetEmail = p.email;
    } else {
      if (!simManualRecipientEmail || !simManualRecipientEmail.includes("@")) {
        addToast("Por favor, insira um e-mail válido!", "error");
        return;
      }
      targetEmail = simManualRecipientEmail;
    }

    if (!simSubject || !simDescription) {
      addToast("O título e a descrição não podem ficar em branco!", "error");
      return;
    }

    setIsSendingSim(true);
    addToast("Conectando ao servidor SMTP cadastrado...", "info");

    setTimeout(() => {
      setIsSendingSim(false);
      addToast(`Sucesso! E-mail disparado para "${targetEmail}" via ${host}:${port}!`, "success");
      
      // Cleanup
      setSimSubject("");
      setSimDescription("");
      setSimAttachmentName("");
    }, 1500);
  };

  const filteredRecipients = pessoas.filter(p => 
    p.nome.toLowerCase().includes(simFilterRecipientText.toLowerCase()) ||
    p.email.toLowerCase().includes(simFilterRecipientText.toLowerCase())
  );

  // Confirmation modal helpers
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <Mail className="text-indigo-400" size={24} />
            Módulo Unificado de E-mails
          </h2>
          <p className="text-sm text-neutral-400">
            Gerencie listas de e-mails corporativas, monitore e dispare a fila de disparos e configure parâmetros SMTP integrados.
          </p>
        </div>
      </div>

      {/* TABS SELECTOR STRIP */}
      <div className="flex flex-wrap gap-1.5 bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab("grupos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "grupos"
              ? "bg-indigo-600 text-neutral-100 shadow-md border border-indigo-500/20"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
          }`}
        >
          <Users size={14} />
          Grupos de E-mails
        </button>

        <button
          onClick={() => setActiveTab("fila")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer relative ${
            activeTab === "fila"
              ? "bg-indigo-600 text-neutral-100 shadow-md border border-indigo-500/20"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
          }`}
        >
          <Layers size={14} />
          Fila de E-mails
          {(filaEmails || []).filter(m => m.status === "Pendente").length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 font-mono text-[9px] font-bold text-white ring-2 ring-neutral-900 animate-pulse">
              {(filaEmails || []).filter(m => m.status === "Pendente").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("smtp")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "smtp"
              ? "bg-indigo-600 text-neutral-100 shadow-md border border-indigo-500/20"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
          }`}
        >
          <Settings size={14} />
          Configurações SMTP
        </button>

        <button
          onClick={() => setActiveTab("modelos")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "modelos"
              ? "bg-indigo-600 text-neutral-100 shadow-md border border-indigo-500/20"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
          }`}
        >
          <FileText size={14} />
          Modelos de E-mail
        </button>

        <button
          onClick={() => setActiveTab("testador")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "testador"
              ? "bg-indigo-600 text-neutral-100 shadow-md border border-indigo-500/20"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850/40"
          }`}
        >
          <Send size={14} />
          Testador de Envio
        </button>
      </div>

      {/* TAB CONTENT ROOT */}

      {/* TAB 1: GRUPOS DE EMAILS */}
      {activeTab === "grupos" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-neutral-200 flex items-center gap-2">
                <Users className="text-indigo-400" size={18} />
                Grupos de E-mails & Alinhamento
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Crie listas de correspondências que herdam eventos na agenda de forma integrada com notificações SMTP automáticas.
              </p>
            </div>
            {activeUser?.perfil === "Administrador" && (
              <button
                onClick={() => {
                  setEditGrupoId(null);
                  setGrupoNome("");
                  setGrupoDescricao("");
                  setGrupoStatus("Ativo");
                  setSelectedPessoas([]);
                  setShowGrupoModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-xs transition-all shadow-lg active:scale-95 cursor-pointer ml-auto"
              >
                <Plus size={14} />
                Criar Novo Grupo
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por nome do grupo..."
                value={searchGrupo}
                onChange={(e) => setSearchGrupo(e.target.value)}
                className="w-full bg-neutral-955 border border-neutral-850 rounded-xl py-1.5 pl-10 pr-4 text-xs text-neutral-200 placeholder-neutral-550 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs text-neutral-400 sm:ml-auto font-mono">
              {filteredGroups.length} grupo(s) encontrado(s)
            </div>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((group) => {
              const totalMembers = group.participantesIds?.length || 0;
              const isInactive = group.status === "Inativo";

              return (
                <div
                  key={group.id}
                  className={`bg-neutral-900 border rounded-2xl p-5 hover:border-neutral-700 transition flex flex-col justify-between ${
                    isInactive ? "opacity-70 border-neutral-850 bg-neutral-950/20" : "border-neutral-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isInactive 
                            ? "bg-neutral-950/80 border border-neutral-850 text-neutral-500" 
                            : "bg-indigo-95/20 border border-indigo-900/30 text-indigo-400"
                        }`}>
                          <Users size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-200">{group.nome}</h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isInactive 
                                ? "bg-red-400/10 text-red-400 border border-red-500/10" 
                                : "bg-green-400/10 text-green-450 border border-green-500/10"
                            }`}>
                              {group.status || "Ativo"}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block mt-0.5">ID: {group.id}</span>
                        </div>
                      </div>

                      <span className="text-[10px] bg-neutral-950 px-2 py-0.5 border border-neutral-850 rounded text-neutral-400 font-mono shrink-0">
                        {totalMembers} {totalMembers === 1 ? "Membro" : "Membros"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-450 leading-relaxed mt-4">
                      {group.descricao || "Sem justificativa ou descrição descrita para o grupo."}
                    </p>

                    {/* Members selection previews */}
                    <div className="mt-4 pt-3 border-t border-neutral-850/80 space-y-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">Integrantes Vinculados:</span>
                      <div className="flex flex-wrap gap-1">
                        {group.participantesIds && group.participantesIds.length > 0 ? (
                          group.participantesIds.map((pid) => {
                            const targetUser = pessoas.find((p) => p.id === pid);
                            if (!targetUser) return null;
                            return (
                              <span
                                key={pid}
                                className="text-[9.5px] font-sans bg-neutral-950 border border-neutral-850 font-bold text-neutral-300 px-2 py-0.5 rounded-md"
                              >
                                {targetUser.nome}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[11px] text-neutral-600 italic">Nenhum participante vinculado.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  {activeUser?.perfil === "Administrador" && (
                    <div className="flex items-center justify-end gap-2 border-t border-neutral-850 mt-5 pt-3.5">
                      <button
                        onClick={() => toggleGrupoStatus(group)}
                        className={`p-1 px-3 cursor-pointer border rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          isInactive 
                            ? "bg-neutral-900 border-neutral-800 text-green-400 hover:bg-green-500/10 hover:border-green-500/20" 
                            : "bg-neutral-900 border-neutral-800 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-505/20"
                        }`}
                      >
                        {isInactive ? "Ativar Grupo" : "Inativar Grupo"}
                      </button>

                      <button
                        onClick={() => handleEditGrupo(group)}
                        className="p-1 px-3 cursor-pointer bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-750 text-neutral-400 hover:text-indigo-400 transition-all rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit size={12} />
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: "Deletar Grupo de E-mails",
                            description: `Deseja realmente excluir permanentemente o grupo "${group.nome}"?`,
                            onConfirm: () => {
                              deleteGrupoEmail(group.id);
                              setConfirmState(null);
                            }
                          });
                        }}
                        className="p-1 px-3 cursor-pointer bg-neutral-955 hover:bg-rose-500/15 border border-neutral-850 text-neutral-500 hover:text-rose-400 transition-all rounded-lg text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="col-span-full py-16 text-center bg-neutral-900/40 border border-neutral-850 rounded-2xl">
                <Users className="mx-auto text-neutral-600 mb-3" size={36} />
                <p className="text-neutral-400 text-sm">Nenhum grupo de e-mail encontrado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FILA DE EMAILS (WITH DATES FILTER & MANUAL DISPATCH) */}
      {activeTab === "fila" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          
          {/* Header section */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="text-indigo-400" />
                Fila de Correspondência (Queued Mail Dispatch)
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Monitore disparos automáticos do ERP e execute reenvios em lote filtrados por período.
              </p>
            </div>

            {/* DATE FILTER STRIPS AND DISPATCH ACTION BUTTON */}
            <div className="flex flex-wrap items-center gap-3 bg-neutral-955 p-3 rounded-xl border border-neutral-850">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <span className="font-semibold text-neutral-400">De:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <span className="font-semibold text-neutral-400">Até:</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <button
                onClick={handleManualProcessQueue}
                disabled={isProcessingQueue}
                className="bg-indigo-650 hover:bg-indigo-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-100 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                {isProcessingQueue ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Disparar fila manualmente
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STATUS SELECTORS AND SEARCH FIELD */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(["Todos", "Pendente", "Enviado", "Erro"] as const).map((tab) => {
                const count = tab === "Todos" 
                  ? (filaEmails || []).length 
                  : (filaEmails || []).filter(e => e.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilaStatusTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1.5 shrink-0 ${
                      activeFilaStatusTab === tab
                        ? "bg-indigo-505/10 border-indigo-500/40 text-indigo-300"
                        : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-950"
                    }`}
                  >
                    <span>{tab}</span>
                    <span className="font-mono text-[9px] bg-neutral-950 px-1.5 py-0.5 rounded-full text-neutral-500 border border-neutral-850">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Filtrar assunto, destinatário..."
                value={searchFilaTerm}
                onChange={(e) => setSearchFilaTerm(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* BULK DELETE ACTION BAR */}
          {selectedEmailIds.length > 0 && (
            <div className="flex items-center justify-between bg-rose-950/25 border border-rose-900/30 p-3.5 rounded-xl animate-fade-in">
              <span className="text-xs text-rose-300 font-semibold flex items-center gap-1">
                <AlertTriangle size={13} />
                {selectedEmailIds.length} e-mail(s) selecionado(s) para exclusão.
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedEmailIds([])}
                  className="px-3 py-1 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 text-xs font-semibold rounded-lg border border-neutral-800 cursor-pointer"
                >
                  Limpar Seleção
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedEmails}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={11} />
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          )}

          {/* TABLE */}
          <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-955 border-b border-neutral-800">
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 w-8">
                    <input
                      type="checkbox"
                      checked={filteredFilaEmails.length > 0 && filteredFilaEmails.every(e => selectedEmailIds.includes(e.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmailIds(prev => {
                            const newIds = [...prev];
                            filteredFilaEmails.forEach(mail => {
                              if (!newIds.includes(mail.id)) newIds.push(mail.id);
                            });
                            return newIds;
                          });
                        } else {
                          setSelectedEmailIds(prev => prev.filter(id => !filteredFilaEmails.some(mail => mail.id === id)));
                        }
                      }}
                      className="rounded border-neutral-800 bg-neutral-950 text-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Criação</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Destinatários</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Processo</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Assunto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Enviado em</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400" >Feedback / Erros</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 text-center" >Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {filteredFilaEmails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-neutral-500 italic text-xs">
                      Nenhum e-mail registrado nesse intervalo ou filtro de pesquisa.
                    </td>
                  </tr>
                ) : (
                  filteredFilaEmails.map((email) => (
                    <tr key={email.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.includes(email.id)}
                          onChange={() => {
                            setSelectedEmailIds(prev => 
                              prev.includes(email.id) 
                                ? prev.filter(id => id !== email.id) 
                                : [...prev, email.id]
                            );
                          }}
                          className="rounded border-neutral-800 bg-neutral-950 text-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-neutral-400 whitespace-nowrap">
                        {new Date(email.dataCriacao).toLocaleDateString("pt-BR")} {new Date(email.dataCriacao).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className="font-semibold text-neutral-200 block truncate max-w-xs">{email.destinatarios}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded text-[9.5px] font-medium font-sans">
                          {email.processo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-neutral-300 max-w-xs truncate font-medium">
                        {email.assunto}
                      </td>
                      <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                        {email.status === "Pendente" && (
                          <span className="text-yellow-400 bg-yellow-400/10 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 w-fit">
                            <Clock size={11} className="inline animate-spin" />
                            Pendente
                          </span>
                        )}
                        {email.status === "Enviado" && (
                          <span className="text-green-400 bg-green-400/10 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 w-fit">
                            <CheckCheck size={11} className="inline" />
                            Enviado
                          </span>
                        )}
                        {email.status === "Erro" && (
                          <span className="text-red-400 bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 w-fit">
                            <AlertTriangle size={11} className="inline" />
                            Erro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-neutral-400 whitespace-nowrap">
                        {email.dataEnvio 
                          ? `${new Date(email.dataEnvio).toLocaleDateString("pt-BR")} ${new Date(email.dataEnvio).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"})}`
                          : <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-red-400 font-mono max-w-xs truncate" title={email.erro}>
                        {email.erro || <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleEmail(email.id)}
                          className="p-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg cursor-pointer transition active:scale-95 inline-flex items-center justify-center"
                          title="Excluir este e-mail"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIG SMTP */}
      {activeTab === "smtp" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 flex items-center gap-2">
            <Key size={16} className="text-indigo-400" />
            Parâmetros de Conexão SMTP de Saída
          </h3>

          <form onSubmit={handleSaveSMTP} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Endereço Host SMTP</label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200"
                  placeholder="smtp.example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Porta TCP</label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200 font-mono"
                  placeholder="587"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Usuário SMTP</label>
                <input
                  type="email"
                  required
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200"
                  placeholder="login@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Senha / App Access Token</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-400 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded border-neutral-800 text-indigo-500 h-4 w-4 bg-neutral-950"
                />
                <span>Requer SSL/TLS Canal Seguro Especial (ex: Porta 465)</span>
              </label>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Salvar Configurações SMTP
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: MODELOS DE EMAIL */}
      {activeTab === "modelos" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 flex items-center gap-2">
            <Layers size={16} className="text-indigo-400" />
            Modelos de Notificação de Negócios (Preloads)
          </h3>
          
          <p className="text-xs text-neutral-400 mt-2">
            Configure as mensagens de alerta que serão carregadas em fila SMTP para parceiros ou funcionários conforme o tipo de demanda.
          </p>

          {/* SERVICE TABS SELECTOR */}
          <div className="flex gap-1.5 border-b border-neutral-800 mt-4 overflow-x-auto pb-1">
            {["Melhoria", "Incidente", "Change", "BUG", "Outros"].map((type) => (
              <button
                key={type}
                onClick={() => setActiveServiceTab(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border shrink-0 ${
                  activeServiceTab === type 
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-950/40"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">Título do Assunto</label>
              <input
                type="text"
                value={preloads[activeServiceTab]?.titulo || ""}
                onChange={(e) => handlePreloadChange("titulo", e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2 text-sm text-neutral-200 focus:border-indigo-500"
                placeholder="Informe o titulo pre carregado"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">Corpo HTML da Notificação</label>
              <textarea
                rows={4}
                value={preloads[activeServiceTab]?.descricao || ""}
                onChange={(e) => handlePreloadChange("descricao", e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2 text-sm text-neutral-200 focus:border-indigo-500 resize-none"
                placeholder="Escreva os detalhes"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 block">Anexo PDF Dinâmico do Evento</label>
              <div className="flex items-center gap-2 bg-neutral-950 p-2 px-3 border border-neutral-805 rounded-xl text-xs text-neutral-400 font-mono">
                <Paperclip size={13} className="text-neutral-500 shrink-0" />
                <input
                  type="text"
                  value={preloads[activeServiceTab]?.anexoNome || ""}
                  onChange={(e) => handlePreloadChange("anexoNome", e.target.value)}
                  className="bg-transparent border-none text-neutral-200 focus:outline-none w-full font-mono text-xs"
                  placeholder="nome_do_anexo"
                />
                <span>.pdf</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-neutral-950/40 p-3 rounded-xl border border-neutral-850/50 mt-4">
              <span className="text-[11px] text-neutral-400">Deseja carregar este modelo diretamente no Testador de Envio?</span>
              <button
                onClick={handleLoadPreloadToTest}
                className="px-3.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-indigo-505 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-all cursor-pointer"
              >
                Carregar Modelo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TESTADOR DE ENVIO */}
      {activeTab === "testador" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-neutral-850 pb-3">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
              <Send size={15} className="text-indigo-400" />
              Mecanismo Testador de Envio SMTP
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Envie e-mails no mesmo instante usando as configurações SMTP ativas para diagnosticar integrações.
            </p>
          </div>

          <form onSubmit={handleSendEmailTest} className="space-y-4">
            
            {/* RECIPIENT TYPE SELECTOR */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-neutral-300">Tipo de Destinatário</label>
              <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-850">
                <button
                  type="button"
                  onClick={() => setSimSelectedRecipientType("select")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    simSelectedRecipientType === "select"
                      ? "bg-indigo-650 text-neutral-100 shadow-md"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Pessoas do ERP
                </button>
                <button
                  type="button"
                  onClick={() => setSimSelectedRecipientType("manual")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    simSelectedRecipientType === "manual"
                      ? "bg-indigo-650 text-neutral-100 shadow-md"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Endereço Externo
                </button>
              </div>
            </div>

            {/* DYNAMIC VIEW FOR SELECTING TARGET */}
            {simSelectedRecipientType === "select" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300 block">Escolher Destinatário</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Filtrar pessoas por nome ou e-mail..."
                    value={simFilterRecipientText}
                    onChange={(e) => setSimFilterRecipientText(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-805 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={simSelectedRecipientId}
                  onChange={(e) => setSimSelectedRecipientId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-3 py-2 text-xs text-neutral-200"
                >
                  <option value="">Selecione na lista ({filteredRecipients.length})</option>
                  {filteredRecipients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} | {p.email} ({p.tipo})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">E-mail de Destino</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="colaborador@parceiro.com"
                    value={simManualRecipientEmail}
                    onChange={(e) => setSimManualRecipientEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-805 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* SUBJECT & DESCRIPTION */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Título / Assunto</label>
                <input
                  type="text"
                  required
                  placeholder="Informe o assunto do teste"
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-neutral-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Conteúdo da Mensagem</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Escreva a mensagem aqui..."
                  value={simDescription}
                  onChange={(e) => setSimDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-neutral-200 resize-none"
                />
              </div>

              {simAttachmentName && (
                <div className="bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-900/40 text-xs text-indigo-350 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Paperclip size={12} />
                    Anexo do Teste: {simAttachmentName}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setSimAttachmentName("")}
                    className="text-indigo-400 hover:text-indigo-200 text-[10px] uppercase font-bold"
                  >
                    Excluir Anexo
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSendingSim}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-neutral-100 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-center cursor-pointer"
            >
              {isSendingSim ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Conectando e transmitindo...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Disparar E-mail de Teste
                </>
              )}
            </button>
          </form>

          <div className="border-t border-neutral-850 pt-3 text-[10px] text-neutral-500 flex items-start gap-2 bg-neutral-950/30 p-3 rounded-xl leading-normal">
            <ShieldAlert size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <span>Este testador utiliza conexões síncronas simuladas com respostas SMTP estritas em tempo real.</span>
          </div>
        </div>
      )}

      {/* ================= TAB 1: GRUPO MODAL (CREATE OR EDIT) ================= */}
      {showGrupoModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-neutral-805 bg-neutral-955 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {editGrupoId ? "Editar Grupo de E-mails" : "Adicionar Novo Grupo de E-mails"}
                </h3>
                <p className="text-xs text-neutral-400 font-sans mt-0.5">
                  Insira o nome, descrição e membros do canal de correspondência.
                </p>
              </div>
              <button 
                onClick={() => setShowGrupoModal(false)}
                className="text-neutral-500 hover:text-neutral-300 transition cursor-pointer p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGrupoSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Nome do Grupo</label>
                  <input
                    type="text"
                    required
                    placeholder="EX: Departamento De Engenharia"
                    value={grupoNome}
                    onChange={(e) => setGrupoNome(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-neutral-300">Status</label>
                  <select
                    value={grupoStatus}
                    onChange={(e) => setGrupoStatus(e.target.value as "Ativo" | "Inativo")}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Descrição / Justificativa</label>
                <textarea
                  rows={2}
                  placeholder="EX: Alinhamento de todos os desenvolvedores seniores e PMs de produto..."
                  value={grupoDescricao}
                  onChange={(e) => setGrupoDescricao(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none resize-none"
                />
              </div>

              {/* Members Selection list inside modal */}
              <div className="space-y-2 border-t border-neutral-800/80 pt-4">
                <div>
                  <label className="text-xs font-bold text-neutral-200">Selecionar Membros Incorporados ({selectedPessoas.length} selecionados)</label>
                  <p className="text-[10px] text-neutral-500">Marque as pessoas que devem receber os disparos SMTP automáticos.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto bg-neutral-950 border border-neutral-850 p-3 rounded-xl scrollbar-thin">
                  {pessoas.map((p) => {
                    const isChecked = selectedPessoas.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePessoaSelection(p.id)}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-900 text-left text-xs text-neutral-300 rounded-lg transition-colors cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare size={13} className="text-indigo-505 shrink-0" />
                        ) : (
                          <Square size={13} className="text-neutral-700 shrink-0" />
                        )}
                        <span className="truncate">{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-5">
                <button
                  type="button"
                  onClick={() => setShowGrupoModal(false)}
                  className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-neutral-100 font-bold text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                >
                  {editGrupoId ? "Salvar Alterações" : "Criar Grupo"}
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
