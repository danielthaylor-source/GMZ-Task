/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Plus, Edit, Trash2, Users, Calendar, Clock, Sparkles, Check, X, CheckSquare, 
  Square, ShieldAlert, Award, AlertTriangle, AlertCircle, TrendingUp, TrendingDown,
  ChevronRight, ArrowRight, User, FolderClosed, FileText, Activity, Eye
} from "lucide-react";
import { FeriasColaborador, HoraExtra, CheckPointItem, ReuniaoCheckPoint } from "../types";

interface RecursosHumanosModuleProps {
  mode?: "admin" | "colaborador";
}

export const RecursosHumanosModule: React.FC<RecursosHumanosModuleProps> = ({ mode = "admin" }) => {
  const { 
    pessoas, projetos, demandas, eventos, ferias, horasExtras, checkpoints, reunioesCheckpoints,
    addFerias, updateFerias, deleteFerias,
    addHoraExtra, updateHoraExtra, deleteHoraExtra,
    addCheckPoint, updateCheckPoint, deleteCheckPoint,
    addReuniaoCheckPoint, updateReuniaoCheckPoint, deleteReuniaoCheckPoint,
    addEvento, activeUser, activeUserAcessos, addToast
  } = useDB();

  const [activeTab, setActiveTab] = useState<"ferias" | "he" | "checkpoints">("ferias");
  const [selectedDemandaToView, setSelectedDemandaToView] = useState<any | null>(null);
  const [smartFilter, setSmartFilter] = useState("");

  // Edit states
  const [editVacationId, setEditVacationId] = useState<string | null>(null);
  const [editHEId, setEditHEId] = useState<string | null>(null);
  const [editCheckpointId, setEditCheckpointId] = useState<string | null>(null);
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);

  // Se o usuário tiver permissão 'rh_comum' (ou NÃO tiver 'rh_admin'), ele é considerado colaborador comum, ou se o módulo for aberto no modo colaborador
  const isHRAdmin = mode === "admin" && (activeUser?.tipo === "GMZ" || (activeUserAcessos && activeUserAcessos.includes("rh_admin"))) && !(activeUserAcessos && activeUserAcessos.includes("rh_comum"));
  const isManager = isHRAdmin; // compatibility fallback

  // --- VACATION CONTROLS STATE ---
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vPessoaId, setVPessoaId] = useState("");
  const [vAcquInicio, setVAcquInicio] = useState("");
  const [vAcquFim, setVAcquFim] = useState("");
  const [vDataInicio, setVDataInicio] = useState("");
  const [vDataFim, setVDataFim] = useState("");
  const [vStatus, setVStatus] = useState<any>("Agendado");
  const [vObs, setVObs] = useState("");
  
  // Custom multi-period fields
  const [vDiasDisponiveis, setVDiasDisponiveis] = useState<number>(30);
  const [vPeriodosGozo, setVPeriodosGozo] = useState<Array<{ id: string; dataInicio: string; dataFim: string }>>([]);
  const [vVisivelColaborador, setVVisivelColaborador] = useState<boolean>(true);

  // --- OVERTIME CONTROLS STATE ---
  const [showHEModal, setShowHEModal] = useState(false);
  const [hePessoaId, setHePessoaId] = useState(activeUser?.id || "");
  const [heProjetoId, setHeProjetoId] = useState("");
  const [heDemandaId, setHeDemandaId] = useState("");
  const [heHoras, setHeHoras] = useState(2);
  const [heData, setHeData] = useState(new Date().toISOString().split("T")[0]);
  const [heDescricao, setHeDescricao] = useState("");
  const [heCompensacao, setHeCompensacao] = useState<any>("Folga");

  // Manager adjust state
  const [adjustHEId, setAdjustHEId] = useState<string | null>(null);
  const [adjustHoras, setAdjustHoras] = useState(0);
  const [adjustObs, setAdjustObs] = useState("");

  // --- CHECKPOINTS STATE ---
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [cpPessoaId, setCpPessoaId] = useState("");
  const [cpTipo, setCpTipo] = useState<"Positivo" | "Negativo">("Positivo");
  const [cpDescricao, setCpDescricao] = useState("");

  // Checkpoints Meetings
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [mTitulo, setMTitulo] = useState("");
  const [mDataReuniao, setMDataReuniao] = useState("");
  const [mParticipanteIds, setMParticipanteIds] = useState<string[]>([]);
  const [mCheckpointIds, setMCheckpointIds] = useState<string[]>([]);
  const [mAcoes, setMAcoes] = useState("");
  const [mPrazo, setMPrazo] = useState("");
  const [mComments, setMComments] = useState("");
  const [mVisivelColaborador, setMVisivelColaborador] = useState<boolean>(true);

  // Find all internal people (not clients)
  const gmzPessoas = pessoas.filter(p => p.tipo !== "Cliente");
  const gmzPessoasIds = new Set(gmzPessoas.map(p => p.id));

  // Feed list values based on RBAC (Admin/Auditor vs Common Employee)
  let visibleFerias = ferias.filter((f) => {
    if (isHRAdmin) return true;
    return f.idPessoa === activeUser?.id;
  });

  let visibleHorasExtras = horasExtras.filter((he) => {
    if (isHRAdmin) return true;
    return he.idPessoa === activeUser?.id;
  });

  let visibleCheckpoints = checkpoints.filter((cp) => {
    if (isHRAdmin) return true;
    return cp.idPessoa === activeUser?.id; // Allow collaborator to see their own checkpoints
  });

  let visibleReunioesCheckpoints = reunioesCheckpoints.filter((rc) => {
    if (isHRAdmin) return true;
    return rc.participantesIds.includes(activeUser?.id || "");
  });

  // Apply Smart Filter if exists
  const filterNormalized = smartFilter.trim().toLowerCase();
  if (filterNormalized) {
    visibleFerias = visibleFerias.filter((f) => {
      const p = pessoas.find((item) => item.id === f.idPessoa);
      const nameMatch = p ? p.nome.toLowerCase().includes(filterNormalized) : false;
      const statusMatch = f.status.toLowerCase().includes(filterNormalized);
      const obsMatch = f.observacao?.toLowerCase().includes(filterNormalized);
      return nameMatch || statusMatch || obsMatch;
    });

    visibleHorasExtras = visibleHorasExtras.filter((he) => {
      const p = pessoas.find((item) => item.id === he.idPessoa);
      const nameMatch = p ? p.nome.toLowerCase().includes(filterNormalized) : false;
      const descMatch = he.descricao.toLowerCase().includes(filterNormalized);
      const statusMatch = he.status.toLowerCase().includes(filterNormalized);
      const proj = projetos.find(item => item.id === he.idProjeto);
      const projMatch = proj ? proj.nome.toLowerCase().includes(filterNormalized) : false;
      const demand = demandas.find(item => item.id === he.idDemanda);
      const demMatch = demand ? (demand.titulo.toLowerCase().includes(filterNormalized) || String(demand.numeroChamado).toLowerCase().includes(filterNormalized)) : false;
      return nameMatch || descMatch || statusMatch || projMatch || demMatch;
    });

    visibleCheckpoints = visibleCheckpoints.filter((cp) => {
      const p = pessoas.find((item) => item.id === cp.idPessoa);
      const nameMatch = p ? p.nome.toLowerCase().includes(filterNormalized) : false;
      const descMatch = cp.descricao.toLowerCase().includes(filterNormalized);
      const tipoMatch = cp.tipo.toLowerCase().includes(filterNormalized);
      return nameMatch || descMatch || tipoMatch;
    });

    visibleReunioesCheckpoints = visibleReunioesCheckpoints.filter((rc) => {
      const titleMatch = rc.titulo.toLowerCase().includes(filterNormalized);
      const actionsMatch = rc.acoes.toLowerCase().includes(filterNormalized);
      const commentsMatch = rc.comentariosGerencia.toLowerCase().includes(filterNormalized);
      const participantsMatch = rc.participantesIds.some(id => {
        const p = pessoas.find(item => item.id === id);
        return p ? p.nome.toLowerCase().includes(filterNormalized) : false;
      });
      return titleMatch || actionsMatch || commentsMatch || participantsMatch;
    });
  }

  // Calculate days difference helper
  const calculateDaysDiff = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return isNaN(diffDays) ? 0 : diffDays;
  };

  // Quick Currency Formats
  const formatEmployeeName = (id: string) => {
    const p = pessoas.find((item) => item.id === id);
    return p ? p.nome : "Desconhecido";
  };

  const formatProjectName = (id: string) => {
    const p = projetos.find((item) => item.id === id);
    return p ? p.nome : "Desconhecido";
  };

  // Sync / Add Event to Calendar Helper
  const handleAddVacationToCalendar = (fv: FeriasColaborador) => {
    const employee = pessoas.find(p => p.id === fv.idPessoa);
    const employeeName = employee ? employee.nome : "Colaborador";
    
    // Use first period of gozo if exists, otherwise layout dates
    const finalStart = fv.periodosGozo && fv.periodosGozo.length > 0 ? fv.periodosGozo[0].dataInicio : fv.dataInicio;

    addEvento({
      titulo: `[FÉRIAS] Gozo de ${employeeName}`,
      descricao: `Período oficial de descansos programados. Aquisições: ${fv.periodoAquisitivoInicio} a ${fv.periodoAquisitivoFim}.\nObservações: ${fv.observacao || "Geral"}`,
      dataHora: `${finalStart || new Date().toISOString().split("T")[0]}T08:00:00`,
      recorrencia: "Nenhuma"
    });
    addToast("Período de gozo cadastrado na Agenda do Sistema!", "success");
  };

  // --- EDIT TRIGGER HELPERS ---
  const handleEditVacation = (f: FeriasColaborador) => {
    setEditVacationId(f.id);
    setVPessoaId(f.idPessoa);
    setVAcquInicio(f.periodoAquisitivoInicio);
    setVAcquFim(f.periodoAquisitivoFim);
    setVDataInicio(f.dataInicio || "");
    setVDataFim(f.dataFim || "");
    setVStatus(f.status);
    setVObs(f.observacao || "");
    setVDiasDisponiveis(f.diasDisponiveis || 30);
    setVPeriodosGozo(f.periodosGozo || []);
    setVVisivelColaborador(f.visivelColaborador !== false);
    setShowVacationModal(true);
  };

  const handleEditHE = (he: HoraExtra) => {
    setEditHEId(he.id);
    setHePessoaId(he.idPessoa);
    setHeProjetoId(he.idProjeto);
    setHeDemandaId(he.idDemanda);
    setHeHoras(he.horas);
    setHeData(he.data);
    setHeDescricao(he.descricao);
    setHeCompensacao(he.compensacao);
    setShowHEModal(true);
  };

  const handleEditCheckpoint = (cp: CheckPointItem) => {
    setEditCheckpointId(cp.id);
    setCpPessoaId(cp.idPessoa);
    setCpTipo(cp.tipo);
    setCpDescricao(cp.descricao);
    setShowCheckpointModal(true);
  };

  const handleEditMeeting = (re: ReuniaoCheckPoint) => {
    setEditMeetingId(re.id);
    setMTitulo(re.titulo);
    setMDataReuniao(re.dataReuniao);
    setMParticipanteIds(re.participantesIds);
    setMCheckpointIds(re.checkpointsIds || []);
    setMAcoes(re.acoes);
    setMPrazo(re.prazo);
    setMComments(re.comentariosGerencia || "");
    setMVisivelColaborador(re.visivelColaborador !== false);
    setShowMeetingModal(true);
  };

  // --- SUBMISSIONS HANDLES ---
  const handleSaveVacation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vPessoaId || !vAcquInicio || !vAcquFim) {
      addToast("Preencha o funcionário titular e o período de aquisição mandatório!", "error");
      return;
    }

    // Support legacy field with the first period's dates
    let mainStart = "";
    let mainEnd = "";
    if (vPeriodosGozo.length > 0) {
      mainStart = vPeriodosGozo[0].dataInicio;
      mainEnd = vPeriodosGozo[0].dataFim;
    }

    if (editVacationId) {
      updateFerias(editVacationId, {
        idPessoa: vPessoaId,
        periodoAquisitivoInicio: vAcquInicio,
        periodoAquisitivoFim: vAcquFim,
        dataInicio: mainStart,
        dataFim: mainEnd,
        status: vStatus,
        observacao: vObs,
        diasDisponiveis: Number(vDiasDisponiveis),
        periodosGozo: vPeriodosGozo,
        visivelColaborador: vVisivelColaborador
      });
      addToast("Período de férias atualizado com sucesso!", "success");
    } else {
      addFerias({
        idPessoa: vPessoaId,
        periodoAquisitivoInicio: vAcquInicio,
        periodoAquisitivoFim: vAcquFim,
        dataInicio: mainStart,
        dataFim: mainEnd,
        status: vStatus,
        observacao: vObs,
        diasDisponiveis: Number(vDiasDisponiveis),
        periodosGozo: vPeriodosGozo,
        visivelColaborador: vVisivelColaborador
      });
    }

    setShowVacationModal(false);
    // Reset states
    setEditVacationId(null);
    setVPessoaId("");
    setVObs("");
    setVPeriodosGozo([]);
    setVDiasDisponiveis(30);
    setVVisivelColaborador(true);
  };

  const handleSaveHE = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heProjetoId || !heDemandaId || heHoras <= 0 || !heDescricao) {
      addToast("Insira o projeto, chamado correspondente e as horas trabalhadas!", "error");
      return;
    }
    if (editHEId) {
      updateHoraExtra(editHEId, {
        idPessoa: isManager ? hePessoaId : (activeUser?.id || "p1"),
        idProjeto: heProjetoId,
        idDemanda: heDemandaId,
        horas: Number(heHoras),
        data: heData,
        descricao: heDescricao,
        compensacao: heCompensacao
      });
    } else {
      addHoraExtra({
        idPessoa: isManager ? hePessoaId : (activeUser?.id || "p1"),
        idProjeto: heProjetoId,
        idDemanda: heDemandaId,
        horas: Number(heHoras),
        data: heData,
        descricao: heDescricao,
        compensacao: heCompensacao
      });
    }
    setShowHEModal(false);
    setEditHEId(null);
    setHeDescricao("");
    setHeHoras(2);
  };

  const handleApproveHE = (id: string) => {
    updateHoraExtra(id, { status: "Aprovado", horasAjustadas: horasExtras.find(h => h.id === id)?.horas });
    addToast("Lançamento de horas extras homologado pelo gerente!", "success");
  };

  const handleOpenAdjustHE = (he: HoraExtra) => {
    setAdjustHEId(he.id);
    setAdjustHoras(he.horas);
    setAdjustObs(he.observacaoGerente || "");
  };

  const handleSaveAdjustHE = () => {
    if (!adjustHEId) return;
    updateHoraExtra(adjustHEId, {
      status: "Ajustado",
      horasAjustadas: Number(adjustHoras),
      observacaoGerente: adjustObs
    });
    addToast("Horas extras recalculadas e ajustadas!", "success");
    setAdjustHEId(null);
  };

  const handleRejectHE = (id: string, obs: string) => {
    updateHoraExtra(id, { status: "Rejeitado", observacaoGerente: obs || "Rejeitado na auditoria" });
  };

  const handleSaveCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpPessoaId || !cpDescricao) {
      addToast("Preencha o funcionário e os fatos observados!", "error");
      return;
    }
    if (editCheckpointId) {
      updateCheckPoint(editCheckpointId, {
        idPessoa: cpPessoaId,
        tipo: cpTipo,
        descricao: cpDescricao
      });
    } else {
      addCheckPoint({
        idPessoa: cpPessoaId,
        tipo: cpTipo,
        descricao: cpDescricao
      });
    }
    setShowCheckpointModal(false);
    setEditCheckpointId(null);
    setCpDescricao("");
    setCpPessoaId("");
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitulo || !mDataReuniao || mParticipanteIds.length === 0) {
      addToast("Escolha o título, data da reunião e ao menos um funcionário!", "error");
      return;
    }
    if (editMeetingId) {
      updateReuniaoCheckPoint(editMeetingId, {
        titulo: mTitulo,
        dataReuniao: mDataReuniao,
        participantesIds: mParticipanteIds,
        checkpointsIds: mCheckpointIds,
        acoes: mAcoes,
        prazo: mPrazo,
        comentariosGerencia: mComments,
        visivelColaborador: mVisivelColaborador
      });
    } else {
      addReuniaoCheckPoint({
        titulo: mTitulo,
        dataReuniao: mDataReuniao,
        participantesIds: mParticipanteIds,
        checkpointsIds: mCheckpointIds,
        acoes: mAcoes,
        prazo: mPrazo,
        comentariosGerencia: mComments,
        visivelColaborador: mVisivelColaborador
      });
    }
    setShowMeetingModal(false);
    setEditMeetingId(null);
    // Reset
    setMTitulo("");
    setMAcoes("");
    setMPrazo("");
    setMComments("");
    setMParticipanteIds([]);
    setMCheckpointIds([]);
  };

  const toggleParticipantInMeetingForm = (id: string) => {
    setMParticipanteIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCheckpointInMeetingForm = (id: string) => {
    setMCheckpointIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans p-2">
      
      {/* Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            {mode === "admin" ? "Recursos Humanos & Colaboração (Administração)" : "Horas Extras & Férias (Minha Jornada)"}
          </h2>
          <p className="text-sm text-neutral-400">
            {mode === "admin" 
              ? "Controles de aquisição de férias periódicas, banco de horas compensatórias e auditoria de check-points de colaboradores."
              : "Consulte seus períodos de férias agendados, lance ou acompanhe suas horas extras e plano de ação individual."}
          </p>
        </div>
        
        {/* Actions based on tab */}
        <div className="flex items-center gap-2">
          {activeTab === "ferias" && isManager && (
            <button
              onClick={() => {
                setVAcquInicio("2025-01-01");
                setVAcquFim("2025-12-31");
                setVDataInicio("2026-06-01");
                setVDataFim("2026-06-15");
                setShowVacationModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              <Plus size={14} /> Agendar Férias
            </button>
          )}

          {activeTab === "he" && (
            <button
              onClick={() => {
                setHeProjetoId(projetos.length > 0 ? projetos[0].id : "");
                setHeDemandaId("");
                setHePessoaId(activeUser?.id || "");
                setShowHEModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              <Plus size={14} /> Lançar Hora Extra
            </button>
          )}

          {activeTab === "checkpoints" && isManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCheckpointModal(true)}
                className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 px-3 py-2 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Plus size={14} /> Registrar Check-Point
              </button>
              <button
                onClick={() => {
                  setMDataReuniao(new Date().toISOString().split("T")[0]);
                  setShowMeetingModal(true);
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer"
              >
                <Plus size={14} /> Criar Plano & Reunião
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABS CONTROLLERS */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-0.5">
        {[
          { id: "ferias", label: "Férias & Período Aquisitivo", icon: <Calendar size={14} /> },
          { id: "he", label: "Horas Extras & Compensações", icon: <Clock size={14} /> },
          { id: "checkpoints", label: isHRAdmin ? "Check-Points & Plano de Ação" : "One-to-One", icon: <Users size={14} /> }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                active 
                  ? "border-indigo-500 text-indigo-400 bg-neutral-900/40 rounded-t-xl" 
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SMART FILTER INPUT */}
      <div id="smart-filter-root" className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-md">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-400" />
            Filtro Inteligente GMZ
          </label>
          <p className="text-[11px] text-neutral-500">
            Filtre por colaborador, projeto, chamado, status ou descrição da jornada.
          </p>
        </div>
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            id="smart-filter-input"
            value={smartFilter}
            onChange={(e) => setSmartFilter(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-505 transition-all"
          />
          <div className="absolute left-3 top-2.5 text-neutral-505">
            <Sparkles size={14} />
          </div>
          {smartFilter && (
            <button
              id="clear-smart-filter"
              onClick={() => setSmartFilter("")}
              className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-350 text-xs font-semibold"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: VACATIONS */}
      {activeTab === "ferias" && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 mb-4">
              Acompanhamento de Direitos e Gozos Ativos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleFerias.map((f) => {
                const hasGozoDetails = f.periodosGozo && f.periodosGozo.length > 0;
                
                // Calculate total gozo days claimed
                const totalGozoDays = f.periodosGozo?.reduce(
                  (acc, curr) => acc + calculateDaysDiff(curr.dataInicio, curr.dataFim), 0
                ) || 0;
                
                const maxDays = f.diasDisponiveis || 30;
                const exceeded = totalGozoDays > maxDays;
                
                // For legacy cards or if no multi-period is found but main dates are set
                const showLegacyDating = !hasGozoDetails && f.dataInicio && f.dataFim;
                const legacyDays = showLegacyDating ? calculateDaysDiff(f.dataInicio, f.dataFim) : 0;
                const finalTotalDays = hasGozoDetails ? totalGozoDays : legacyDays;
                
                // Check if currently under gozo
                const isUnderGozo = hasGozoDetails
                  ? f.periodosGozo!.some(p => new Date(p.dataInicio) <= new Date() && new Date(p.dataFim) >= new Date())
                  : (f.dataInicio && f.dataFim && new Date(f.dataInicio) <= new Date() && new Date(f.dataFim) >= new Date());

                return (
                  <div key={f.id} className="bg-neutral-950 border border-neutral-805 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-200">
                          <User size={13} className="text-indigo-400 shrink-0" />
                          <span className="truncate">{formatEmployeeName(f.idPessoa)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isHRAdmin && (
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                              f.visivelColaborador 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-neutral-800 border-neutral-700 text-neutral-400"
                            }`}>
                              {f.visivelColaborador ? "Público" : "Hospedado"}
                            </span>
                          )}
                          <span className={`text-[9px] uppercase font-bold py-0.5 px-2 rounded-full border ${
                            isUnderGozo 
                              ? "bg-amber-500/10 border-amber-550/20 text-amber-400 animate-pulse"
                              : f.status === "Agendado"
                              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}>
                            {isUnderGozo ? "Em Gozo Ativo" : f.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-900/60 p-3 rounded-xl text-[11px] space-y-2 text-neutral-400 border border-neutral-850">
                        <div>
                          <span className="text-[9px] uppercase font-mono tracking-wider text-indigo-400 block font-bold">1. Aquisição Obrigatória</span>
                          <p className="text-neutral-200 mt-0.5 font-semibold">
                            {f.periodoAquisitivoInicio.replace(/-/g, "/")} a {f.periodoAquisitivoFim.replace(/-/g, "/")}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-[9px] uppercase font-mono tracking-wider text-indigo-400 block font-bold">2. Períodos de Gozo (Opcional)</span>
                          {hasGozoDetails ? (
                            <div className="space-y-1.5 mt-1 max-h-24 overflow-y-auto pr-1">
                              {f.periodosGozo!.map((p, idx) => {
                                const pDays = calculateDaysDiff(p.dataInicio, p.dataFim);
                                return (
                                  <div key={p.id} className="bg-neutral-950 p-1.5 border border-neutral-850 rounded-lg flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-neutral-350">#{idx + 1}: {p.dataInicio.replace(/-/g, "/")} a {p.dataFim.replace(/-/g, "/")}</span>
                                    <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded font-bold font-mono">{pDays}d</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : showLegacyDating ? (
                            <div className="bg-neutral-955 p-1.5 border border-neutral-850 rounded-lg flex items-center justify-between text-[10px] mt-1">
                              <span className="font-mono text-neutral-350">{f.dataInicio.replace(/-/g, "/")} a {f.dataFim.replace(/-/g, "/")}</span>
                              <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded font-bold font-mono">{legacyDays}d</span>
                            </div>
                          ) : (
                            <p className="text-neutral-500 italic text-[10px] mt-1 pl-1">Nenhum período de gozo programado ainda.</p>
                          )}
                        </div>
                      </div>

                      {/* Display days calculation and checks */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                          <span>Dias gozados: <strong>{finalTotalDays}</strong></span>
                          <span>Disponíveis: <strong>{maxDays}</strong></span>
                        </div>
                        <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden border border-neutral-850">
                          <div 
                            className={`h-full transition-all rounded-full ${exceeded ? "bg-rose-500" : "bg-indigo-500"}`} 
                            style={{ width: `${Math.min(100, (finalTotalDays / maxDays) * 100)}%` }}
                          />
                        </div>
                        {exceeded && (
                          <p className="text-[9px] text-rose-400 font-mono mt-0.5">
                            ⚠️ Gozo ({finalTotalDays}d) excede limite ({maxDays}d)!
                          </p>
                        )}
                      </div>

                      {f.observacao && (
                        <p className="text-[11px] text-neutral-400 italic">"{f.observacao}"</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-900 pt-2 text-[10px]">
                      <span className="text-neutral-500">Ações regulamentares</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddVacationToCalendar(f)}
                          className="px-2.5 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:border-indigo-500/40 rounded font-medium transition-all cursor-pointer"
                          title="Sincronizar com Agenda Geral do ERP"
                        >
                          Agenda
                        </button>
                        {isHRAdmin && (
                          <>
                            <button
                              onClick={() => handleEditVacation(f)}
                              className="p-1 px-2.5 bg-neutral-900 border border-neutral-805 hover:bg-neutral-800 text-neutral-350 hover:text-neutral-100 rounded transition-all cursor-pointer font-bold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteFerias(f.id)}
                              className="p-1 px-1.5 bg-neutral-900 border border-neutral-805 hover:bg-rose-500/10 text-neutral-500 hover:text-rose-450 rounded transition-all cursor-pointer"
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleFerias.length === 0 && (
                <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-dashed border-neutral-850 rounded-2xl text-neutral-500">
                  <Calendar size={36} className="mx-auto text-neutral-600 mb-2" />
                  <p className="text-sm">Nenhum agendamento de férias ativo listado para você ou visível.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: OVERTIME */}
      {activeTab === "he" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left section: Hour logs list */}
            <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 mb-4">
                Histórico de Lançamento de Banco de Horas
              </h3>

              <div className="space-y-3">
                {visibleHorasExtras.map((he) => {
                  const associatedDemand = demandas.find(d => d.id === he.idDemanda);
                  const isPending = he.status === "Pendente";
                  return (
                    <div key={he.id} className="bg-neutral-950 border border-neutral-805 p-4.5 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-indigo-400" />
                          <span className="text-xs font-bold text-neutral-200">{formatEmployeeName(he.idPessoa)}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">({he.data})</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-bold py-0.5 px-2 rounded-full border ${
                            he.status === "Aprovado"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : he.status === "Ajustado"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : he.status === "Rejeitado"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-450"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}>
                            {he.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-neutral-400">
                        <div className="space-y-1">
                          <p><strong className="text-neutral-300">Horas Reivindicadas:</strong> <span className="font-mono text-xs font-bold text-neutral-200">{he.horas} horas</span></p>
                          {he.horasAjustadas !== undefined && (
                            <p><strong className="text-neutral-300">Horas Homologadas:</strong> <span className="font-mono text-xs font-bold text-indigo-400">{he.horasAjustadas} horas</span></p>
                          )}
                          <p><strong className="text-neutral-300">Compensação:</strong> <span className="text-neutral-205">{he.compensacao}</span></p>
                        </div>

                        <div className="space-y-1">
                          {associatedDemand && (
                            <p className="truncate flex items-center gap-1">
                              <strong className="text-neutral-300">Chamado Ass.:</strong>{" "}
                              <span className="font-mono text-[10px] bg-neutral-900 border border-neutral-850 px-1.5 py-0.5 rounded text-indigo-400 font-bold shrink-0">
                                CH-{associatedDemand.numeroChamado}
                              </span>{" "}
                              <span className="text-neutral-200 truncate" title={associatedDemand.titulo}>
                                {associatedDemand.titulo}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedDemandaToView(associatedDemand)}
                                className="text-indigo-400 hover:text-indigo-300 p-1 bg-neutral-900 border border-neutral-805 rounded-lg hover:shadow-md transition-all active:scale-95 shrink-0 select-none cursor-pointer flex items-center justify-center ml-1"
                                title="Visualizar Chamado"
                              >
                                <Eye size={12} />
                              </button>
                            </p>
                          )}
                          <p className="line-clamp-2"><strong className="text-neutral-300">Motivo:</strong> "{he.descricao}"</p>
                        </div>
                      </div>

                      {he.observacaoGerente && (
                        <div className="p-2 bg-neutral-900 border border-neutral-850 rounded-lg text-[10px] text-indigo-300 font-mono">
                          Comentário de Auditoria: "{he.observacaoGerente}"
                        </div>
                      )}

                      {/* MANAGER RESPONSE ACTIONS */}
                      {isPending && isManager && (
                        <div className="flex items-center justify-end gap-1.5 border-t border-neutral-900 pt-2 mt-2">
                          <button
                            onClick={() => handleApproveHE(he.id)}
                            className="bg-emerald-600/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-650/30 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Aprovar Direto
                          </button>
                          <button
                            onClick={() => handleOpenAdjustHE(he)}
                            className="bg-amber-600/15 border border-amber-500/35 text-amber-400 hover:bg-amber-650/30 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Ajustar Horas
                          </button>
                          <button
                            onClick={() => handleRejectHE(he.id, "Motivo insuficiente no chamado")}
                            className="bg-rose-600/15 border border-rose-505/35 text-rose-455 hover:bg-rose-650/30 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}

                      {/* MANAGER ADMINISTRATIVE CONTROLS: EDIT/DELETE */}
                      {isManager && (
                        <div className="flex items-center justify-end gap-1.5 border-t border-neutral-900 pt-2 mt-2">
                          <span className="text-[10px] text-neutral-500 mr-auto font-mono">Controle Gerencial:</span>
                          <button
                            type="button"
                            onClick={() => handleEditHE(he)}
                            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-805 hover:border-neutral-750 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHoraExtra(he.id)}
                            className="px-2.5 py-1 bg-neutral-900 border border-neutral-805 hover:bg-rose-500/10 text-neutral-500 hover:text-rose-455 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {visibleHorasExtras.length === 0 && (
                  <div className="py-12 text-center text-neutral-500 bg-neutral-950/40 border border-dashed border-neutral-850 rounded-2xl">
                    <Clock size={36} className="mx-auto text-neutral-600 mb-2" />
                    <p className="text-sm">Nenhum lançamento de hora extra cadastrado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right section: Manager quick adjust box if open */}
            <div className="lg:col-span-4">
              {adjustHEId ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-2">
                    Ajuste de Auditoria de Horas
                  </h4>

                  <div className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300 block">Horas Aprovadas Ajustadas</label>
                      <input
                        type="number"
                        value={adjustHoras}
                        onChange={(e) => setAdjustHoras(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2 text-sm text-indigo-400 font-mono font-bold"
                      />
                      <p className="text-[10px] text-neutral-500">Modifique a quantidade se necessário após conferir os apontamentos.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300 block">Observação / Justificativa</label>
                      <textarea
                        rows={2}
                        value={adjustObs}
                        onChange={(e) => setAdjustObs(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2 text-xs text-neutral-200 focus:outline-none"
                        placeholder="Insira detalhes sobre o ajuste..."
                      />
                    </div>

                    <div className="flex items-center gap-1.5 pt-2">
                      <button
                        onClick={handleSaveAdjustHE}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 py-2 rounded-xl text-xs font-semibold shadow"
                      >
                        Salvar Ajuste
                      </button>
                      <button
                        onClick={() => setAdjustHEId(null)}
                        className="px-3 py-2 bg-neutral-950 border border-neutral-805 text-neutral-400 rounded-xl text-xs font-semibold"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-850/50 text-xs text-neutral-500 h-full flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="font-bold text-neutral-300">Contratos & Auditoria de Atividades</h4>
                    <p>O regulamento determina que todas as solicitações vindas de colaboradores devem vincular-se a chamados de projetos válidos, garantindo o rastreamento financeiro preciso.</p>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-850 mt-4 text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-neutral-500 shrink-0" />
                    <span>Nível atual: {isManager ? "Auditor/Gerente GMZ" : "Visualização de Funcionário"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: CHECKPOINTS & ACTION PLAN MEETINGS */}
      {activeTab === "checkpoints" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left section: Checkpoints catalog list */}
            {isHRAdmin && (
              <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 mb-4 flex items-center justify-between">
                  <span>Feedbacks de Desempenho (Check-Points)</span>
                  {!isHRAdmin && <span className="text-[10px] text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded-full">Menu de Consulta</span>}
                </h3>

                <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {visibleCheckpoints.map((cp) => (
                    <div 
                      key={cp.id} 
                      className={`p-4 border rounded-2xl relative flex flex-col justify-between space-y-4 transition-all shadow-sm ${
                        cp.tipo === "Positivo"
                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-950/20 border-rose-500/20 text-rose-455"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1 text-neutral-200">
                            <User size={12} className="text-indigo-400" />
                            {formatEmployeeName(cp.idPessoa)}
                          </span>
                          
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-wide flex items-center gap-0.5 px-1.5 rounded ${
                            cp.tipo === "Positivo"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {cp.tipo === "Positivo" ? (
                              <TrendingUp size={10} className="text-emerald-400 shrink-0" />
                            ) : (
                              <TrendingDown size={10} className="text-rose-400 shrink-0" />
                            )}
                            {cp.tipo}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-300 leading-normal">"{cp.descricao}"</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-900/30 pt-2 text-[9px] text-neutral-500">
                        <span>Registrado em {cp.data}</span>
                        {isHRAdmin && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCheckpoint(cp)}
                              className="text-indigo-400 hover:text-indigo-300 transition-colors uppercase font-bold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteCheckPoint(cp.id)}
                              className="text-neutral-505 hover:text-rose-350 transition-colors uppercase font-bold"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {visibleCheckpoints.length === 0 && (
                    <div className="col-span-full py-12 text-center text-neutral-500 bg-neutral-950/20 border border-dashed border-neutral-850 rounded-2xl">
                      <Award size={36} className="mx-auto text-neutral-600 mb-2 animate-bounce" />
                      <p className="text-sm">Nenhum check-point de avaliação registrado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right section: Scheduled meetings & feedback action plans */}
            <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 ${isHRAdmin ?  "lg:col-span-6" : "lg:col-span-12"}`}>
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 mb-4">
                Atas de Alinhamento e Planos de Ação
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {visibleReunioesCheckpoints.map((re) => (
                  <div key={re.id} className="bg-neutral-950 border border-neutral-805 p-4.5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-100">{re.titulo}</h4>
                          {isHRAdmin && (
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                              re.visivelColaborador 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                : "bg-neutral-800 border-neutral-700 text-neutral-400"
                            }`}>
                              {re.visivelColaborador ? "Visível Colaborador" : "Privado Gestão"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-505 font-mono flex items-center gap-1.5 pt-0.5">
                          <Calendar size={11} /> Reunião: {re.dataMedicao || re.dataReuniao}
                        </span>
                      </div>
                      {isHRAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditMeeting(re)}
                            className="text-neutral-500 hover:text-indigo-400 p-1 rounded hover:bg-neutral-900 transition-all cursor-pointer"
                            title="Editar Reunião"
                          >
                            <Edit size={13} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => deleteReuniaoCheckPoint(re.id)}
                            className="text-neutral-505 hover:text-rose-455 p-1 rounded hover:bg-neutral-900 transition-all cursor-pointer"
                            title="Excluir Reunião"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-neutral-400 bg-neutral-900/40 p-3 rounded-xl border border-neutral-850/60">
                      <div>
                        <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-[9px] mb-1 font-mono">Funcionários Avaliados</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {re.participantesIds.map(pId => (
                            <span key={pId} className="bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-[10px] text-neutral-300">
                              {formatEmployeeName(pId)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold text-neutral-300 uppercase tracking-widest text-[9px] mb-1 font-mono">Pontos Observados</h5>
                        <span className="text-neutral-100 font-mono text-[10px] font-bold">
                          {isHRAdmin ? `${re.checkpointsIds?.length || 0} furos/avaliações` : "Indisponível para Colaboradores"}
                        </span>
                      </div>
                    </div>

                    {re.acoes && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">Metas e Plano de Ações (Detalhes Finais)</span>
                        <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-850 text-xs text-neutral-300 font-mono whitespace-pre-line leading-relaxed">
                          {re.acoes}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-[10px]">
                      <span className="text-neutral-500">Prazo das entregas: <strong className="text-indigo-400 font-mono">{re.prazo}</strong></span>
                      {isHRAdmin && re.comentariosGerencia && (
                        <span className="text-neutral-400 underline cursor-pointer hover:text-neutral-200 select-none font-medium" title={re.comentariosGerencia}>Ver observações do auditor</span>
                      )}
                    </div>
                  </div>
                ))}

                {visibleReunioesCheckpoints.length === 0 && (
                  <div className="py-12 text-center text-neutral-500 bg-neutral-950/20 border border-dashed border-neutral-850 rounded-2xl">
                    <Activity size={36} className="mx-auto text-neutral-600 mb-2 animate-pulse" />
                    <p className="text-sm">Nenhum plano de ação de metas cadastrado ou visível.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

       {showVacationModal && isHRAdmin && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {editVacationId ? "Editar Período de Férias" : "Agendar Período de Férias"}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">Duração customizável e controle de visibilidade pública.</p>
              </div>
              <button type="button" onClick={() => { setShowVacationModal(false); setEditVacationId(null); }} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVacation} className="p-6 space-y-4 max-h-[650px] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Funcionário Beneficiado</label>
                <select
                  required
                  value={vPessoaId}
                  onChange={(e) => setVPessoaId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-250 cursor-pointer"
                >
                  <option value="">Selecione o titular...</option>
                  {gmzPessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Aquisitivo Início <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    required
                    value={vAcquInicio}
                    onChange={(e) => setVAcquInicio(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Aquisitivo Fim <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    required
                    value={vAcquFim}
                    onChange={(e) => setVAcquFim(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Dias Disponíveis no Direito</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={vDiasDisponiveis}
                    onChange={(e) => setVDiasDisponiveis(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-200 font-mono font-bold text-indigo-400"
                  />
                </div>
                
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="visivel_colaborador"
                    checked={vVisivelColaborador}
                    onChange={(e) => setVVisivelColaborador(e.target.checked)}
                    className="w-4 h-4 bg-neutral-950 border-neutral-800 rounded accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="visivel_colaborador" className="text-xs font-semibold text-neutral-350 cursor-pointer select-none">
                    Visível para o colaborador
                  </label>
                </div>
              </div>

              {/* Multi-period "Gozos" Segment */}
              <div className="space-y-3.5 border-t border-neutral-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-200 uppercase tracking-widest font-mono text-[9px]">Períodos de Gozo programados</span>
                  <button
                    type="button"
                    onClick={() => setVPeriodosGozo([...vPeriodosGozo, { id: Math.random().toString(), dataInicio: "", dataFim: "" }])}
                    className="flex items-center gap-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-350 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Plus size={11} /> Adicionar Período
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {vPeriodosGozo.map((p, idx) => (
                    <div key={p.id} className="bg-neutral-950 p-3 rounded-2xl border border-neutral-805 space-y-2.5 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-neutral-400 font-mono">Gozo de Descanso #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setVPeriodosGozo(vPeriodosGozo.filter(item => item.id !== p.id))}
                          className="text-neutral-500 hover:text-rose-455 p-1 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-mono font-bold text-neutral-500">Início</span>
                          <input
                            type="date"
                            required
                            value={p.dataInicio}
                            onChange={(e) => {
                              setVPeriodosGozo(vPeriodosGozo.map(item => item.id === p.id ? { ...item, dataInicio: e.target.value } : item));
                            }}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-mono font-bold text-neutral-500">Término</span>
                          <input
                            type="date"
                            required
                            value={p.dataFim}
                            onChange={(e) => {
                              setVPeriodosGozo(vPeriodosGozo.map(item => item.id === p.id ? { ...item, dataFim: e.target.value } : item));
                            }}
                            className="w-full bg-neutral-900 border border-neutral-850 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {vPeriodosGozo.length === 0 && (
                    <p className="text-center text-[11px] text-neutral-500 italic py-4 bg-neutral-950/20 border border-neutral-855 rounded-xl">
                      Nenhum período de gozo programado (opcional).
                    </p>
                  )}
                </div>

                {/* Totals & warning on-the-fly */}
                {vPeriodosGozo.length > 0 && (() => {
                  const totalGozados = vPeriodosGozo.reduce((sum, p) => {
                    if (p.dataInicio && p.dataFim) {
                      return sum + calculateDaysDiff(p.dataInicio, p.dataFim);
                    }
                    return sum;
                  }, 0);
                  const isExceeded = totalGozados > vDiasDisponiveis;
                  return (
                    <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-805 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 font-medium">Dias Solicitados (Gozo):</span>
                        <span className={`font-bold font-mono ${isExceeded ? "text-rose-400" : "text-emerald-400"}`}>
                          {totalGozados} / {vDiasDisponiveis} dias
                        </span>
                      </div>
                      <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all rounded-full ${isExceeded ? "bg-rose-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(100, (totalGozados / vDiasDisponiveis) * 100)}%` }}
                        />
                      </div>
                      {isExceeded && (
                        <p className="text-[10px] text-rose-455 font-mono text-right animate-pulse">
                          ⚠️ Atenção: Gozos somados excedem limite disponível!
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Observações de Viagem / Comentário</label>
                <input
                  type="text"
                  placeholder="Ex: Viagem programada aos EUA, passagens compradas."
                  value={vObs}
                  onChange={(e) => setVObs(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2 text-xs text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowVacationModal(false); setEditVacationId(null); }}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-805 text-neutral-400 hover:text-neutral-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 rounded-xl text-xs font-semibold shadow"
                >
                  Salvar Período
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OVERTIME ENTRY FORM MODAL --- */}
      {showHEModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {editHEId ? "Editar Registro de Horas Extras" : "Lançamento de Registro de Horas Extras"}
                </h3>
                <p className="text-xs text-neutral-400">Declare furos de jornada associando-os com demandas válidas.</p>
              </div>
              <button onClick={() => { setShowHEModal(false); setEditHEId(null); }} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveHE} className="p-6 space-y-4">
              {isHRAdmin ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">Colaborador Titular</label>
                  <select
                    required
                    value={hePessoaId}
                    onChange={(e) => setHePessoaId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 cursor-pointer"
                  >
                    {gmzPessoas.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400 block">Colaborador Solicitante</label>
                  <div className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-300 font-bold select-none">
                    {activeUser?.nome || "Você mesmo"}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">Projeto Destino</label>
                  <select
                    required
                    value={heProjetoId}
                    onChange={(e) => setHeProjetoId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 cursor-pointer"
                  >
                    <option value="">Selecione o projeto...</option>
                    {projetos.map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">Chamado Correspondente (Demand)</label>
                  <select
                    required
                    value={heDemandaId}
                    onChange={(e) => setHeDemandaId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 cursor-pointer"
                  >
                    <option value="">Selecione a tarefa...</option>
                    {demandas
                      .filter(d => !d.excluido && (!heProjetoId || d.idProjeto === heProjetoId))
                      .map(d => (
                        <option key={d.id} value={d.id}>CH-{d.numeroChamado} | {d.titulo}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-semibold text-neutral-300 block">Horas Gastas</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={heHoras}
                    onChange={(e) => setHeHoras(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300 block">Forma de Compensação</label>
                  <select
                    value={heCompensacao}
                    onChange={(e) => setHeCompensacao(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200"
                  >
                    <option value="Folga">Banco de Horas (Folga Compensatória)</option>
                    <option value="Pagamento">Faturamento Financeiro (Pagamento Adicional)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Justificativa das Horas Fora do Horário</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Por que este chamado precisou ser tratado fora do expediente?"
                  value={heDescricao}
                  onChange={(e) => setHeDescricao(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowHEModal(false); setEditHEId(null); }}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 rounded-xl text-xs font-semibold"
                >
                  Registrar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REGISTER CHECKPOINT MODAL --- */}
      {showCheckpointModal && isHRAdmin && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-base font-bold text-neutral-100 font-sans">
                  {editCheckpointId ? "Editar Check-Point de Desempenho" : "Cadastrar Check-Point de Desempenho"}
                </h3>
                <p className="text-xs text-neutral-400">Adicione observações corretivas ou de destaque profissional.</p>
              </div>
              <button onClick={() => { setShowCheckpointModal(false); setEditCheckpointId(null); }} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCheckpoint} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Funcionário Avaliado</label>
                <select
                  required
                  value={cpPessoaId}
                  onChange={(e) => setCpPessoaId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200"
                >
                  <option value="">Selecione o profissional...</option>
                  {gmzPessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Tipo do Fato</label>
                <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setCpTipo("Positivo")}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      cpTipo === "Positivo"
                        ? "bg-emerald-600 text-neutral-100 font-bold shadow-md"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Sinal Positivo (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCpTipo("Negativo")}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      cpTipo === "Negativo"
                        ? "bg-rose-600 text-neutral-100 font-bold shadow-md"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Sinal Negativo (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">Fatos Observados (Mensagem do Feedback)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Registre fatos observaveis do comportamento ou entrega técnica..."
                  value={cpDescricao}
                  onChange={(e) => setCpDescricao(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2.5 text-xs text-neutral-250 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCheckpointModal(false); setEditCheckpointId(null); }}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 rounded-xl text-xs font-semibold"
                >
                  Lançar Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SCHEDULE ACTION PLAN / MEETING FORM MODAL --- */}
      {showMeetingModal && isHRAdmin && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {editMeetingId ? "Editar Plano de Ação & Ata de Alinhamento" : "Criar Plano de Ação & Ata de Alinhamento"}
                </h3>
                <p className="text-xs text-neutral-400">Associe feedback a planos de metas de evolução de carreira.</p>
              </div>
              <button type="button" onClick={() => { setShowMeetingModal(false); setEditMeetingId(null); }} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">Tema da Reunião</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alinhamento De Performance Daniel"
                    value={mTitulo}
                    onChange={(e) => setMTitulo(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">Data Realização</label>
                  <input
                    type="date"
                    required
                    value={mDataReuniao}
                    onChange={(e) => setMDataReuniao(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm m-text-neutral-200"
                  />
                </div>
              </div>

              {/* PARTICIPANTS CHECKBOXES */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono block">Colaborador(es) Vinculados</label>
                <div className="grid grid-cols-2 gap-2 bg-neutral-955 p-3 rounded-xl border border-neutral-850 max-h-24 overflow-y-auto">
                  {gmzPessoas.map(p => {
                    const isSelected = mParticipanteIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleParticipantInMeetingForm(p.id)}
                        className="flex items-center gap-2 text-left text-xs text-neutral-350 hover:text-neutral-100 transition-colors cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                        ) : (
                          <Square size={14} className="text-neutral-600 shrink-0" />
                        )}
                        <span className="truncate">{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CHECKPOINTS ATTACHED */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-widest font-mono block">Relacionar Check-Points Gravados</label>
                <div className="space-y-1.5 bg-neutral-955 p-3 rounded-xl border border-neutral-850 max-h-24 overflow-y-auto">
                  {checkpoints
                    .filter(cp => mParticipanteIds.includes(cp.idPessoa))
                    .map(cp => {
                      const isSelected = mCheckpointIds.includes(cp.id);
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          onClick={() => toggleCheckpointInMeetingForm(cp.id)}
                          className="w-full flex items-center gap-2.5 text-left text-xs text-neutral-350 hover:text-neutral-100 transition-colors cursor-pointer border-b border-neutral-900 pb-1"
                        >
                          {isSelected ? (
                            <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                          ) : (
                            <Square size={14} className="text-neutral-600 shrink-0" />
                          )}
                          <span className={`text-[10px] font-bold ${cp.tipo === 'Positivo' ? 'text-emerald-450': 'text-rose-450'}`}>[{cp.tipo}]</span>
                          <span className="truncate italic">"{cp.descricao}"</span>
                        </button>
                      );
                    })}

                  {mParticipanteIds.length === 0 && (
                    <span className="text-[10px] text-neutral-500 italic">Selecione colaboradores para listar seus feedbacks disponíveis.</span>
                  )}
                </div>
              </div>

              {/* META / ACTIONS */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-30 block">Ações Corretivas & Metas Definidas</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Divida em linhas ex:&#10;1. Realizar curso de Design System&#10;2. Melhorar entregas mobile"
                  value={mAcoes}
                  onChange={(e) => setMAcoes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-805 rounded-xl px-4 py-2.5 text-xs text-neutral-200 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-305 block">Prazo de Resolução</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Próxima Sprint (15 dias)"
                    value={mPrazo}
                    onChange={(e) => setMPrazo(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-305 block">Observações de Gestão (Comentários)</label>
                  <input
                    type="text"
                    placeholder="Ex: Auditor Thaylor fará o acompanhamento."
                    value={mComments}
                    onChange={(e) => setMComments(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-105"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 bg-neutral-950/25 p-3 rounded-xl border border-neutral-850/50">
                <input
                  type="checkbox"
                  id="meeting_visivel_colaborador"
                  checked={mVisivelColaborador}
                  onChange={(e) => setMVisivelColaborador(e.target.checked)}
                  className="w-4 h-4 bg-neutral-950 border-neutral-800 rounded accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="meeting_visivel_colaborador" className="text-xs font-semibold text-neutral-300 cursor-pointer select-none">
                  Disponibilizar Ata e Plano sob consulta para os Colaboradores participantes
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowMeetingModal(false); setEditMeetingId(null); }}
                  className="px-4 py-2 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 rounded-xl text-xs font-semibold shadow"
                >
                  Gravar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETALHES DA DEMANDA MODAL (READ-ONLY) --- */}
      {selectedDemandaToView && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 font-bold">
                  CH-{selectedDemandaToView.numeroChamado}
                </span>
                <span className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-full border ${
                  selectedDemandaToView.tipo === "BUG"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-455"
                    : selectedDemandaToView.tipo === "Change"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}>
                  {selectedDemandaToView.tipo || "Tarefa"}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedDemandaToView(null)} 
                className="text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[600px] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-mono">Título do Chamado</h4>
                <p className="text-base font-bold text-neutral-100 mt-1">{selectedDemandaToView.titulo || "Sem Título"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-neutral-950/50 p-4 rounded-2xl border border-neutral-850">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Projeto Relacionado</span>
                  <span className="text-xs font-bold text-neutral-350 block">{formatProjectName(selectedDemandaToView.idProjeto)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Status Atual</span>
                  <span className="text-xs font-bold text-neutral-300 block bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full inline-block">
                    {selectedDemandaToView.coluna || "Rascunho"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Criticidade</span>
                  <span className={`text-xs font-bold block ${
                    selectedDemandaToView.criticidade === "Urgente" || selectedDemandaToView.criticidade === "Alta"
                      ? "text-rose-455"
                      : selectedDemandaToView.criticidade === "Média"
                      ? "text-amber-450"
                      : "text-neutral-300"
                  }`}>
                    ⚠️ {selectedDemandaToView.criticidade || "Padrão"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Profissional Designado</span>
                  <span className="text-xs font-bold text-neutral-350 block">
                    {selectedDemandaToView.idDesignado ? formatEmployeeName(selectedDemandaToView.idDesignado) : "Não Designado"}
                  </span>
                </div>
                <div className="space-y-1 col-span-2 border-t border-neutral-900 pt-3">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Estimativa de Esforço</span>
                  <span className="text-xs text-neutral-220 font-mono font-bold block">{selectedDemandaToView.estimativaHoras || 0} horas estimadas</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Descrição Detalhada</span>
                <div 
                  className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs font-sans text-neutral-300 overflow-y-auto max-h-48 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedDemandaToView.descricao || "<p className='text-neutral-500 italic'>Nenhuma descrição inserida.</p>" }}
                />
              </div>

              {selectedDemandaToView.tags && selectedDemandaToView.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono block">Categorias / Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDemandaToView.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] font-mono bg-neutral-950 text-neutral-400 border border-neutral-850 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-950/30 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDemandaToView(null)}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-neutral-100 rounded-xl text-xs font-semibold select-none cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
