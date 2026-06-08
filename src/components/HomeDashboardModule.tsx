/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useMemo } from "react";
import { useDB } from "../dbState";
import { EventoAgenda, Demanda } from "../types";
import { 
  Home, Calendar, Zap, ClipboardList, BarChart3, Settings2, CheckSquare, 
  Square, Clock, ArrowRight, User, AlertCircle, Sparkles, Building2, Flame, X
} from "lucide-react";

export const HomeDashboardModule: React.FC = () => {
  const { 
    eventos, 
    demandas, 
    grupoEmails,
    empresas,
    activeUser, 
    addToast 
  } = useDB();

  // Storage key for custom widgets configurations
  const widgetStorageKey = useMemo(() => {
    return `erp_home_widgets_${activeUser?.id || "guest"}`;
  }, [activeUser]);

  // Default widgets list initialized: loaded from local storage or defaults to "agenda" + "prioridades"
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`erp_home_widgets_${activeUser?.id || "guest"}`);
      return saved ? JSON.parse(saved) : ["agenda", "prioridades"];
    } catch (_) {
      return ["agenda", "prioridades"];
    }
  });

  const [showConfig, setShowConfig] = useState(false);

  // Sync widgets list to settings
  useEffect(() => {
    localStorage.setItem(widgetStorageKey, JSON.stringify(visibleWidgets));
  }, [visibleWidgets, widgetStorageKey]);

  const allWidgets = [
    { id: "agenda", label: "Próximos Compromissos da Agenda", desc: "Lista de reuniões, marcos e alertas de grupo sincronizados.", icon: <Calendar size={15} className="text-indigo-400" /> },
    { id: "prioridades", label: "Fila Técnica de Prioridades", desc: "Minhas demandas prioritárias operacionais ordenadas.", icon: <Zap size={15} className="text-amber-400" /> },
    { id: "kanban", label: "Quadro de Tarefas Ativas", desc: "Suas tarefas designadas no Kanban organizadas por status.", icon: <ClipboardList size={15} className="text-sky-400" /> },
    { id: "graficos", label: "Relatórios & Gráficos Comerciais", desc: "Painéis de gráficos e estatísticas gerais do ERP.", icon: <BarChart3 size={15} className="text-emerald-400" /> }
  ];

  const handleToggleWidget = (id: string) => {
    setVisibleWidgets((prev) => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(w => w !== id);
        addToast(`Widget de "${allWidgets.find(aw => aw.id === id)?.label}" ocultado!`, "info");
      } else {
        next = [...prev, id];
        addToast(`Widget de "${allWidgets.find(aw => aw.id === id)?.label}" habilitado com sucesso.`, "success");
      }
      return next;
    });
  };

  // 1) List of upcoming events belonging to user or user's groups
  const upcomingEvents = useMemo(() => {
    if (!activeUser) return [];
    
    // Project events in current month range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15, 23, 59, 59); // Next 15 days window

    const list: EventoAgenda[] = [];

    eventos.forEach((ev) => {
      const evTipo = ev.tipo || "Pessoal";
      
      // Filter by personal relevance
      let isRelevant = false;
      if (evTipo === "Pessoal") {
        isRelevant = ev.criadorId === activeUser.id || ev.participantesIds?.includes(activeUser.id);
      } else if (evTipo === "Grupo") {
        if (ev.participantesIds?.includes(activeUser.id)) isRelevant = true;
        else if (ev.grupoId) {
          const grp = grupoEmails.find(g => g.id === ev.grupoId);
          if (grp && grp.participantesIds?.includes(activeUser.id)) isRelevant = true;
        }
        if (ev.criadorId === activeUser.id) isRelevant = true;
      }

      if (!isRelevant) return;

      const evDate = new Date(ev.dataHora);
      if (!ev.recorrencia || ev.recorrencia === "Nenhuma") {
        if (evDate >= startOfToday && evDate <= endWindow) {
          list.push({ ...ev });
        }
        return;
      }

      // Projections
      let currentProj = new Date(evDate);
      let safeLimit = 0;
      while (currentProj <= endWindow && safeLimit < 50) {
        safeLimit++;
        if (currentProj >= startOfToday && currentProj <= endWindow) {
          list.push({
            ...ev,
            id: `${ev.id}_dash_${currentProj.getTime()}`,
            dataHora: currentProj.toISOString().split(".")[0],
            parentId: ev.id
          });
        }
        if (ev.recorrencia === "Semanal") currentProj.setDate(currentProj.getDate() + 7);
        else if (ev.recorrencia === "Quinzenal") currentProj.setDate(currentProj.getDate() + 14);
        else if (ev.recorrencia === "Mensal") currentProj.setMonth(currentProj.getMonth() + 1);
        else if (ev.recorrencia === "Anual") currentProj.setFullYear(currentProj.getFullYear() + 1);
        else break;
      }
    });

    return list.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()).slice(0, 5);
  }, [eventos, activeUser, grupoEmails]);

  // 2) List of high priorities assigned to user
  const userPriorityDemands = useMemo(() => {
    if (!activeUser) return [];
    return demandas.filter((d) => 
      !d.excluido && 
      d.status !== "Concluida" &&
      d.priorizadoFila === true && 
      d.filaAprovada !== false &&
      (d.idDesignado === activeUser.id || d.idDesignados?.includes(activeUser.id))
    ).slice(0, 5);
  }, [demandas, activeUser]);

  // 3) Kanban tasks assigned to user (general active tasks)
  const activeKanbanTasks = useMemo(() => {
    if (!activeUser) return [];
    return demandas.filter((d) => 
      !d.excluido && 
      d.status !== "Concluida" &&
      (d.idDesignado === activeUser.id || d.idDesignados?.includes(activeUser.id))
    );
  }, [demandas, activeUser]);

  // 4) Metrics for the reports display chart widgets
  const chartMetrics = useMemo(() => {
    const total = demandas.filter(d => !d.excluido).length;
    const concluded = demandas.filter(d => !d.excluido && d.status === "Concluida").length;
    const progress = demandas.filter(d => !d.excluido && d.status === "Desenvolvimento").length;
    const homologacao = demandas.filter(d => !d.excluido && d.status === "Homologacao").length;
    const waiting = demandas.filter(d => !d.excluido && d.status === "Aguardando Chamado").length;
    
    return { total, concluded, progress, homologacao, waiting };
  }, [demandas]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Welcome Hero Banner */}
      <div className="bg-radial from-neutral-900/40 via-neutral-900/10 to-transparent border border-neutral-900 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase font-bold flex items-center gap-1.5">
            <Sparkles size={11} className="animate-spin" style={{ animationDuration: "10s" }} />
            Bem-vindo de volta, Colaborador
          </span>
          <h2 className="text-lg font-bold text-neutral-100 tracking-tight">
            Olá, {activeUser?.nome || "Representante"}!
          </h2>
          <p className="text-xs text-neutral-400">
            Você está operando seu workspace ERP Premium. Ajuste seus widgets no botão de layout para focar no que importa.
          </p>
        </div>

        {/* Action customization gear */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer z-10 shrink-0"
        >
          <Settings2 size={13} />
          Personalizar Painel
        </button>
      </div>

      {/* Slide overlay inside page for editing active widgets */}
      {showConfig && (
        <div className="bg-neutral-900/80 border border-indigo-500/15 p-5 rounded-3xl animate-scale-in space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={14} className="text-indigo-400 animate-spin" style={{ animationDuration: "6s" }} />
                Controle de Componentes Visuais (Home Widgets)
              </h3>
              <p className="text-[10px] text-neutral-400">Habilite ou suprima widgets na sua página inicial de acordo com seu foco do dia.</p>
            </div>
            
            <button
              onClick={() => setShowConfig(false)}
              className="p-1 hover:bg-neutral-850 rounded-lg text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allWidgets.map((wid) => {
              const isEnabled = visibleWidgets.includes(wid.id);
              return (
                <button
                  key={wid.id}
                  type="button"
                  onClick={() => handleToggleWidget(wid.id)}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                    isEnabled
                      ? "bg-indigo-950/20 border-indigo-500/25 text-indigo-200"
                      : "bg-neutral-950/40 border-neutral-850 hover:bg-neutral-950 text-neutral-400"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isEnabled ? (
                      <CheckSquare size={16} className="text-indigo-500" />
                    ) : (
                      <Square size={16} className="text-neutral-600" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold block flex items-center gap-1.5">
                      {wid.icon}
                      {wid.label}
                    </span>
                    <span className="text-[9.5px] leading-snug text-neutral-500 block truncate">{wid.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Widget layout loader */}
      {visibleWidgets.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900/20 border border-neutral-850 rounded-3xl">
          <Flame className="mx-auto text-neutral-600 mb-3" size={30} />
          <h4 className="text-sm font-semibold text-neutral-300">Nenhum Widget Habilitado</h4>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
            Clique no botão <strong>Personalizar Painel</strong> no cabeçalho acima para habilitar marcos de agenda ou prioridades.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Calendar Agenda Widget */}
          {visibleWidgets.includes("agenda") && (
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400 animate-pulse" />
                  Meus Próximos Eventos
                </span>
                <span className="text-[9px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">Próximos 15 dias</span>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {upcomingEvents.map((ev) => {
                  const evDate = new Date(ev.dataHora);
                  const isGroup = ev.tipo === "Grupo";
                  const groupObj = isGroup && ev.grupoId ? grupoEmails.find(g => g.id === ev.grupoId) : null;

                  return (
                    <div
                      key={ev.id}
                      className="p-3 bg-neutral-955 border border-neutral-850 hover:border-neutral-800 rounded-2xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-center shrink-0 w-11 ${
                          isGroup ? "bg-amber-950/20 text-amber-400" : "bg-indigo-950/20 text-indigo-400"
                        }`}>
                          <span className="block text-[8px] uppercase font-mono font-bold">
                            {evDate.toLocaleDateString("pt-BR", {month: "short"}).replace(".", "")}
                          </span>
                          <span className="block text-xs font-bold font-mono">{evDate.getDate()}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-neutral-200 block truncate max-w-[190px]">{ev.titulo}</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[9px] text-neutral-500 font-mono inline-flex items-center gap-1">
                              <Clock size={9} /> {evDate.toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}
                            </span>
                            {groupObj && (
                              <span className="text-[9px] text-amber-400 bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10 font-mono scale-95 shrink-0">
                                {groupObj.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {upcomingEvents.length === 0 && (
                  <p className="py-12 text-center text-xs text-neutral-500 italic">Nenhum evento agendado para as próximas semanas.</p>
                )}
              </div>
            </div>
          )}

          {/* User Priorities Queue Widget */}
          {visibleWidgets.includes("prioridades") && (
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} className="text-amber-400 animate-pulse" />
                  Lista de Prioridades Ativas
                </span>
                <span className="text-[9px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">Urgente</span>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {userPriorityDemands.map((dm) => (
                  <div
                    key={dm.id}
                    className="p-3 bg-neutral-955 border border-neutral-850 hover:border-neutral-800 rounded-2xl flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-neutral-300 block truncate">{dm.titulo}</span>
                      <div className="flex items-center gap-2 mt-0.5 truncate">
                        <span className="text-[9px] font-mono bg-neutral-950 text-neutral-500 px-1 py-0.5 rounded border border-neutral-850">
                          {dm.numeroChamado}
                        </span>
                        <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded uppercase ${
                          dm.prioridade === "Critica"
                            ? "bg-rose-500/10 text-rose-400"
                            : dm.prioridade === "Alta"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {dm.prioridade}
                        </span>
                      </div>
                    </div>
                    
                    <span className="text-[9px] bg-indigo-950/20 text-indigo-400 font-mono font-bold px-1.5 py-0.5 border border-indigo-900/30 rounded inline-flex shrink-0 uppercase tracking-wide">
                      {dm.status}
                    </span>
                  </div>
                ))}

                {userPriorityDemands.length === 0 && (
                  <div className="py-12 text-center text-xs text-neutral-500 italic">
                    Não há demandas técnicas na sua lista de prioridades.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kanban Active Tasks Count Screen */}
          {visibleWidgets.includes("kanban") && (
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={14} className="text-sky-400" />
                  Minhas Tarefas do Kanban
                </span>
                <span className="text-[9px] font-mono text-neutral-500 bg-neutral-950 px-2.5 py-0.5 rounded border border-neutral-850 font-bold">
                  {activeKanbanTasks.length} ativas
                </span>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                {activeKanbanTasks.map((dm) => {
                  const hasCompany = dm.empresaId ? empresas.find(emp => emp.id === dm.empresaId) : null;
                  
                  return (
                    <div
                      key={dm.id}
                      className="p-3 bg-neutral-955 border border-neutral-850 hover:border-amber-500/10 rounded-2xl space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <span className="text-xs font-bold text-neutral-200 truncate">{dm.titulo}</span>
                        <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded shrink-0">
                          {dm.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[9.5px] font-mono text-neutral-550 border-r border-neutral-800 pr-2">
                          Num: {dm.numeroChamado}
                        </span>
                        {hasCompany && (
                          <span className="text-[9.5px] text-indigo-400 font-bold font-mono flex items-center gap-0.5">
                            <Building2 size={9} /> {hasCompany.razao_social.substring(0, 15)}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeKanbanTasks.length === 0 && (
                  <p className="py-12 text-center text-xs text-neutral-500 italic">Nenhuma tarefa em andamento no Kanban.</p>
                )}
              </div>
            </div>
          )}

          {/* Visual SVG charts dashboard report */}
          {visibleWidgets.includes("graficos") && (
            <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={14} className="text-emerald-400 animate-pulse" />
                  Divisão de Demandas e Métricas
                </span>
                <span className="text-[9px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850">Geral ERP</span>
              </div>

              {/* Chart Visual Layout representation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Homologação", val: chartMetrics.homologacao, color: "bg-blue-500", text: "text-blue-400" },
                  { label: "Em Progresso", val: chartMetrics.progress, color: "bg-indigo-505", text: "text-indigo-400" },
                  { label: "Concluídas", val: chartMetrics.concluded, color: "bg-emerald-500", text: "text-emerald-450" },
                  { label: "Aguardando", val: chartMetrics.waiting, color: "bg-stone-500", text: "text-stone-400" }
                ].map((m, idx) => (
                  <div key={idx} className="bg-neutral-955 border border-neutral-850 p-3 rounded-2xl flex flex-col justify-between space-y-3.5 text-left">
                    <span className="text-[10px] font-bold text-neutral-400 block shrink-0">{m.label}</span>
                    <div>
                      <span className={`text-xl font-bold block ${m.text || "text-neutral-100"}`}>{m.val}</span>
                      <div className="w-full bg-neutral-900 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${m.color}`} 
                          style={{ width: `${chartMetrics.total > 0 ? (m.val / chartMetrics.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="bg-neutral-955 p-3 rounded-2xl border border-neutral-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total de Demandas Registradas:</span>
                  <span className="text-xs text-neutral-500 mt-0.5 block">Sincronizado em tempo real com o Firestore corporativo.</span>
                </div>
                <span className="text-lg font-bold font-mono text-neutral-200 bg-neutral-900 px-3 py-1 border border-neutral-800 rounded-xl">
                  {chartMetrics.total} CH
                </span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
