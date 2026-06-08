/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useDB } from "./dbState";
import { Sidebar } from "./components/Sidebar";
import { EmpresasModule } from "./components/EmpresasModule";
import { PessoasModule } from "./components/PessoasModule";
import { ContratosModule } from "./components/ContratosModule";
import { ProjetosModule } from "./components/ProjetosModule";
import { KanbanModule } from "./components/KanbanModule";
import { AgendaModule } from "./components/AgendaModule";
import { SMTPModule } from "./components/SMTPModule";
import { RecursosHumanosModule } from "./components/RecursosHumanosModule";
import { RelatoriosModule } from "./components/RelatoriosModule";
import { FilaPrioridadesModule } from "./components/FilaPrioridadesModule";
import { ApontamentosModule } from "./components/ApontamentosModule";
import { ToastContainer } from "./components/ToastContainer";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { HomeDashboardModule } from "./components/HomeDashboardModule";
import { GrupoEmailModule } from "./components/GrupoEmailModule";
import { PermissoesModule } from "./components/PermissoesModule";
import { UserProfileModule } from "./components/UserProfileModule";
import { 
  Building2, Users, FileText, ClipboardList, Calendar, Settings, 
  Lock, ArrowRight, ShieldAlert, Sparkles, LogIn, Mail, Key, Image,
  Bell, Zap, ListOrdered, X, Check, Clock, HelpCircle, BookOpen, Save
} from "lucide-react";

export default function App() {
  const { 
    activeUser, activeUserAcessos, simulatedLogin, sendLoginToken, addToast, pessoas, isInitialized, forceSync,
    dbConnected, dbError, isCheckingConnection, testAndInitializeDatabase, loadingMessage,
    demandas, horasExtras, ferias, alertas, updatePessoa
  } = useDB();

  const [currentModule, setCurrentModule] = useState<string>("");
  const [targetTechSelectedId, setTargetTechSelectedId] = useState<string>("");

  const [isOpenNotifications, setIsOpenNotifications] = useState(false);
  const [isOpenPriorityPanel, setIsOpenPriorityPanel] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("read_notifications_ids") || "[]");
    } catch (_) {
      return [];
    }
  });

  const handleMarkAsRead = (id: string) => {
    const updated = [...readNotifications, id];
    setReadNotifications(updated);
    localStorage.setItem("read_notifications_ids", JSON.stringify(updated));
  };

  const handleMarkAllAsRead = (notificationIds: string[]) => {
    const updated = Array.from(new Set([...readNotifications, ...notificationIds]));
    setReadNotifications(updated);
    localStorage.setItem("read_notifications_ids", JSON.stringify(updated));
    addToast("Todas as notificações marcadas como lidas!", "success");
  };

  // Login variables
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginToken, setLoginToken] = useState("");
  const [authMode, setAuthMode] = useState<"senha" | "token">("senha");
  const [tokenSent, setTokenSent] = useState(false);
  const [lastGeneratedToken, setLastGeneratedToken] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // First access / registration states
  const [firstCpf, setFirstCpf] = useState("");
  const [firstCep, setFirstCep] = useState("");
  const [firstEndereco, setFirstEndereco] = useState("");
  const [firstCidade, setFirstCidade] = useState("");
  const [firstEstado, setFirstEstado] = useState("");
  const [firstTelefone, setFirstTelefone] = useState("");

  // Sync first access state from logged in user if they are GMZ
  useEffect(() => {
    if (activeUser && activeUser.tipo === "GMZ") {
      setFirstCpf(activeUser.cpf || "");
      setFirstCep(activeUser.cep || "");
      setFirstEndereco(activeUser.endereco || "");
      setFirstCidade(activeUser.cidade || "");
      setFirstEstado(activeUser.estado || "");
      setFirstTelefone(activeUser.telefone || "");
    }
  }, [activeUser]);

  const isGmzFirstLogin = activeUser && activeUser.tipo === "GMZ" && (
    !activeUser.cpf || 
    !activeUser.cep || 
    !activeUser.endereco || 
    !activeUser.cidade || 
    !activeUser.estado || 
    !activeUser.telefone
  );

  const handleFirstLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    if (
      !firstCpf.trim() || 
      !firstCep.trim() || 
      !firstEndereco.trim() || 
      !firstCidade.trim() || 
      !firstEstado.trim() || 
      !firstTelefone.trim()
    ) {
      addToast("Todos os campos do cadastro do Grupo GMZ são estritamente obrigatórios no seu primeiro login.", "error");
      return;
    }

    try {
      await updatePessoa(activeUser.id, {
        cpf: firstCpf.trim(),
        cep: firstCep.trim(),
        endereco: firstEndereco.trim(),
        cidade: firstCidade.trim(),
        estado: firstEstado.trim(),
        telefone: firstTelefone.trim()
      });
      addToast("Dados cadastrais salvos com sucesso! Bem-vindo ao sistema.", "success");
    } catch (_) {
      addToast("Erro ao gravar dados cadastrais mandatórios. Tente de novo.", "error");
    }
  };

  // Submit Login Handler
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      addToast("Por favor, preencha o e-mail.", "error");
      return;
    }

    if (authMode === "senha") {
      if (!loginPassword) {
        addToast("Por favor, preencha a senha securitizada.", "error");
        return;
      }
      simulatedLogin(loginEmail, loginPassword, false, rememberMe);
    } else {
      if (!loginToken) {
        addToast("Por favor, informe o token recebido.", "error");
        return;
      }
      simulatedLogin(loginEmail, loginToken, true, rememberMe);
    }
  };

  const handleRequestToken = async () => {
    if (!loginEmail.trim()) {
      addToast("Preencha o e-mail corporativo para podermos despachar seu token.", "error");
      return;
    }
    const tokenCreated = await sendLoginToken(loginEmail);
    if (tokenCreated) {
      setTokenSent(true);
      setLastGeneratedToken(tokenCreated);
    }
  };

  const checkAccess = (module: string): boolean => {
    if (module === "home" || module === "perfil") return true;
    if (!activeUserAcessos) return false;
    return activeUserAcessos.includes(module);
  };

  // Auto-set home module when the user logs in
  useEffect(() => {
    if (activeUser) {
      if (!currentModule || !checkAccess(currentModule)) {
        setCurrentModule("home");
      }
    } else {
      setCurrentModule("");
    }
  }, [activeUser, activeUserAcessos, currentModule]);

  // Handle deep link during initial load before rendering standard flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demanda")) {
      // If we has ?demanda URL query, make sure we direct to board view
      setCurrentModule("demandas");
    }
  }, []);

  // Dynamic calculations for Notifications & Priority Queue
  const userDemandas = (demandas || []).filter(
    (d) => !d.excluido && (d.idDesignado === activeUser?.id || d.idDesignados?.includes(activeUser?.id || ""))
  );
  
  const userHorasExtras = (horasExtras || []).filter(
    (he) => he.idPessoa === activeUser?.id
  );
  
  const userFerias = (ferias || []).filter(
    (f) => f.idPessoa === activeUser?.id
  );

  const userAlertas = (alertas || []).filter((al) => {
    if (!activeUser) return false;
    const isManager = activeUser.perfil === "Gerencial" || activeUser.perfil === "Administrador" || (activeUserAcessos && activeUserAcessos.includes("fila_prioridades_gerencial"));
    return al.recipientId === activeUser.id || (al.recipientId === "gerencial" && isManager);
  });

  const notificationsList = [
    ...userAlertas.map((al) => {
      const isManager = activeUser?.perfil === "Gerencial" || activeUser?.perfil === "Administrador" || (activeUserAcessos && activeUserAcessos.includes("fila_prioridades_gerencial"));
      return {
        id: al.id,
        titulo: al.titulo,
        mensagem: al.mensagem,
        data: al.data,
        type: al.type || "alerta",
        targetPessoaId: al.targetPessoaId || "",
        link: al.type === "prioridade_update" 
          ? (isManager ? "fila_prioridades_gerencial" : "fila_prioridades") 
          : "demandas"
      };
    }),
    ...userDemandas.map((d) => ({
      id: `dem-${d.id}`,
      titulo: "Nova Demanda Designada",
      mensagem: `Você foi designado para a demanda "${d.titulo}" (CH: ${d.numeroChamado}).`,
      data: d.updatedAt || d.createdAt || new Date().toISOString(),
      type: "demanda",
      link: "demandas"
    })),
    ...userHorasExtras.map((he) => ({
      id: `he-${he.id}`,
      titulo: `Hora Extra - Status: ${he.status || "Pendente"}`,
      mensagem: `Seu lançamento de ${he.horas}h referente ao dia ${he.data ? new Date(he.data).toLocaleDateString("pt-BR") : ""} está como ${he.status?.toLowerCase() || "pendente"}.`,
      data: he.updatedAt || he.createdAt || new Date().toISOString(),
      type: "hora_extra",
      link: "meus_beneficios"
    })),
    ...userFerias.map((f) => ({
      id: `fer-${f.id}`,
      titulo: `Programação de Férias: ${f.status || "Solicitado"}`,
      mensagem: `Seu pedido de férias de ${f.dias} dias se encontra ${f.status?.toLowerCase() || "solicitado"}.`,
      data: f.updatedAt || f.createdAt || new Date().toISOString(),
      type: "ferias",
      link: "meus_beneficios"
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const unreadNotifications = notificationsList.filter(n => !readNotifications.includes(n.id));

  const priorityQueueList = (demandas || []).filter(
    (d) => !d.excluido && d.priorizadoFila === true && d.filaAprovada !== false && (d.idDesignado === activeUser?.id || d.idDesignados?.includes(activeUser?.id || ""))
  );

  const renderActiveModule = () => {
    if (!activeUser) return null;

    // Enforce role-based access control (RBAC) securely in rendering
    const hasAccess = checkAccess(currentModule);

    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4 max-w-lg mx-auto font-sans shadow-lg animate-fade-in mt-12">
          <div className="p-4 bg-rose-500/10 border border-rose-500/15 rounded-2xl text-rose-400">
            <ShieldAlert size={40} className="animate-bounce" />
          </div>
          <h3 className="text-neutral-100 font-bold text-lg">Módulo Restrito (Gestão de Acesso RBAC)</h3>
          <p className="text-xs text-neutral-400 leading-normal">
            Lamentamos! O perfil do usuário <strong>{activeUser.nome}</strong> ({activeUser.tipo}) não possui permissões no Firestore para monitorar este módulo de <strong>"{currentModule}"</strong>.
          </p>
          <div className="text-xs text-indigo-400 font-mono bg-neutral-950 p-2.5 rounded border border-neutral-800">
            Regra: ID_Pessoa vinculada não inclusa de acessos
          </div>
        </div>
      );
    }

    switch (currentModule) {
      case "home":
        return <HomeDashboardModule />;
      case "empresas":
        return <EmpresasModule />;
      case "pessoas":
        return <PessoasModule />;
      case "contratos":
        return <ContratosModule />;
      case "projetos":
        return <ProjetosModule />;
      case "demandas":
        return <KanbanModule />;
      case "fila_prioridades":
        return <FilaPrioridadesModule mode="tecnico" setCurrentModule={setCurrentModule} targetTechSelectedId={targetTechSelectedId} setTargetTechSelectedId={setTargetTechSelectedId} />;
      case "fila_prioridades_gerencial":
        return <FilaPrioridadesModule mode="gerencial" setCurrentModule={setCurrentModule} targetTechSelectedId={targetTechSelectedId} setTargetTechSelectedId={setTargetTechSelectedId} />;
      case "apontamentos_pessoal":
        return <ApontamentosModule mode="pessoal" />;
      case "apontamentos_gerencial":
        return <ApontamentosModule mode="gerencial" />;
      case "perfil":
        return <UserProfileModule />;
      case "agenda":
        return <AgendaModule mode="pessoal" />;
      case "agenda_grupo":
        return <AgendaModule mode="empresarial" />;
      case "grupo_emails":
      case "smtp":
        return <SMTPModule />;
      case "permissoes":
        return <PermissoesModule />;
      case "rrhh":
        return <RecursosHumanosModule mode="admin" />;
      case "meus_beneficios":
        return <RecursosHumanosModule mode="colaborador" />;
      case "relatorios":
        return <RelatoriosModule />;
      default:
        return (
          <div className="py-12 text-center text-neutral-500">
            Selecione uma opção válida na barra lateral.
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-neutral-955 text-neutral-200 font-sans antialiased overflow-hidden flex flex-col ${activeUser?.tema === "clean" ? "theme-clean" : ""}`}>
      {/* Loading animation state overlay */}
      {!isInitialized && <LoadingOverlay message={loadingMessage} />}

      {/* Toast state notifications wrapper */}
      <ToastContainer />

      {isInitialized && (
        <>
          {activeUser ? (
            isGmzFirstLogin ? (
              /* FIRST LOGIN OBLIGATORY UPDATE SCREEN */
              <div className="flex min-h-screen w-full items-center justify-center p-4 bg-neutral-955 overflow-y-auto">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl space-y-6 animate-scale-in my-8">
                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase block">Primeiro Acesso GMZ Solutions</span>
                    <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Atualização Cadastral Obrigatória</h2>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                      Detectamos que este é o seu primeiro acesso ao sistema ERP. Conforme as regras de governança da GMZ Solutions, complete todos os seus campos obrigatórios para poder prosseguir ao ambiente produtivo.
                    </p>
                  </div>

                  <form onSubmit={handleFirstLoginSubmit} className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-neutral-305">CPF *</label>
                        <input
                          type="text"
                          required
                          placeholder="000.000.000-00"
                          value={firstCpf}
                          onChange={(e) => setFirstCpf(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-neutral-305">Telefone / Celular *</label>
                        <input
                          type="text"
                          required
                          placeholder="(11) 99999-9999"
                          value={firstTelefone}
                          onChange={(e) => setFirstTelefone(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-neutral-305">CEP *</label>
                        <input
                          type="text"
                          required
                          placeholder="00000-000"
                          value={firstCep}
                          onChange={(e) => setFirstCep(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-neutral-305">Cidade *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: São Paulo"
                          value={firstCidade}
                          onChange={(e) => setFirstCidade(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-xs font-semibold text-neutral-305">Estado *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: SP"
                          value={firstEstado}
                          onChange={(e) => setFirstEstado(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-semibold text-neutral-305">Endereço Completo *</label>
                        <input
                          type="text"
                          required
                          placeholder="Rua, número, complemento, bairro"
                          value={firstEndereco}
                          onChange={(e) => setFirstEndereco(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-hidden transition-all"
                        />
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-98 cursor-pointer mt-4 flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Salvar Cadastro e Acessar Sistema
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* APP SHELL INTERFACE LOGGED IN */
              <div className="flex h-screen relative overflow-hidden">
                <Sidebar currentModule={currentModule} setCurrentModule={setCurrentModule} />

              <main className="flex-1 flex flex-col min-w-0 bg-neutral-955 relative overflow-y-auto">
                <header className="px-8 py-5 border-b border-neutral-900 bg-neutral-900/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-bold">PAINEL ERP CORPORATIVO</span>
                    <h2 className="text-neutral-100 font-bold text-sm tracking-wide capitalize">
                      {currentModule === "apontamentos_pessoal" ? "Apontamentos" :
                       currentModule === "apontamentos_gerencial" ? "Apontamentos Gerencial" :
                       currentModule.replace(/_/g, " ")}
                    </h2>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Header Controls: Priority Queue and Notifications */}
                    <div className="flex items-center gap-2 mr-2">
                      
                      {/* FAQ / Documentation Header Button */}
                      <button
                        onClick={() => setShowFAQModal(true)}
                        className="p-2.5 rounded-xl border bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                        title="FAQ e Documentação do Sistema"
                      >
                        <HelpCircle size={13} />
                      </button>

                      {/* Priority Queue Header Button */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setCurrentModule("fila_prioridades");
                            setIsOpenNotifications(false);
                          }}
                          className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-105 active:scale-95 ${
                            currentModule === "fila_prioridades"
                              ? "bg-amber-500/15 border-amber-500/25 text-amber-400 font-bold"
                              : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                          }`}
                          title="Fila Técnica de Prioridades"
                        >
                          <Zap size={13} className={priorityQueueList.length > 0 ? "fill-amber-500 text-amber-500 animate-pulse" : ""} />
                          {priorityQueueList.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-neutral-950 font-bold font-mono text-[9px] rounded-full flex items-center justify-center border border-neutral-950 shadow-sm animate-bounce">
                              {priorityQueueList.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Notifications Dropdown Panel Trigger */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setIsOpenNotifications(!isOpenNotifications);
                          }}
                          className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-105 active:scale-95 ${
                            isOpenNotifications
                              ? "bg-indigo-500/15 border-indigo-500/25 text-indigo-400 font-bold"
                              : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                          }`}
                          title="Central de Notificações"
                        >
                          <Bell size={13} className={unreadNotifications.length > 0 ? "text-indigo-400 fill-indigo-400/20" : ""} />
                          {unreadNotifications.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 text-white font-bold font-mono text-[9px] rounded-full flex items-center justify-center border border-neutral-950 shadow-sm animate-pulse">
                              {unreadNotifications.length}
                            </span>
                          )}
                        </button>

                        {/* Notifications Dropdown Popover */}
                        {isOpenNotifications && (
                          <>
                            {/* Overlay backdrop */}
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpenNotifications(false)}></div>
                            <div className="absolute right-0 top-11 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-4 z-50 text-left scale-in flex flex-col max-h-[480px]">
                              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3 shrink-0">
                                <div>
                                  <h4 className="text-xs font-bold text-neutral-200">Notificações</h4>
                                  <span className="text-[9px] text-neutral-500 font-mono">{unreadNotifications.length} não lida(s)</span>
                                </div>
                                {unreadNotifications.length > 0 && (
                                  <button
                                    onClick={() => {
                                      handleMarkAllAsRead(unreadNotifications.map(n => n.id));
                                    }}
                                    className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-300 transition cursor-pointer"
                                  >
                                    Limpar Tudo
                                  </button>
                                )}
                              </div>

                              <div className="overflow-y-auto space-y-2 pr-1 scrollbar-thin flex-1 max-h-[300px]">
                                {notificationsList.length === 0 ? (
                                  <div className="py-6 text-center text-neutral-500 italic text-xs">
                                    Nenhuma notificação por aqui!
                                  </div>
                                ) : (
                                  notificationsList.map((notif) => {
                                    const isUnread = !readNotifications.includes(notif.id);
                                    return (
                                      <div
                                        key={notif.id}
                                        onClick={() => {
                                          if (notif.targetPessoaId) {
                                            setTargetTechSelectedId(notif.targetPessoaId);
                                          }
                                          setCurrentModule(notif.link);
                                          handleMarkAsRead(notif.id);
                                          setIsOpenNotifications(false);
                                        }}
                                        className={`p-2.5 rounded-xl border transition cursor-pointer text-left relative group ${
                                          isUnread
                                            ? "bg-indigo-950/20 border-indigo-900/30 hover:border-indigo-800/40"
                                            : "bg-neutral-950/40 border-neutral-900/60 hover:border-neutral-800 text-neutral-400"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="space-y-0.5">
                                            <h5 className={`text-[10px] font-bold ${isUnread ? "text-neutral-200" : "text-neutral-400"}`}>
                                              {notif.titulo}
                                            </h5>
                                            <p className="text-[10px] leading-snug text-neutral-400">
                                              {notif.mensagem}
                                            </p>
                                            <span className="text-[8px] font-mono text-neutral-500 block">
                                              {new Date(notif.data).toLocaleDateString("pt-BR")} às {new Date(notif.data).toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"})}
                                            </span>
                                          </div>
                                          {isUnread && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(notif.id);
                                              }}
                                              className="p-1 rounded bg-neutral-900 hover:bg-indigo-950 hover:text-indigo-400 border border-neutral-850 cursor-pointer shrink-0 transition"
                                              title="Marcar como lida"
                                            >
                                              <Check size={8} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                    </div>

                    {/* USER SIMULATION MODULE (ONLY FOR ADMINISTRATOR OR SIMULATION ACTIVE) */}
                    {activeUser?.perfil === "Administrador" ? (
                      <div className="hidden md:flex items-center gap-1.5 bg-indigo-950/20 border border-indigo-900/30 px-3 py-1.5 rounded-xl cursor-pointer">
                        <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase">Simular Canal:</span>
                        <select
                          value={activeUser.id}
                          onChange={(e) => {
                            const selectedUser = pessoas.find(p => p.id === e.target.value);
                            if (selectedUser) {
                              simulatedLogin(selectedUser.email);
                            }
                          }}
                          className="bg-transparent border-none text-neutral-300 hover:text-white text-xs font-bold outline-none cursor-pointer"
                        >
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-300">
                              {p.nome} ({p.perfil || p.tipo || "Usuário"})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      pessoas.some(p => p.id === "p1") && (
                        <button
                          onClick={() => {
                            const adminUser = pessoas.find(p => p.id === "p1");
                            if (adminUser) {
                              simulatedLogin(adminUser.email);
                              addToast("Retornado ao perfil administrador corporativo!", "success");
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 text-[10px] font-bold rounded-xl cursor-pointer transition flex items-center gap-1 shrink-0 select-none font-mono"
                          title="Voltar ao Perfil Administrador de Fábrica"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                          <span>Finalizar Simulação (Admin)</span>
                        </button>
                      )
                    )}

                    {dbConnected ? (
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 rounded px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online: Cloud Firestore
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/45 border border-amber-500/25 rounded px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Offline: Local Contingência
                      </span>
                    )}
                  </div>
                </header>

                {/* Database Warning Banner */}
                {!dbConnected && (
                  <div className="px-8 pt-6 animate-fade-in">
                    <div className="bg-amber-500/10 border border-amber-500/15 text-amber-400/95 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400 shrink-0">
                          <ShieldAlert size={18} />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-xs text-amber-200">Aviso importante: Firestore Offline / Modo de Contingência</h4>
                          <p className="text-[10px] text-amber-400/80 leading-snug mt-0.5">
                            Não foi possível estabelecer uma conexão estável com o Firestore ({dbError || "Timeout / Erro de Rede"}). 
                            O sistema está operando em modo offline resiliente. Você pode cadastrar, ver e gerenciar todos os módulos normalmente!
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={testAndInitializeDatabase}
                        disabled={isCheckingConnection}
                        className="px-4 py-2 text-neutral-950 bg-amber-400 hover:bg-amber-300 font-bold text-[10px] uppercase tracking-wide rounded-xl transition-all cursor-pointer shadow-indigo-500/10 shrink-0"
                      >
                        {isCheckingConnection ? "Aguarde..." : "Recarregar Conexão"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {renderActiveModule()}
                </div>
              </main>

              {/* FAQ AND SYSTEM DOCUMENTATION OVERLAY MODAL */}
              {showFAQModal && (
                <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
                    
                    {/* Modal Header */}
                    <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-955 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600/15 rounded-xl text-indigo-400 border border-indigo-500/10">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest font-mono">Guia de Ajuda</h3>
                          <h3 className="text-lg font-bold text-neutral-150">F.A.Q. & Documentação Funcional ERP</h3>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowFAQModal(false)} 
                        className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-neutral-850 cursor-pointer transition"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 font-sans text-left">
                      
                      {/* Section 1 */}
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-2 pb-2 border-b border-neutral-850">
                          <span>01. Perfis de Cargos e Matriz de Acessos (RBAC)</span>
                        </h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          O sistema possui um controle flexível de permissões baseado em perfis cumulativos e dinâmicos. Os perfis nativos mapeiam-se conforme as atribuições operacionais abaixo:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-850 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-rose-400 font-mono tracking-wider block">Administrador</span>
                            <span className="block text-xs leading-relaxed text-neutral-300">
                              Gerencia empresas, contratos, projetos e usuários globais. Configura os acessos dinâmicos dos perfis operacionais e parametriza chaves SMTP e infraestrutura.
                            </span>
                          </div>
                          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-850 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-amber-500 font-mono tracking-wider block">Gerencial</span>
                            <span className="block text-xs leading-relaxed text-neutral-300">
                              Triagem técnica de demandas, gerenciamento de filas executivas (fila prioridades), acompanhamento de gozos e One-to-One do time, aprovação de lançamentos e geração de relatórios SLA.
                            </span>
                          </div>
                          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-850 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider block">Técnico Operador</span>
                            <span className="block text-xs leading-relaxed text-neutral-300">
                              Foco em execução. Gerencia fila de tarefas pessoais, altera estado de chamados no Kanban, e reporta faturamento de horas baseadas nas estimativas atribuídas.
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 bg-indigo-600/5 border border-indigo-500/10 text-xs text-neutral-300 rounded-xl leading-normal">
                          💡 <strong>Políticas Especiais:</strong> (1) O administrador pode adicionar novos perfis textuais e calibrar switches de acesso em tempo real. (2) O colaborador com o e-mail <strong>daniel.thaylor@gmz.solutions</strong> herda automaticamente privilégios super-user, possuindo acessibilidade e auditoria total para qualquer tela instalada.
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-2 pb-2 border-b border-neutral-850">
                          <span>02. Tipos de Demandas Kanban</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-2xl">
                            <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Incidente (INC)</span>
                            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                              Resolva anomalias de sistemas críticos. Divide-se em abas dedicadas: <strong>Resumo</strong> (título, descrição, protocolo cliente), <strong>Detalhes</strong> (criticidade, empresas, estimativas de horas, ticket manager e técnico atribuído), <strong>Passo a Passo</strong> (com readequação de etapas via drag, botões de cópia estruturada, status QA e anexo múltiplo de fotos por etapa) e <strong>Tarefas Associadas</strong>.
                            </p>
                          </div>

                          <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-2xl">
                            <span className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Melhoria (MEL)</span>
                            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                              Propostas de upgrade solicitadas pela gerência ou cliente. Exige o controle de <strong>Status da Proposta</strong> (Em análise, Enviada, Aprovada, Re-analise, Reprovada) e a identificação do <strong>Cliente Responsável</strong>, além de tags associadas e estimativas por atividade.
                            </p>
                          </div>

                          <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-2xl">
                            <span className="text-[10px] font-bold text-purple-400 font-mono uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">Mudança (MUD)</span>
                            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                              Processos estruturados de RFC (Mudanças de Infraestrutura/Deploy). Controla justificativas, nível de indisponibilidade simulada, plano de reversão e uma timeline rígida. <strong className="text-indigo-400">Regra de Segurança:</strong> Ao adicionar tarefas da mudança na checklist operacional, o sistema impede data inicial ou final fora da abrangência global declarada na aba Resumo.
                            </p>
                          </div>

                          <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-2xl">
                            <span className="text-[10px] font-bold text-rose-400 font-mono uppercase tracking-widest bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded">BUG / Defeito (BUG)</span>
                            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                              Etapa operacional pós-entrega. Especifica o <strong>Ambiente</strong> de triagem (DEV, QA, PROD ou customizados), <strong>Sub-tipo do BUG</strong> (Front, Back, Banco) e exige o vínculo de até 1 tarefa pai para associação de correlação de causa.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3 */}
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-2 pb-2 border-b border-neutral-850">
                          <span>03. Faturamento de Contratos & Apontamentos de Horas</span>
                        </h4>
                        <div className="space-y-2 text-xs text-neutral-300">
                          <p className="leading-relaxed">
                            • <strong>Prevenir bloqueios de progresso:</strong> Para avançar tarefas dos tipos <em>Melhoria</em> ou <em>Change (Mudança)</em> para colunas de execução no Kanban, o profissional deve obrigatoriamente logar uma atividade estimada nos parâmetros de horas.
                          </p>
                          <p className="leading-relaxed">
                            • <strong>Cálculo por Empresa:</strong> Caso o projeto possua o faturamento dinâmico ("Contabilizar por Empresa"), as horas de apontamento bruto registradas na demanda serão automaticamente multiplicadas pelo correspondente de empresas clientes associadas aos contratos mapeados.
                          </p>
                          <p className="leading-relaxed">
                            • <strong>Acesso restrito de apontamentos:</strong> Técnicos comuns só enxergam e excluem seus próprios lançamentos na gaveta de Apontamentos de cada chamado. Administradores e gerentes conseguem visualizar, inserir e apagar logs de qualquer recurso operacional.
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-955 shrink-0">
                      <button 
                        onClick={() => setShowFAQModal(false)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition active:scale-95 shadow-md"
                      >
                        Entendi, fechar guia
                      </button>
                    </div>

                  </div>
                </div>
              )}

              </div>
            )
          ) : (
            /* LANDING AUTHENTICATION SELECTOR & WELCOME VIEW SCREEN */
            <div className="min-h-screen flex items-center justify-center p-4 bg-radial from-neutral-900 via-neutral-950 to-black select-none">
              <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden animate-scale-in">
                
                {/* Back glow decoration */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-linear-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-xl shadow-indigo-500/20">
                    G
                  </div>
                  <h1 className="text-xl font-bold text-neutral-100 tracking-tight">GMZ Solutions ERP</h1>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Plataforma integrada SaaS Premium de gestão de contratos, projetos e fluxos de demandas operacionais.
                  </p>
                </div>

                {/* Database Connectivity Status Message */}
                {dbConnected ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 animate-fade-in">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                    <div className="text-left leading-snug">
                      <span className="block font-bold text-[11px] text-emerald-300 font-mono uppercase tracking-wide">Banco de Dados Conectado</span>
                      <span className="block text-[10px] text-emerald-500/85">Realtime sync de permissões RBAC e coleções Firestore ativa.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-2xl text-amber-400 space-y-2.5 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-left">
                        <span className="block font-bold text-xs text-amber-300">Mensagem de Conexão com o Banco</span>
                        <span className="block text-[10px] text-amber-400/85 leading-normal mt-0.5">
                          Não foi possível carregar os dados das coleções Firestore ({dbError || "Timeout de Rede"}). 
                          Para garantir resiliência, o ERP foi inicializado em modo de contingência local offline com sincronização bidirecional.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={testAndInitializeDatabase}
                      disabled={isCheckingConnection}
                      className="w-full py-1.5 bg-amber-400/10 hover:bg-amber-400/15 border border-amber-500/15 text-amber-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer active:scale-99"
                    >
                      {isCheckingConnection ? "🔁 Tentando Conexão..." : "🔁 Reestabelecer Conexão com Cloud"}
                    </button>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="border border-neutral-800/80 bg-neutral-950/40 p-6 rounded-3xl space-y-4">
                  <span className="text-xs font-bold text-indigo-400 tracking-wider font-mono uppercase block text-center">
                    🔐 Autenticação Segura ERP
                  </span>

                  {/* Auth mode selection buttons */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAuthMode("senha")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        authMode === "senha"
                          ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-500"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Login via Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("token")}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        authMode === "token"
                          ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-500"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Login via Token
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Email field */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">E-mail Corporativo</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                        <input
                          type="email"
                          required
                          placeholder="EX: daniel.thaylor@gmz.solutions"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    {authMode === "senha" ? (
                      /* Password field */
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Senha de Acesso</label>
                        </div>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                          <input
                            type="password"
                            placeholder="Insira sua senha de segurança"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden transition-all"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Token field & dispatch button */
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Token de Segurança por E-mail</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Digite o token de 6 dígitos"
                              value={loginToken}
                              onChange={(e) => setLoginToken(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRequestToken}
                          className="w-full py-2 bg-indigo-650/20 hover:bg-indigo-650/35 border border-indigo-900/40 hover:border-indigo-800/60 text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
                        >
                          {tokenSent ? "✅ Token de Segurança Solicitado!" : "✉️ Enviar Token de Login por E-mail"}
                        </button>
                        
                        {tokenSent && lastGeneratedToken && (
                          <div className="p-2.5 border border-blue-900/30 bg-blue-950/20 rounded-xl text-[10px] text-blue-400 leading-normal text-center font-mono">
                            Desenvolvimento: Token enviado por e-mail! utilize o token <strong className="text-white bg-blue-900/60 px-1 py-0.5 rounded font-sans font-bold select-all">{lastGeneratedToken}</strong> para logar agora.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remember Me for 7 days checkbox */}
                  <div className="flex items-center gap-2 pt-1 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400 select-none hover:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-neutral-800 bg-neutral-900 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span>Se manter conectado por 7 dias</span>
                    </label>
                  </div>

                  {/* Submission Action */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-98 cursor-pointer mt-2"
                  >
                    <LogIn size={14} />
                    Entrar no Sistema ERP
                  </button>
                </form>

                <div className="text-center">
                  <p className="text-[10px] text-neutral-600 font-mono">
                    Construído com React 19 + Tailwind CSS + Firestore Realtime Sync
                  </p>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
