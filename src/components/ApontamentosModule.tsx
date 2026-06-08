/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { useDB } from "../dbState";
import { 
  Calendar as CalendarIcon, Clock, Filter, Plus, Trash2, Edit2, 
  Search, Zap, X, ChevronLeft, ChevronRight, Check, AlertCircle, 
  FileText, Users, Code, Box, TrendingUp, CheckSquare
} from "lucide-react";

interface ApontamentosModuleProps {
  mode: "pessoal" | "gerencial";
}

export const ApontamentosModule: React.FC<ApontamentosModuleProps> = ({ mode }) => {
  const { 
    pessoas, projetos, demandas, apontamentos, activeUser, 
    addApontamento, updateApontamento, deleteApontamento 
  } = useDB();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    return d;
  });

  // Calendar render helper calendar dates
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth()); // 0-indexed

  // Filter states for Gerencial
  const [filterType, setFilterType] = useState<string>("");
  const [filterPessoaId, setFilterPessoaId] = useState<string>("");
  const [managerCustomDate, setManagerCustomDate] = useState<string>("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formPessoaId, setFormPessoaId] = useState<string>("");
  const [formProjetoId, setFormProjetoId] = useState<string>("");
  const [formType, setFormType] = useState<string>("");
  const [formDemandaId, setFormDemandaId] = useState<string>("");
  const [formDemandaSearch, setFormDemandaSearch] = useState<string>("");
  const [formAtividade, setFormAtividade] = useState<string>("");
  const [formHoras, setFormHoras] = useState<number>(1);
  const [formDate, setFormDate] = useState<string>("");

  // Helper lists
  const mesesAbreviados = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const diasDaSemanaSiglas = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const atividadesDefault = ["Desenvolvimento", "Reunião Especializada", "Análise de Negócios", "Design / UI", "Suporte & SLAs", "QA / Testes", "Gestão de Projeto"];

  // Cache pre-population trigger on modal open
  useEffect(() => {
    if (showModal && !editingId) {
      const cachedProj = localStorage.getItem("pointing_last_project") || "";
      const cachedType = localStorage.getItem("pointing_last_tipo_demanda") || "";
      
      if (cachedProj && projetos.some(p => p.id === cachedProj)) {
        setFormProjetoId(cachedProj);
      } else if (projetos.length > 0) {
        setFormProjetoId(projetos[0].id);
      }

      if (cachedType) {
        setFormType(cachedType);
      } else {
        setFormType("");
      }

      setFormDemandaId("");
      setFormDemandaSearch("");
      setFormAtividade(atividadesDefault[0]);
      setFormHoras(2);
      
      // Formatting selected date for the input
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      setFormDate(`${year}-${month}-${day}`);
      
      setFormPessoaId(mode === "pessoal" ? (activeUser?.id || "") : (activeUser?.id || ""));
    }
  }, [showModal, editingId, status]);

  // Format Helper
  const getFormattedDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = getFormattedDateString(selectedDate);

  // Active GMZ Users (Professionals)
  const gmzPessoas = pessoas.filter(p => p.tipo === "GMZ");

  // Project select activities list helper
  const selectedProjectObj = projetos.find(p => p.id === formProjetoId);
  const currentProjectActivities = selectedProjectObj?.atividades && selectedProjectObj.atividades.length > 0
    ? selectedProjectObj.atividades
    : atividadesDefault;

  useEffect(() => {
    if (formProjetoId && !editingId) {
      if (!currentProjectActivities.includes(formAtividade)) {
        setFormAtividade(currentProjectActivities[0]);
      }
    }
  }, [formProjetoId]);

  // Filter demands by chosen project and type
  const filteredDemandsForForm = demandas.filter(d => {
    const matchesProj = d.idProjeto === formProjetoId;
    const matchesType = formType ? (d.tipo === formType || d.tipoCustomId === formType) : true;
    
    // Add real-time smart search check
    const searchLower = formDemandaSearch.toLowerCase().trim();
    const matchesSearch = searchLower 
      ? (d.titulo || "").toLowerCase().includes(searchLower) || 
        (d.numeroChamado || "").toLowerCase().includes(searchLower) || 
        (d.tipo || "").toLowerCase().includes(searchLower)
      : true;

    return matchesProj && matchesType && matchesSearch && !d.excluido;
  });

  // Extract all unique Demand Types
  const allDemandTypes = Array.from(new Set(demandas.map(d => d.tipo).filter(Boolean)));
  if (!allDemandTypes.includes("BUG")) allDemandTypes.push("BUG");
  if (!allDemandTypes.includes("Change")) allDemandTypes.push("Change");
  if (!allDemandTypes.includes("Melhoria")) allDemandTypes.push("Melhoria");

  // Total Hours pointed in active month
  const getMonthHoursStats = () => {
    const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-31`;
    return apontamentos.filter(ap => {
      const apDate = ap.createdAt.slice(0, 10);
      const isMyPerson = mode === "pessoal" ? ap.idPessoa === activeUser?.id : true;
      return isMyPerson && apDate >= startStr && apDate <= endStr;
    }).reduce((acc, curr) => acc + (curr.horas || 0), 0);
  };

  // Calendar Calculations
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [];

  // Previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarCells.push(d);
  }

  // Get total hours pointed on a specific day of active month-year
  const getDayTotalHours = (day: number) => {
    const targetStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return apontamentos.filter(ap => {
      const isMyPerson = mode === "pessoal" ? ap.idPessoa === activeUser?.id : true;
      return ap.createdAt.startsWith(targetStr) && isMyPerson;
    }).reduce((acc, curr) => acc + (curr.horas || 0), 0);
  };

  // Personal: Filter Points made on chosen selectedDate
  const personalAppointmentsToday = apontamentos.filter(ap => {
    const apDate = ap.createdAt.slice(0, 10);
    return apDate === selectedDateStr && ap.idPessoa === activeUser?.id;
  });

  // Gerencial: Filter Points with active filters
  const managerFilteredDateStr = managerCustomDate || selectedDateStr;
  const managerAppointmentsFiltered = apontamentos.filter(ap => {
    const apDate = ap.createdAt.slice(0, 10);
    const dateMatch = apDate === managerFilteredDateStr;
    const personMatch = filterPessoaId ? ap.idPessoa === filterPessoaId : true;
    
    // Type match (needs checking associated Demanda's type)
    let typeMatch = true;
    if (filterType) {
      const dem = demandas.find(d => d.id === ap.idDemanda);
      typeMatch = dem ? (dem.tipo === filterType || dem.tipoCustomId === filterType) : false;
    }
    
    return dateMatch && personMatch && typeMatch;
  });

  // Calculate sum based on gerencial filters
  const filteredManagerHoursSum = managerAppointmentsFiltered.reduce((acc, curr) => acc + (curr.horas || 0), 0);

  // Core Actions
  const handleAddOrEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjetoId) {
      alert("Por favor, selecione um projeto.");
      return;
    }
    if (!formDemandaId) {
      alert("Por favor, selecione uma tarefa.");
      return;
    }
    if (formHoras <= 0) {
      alert("Por favor, informe horas válidas.");
      return;
    }

    const selectedPerson = pessoas.find(p => p.id === formPessoaId) || activeUser;
    if (!selectedPerson) return;

    // Cache project & type for smart pre-selection next time
    localStorage.setItem("pointing_last_project", formProjetoId);
    localStorage.setItem("pointing_last_tipo_demanda", formType);

    // Save date of action
    const apDateWithHour = `${formDate}T12:00:00Z`;

    const payload = {
      idDemanda: formDemandaId,
      idPessoa: selectedPerson.id,
      nomePessoa: selectedPerson.nome,
      atividade: formAtividade,
      horas: Number(formHoras),
    };

    if (editingId) {
      await updateApontamento(editingId, {
        ...payload,
        createdAt: apDateWithHour
      });
    } else {
      await addApontamento({
        ...payload,
        createdAt: apDateWithHour
      });
    }

    // Refresh calendar state to match entry date if user pointed to a different month
    const createdDate = new Date(formDate);
    setSelectedDate(createdDate);
    setCurrentYear(createdDate.getFullYear());
    setCurrentMonth(createdDate.getMonth());

    setShowModal(false);
    setEditingId(null);
  };

  const startEdit = (ap: any) => {
    setEditingId(ap.id);
    setFormPessoaId(ap.idPessoa);
    
    // Find the corresponding demands details
    const dem = demandas.find(d => d.id === ap.idDemanda);
    if (dem) {
      setFormProjetoId(dem.idProjeto);
      setFormType(dem.tipo || "");
      setFormDemandaId(dem.id);
    } else {
      setFormProjetoId("");
      setFormType("");
      setFormDemandaId(ap.idDemanda);
    }

    setFormAtividade(ap.atividade);
    setFormHoras(ap.horas);
    setFormDate(ap.createdAt.slice(0, 10));
    setShowModal(true);
  };

  const getDemandaLabel = (id: string) => {
    const dem = demandas.find(d => d.id === id);
    if (!dem) return "Tarefa Independente";
    return `${dem.numeroChamado || "TK-" + dem.id.slice(0, 4)}: ${dem.titulo}`;
  };

  const getProjetoLabel = (id: string) => {
    const proj = projetos.find(p => p.id === id);
    return proj ? proj.nome : "Controle Interno";
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans p-2 select-none" id="apontamentos-container">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/40 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-400 tracking-widest uppercase flex items-center gap-1">
            <Zap size={11} className="text-amber-500 fill-amber-500 animate-pulse" />
            {mode === "pessoal" ? "Minha Jornada - Trabalho" : "Área Gerencial - Painel Operacional"}
          </span>
          <h2 className="text-xl font-extrabold text-neutral-100 tracking-tight mt-1 flex items-center gap-2">
            <Clock size={20} className="text-indigo-400" />
            {mode === "pessoal" ? "Apontamentos de Horas" : "Apontamentos Gerencial de Squads"}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            {mode === "pessoal" 
              ? "Registre suas horas de trabalho diárias vinculadas a projetos ativos e chamados de forma prática e com auto-completar dinâmico."
              : "Visão consolidada corporativa com monitoramento diário, calendário gerencial integrado e ferramentas de auditoria manual."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer self-start md:self-auto"
        >
          <Plus size={15} />
          {mode === "pessoal" ? "Lançar Horas" : "Lançar para Colaborador"}
        </button>
      </div>

      {/* METRICS & CONSOLIDATION PANEL BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI: HOURS OF SELECTION */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider font-mono">
              Total do Dia Selecionado ({selectedDate.toLocaleDateString("pt-BR")})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-neutral-100">
                {mode === "pessoal" 
                  ? personalAppointmentsToday.reduce((acc, curr) => acc + (curr.horas || 0), 0)
                  : filteredManagerHoursSum}h
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Apontado</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Clock size={18} />
          </div>
        </div>

        {/* KPI: MONTHLY STATS */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider font-mono">
              Volume no Mês ({mesesAbreviados[currentMonth]} / {currentYear})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-neutral-100">{getMonthHoursStats()}h</span>
              <span className="text-[10px] text-emerald-400 font-mono">Registradas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* KPI: STATUS INFO */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider font-mono">
              Alvo Diário Comercial
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-neutral-100">8.0h</span>
              <span className="text-[10px] text-neutral-500">Padrão GMZ</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500">
            <Zap size={18} />
          </div>
        </div>

      </div>

      {/* CORE WORKSPACE: CALENDAR + LIST PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* INTERACTIVE CALENDAR CONTAINER */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 lg:col-span-5 h-fit shadow-xs">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between mb-4 border-b border-neutral-850 pb-3">
            <div className="flex flex-col">
              <span className="text-xs text-indigo-400 font-mono font-bold uppercase tracking-wider">Visualizar Escala</span>
              <span className="text-sm font-extrabold text-neutral-100">
                {mesesAbreviados[currentMonth]} de {currentYear}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 text-neutral-400 hover:text-neutral-200 rounded-lg transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 text-neutral-400 hover:text-neutral-200 rounded-lg transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Calendar Weekday titles */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {diasDaSemanaSiglas.map(sig => (
              <span key={sig} className="text-[10px] uppercase tracking-wider text-neutral-550 font-bold font-mono py-1">
                {sig}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5" id="fila-prioridades-view">
            {calendarCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="aspect-square opacity-0 pointer-events-none"></div>;
              }

              const hasHours = getDayTotalHours(dayNum);
              
              // Date matching
              const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isSelected = selectedDate.getDate() === dayNum && 
                                 selectedDate.getMonth() === currentMonth && 
                                 selectedDate.getFullYear() === currentYear;
              
              const isToday = new Date().getDate() === dayNum && 
                              new Date().getMonth() === currentMonth && 
                              new Date().getFullYear() === currentYear;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => {
                    const nextDate = new Date(currentYear, currentMonth, dayNum);
                    setSelectedDate(nextDate);
                    // Also clear manager input so they align
                    setManagerCustomDate("");
                  }}
                  className={`relative aspect-square rounded-xl border flex flex-col justify-between p-1.5 transition-all outline-none text-left cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-600/10"
                      : isToday
                      ? "bg-neutral-850 border-neutral-700 text-neutral-200"
                      : "bg-neutral-950/40 border-neutral-850/50 hover:border-neutral-800 text-neutral-405 hover:text-neutral-200"
                  }`}
                >
                  <span className="text-[10px] font-bold">{dayNum}</span>
                  
                  {/* Pointing hours feedback indicator */}
                  {hasHours > 0 && (
                    <div className={`text-[8.5px] font-black font-mono self-end px-1.5 py-0.5 rounded-md ${
                      isSelected 
                        ? "bg-indigo-500 text-white" 
                        : hasHours >= 8 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                        : "bg-neutral-800 text-indigo-400"
                    }`}>
                      {hasHours}h
                    </div>
                  )}
                  
                  {hasHours === 0 && isToday && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 self-end mr-0.5 mb-0.5"></div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 bg-neutral-950/40 border border-neutral-850 p-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-[10px] text-neutral-500 leading-snug">
              Clique em qualquer dia para ver, acrescentar, editar ou auditar os lançamentos cadastrados. Dias com horas registradas exibem etiquetas específicas em destaque.
            </div>
          </div>
        </div>

        {/* LIST / MANAGER DATA GRID TABLE */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* PERSONAL ACTION/SUMMARY TITLE & VIEW */}
          {mode === "pessoal" && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-850 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono">
                    Meus Apontamentos ({selectedDate.toLocaleDateString("pt-BR")})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-500">
                  Total do dia: <strong>{personalAppointmentsToday.reduce((acc, curr) => acc + (curr.horas || 0), 0)} horas</strong>
                </span>
              </div>

              {personalAppointmentsToday.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-neutral-850 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-11 h-11 bg-neutral-950 rounded-full flex items-center justify-center border border-neutral-850 mb-3 text-neutral-500">
                    <Clock size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-350">Nenhum lançamento neste dia</h4>
                  <p className="text-[10.5px] text-neutral-510 mt-1.5 max-w-xs">
                    Você ainda não apontou horas para esta data. Clique no botão <strong className="text-indigo-400">Lançar Horas</strong> para registrar seu tempo!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-850/60">
                  {personalAppointmentsToday.map((ap) => (
                    <div key={ap.id} className="py-3.5 flex items-center justify-between gap-4 group">
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-neutral-200">
                            {getDemandaLabel(ap.idDemanda)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-neutral-500 font-mono">
                          <span className="text-neutral-400 font-semibold">{getProjetoLabel(demandas.find(d => d.id === ap.idDemanda)?.idProjeto || "")}</span>
                          <span>•</span>
                          <span className="bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-850">{ap.atividade}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-neutral-150 font-mono bg-neutral-950 border border-neutral-850/80 px-2.5 py-1 rounded-xl">
                          {ap.horas}h
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-90 lg:opacity-0 group-hover:opacity-100 transition duration-150">
                          <button
                            onClick={() => startEdit(ap)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-850 rounded-lg transition"
                            title="Editar Apontamento"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Deseja realmente remover este lançamento de horas?")) {
                                await deleteApontamento(ap.id);
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-850 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GERENCIAL EXPANDED DIALOG/GRID VIEW */}
          {mode === "gerencial" && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
              
              {/* FILTERS PANEL */}
              <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-850/80 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                  <span className="text-xs font-bold text-neutral-350 flex items-center gap-1.5">
                    <Filter size={12} className="text-indigo-400" />
                    Filtros de Auditoria Corporativa
                  </span>
                  <button
                    onClick={() => {
                      setFilterType("");
                      setFilterPessoaId("");
                      setManagerCustomDate("");
                    }}
                    className="text-[10px] text-neutral-500 hover:text-indigo-400 font-mono"
                  >
                    Resetar Filtros
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Select colaborador */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-neutral-500 uppercase font-mono">Profissional / Squad</label>
                    <select
                      value={filterPessoaId}
                      onChange={(e) => setFilterPessoaId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-2.5 py-1.5 text-[11px] text-neutral-200 outline-none cursor-pointer"
                    >
                      <option value="">Todos da Base (GMZ)</option>
                      {gmzPessoas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select demand type */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-neutral-500 uppercase font-mono">Tipo de Demanda</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-2.5 py-1.5 text-[11px] text-neutral-200 outline-none cursor-pointer"
                    >
                      <option value="">Todos os Tipos</option>
                      {allDemandTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom overrides template date picker */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-neutral-500 uppercase font-mono">Data Alternativa</label>
                    <input
                      type="date"
                      value={managerCustomDate || selectedDateStr}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setManagerCustomDate(val);
                          // Sync selectedDate Calendar state to display month beautifully 
                          const d = new Date(val);
                          setSelectedDate(d);
                          setCurrentYear(d.getFullYear());
                          setCurrentMonth(d.getMonth());
                        }
                      }}
                      className="w-full bg-neutral-950 border border-neutral-850 rounded-xl px-2.5 py-1.5 text-[11px] text-neutral-200 outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* FILTERED SUMMARY LIST TABLE */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11.5px] font-bold text-neutral-100 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Users size={14} className="text-indigo-400" />
                  Apontamentos Detalhados ({managerFilteredDateStr})
                </span>
                <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 py-1 px-3 rounded-xl">
                  Filtrado: {filteredManagerHoursSum}h
                </span>
              </div>

              {managerAppointmentsFiltered.length === 0 ? (
                <div className="py-14 border-2 border-dashed border-neutral-850 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                  <div className="w-11 h-11 bg-neutral-950 rounded-full flex items-center justify-center border border-neutral-850 mb-3 text-neutral-500">
                    <Search size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-350">Nenhum apontamento localizado</h4>
                  <p className="text-[10.5px] text-neutral-510 mt-1 max-w-sm">
                    Não existem lançamentos corporativos para os filtros aplicados nesta data. Se desejar, crie um novo apontamento com o botão superior.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto scroller-none border border-neutral-850/80 rounded-xl">
                  <table className="w-full text-left whitespace-nowrap text-xs">
                    <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono text-[9px] border-b border-neutral-850">
                      <tr>
                        <th className="py-3 px-4">Recurso / Squad</th>
                        <th className="py-3 px-4">Projeto & Solicitação</th>
                        <th className="py-3 px-4">Atividade</th>
                        <th className="py-3 px-4 text-center">Horas</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850 bg-neutral-900/60">
                      {managerAppointmentsFiltered.map((ap) => {
                        const matchingDemandObj = demandas.find(d => d.id === ap.idDemanda);
                        return (
                          <tr key={ap.id} className="hover:bg-neutral-850/30 transition duration-150">
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-neutral-200">{ap.nomePessoa}</span>
                              <span className="text-[9.5px] text-neutral-500 font-mono block">ID: {ap.idPessoa.slice(0, 5)}</span>
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              <span className="font-semibold text-neutral-300 block truncate">{getDemandaLabel(ap.idDemanda)}</span>
                              <span className="text-[10px] text-indigo-400 font-mono">{getProjetoLabel(matchingDemandObj?.idProjeto || "")}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-850 text-neutral-400 font-medium whitespace-normal">
                                {ap.atividade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-black text-neutral-150 text-xs font-mono">{ap.horas}h</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEdit(ap)}
                                  className="p-1.5 text-neutral-400 hover:text-indigo-400 hover:bg-neutral-950 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Deseja realmente remover o apontamento de ${ap.nomePessoa}?`)) {
                                      await deleteApontamento(ap.id);
                                    }
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-950 rounded-lg transition"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* MODAL DIALOG COMPONENT: ADD / EDIT APPOINTMENT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-850 flex items-center justify-between bg-neutral-950/40">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                <h3 className="text-sm font-extrabold text-neutral-100 uppercase tracking-wide">
                  {editingId ? "Editar Apontamento" : "Novo Apontamento de Horas"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-xl hover:bg-neutral-805 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddOrEditSubmit} className="p-6 space-y-4">
              
              {/* Squad / Colaborador select for manager mode only */}
              {mode === "gerencial" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                    <Users size={12} className="text-indigo-400" />
                    Colaborador Beneficiado
                  </label>
                  <select
                    value={formPessoaId}
                    onChange={(e) => setFormPessoaId(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition"
                  >
                    <option value="">Selecione quem realizou o trabalho...</option>
                    {gmzPessoas.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* First Grid Row: Selected Project & Demand Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* PROJECT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                    <Box size={12} className="text-indigo-400" />
                    Projeto Vinculado
                  </label>
                  <select
                    value={formProjetoId}
                    onChange={(e) => {
                      setFormProjetoId(e.target.value);
                      setFormDemandaId(""); // reset demand when project defaults change
                    }}
                    required
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition"
                  >
                    <option value="">Selecione o Projeto...</option>
                    {projetos.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.nome}</option>
                    ))}
                  </select>
                </div>

                {/* DEMAND TYPE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                    <Code size={12} className="text-indigo-400" />
                    Tipo de Registro (Opcional)
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value);
                      setFormDemandaId("");
                    }}
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition"
                  >
                    <option value="">Todos os Tipos de Tarefas</option>
                    {allDemandTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* DEMAND SELECTION (INTELLIGENT COMPONENT WITH AUTOCOMPLETE / FILTER) */}
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                  <CheckSquare size={12} className="text-indigo-400" />
                  Tarefa / Demanda Específica
                </label>

                {/* Intelligent Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisa rápida de tarefas (digite ID, título, assunto...)"
                    value={formDemandaSearch}
                    onChange={(e) => setFormDemandaSearch(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <Search size={13} className="absolute left-3 top-2.5 text-neutral-500" />
                  {formDemandaSearch && (
                    <button
                      type="button"
                      onClick={() => setFormDemandaSearch("")}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-200 text-xs font-bold font-sans"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={formDemandaId}
                  onChange={(e) => setFormDemandaId(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition"
                >
                  <option value="">Selecione o Ticket correspondente...</option>
                  {filteredDemandsForForm.map(dem => (
                    <option key={dem.id} value={dem.id}>
                      {dem.numeroChamado || "TK-" + dem.id.slice(0, 4)} — {dem.titulo} ({dem.tipo})
                    </option>
                  ))}
                  {filteredDemandsForForm.length === 0 && formProjetoId && (
                    <option value="" disabled className="text-neutral-550 italic">
                      (Nenhuma tarefa localizada com os filtros correspondentes)
                    </option>
                  )}
                  {filteredDemandsForForm.length === 0 && !formProjetoId && (
                    <option value="" disabled className="text-neutral-550 italic">
                      (Aguardando seleção do Projeto...)
                    </option>
                  )}
                </select>
                
                {filteredDemandsForForm.length > 0 && (
                  <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                    <Check size={10} /> Localizamos {filteredDemandsForForm.length} tarefas compatíveis no escopo selecionado!
                  </span>
                )}
              </div>

              {/* WORKPLACE DETAILS: ACTIVITY & HOURS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* ACTIVITY TYPE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                    <FileText size={12} className="text-indigo-400" />
                    Atividade Desempenhada
                  </label>
                  <select
                    value={formAtividade}
                    onChange={(e) => setFormAtividade(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none cursor-pointer focus:border-indigo-500 transition"
                  >
                    {currentProjectActivities.map((act) => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>

                {/* COUNT HOURS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                    <Clock size={12} className="text-indigo-400" />
                    Quantidade de Horas (h)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={formHoras}
                    onChange={(e) => setFormHoras(Number(e.target.value))}
                    required
                    className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>

              </div>

              {/* DATE OF RECORDING */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-350 flex items-center gap-1">
                  <CalendarIcon size={12} className="text-indigo-400" />
                  Data do Trabalho Realizado
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-855 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* ACTIONS SUBMIT ROW */}
              <div className="pt-4 border-t border-neutral-850 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 bg-transparent border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {editingId ? "Salvar Alterações" : "Efetivar Lançamento"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
