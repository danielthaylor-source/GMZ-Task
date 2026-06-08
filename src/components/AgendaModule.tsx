/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useDB } from "../dbState";
import { EventoAgenda } from "../types";
import { 
  Plus, Calendar, ChevronLeft, ChevronRight, Info, Clock, RefreshCw, X, ShieldAlert, Users, Building, AlertCircle
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

interface AgendaModuleProps {
  mode: "pessoal" | "empresarial";
}

export const AgendaModule: React.FC<AgendaModuleProps> = ({ mode }) => {
  const { 
    eventos, 
    addEvento, 
    updateEvento, 
    deleteEvento, 
    grupoEmails, 
    empresas, 
    activeUser, 
    pessoas,
    addToast 
  } = useDB();
  
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // May (0-indexed 4)
  const [viewFilter, setViewFilter] = useState<"hoje" | "semana" | "mes" | "ano" | "personalizado">("mes");
  
  // Custom filter dates state
  const [customStart, setCustomStart] = useState("2026-05-01");
  const [customEnd, setCustomEnd] = useState("2026-05-31");

  // Create / Edit modal state
  const [showModal, setShowModal] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formDateStr, setFormDateStr] = useState("2026-05-28");
  const [formTimeStr, setFormTimeStr] = useState("10:00");
  const [formRecorrencia, setFormRecorrencia] = useState<"Nenhuma" | "Semanal" | "Quinzenal" | "Mensal" | "Anual">("Nenhuma");
  const [formTipo, setFormTipo] = useState<"Pessoal" | "Grupo">(mode === "empresarial" ? "Grupo" : "Pessoal");
  const [formGrupoId, setFormGrupoId] = useState("");
  const [formEmpresaId, setFormEmpresaId] = useState("");

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const isAdmin = activeUser ? (
    activeUser.perfil?.includes("Administrador") || 
    activeUser.perfil?.includes("Gerencial") || 
    activeUser.tipo === "GMZ"
  ) : false;

  const isColaborador = activeUser ? activeUser.tipo !== "Cliente" : false;

  // Filter actual raw events based on view mode (Pessoal vs Empresarial)
  const filteredRawEvents = useMemo(() => {
    if (!activeUser) return [];

    return eventos.filter((ev) => {
      const parentTipo = ev.tipo || "Pessoal";

      if (mode === "pessoal") {
        // Pessoal Mode:
        // Shows user's personal events
        if (parentTipo === "Pessoal") {
          return ev.criadorId === activeUser.id || ev.participantesIds?.includes(activeUser.id);
        }
        // Shows group events if the user belongs to that email group or is in participantes list
        if (parentTipo === "Grupo") {
          if (ev.participantesIds?.includes(activeUser.id)) return true;
          if (ev.grupoId) {
            const grp = grupoEmails.find(g => g.id === ev.grupoId);
            if (grp && grp.participantesIds?.includes(activeUser.id)) return true;
          }
          if (ev.criadorId === activeUser.id) return true;
        }
        return false;
      } else {
        // Empresarial / Corporativo Mode:
        // Admin or manager can view all. Shows group events
        return parentTipo === "Grupo";
      }
    });
  }, [eventos, activeUser, mode, grupoEmails]);

  // VIRTUAL EXPANSION OF CYCLIC RECURRING EVENTS
  const expandedEvents = useMemo(() => {
    let startDate = new Date(2026, 0, 1);
    let endDate = new Date(2026, 11, 31, 23, 59, 59);

    if (viewFilter === "hoje") {
      startDate = new Date(2026, 4, 28, 0, 0, 0); // Context date time: 2026-05-28
      endDate = new Date(2026, 4, 28, 23, 59, 59);
    } else if (viewFilter === "semana") {
      startDate = new Date(2026, 4, 24, 0, 0, 0);
      endDate = new Date(2026, 4, 31, 23, 59, 49);
    } else if (viewFilter === "mes") {
      startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    } else if (viewFilter === "ano") {
      startDate = new Date(currentYear, 0, 1, 0, 0, 0);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    } else if (viewFilter === "personalizado") {
      startDate = new Date(customStart + "T00:00:00");
      endDate = new Date(customEnd + "T23:59:59");
    }

    const list: EventoAgenda[] = [];

    filteredRawEvents.forEach((ev) => {
      const evDate = new Date(ev.dataHora);
      
      if (!ev.recorrencia || ev.recorrencia === "Nenhuma") {
        if (evDate >= startDate && evDate <= endDate) {
          list.push({ ...ev });
        }
        return;
      }

      // Project virtual children for periodic cycles
      let currentProj = new Date(evDate);
      let safeLimit = 0;

      while (currentProj <= endDate && safeLimit < 100) {
        safeLimit++;

        if (currentProj >= startDate && currentProj <= endDate) {
          list.push({
            ...ev,
            id: `${ev.id}_v_${currentProj.getTime()}`,
            dataHora: currentProj.toISOString().split(".")[0],
            parentId: ev.id
          });
        }

        if (ev.recorrencia === "Semanal") {
          currentProj.setDate(currentProj.getDate() + 7);
        } else if (ev.recorrencia === "Quinzenal") {
          currentProj.setDate(currentProj.getDate() + 14);
        } else if (ev.recorrencia === "Mensal") {
          currentProj.setMonth(currentProj.getMonth() + 1);
        } else if (ev.recorrencia === "Anual") {
          currentProj.setFullYear(currentProj.getFullYear() + 1);
        } else {
          break;
        }
      }
    });

    return list.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
  }, [filteredRawEvents, viewFilter, currentMonth, currentYear, customStart, customEnd]);

  // MONTHLY GRID CALCULATIONS
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentYear, currentMonth, d));
    }
    return days;
  }, [currentYear, currentMonth]);

  const getDayPins = (date: Date) => {
    return expandedEvents.filter((ev) => {
      const evD = new Date(ev.dataHora);
      return (
        evD.getDate() === date.getDate() &&
        evD.getMonth() === date.getMonth() &&
        evD.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleEditClick = (ev: EventoAgenda) => {
    const parentId = ev.parentId || ev.id;
    const parent = eventos.find((item) => item.id === parentId);
    
    if (!parent) return;

    // Check permissions
    const parentTipo = parent.tipo || "Pessoal";
    if (parentTipo === "Grupo" && !isAdmin) {
      addToast("Apenas administradores podem atualizar ou excluir agendamentos corporativos de grupo.", "error");
      return;
    }

    setEditId(parent.id);
    setFormTitulo(parent.titulo);
    setFormDescricao(parent.descricao);
    setFormRecorrencia(parent.recorrencia as any || "Nenhuma");
    setFormTipo(parentTipo as any);
    setFormGrupoId(parent.grupoId || "");
    setFormEmpresaId(parent.empresaId || "");
    
    const parts = parent.dataHora.split("T");
    setFormDateStr(parts[0]);
    setFormTimeStr(parts[1]?.substring(0, 5) || "10:00");
    setShowModal(true);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setFormTitulo("");
    setFormDescricao("");
    setFormDateStr("2026-05-28");
    setFormTimeStr("10:00");
    setFormRecorrencia("Nenhuma");
    setFormTipo(mode === "empresarial" ? "Grupo" : "Pessoal");
    setFormGrupoId("");
    setFormEmpresaId("");
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !activeUser) return;

    const isoString = `${formDateStr}T${formTimeStr}:00`;
    
    // Auto populate participantes based on email group selected
    let targetParticipants: string[] = [activeUser.id];
    if (formTipo === "Grupo" && formGrupoId) {
      const selectedGrp = grupoEmails.find(g => g.id === formGrupoId);
      if (selectedGrp && selectedGrp.participantesIds) {
        targetParticipants = Array.from(new Set([...selectedGrp.participantesIds, activeUser.id]));
      }
    }

    const payload: Omit<EventoAgenda, "id"> = {
      titulo: formTitulo,
      descricao: formDescricao,
      dataHora: isoString,
      recorrencia: formRecorrencia,
      tipo: formTipo,
      criadorId: activeUser.id,
      grupoId: formTipo === "Grupo" ? formGrupoId : undefined,
      empresaId: formTipo === "Grupo" ? formEmpresaId : undefined,
      participantesIds: targetParticipants
    };

    if (editId) {
      updateEvento(editId, payload);
      if (formTipo === "Grupo" && formGrupoId) {
        const selectedGrp = grupoEmails.find(g => g.id === formGrupoId);
        addToast(`Notificação SMTP enviada para as caixas postais do grupo "${selectedGrp?.nome || "colaboradores"}" sobre a alteração deste evento.`, "success");
      }
    } else {
      addEvento(payload);
      if (formTipo === "Grupo" && formGrupoId) {
        const selectedGrp = grupoEmails.find(g => g.id === formGrupoId);
        addToast(`Notificação SMTP disparada com sucesso! Alerta de evento corporativo enviado aos membros do grupo "${selectedGrp?.nome || "colaboradores"}".`, "success");
      }
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-400" size={22} />
            {mode === "pessoal" ? "Minha Agenda Pessoal" : "Agenda Gerencial & Empresarial"}
          </h2>
          <p className="text-sm text-neutral-400">
            {mode === "pessoal" 
              ? "Visualize seus compromissos individuais e corporativos vinculados ao seu e-mail."
              : "Defina marcos corporativos, atribua-os a empresas e designe alertas aos times por grupo."}
          </p>
        </div>
        
        {/* Render create triggers */}
        {(mode === "pessoal" || isColaborador) && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 cursor-pointer ml-auto shrink-0"
          >
            <Plus size={16} />
            {mode === "pessoal" ? "Novo Evento Pessoal" : "Criar Evento Corporativo"}
          </button>
        )}
      </div>

      {/* View Filter Area */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col xl:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-850 w-full xl:w-auto">
          {[
            { id: "hoje", label: "Hoje (28/Mai)" },
            { id: "semana", label: "Esta Semana" },
            { id: "mes", label: "Visão Geral Mês" },
            { id: "ano", label: "Anual Extensivo" },
            { id: "personalizado", label: "Personalizado" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setViewFilter(item.id as any)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewFilter === item.id 
                  ? "bg-indigo-600 text-neutral-100 font-sans shadow-md" 
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {viewFilter === "personalizado" && (
          <div className="flex items-center gap-2 text-xs w-full xl:w-auto p-2 bg-neutral-950/40 rounded-xl border border-neutral-850">
            <span className="text-neutral-500 font-bold uppercase text-[10px]">Período:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 py-1 px-2 text-neutral-300 rounded font-mono"
            />
            <span className="text-neutral-500">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 py-1 px-2 text-neutral-300 rounded font-mono"
            />
          </div>
        )}

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-neutral-400">
          <Info size={14} className="text-indigo-400" />
          <span>Agenda com suporte a repetições virtuais automáticas no banco Cloud.</span>
        </div>
      </div>

      {/* Main Grid display content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar visual */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-indigo-400" />
              Pins Mensais ({monthNames[currentMonth]} {currentYear})
            </h3>

            <div className="flex items-center gap-1 bg-neutral-950/60 p-1 border border-neutral-850 rounded-lg">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-neutral-300 font-mono px-2">
                {monthNames[currentMonth].substring(0, 3)}/{currentYear}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500 py-1 border-b border-neutral-850/50">
            {daysOfWeek.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="aspect-square bg-transparent rounded-lg"></div>;
              }

              const pins = getDayPins(date);
              const hasPins = pins.length > 0;
              const isToday = date.getDate() === 28 && date.getMonth() === 4 && date.getFullYear() === 2026;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (pins.length > 0) {
                      addToast(`Visualizando ${pins.length} evento(s) na listagem lateral para o dia ${date.getDate()}.`, "info");
                    }
                  }}
                  className={`aspect-square p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all relative cursor-pointer ${
                    isToday
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                      : "bg-neutral-950/40 border-neutral-850 hover:border-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <span className={`text-[11px] font-bold font-mono ${isToday ? "text-indigo-400" : ""}`}>{date.getDate()}</span>
                  
                  {hasPins && (
                    <div className="flex gap-1 flex-wrap w-full mt-auto">
                      {pins.slice(0, 3).map((pin, pidx) => (
                        <span 
                          key={pidx} 
                          className={`w-1.5 h-1.5 rounded-full shadow-sm animate-pulse ${
                            pin.tipo === "Grupo" ? "bg-amber-400" : "bg-indigo-500"
                          }`} 
                          title={`${pin.tipo === "Grupo" ? "🏢 Corporativo: " : ""}${pin.titulo}`}
                        />
                      ))}
                      {pins.length > 3 && (
                        <span className="text-[7px] text-amber-400 font-mono font-bold leading-none">+{pins.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Expanded side-list display */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-4 h-[440px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-805">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
              Compromissos Agendados ({expandedEvents.length})
            </h3>
            {mode === "pessoal" && (
              <span className="text-[9px] font-mono text-indigo-400 font-bold px-1.5 py-0.5 bg-indigo-950/40 rounded border border-indigo-900/40">
                Inbox
              </span>
            )}
            {mode === "empresarial" && (
              <span className="text-[9px] font-mono text-amber-400 font-bold px-1.5 py-0.5 bg-amber-950/40 rounded border border-amber-900/40">
                Corporativo
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {expandedEvents.map((ev) => {
              const dateObj = new Date(ev.dataHora);
              const evTipo = ev.tipo || "Pessoal";
              const isGroup = evTipo === "Grupo";
              const associatedEmpresa = isGroup && ev.empresaId ? empresas.find(emp => emp.id === ev.empresaId) : null;
              const groupDetails = isGroup && ev.grupoId ? grupoEmails.find(g => g.id === ev.grupoId) : null;

              return (
                <div
                  key={ev.id}
                  onClick={() => handleEditClick(ev)}
                  className={`group p-4 bg-neutral-950 hover:bg-neutral-850 border rounded-2xl transition-all cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
                    isGroup ? "border-amber-500/10 hover:border-amber-500/25" : "border-neutral-850 hover:border-neutral-800"
                  }`}
                >
                  {/* Left Calendar icon info */}
                  <div className={`text-center rounded-xl p-2.5 shrink-0 w-12 flex flex-col justify-center items-center ${
                    isGroup ? "bg-amber-950/10 border border-amber-900/20" : "bg-neutral-900 border border-neutral-800"
                  }`}>
                    <span className="text-[9px] uppercase font-bold text-neutral-400">{monthNames[dateObj.getMonth()].substring(0, 3)}</span>
                    <span className="text-md font-bold font-mono text-neutral-100">{dateObj.getDate()}</span>
                  </div>

                  {/* Body text details */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors truncate max-w-[160px]">
                        {ev.titulo}
                      </span>
                      {isGroup ? (
                        <span className="text-[7.5px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 shrink-0">
                          <Building size={8} /> Corp
                        </span>
                      ) : (
                        <span className="text-[7.5px] font-mono font-bold uppercase bg-indigo-550/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1 shrink-0">
                          Pessoal
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-neutral-400 leading-relaxed truncate max-w-[210px]">
                      {ev.descricao || "Sem justificativa ou descrição comercial adicional."}
                    </p>
                    
                    {/* Render badge for group or connected company */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="text-[9px] text-neutral-500 font-mono flex items-center gap-1">
                        <Clock size={10} /> {dateObj.toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})} HORAS
                      </span>
                      
                      {groupDetails && (
                        <span className="text-[9px] text-amber-400/80 font-mono flex items-center gap-0.5">
                          • <Users size={9} /> {groupDetails.nome}
                        </span>
                      )}

                      {associatedEmpresa && (
                        <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-0.5">
                          • <Building size={9} /> {associatedEmpresa.razao_social}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Readonly Alert if click will trigger restricted alert */}
                  {isGroup && !isAdmin && (
                    <span className="absolute bottom-2 right-3 text-[8px] text-neutral-500 font-mono flex items-center gap-0.5">
                      <ShieldAlert size={8} /> Somente Leitura
                    </span>
                  )}
                  {ev.parentId && (isAdmin || !isGroup) && (
                    <span className="absolute bottom-2 right-3 text-[8px] text-neutral-500 font-mono flex items-center gap-0.5">
                      ✏️ Editar Principal
                    </span>
                  )}
                </div>
              );
            })}

            {expandedEvents.length === 0 && (
              <div className="py-12 text-center text-neutral-500 italic text-xs">
                Nenhum agendamento ativo nesta janela temporal.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DETAILED DIALOG COMPROMISSO EDIT & CREATE */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-neutral-800 bg-neutral-955 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {editId ? "Ajustar Compromisso" : "Agendar Novo Compromisso"}
                </h3>
                <p className="text-xs text-neutral-400">Insira as diretrizes de horário e notificações alertadas.</p>
              </div>
              
              {editId && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmState({
                      isOpen: true,
                      title: "Excluir Evento da Agenda",
                      description: "Excluir permanentemente este compromisso e todas as suas repetições futuras?",
                      onConfirm: () => {
                        deleteEvento(editId);
                        setShowModal(false);
                      }
                    });
                  }}
                  className="bg-rose-500/10 border border-rose-500/15 hover:bg-rose-600 text-rose-400 hover:text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer"
                >
                  Excluir Todo
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {isColaborador && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Tipo de Compromisso</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-neutral-250 outline-none transition"
                  >
                    <option value="Pessoal">Pessoal (Apenas na minha agenda individual)</option>
                    <option value="Grupo">Corporativo (Visível para o grupo de colaboradores e empresa)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Título do Compromisso</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento Geral de Engenharia"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Anotações / Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Reunião para alinhar metas, designados do email reportam os KPIs..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden resize-none"
                />
              </div>

              {/* Group selection if Corporate event (Grupo) is chosen */}
              {formTipo === "Grupo" && (
                <div className="grid grid-cols-2 gap-3 bg-amber-950/10 border border-amber-900/15 p-3 rounded-xl space-y-1.5">
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Configuração de Grupo de Alerta</span>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Grupo de E-mail</label>
                    <select
                      required
                      value={formGrupoId}
                      onChange={(e) => setFormGrupoId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 py-1.5 px-2.5 rounded text-xs outline-none"
                    >
                      <option value="">Selecione um Grupo...</option>
                      {grupoEmails.filter(g => g.status !== "Inativo").map(g => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Empresa de Contrato</label>
                    <select
                      value={formEmpresaId}
                      onChange={(e) => setFormEmpresaId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 py-1.5 px-2.5 rounded text-xs outline-none"
                    >
                      <option value="">Nenhuma Associada</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.razao_social}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Data Base</label>
                  <input
                    type="date"
                    required
                    value={formDateStr}
                    onChange={(e) => setFormDateStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Horário Base</label>
                  <input
                    type="time"
                    required
                    value={formTimeStr}
                    onChange={(e) => setFormTimeStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5 bg-neutral-950/40 p-4 border border-neutral-850 rounded-xl">
                <label className="text-xs font-bold text-neutral-200">Ciclo de Recorrência Virtual</label>
                <select
                  value={formRecorrencia}
                  onChange={(e) => setFormRecorrencia(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-305"
                >
                  <option value="Nenhuma">Ocorrer apenas uma vez (Sem Recorrência)</option>
                  <option value="Semanal">Semanal (Ocorre a cada 7 dias)</option>
                  <option value="Quinzenal">Quinzenal (Ocorre a cada 14 dias)</option>
                  <option value="Mensal">Mensal (Ocorre todo mês no mesmo dia)</option>
                  <option value="Anual">Anual (Ocorre uma vez por ano)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-neutral-100 font-medium text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                >
                  {editId ? "Salvar Alterações" : "Confirmar Agendamento"}
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
