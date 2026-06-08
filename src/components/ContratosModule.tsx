/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Plus, Edit2, Trash2, Search, FileText, Calendar, DollarSign, 
  Clock, Link, FolderClosed, File, Upload, Download, CheckSquare, Square, X, RefreshCw, Building
} from "lucide-react";
import { Contrato, Empresa } from "../types";
import { ConfirmModal } from "./ConfirmModal";

export const ContratosModule: React.FC = () => {
  const { 
    contratos, empresas, addContrato, updateContrato, deleteContrato,
    medicoes, addMedicao, updateMedicao, deleteMedicao 
  } = useDB();
  
  const [search, setSearch] = useState("");
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [sla, setSla] = useState("24h");
  const [valorTotal, setValorTotal] = useState(0);
  const [valorCobranca, setValorCobranca] = useState(0);
  const [valoresAdicionais, setValoresAdicionais] = useState(0);
  const [periodoCobranca, setPeriodoCobranca] = useState<any>("Mensal");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState<any>("Ativo");
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<string[]>([]);
  const [folderId, setFolderId] = useState("");
  const [horasMensais, setHorasMensais] = useState<number>(0);
  const [divisaoIgual, setDivisaoIgual] = useState<boolean>(true);
  const [divisaoHorasEmpresas, setDivisaoHorasEmpresas] = useState<{ [empresaId: string]: number }>({});
  const [acumulativoTrimestre, setAcumulativoTrimestre] = useState<boolean>(false);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [currentSelectedRef, setCurrentSelectedRef] = useState<string[]>([]);

  // Tab controls for each contract card
  const [activeContractTab, setActiveContractTab] = useState<{ [contractId: string]: "arquivos" | "medicoes" }>({});

  // Monthly measurement states
  const [showMedicaoModal, setShowMedicaoModal] = useState(false);
  const [medicaoEditId, setMedicaoEditId] = useState<string | null>(null);
  const [medRefMonth, setMedRefMonth] = useState("2026-05");
  const [medValorMes, setMedValorMes] = useState(0);
  const [medValoresAdicionaisTotais, setMedValoresAdicionaisTotais] = useState(0);
  const [medPedido, setMedPedido] = useState("");
  const [medFolha, setMedFolha] = useState("");
  const [medDataRecebimento, setMedDataRecebimento] = useState("");
  const [medObs, setMedObs] = useState("");
  const [medSelectedContratoIds, setMedSelectedContratoIds] = useState<string[]>([]);
  const [medicaoContratoId, setMedicaoContratoId] = useState("");

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Simulated upload state
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setNumero(`CT-${new Date().getFullYear()}/${(contratos.length + 1).toString().padStart(3, "0")}`);
    setNome("");
    setSla("24h");
    setValorTotal(50000);
    setValorCobranca(4500);
    setValoresAdicionais(0);
    setPeriodoCobranca("Mensal");
    setDataInicio(new Date().toISOString().split("T")[0]);
    setDataFim(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setStatus("Rascunho");
    setSelectedEmpresaIds([]);
    setFolderId("drive-project-folder-" + Math.random().toString(36).substring(2, 7));
    setHorasMensais(0);
    setDivisaoIgual(true);
    setDivisaoHorasEmpresas({});
    setAcumulativoTrimestre(false);
    setShowModal(true);
  };

  const handleEdit = (c: Contrato) => {
    setEditId(c.id);
    setNumero(c.numero);
    setNome(c.nome);
    setSla(c.sla);
    setValorTotal(c.valorTotal);
    setValorCobranca(c.valorCobranca);
    setValoresAdicionais(c.valoresAdicionais || 0);
    setPeriodoCobranca(c.periodoCobranca);
    setDataInicio(c.dataInicio);
    setDataFim(c.dataFim);
    setStatus(c.status);
    setSelectedEmpresaIds(c.empresaIds || []);
    setFolderId(c.folderId);
    setHorasMensais(c.horasMensais || 0);
    setDivisaoIgual(c.divisaoIgual !== false);
    setDivisaoHorasEmpresas(c.divisaoHorasEmpresas || {});
    setAcumulativoTrimestre(!!c.acumulativoTrimestre);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || selectedEmpresaIds.length === 0) {
      alert("Por favor insira um título do contrato e vincule ao menos uma Empresa!");
      return;
    }

    if (horasMensais > 0 && !divisaoIgual) {
      const sum = selectedEmpresaIds.reduce((acc, empId) => acc + (divisaoHorasEmpresas[empId] || 0), 0);
      if (Math.abs(sum - horasMensais) > 0.01) {
        alert(`A soma das horas divididas (${sum.toFixed(2)}h) deve ser exatamente igual ao total de horas mensais (${horasMensais}h)!`);
        return;
      }
    }

    const payload = {
      numero,
      nome,
      sla,
      valorTotal: Number(valorTotal),
      valorCobranca: Number(valorCobranca),
      valoresAdicionais: Number(valoresAdicionais),
      periodoCobranca,
      dataInicio,
      dataFim,
      status,
      empresaIds: selectedEmpresaIds,
      folderId: folderId || "drive-folder-" + Math.random().toString(36).substring(2, 7),
      horasMensais: Number(horasMensais),
      divisaoIgual,
      divisaoHorasEmpresas,
      acumulativoTrimestre
    };

    if (editId) {
      updateContrato(editId, payload);
    } else {
      addContrato(payload);
    }
    setShowModal(false);
  };

  const toggleEmpresaInSelection = (id: string) => {
    setSelectedEmpresaIds((prev) => {
      const next = prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id];
      if (horasMensais > 0) {
        // Redivide hours to maintain balanced custom hours if not igual
        const eachVal = Number((horasMensais / (next.length || 1)).toFixed(2));
        const nextDist: { [key: string]: number } = {};
        next.forEach(eid => {
          nextDist[eid] = divisaoHorasEmpresas[eid] ?? eachVal;
        });
        setDivisaoHorasEmpresas(nextDist);
      }
      return next;
    });
  };

  const handleSimulatedFileUpload = (contratoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const key = `${contratoId}_${file.name}`;
    setUploadProgress((prev) => ({ ...prev, [key]: 10 }));

    // Simula a barra progresso de upload com Firebase Storage
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        const current = prev[key] || 0;
        if (current >= 100) {
          clearInterval(interval);
          // Adiciona arquivo na lista
          const contratoToUpdate = contratos.find((c) => c.id === contratoId);
          if (contratoToUpdate) {
            const fileItem = {
              name: file.name,
              url: "#",
              size: `${(file.size / 1024).toFixed(1)} KB`
            };
            const updatedAnexos = [...contratoToUpdate.anexos, fileItem];
            updateContrato(contratoId, { anexos: updatedAnexos });
          }
          return { ...prev, [key]: -1 }; // Concluído
        }
        return { ...prev, [key]: current + 30 };
      });
    }, 300);
  };

  const handleRemoveAnexo = (contratoId: string, index: number) => {
    const contratoToUpdate = contratos.find((c) => c.id === contratoId);
    if (contratoToUpdate) {
      const updatedAnexos = contratoToUpdate.anexos.filter((_, i) => i !== index);
      updateContrato(contratoId, { anexos: updatedAnexos });
    }
  };

  const handleOpenMedicaoCreate = (c: Contrato) => {
    setMedicaoEditId(null);
    setMedicaoContratoId(c.id);
    setMedSelectedContratoIds([c.id]);
    setMedRefMonth(new Date().toISOString().substring(0, 7)); // e.g. "2026-05"
    
    const cobranca = c.valorCobranca || 0;
    const adicionais = c.valoresAdicionais || 0;
    setMedValorMes(cobranca + adicionais);
    setMedValoresAdicionaisTotais(adicionais);
    setMedPedido("");
    setMedFolha("");
    setMedDataRecebimento(new Date().toISOString().split("T")[0]);
    setMedObs("");
    setShowMedicaoModal(true);
  };

  const handleOpenMedicaoEdit = (m: any) => {
    setMedicaoEditId(m.id);
    setMedRefMonth(m.periodoRef);
    setMedValorMes(m.valorMes);
    setMedValoresAdicionaisTotais(m.valoresAdicionaisTotais || 0);
    setMedPedido(m.pedido || "");
    setMedFolha(m.folha || "");
    setMedDataRecebimento(m.dataRecebimento || "");
    setMedObs(m.observacao || "");
    setMedSelectedContratoIds(m.contratoIds || [m.idContrato]);
    setShowMedicaoModal(true);
  };

  const handleMedicaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate accumulated
    let totalAcc = 0;
    const targetContracts = medSelectedContratoIds.length > 0 ? medSelectedContratoIds : [medicaoContratoId];
    
    targetContracts.forEach(cid => {
      const prevs = medicoes.filter(m => m.id !== medicaoEditId && (m.contratoIds?.includes(cid) || m.idContrato === cid));
      totalAcc += prevs.reduce((sum, curr) => sum + (curr.valorMes || 0), 0);
    });
    totalAcc += Number(medValorMes);

    const payload = {
      contratoIds: targetContracts,
      idContrato: targetContracts[0] || medicaoContratoId,
      nomeDocumento: `Medição Mensal Unificada - ${medRefMonth}`,
      periodoRef: medRefMonth,
      valorMes: Number(medValorMes),
      valorAcumulado: totalAcc,
      valoresAdicionaisTotais: Number(medValoresAdicionaisTotais),
      pedido: medPedido,
      folha: medFolha,
      dataRecebimento: medDataRecebimento,
      status: "Salvo" as any,
      observacao: medObs
    };

    if (medicaoEditId) {
      updateMedicao(medicaoEditId, payload);
    } else {
      addMedicao(payload);
    }
    setShowMedicaoModal(false);
  };

  const toggleContractInSelection = (cid: string) => {
    setMedSelectedContratoIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const filtered = contratos.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      c.sla.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Gestão de Contratos SaaS</h2>
          <p className="text-sm text-neutral-400">Controle financeiro, prazos de SLA e anexos vinculados às marcas no Firestore.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Novo Contrato
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por número ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs text-neutral-400 sm:ml-auto">
          Carregando contratos de faturamento mensal. Total: <span className="text-neutral-100 font-semibold">{filtered.length} ativos</span>
        </div>
      </div>

      {/* Contract Layout list */}
      <div className="space-y-4">
        {filtered.map((c) => {
          // Find companies
          const linkedCompanies = empresas.filter((emp) => c.empresaIds?.includes(emp.id));

          return (
            <div
              key={c.id}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-750 p-6 rounded-2xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-6 relative overflow-hidden"
            >
              {/* Top color tag indicator by status */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                c.status === "Ativo"
                  ? "bg-emerald-500"
                  : c.status === "Rascunho"
                  ? "bg-yellow-500"
                  : c.status === "Suspenso"
                  ? "bg-rose-500"
                  : "bg-neutral-600"
              }`}></div>

              {/* General details group */}
              <div className="lg:col-span-5 space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-indigo-400 px-2.5 py-1 rounded-md">
                    {c.numero}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    c.status === "Ativo"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : c.status === "Rascunho"
                      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-neutral-100 mb-0.5">{c.nome}</h3>
                  <div className="flex flex-wrap gap-1.5 items-center mt-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">Empresas:</span>
                    {linkedCompanies.slice(0, 3).map((comp) => (
                      <span key={comp.id} className="text-xs bg-neutral-950 px-2 py-0.5 border border-neutral-800 rounded-md text-neutral-300 font-medium">
                        {comp.nome}
                      </span>
                    ))}
                    {linkedCompanies.length > 3 && (
                      <span className="text-xs text-indigo-400 font-mono font-medium">+{linkedCompanies.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Folder details / Drive ID alignment */}
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono bg-neutral-950/40 p-2 border border-neutral-850 rounded-xl w-fit">
                  <FolderClosed size={14} className="text-neutral-500" />
                  <span className="text-neutral-300">ID de Pasta Firebase:</span>
                  <span className="text-neutral-400 select-all font-semibold">{c.folderId}</span>
                </div>
              </div>

              {/* Financial panel */}
              <div className="lg:col-span-3 space-y-3 lg:border-l lg:border-r border-neutral-800 lg:px-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5"><Clock size={13} /> SLA de Resolução</span>
                  <span className="font-semibold text-neutral-200 font-mono text-indigo-300">{c.sla}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5"><DollarSign size={13} /> Ciclo Recorrência</span>
                  <span className="font-semibold text-neutral-200">{c.periodoCobranca}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5"><DollarSign size={13} /> Valor Periódico</span>
                  <span className="font-semibold text-neutral-100 font-mono">{formatCurrency(c.valorCobranca)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Faturamento Total</span>
                  <span className="font-semibold text-neutral-100 font-mono">{formatCurrency(c.valorTotal)}</span>
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-850">
                  <span>{c.dataInicio.replace(/-/g, "/")}</span>
                  <span>até</span>
                  <span>{c.dataFim.replace(/-/g, "/")}</span>
                </div>
              </div>

              {/* Attachments & Measurements dual-tab panel */}
              <div className="lg:col-span-12 border-t border-neutral-800 pt-4 mt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/20 p-2 rounded-xl border border-neutral-850">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveContractTab(prev => ({ ...prev, [c.id]: "arquivos" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        (activeContractTab[c.id] || "arquivos") === "arquivos"
                          ? "bg-indigo-600 text-neutral-100"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      🗄️ Arquivos do Contrato ({c.anexos?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveContractTab(prev => ({ ...prev, [c.id]: "medicoes" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeContractTab[c.id] === "medicoes"
                          ? "bg-indigo-600 text-neutral-100"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      📊 Aba de Medições Mensais ({medicoes.filter(m => m.contratoIds?.includes(c.id) || m.idContrato === c.id).length})
                    </button>
                  </div>

                  {/* CRUD Contract edit button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="p-1.5 cursor-pointer bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-indigo-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Editar Contrato
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmState({
                          isOpen: true,
                          title: "Excluir Contrato",
                          description: `Deseja excluir o contrato "${c.nome}" e remover todas as referências no Firestore? Esta ação não pode ser desfeita.`,
                          onConfirm: () => deleteContrato(c.id)
                        });
                      }}
                      className="p-1.5 cursor-pointer bg-neutral-900 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 text-neutral-500 hover:text-rose-400 rounded-lg text-xs"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sub Tab: files upload */}
                {(activeContractTab[c.id] || "arquivos") === "arquivos" && (
                  <div className="bg-neutral-950/45 p-4 rounded-xl border border-neutral-850/70 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Link size={12} />
                        Diretório de Anexos
                      </span>
                      <label className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 underline select-none">
                        <Upload size={10} /> Carregar Novo Documento
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleSimulatedFileUpload(c.id, e)}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
                      {c.anexos?.map((anexo, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-xs">
                          <span className="flex items-center gap-2 text-neutral-300 truncate pr-2">
                            <File size={13} className="text-neutral-450 shrink-0" />
                            <span className="truncate" title={anexo.name}>{anexo.name}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-mono text-neutral-500">{anexo.size}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAnexo(c.id, idx)}
                              className="text-neutral-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer"
                              title="Remover anexo"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Progress bars */}
                      {Object.keys(uploadProgress).map((key) => {
                        if (!key.startsWith(c.id + "_") || uploadProgress[key] < 0) return null;
                        const fileName = key.replace(c.id + "_", "");
                        return (
                          <div key={key} className="space-y-1 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-xs col-span-full">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-neutral-300 truncate">{fileName}</span>
                              <span className="text-indigo-400 font-bold">{uploadProgress[key]}%</span>
                            </div>
                            <div className="w-full bg-neutral-855 h-1 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress[key]}%` }}></div>
                            </div>
                          </div>
                        );
                      })}

                      {(!c.anexos || c.anexos.length === 0) && Object.keys(uploadProgress).filter(k => k.startsWith(c.id + "_")).length === 0 && (
                        <p className="text-[11px] text-neutral-500 italic py-2 col-span-full text-center">Nenhum anexo enviado.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Monthly measurement historic list */}
                {activeContractTab[c.id] === "medicoes" && (
                  <div className="bg-neutral-950/45 p-4 rounded-xl border border-neutral-855 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Histórico de Medições de Contrato</h4>
                        <p className="text-[10px] text-neutral-500">Cada medição consolida o valor recorrente do ciclo somado aos valores adicionais avulsos.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenMedicaoCreate(c)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Gerar Medição Mensal
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[700px] border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-850 text-neutral-450 uppercase font-mono text-[9px] tracking-widest">
                            <th className="py-2.5 px-3">Mês Competência</th>
                            <th className="py-2.5 px-3">Pedido / O.S</th>
                            <th className="py-2.5 px-3">Folha / Registro</th>
                            <th className="py-2.5 px-3">Valor do Mês</th>
                            <th className="py-2.5 px-3">Adicionais Estimados</th>
                            <th className="py-2.5 px-3">Histórico Acumulado</th>
                            <th className="py-2.5 px-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 text-neutral-300 font-sans">
                          {medicoes
                            .filter(m => m.contratoIds?.includes(c.id) || m.idContrato === c.id)
                            .map((m) => {
                              return (
                                <tr key={m.id} className="hover:bg-neutral-900/40 transition-colors">
                                  <td className="py-3 px-3 font-semibold text-indigo-400 font-mono flex items-center gap-2">
                                    <Calendar size={12} className="text-neutral-500" />
                                    {m.periodoRef}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-neutral-350">{m.pedido || "S/ Pedido"}</td>
                                  <td className="py-3 px-3 font-mono text-neutral-450">{m.folha || "S/ Folha"}</td>
                                  <td className="py-3 px-3 text-emerald-400 font-bold font-mono">{formatCurrency(m.valorMes)}</td>
                                  <td className="py-3 px-3 font-mono text-neutral-500">{formatCurrency(m.valoresAdicionaisTotais || 0)}</td>
                                  <td className="py-3 px-3 font-mono text-neutral-400 font-semibold">{formatCurrency(m.valorAcumulado || 0)}</td>
                                  <td className="py-3 px-3 text-right space-x-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMedicaoEdit(m)}
                                      className="text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmState({
                                          isOpen: true,
                                          title: "Remover de Medição",
                                          description: "Deseja mesmo purgar esta medição contratual do histórico de medições?",
                                          onConfirm: () => deleteMedicao(m.id)
                                        });
                                      }}
                                      className="text-neutral-500 hover:text-rose-400 underline font-semibold cursor-pointer"
                                    >
                                      Remover/Excluir
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                          {medicoes.filter(m => m.contratoIds?.includes(c.id) || m.idContrato === c.id).length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-neutral-500 font-serif italic">
                                Nenhuma medição mensal lançada para este contrato. Gere no botão acima.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center bg-neutral-900/40 border border-neutral-850 rounded-2xl">
            <FileText className="mx-auto text-neutral-600 mb-3" size={36} />
            <p className="text-neutral-400 text-sm">Nenhum contrato cadastrado ou correspondente às buscas.</p>
          </div>
        )}
      </div>

      {/* DETAILED MODAL: EDIT & CREATE CONTRACT */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-lg font-bold text-neutral-100">
                  {editId ? "Editar Contrato Corporativo" : "Criar Contrato SaaS"}
                </h3>
                <p className="text-xs text-neutral-400">Insira valores, SLAs de resposta e defina o vínculo de múltiplas empresas.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Número do Contrato (ID Único)</label>
                  <input
                    type="text"
                    required
                    readOnly={!!editId}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-300 outline-none select-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nome Resumido / Finalidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: API Core e Suporte"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">SLA de Resposta (Acordo de Nível)</label>
                  <select
                    value={sla}
                    onChange={(e) => setSla(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none"
                  >
                    <option value="4h">4 horas Premium (Urgente)</option>
                    <option value="12h">12 horas (Padrão corporativo)</option>
                    <option value="24h">24 horas (Básico)</option>
                    <option value="48h">48 horas (Flexível)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Código da Pasta Storage (FolderID)</label>
                  <input
                    type="text"
                    required
                    placeholder="drive-folder-xxx"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Valor Total do Contrato (R$)</label>
                  <input
                    type="number"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Valor Cobrança por Ciclo (R$)</label>
                  <input
                    type="number"
                    value={valorCobranca}
                    onChange={(e) => setValorCobranca(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Valores Adicionais por Ciclo (R$)</label>
                  <input
                    type="number"
                    value={valoresAdicionais}
                    onChange={(e) => setValoresAdicionais(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Período de Cobrança</label>
                  <select
                    value={periodoCobranca}
                    onChange={(e) => setPeriodoCobranca(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Bimestral">Bimestral</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Status Geral do Contrato</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Rascunho">Rascunho</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Data de Início</label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5 font-sans">
                  <label className="text-xs font-semibold text-neutral-300">Horas Mensais do Contrato</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 500"
                    value={horasMensais || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setHorasMensais(val);
                      // Auto-update divisaoHorasEmpresas when total hours changes
                      const eachVal = Number((val / (selectedEmpresaIds.length || 1)).toFixed(2));
                      const nextDist: { [key: string]: number } = {};
                      selectedEmpresaIds.forEach(eid => {
                        nextDist[eid] = eachVal;
                      });
                      setDivisaoHorasEmpresas(nextDist);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 font-mono"
                  />
                </div>
              </div>

              {/* DYNAMIC CONTRACT HOURS DISTRIBUTION FIELDS */}
              {horasMensais > 0 && (
                <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-800 space-y-4">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Ajustes de Horas Mensais</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Switch: Divisão Igualitária */}
                    <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                      <div>
                        <span className="text-xs font-semibold text-neutral-300 block">Divisão Igualitária das Horas</span>
                        <span className="text-[10px] text-neutral-500">Divide {horasMensais}h entre {selectedEmpresaIds.length || 1} empresas.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !divisaoIgual;
                          setDivisaoIgual(nextVal);
                          if (!nextVal) {
                            const eachVal = Number((horasMensais / (selectedEmpresaIds.length || 1)).toFixed(2));
                            const initialDist: { [key: string]: number } = {};
                            selectedEmpresaIds.forEach(id => {
                              initialDist[id] = eachVal;
                            });
                            setDivisaoHorasEmpresas(initialDist);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          divisaoIgual ? 'bg-indigo-600' : 'bg-neutral-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            divisaoIgual ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Switch: Acumulativo Trimestre */}
                    <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                      <div>
                        <span className="text-xs font-semibold text-neutral-300 block">Acumulativo Trimestre</span>
                        <span className="text-[10px] text-neutral-500">Exibe e acumula saldo trimestral no relatório.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAcumulativoTrimestre(!acumulativoTrimestre)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          acumulativoTrimestre ? 'bg-indigo-600' : 'bg-neutral-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            acumulativoTrimestre ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Manual division list */}
                  {!divisaoIgual && (
                    <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-xl space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                        <span className="text-xs font-bold text-neutral-400">Distribuição por Empresa</span>
                        <span className="text-xs font-mono">
                          Total:{" "}
                          <strong className={
                            Math.abs(selectedEmpresaIds.reduce((sum, id) => sum + (divisaoHorasEmpresas[id] || 0), 0) - horasMensais) < 0.05
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }>
                            {selectedEmpresaIds.reduce((sum, id) => sum + (divisaoHorasEmpresas[id] || 0), 0).toFixed(2)}h
                          </strong>
                          {" "} / {horasMensais}h
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {selectedEmpresaIds.map((eid) => {
                          const emp = empresas.find((e) => e.id === eid);
                          if (!emp) return null;
                          const currentVal = divisaoHorasEmpresas[eid] ?? 0;
                          return (
                            <div key={eid} className="flex items-center justify-between gap-4 bg-neutral-950/40 p-2 rounded-lg border border-neutral-850">
                              <span className="text-xs text-neutral-300 font-medium truncate">{emp.nome}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  placeholder="0.00"
                                  value={currentVal || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setDivisaoHorasEmpresas((prev) => ({
                                      ...prev,
                                      [eid]: val,
                                    }));
                                  }}
                                  className="w-24 bg-neutral-900 border border-neutral-800 focus:border-indigo-500 rounded-lg py-1 px-2 text-xs font-mono text-neutral-100 text-right outline-none"
                                />
                                <span className="text-[10px] text-neutral-500 font-mono">hrs</span>
                              </div>
                            </div>
                          );
                        })}
                        {selectedEmpresaIds.length === 0 && (
                          <p className="text-xs text-neutral-500 italic text-center py-2">Nenhuma empresa atrelada a este contrato.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {divisaoIgual && (
                    <div className="p-3 bg-neutral-900/20 border border-neutral-850 rounded-xl">
                      <p className="text-xs text-neutral-400">
                        💡 <strong>Divisão Ativa:</strong> Cada uma das {selectedEmpresaIds.length || 1} empresas cadastradas receberá exatamente {" "}
                        <span className="text-indigo-400 font-mono font-bold">
                          {(horasMensais / (selectedEmpresaIds.length || 1)).toFixed(2)}h
                        </span>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SELEÇÃO MÚLTIPLA DE EMPRESAS */}
              <div className="border-t border-neutral-850 pt-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-300">
                      Vincular Empresas ao Contrato (Múltipla Seleção)
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      O contrato deve estar atrelado a no mínimo uma empresa. Marque abaixo.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">
                    {selectedEmpresaIds.length} selecionadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950/40 p-4 rounded-xl border border-neutral-850 max-h-36 overflow-y-auto">
                  {empresas.map((emp) => {
                    const isSelected = selectedEmpresaIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmpresaInSelection(emp.id)}
                        className="flex items-center gap-3 py-1.5 px-2 rounded-lg text-left hover:bg-neutral-900 transition-colors text-xs text-neutral-300 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-indigo-500 shrink-0" />
                        ) : (
                          <Square size={16} className="text-neutral-600 shrink-0" />
                        )}
                        <span className="truncate">{emp.nome}</span>
                      </button>
                    );
                  })}

                  {empresas.length === 0 && (
                    <span className="col-span-full text-xs text-neutral-500 py-2 text-center italic">
                      Por favor, cadastre ao menos uma empresa primeiro!
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-300 font-medium text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editId ? "Salvar Alterações" : "Ativar Contrato"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* METRIC MEASUREMENT MODAL */}
      {showMedicaoModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/20">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {medicaoEditId ? "Editar Fechamento de Medição" : "Gerar Nova Medição Mensal"}
                </h3>
                <p className="text-[11px] text-neutral-400">Lance o faturamento mensal corporativo com valores recorrentes e adicionais.</p>
              </div>
              <button onClick={() => setShowMedicaoModal(false)} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMedicaoSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* COMPOSITE MULTIPLE CONTRACTS SELECTOR FOR SINGLE DOCUMENT BUNDLING */}
              <div className="space-y-2 border-b border-neutral-850 pb-4">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Building size={14} className="text-indigo-400" />
                  Contratos Vinculados (Medição Unificada)
                </label>
                <p className="text-[10px] text-neutral-500">
                  Selecione vários contratos para faturar e gerar apenas um único documento condensado.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-850 max-h-32 overflow-y-auto">
                  {contratos.map((con) => {
                    const isChecked = medSelectedContratoIds.includes(con.id);
                    return (
                      <button
                        key={con.id}
                        type="button"
                        onClick={() => toggleContractInSelection(con.id)}
                        className="flex items-center gap-2.5 py-1 px-2 rounded-lg text-left hover:bg-neutral-900 transition-colors text-xs text-neutral-300 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare size={15} className="text-indigo-500 shrink-0" />
                        ) : (
                          <Square size={15} className="text-neutral-600 shrink-0" />
                        )}
                        <span className="truncate text-[11px] font-mono">{con.codigo} | {con.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TWO COLUMN GENERAL FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Mês de Competência</label>
                  <input
                    type="month"
                    required
                    value={medRefMonth}
                    onChange={(e) => setMedRefMonth(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Data de Recebimento</label>
                  <input
                    type="date"
                    required
                    value={medDataRecebimento}
                    onChange={(e) => setMedDataRecebimento(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Nº do Pedido / Ordem Serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: PO-2026-904"
                    value={medPedido}
                    onChange={(e) => setMedPedido(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Folha de Registro (Folha)</label>
                  <input
                    type="text"
                    placeholder="Ex: 54 / Verso"
                    value={medFolha}
                    onChange={(e) => setMedFolha(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Valores Adicionais do Mês (R$)</label>
                  <input
                    type="number"
                    value={medValoresAdicionaisTotais}
                    onChange={(e) => {
                      const additional = Number(e.target.value);
                      setMedValoresAdicionaisTotais(additional);
                      // Recalculate valorMes if contract single
                      const con = contratos.find(x => x.id === medicaoContratoId);
                      if (con) {
                        setMedValorMes((con.valorCobranca || 0) + additional);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Valor Total Medido no Mês (R$)</label>
                  <input
                    type="number"
                    required
                    value={medValorMes}
                    onChange={(e) => setMedValorMes(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-indigo-500/35 rounded-xl px-4 py-2 text-sm text-indigo-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* ACCUMULATED CALCULATION PREVIEW BOX */}
              <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest block mb-0.5">
                    Memória de Valor Acumulado (Já Cobrado)
                  </span>
                  <p className="text-[10.5px] text-neutral-400 leading-normal max-w-sm">
                    Soma global de faturamentos de meses anteriores para os contratos selecionados.
                  </p>
                </div>
                <div className="text-right shrink-0 pr-1">
                  <span className="text-[10px] text-neutral-400 font-mono block">Acumulado Estimado</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {formatCurrency(
                      medSelectedContratoIds.reduce((sum, cid) => {
                        const prevsEnd = medicoes.filter(m => m.id !== medicaoEditId && (m.contratoIds?.includes(cid) || m.idContrato === cid));
                        return sum + prevsEnd.reduce((sc, cs) => sc + (cs.valorMes || 0), 0);
                      }, 0) + Number(medValorMes)
                    )}
                  </span>
                </div>
              </div>

              {/* OBSERVATION FOOTER */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 font-mono">Observações / Detalhes de Envio</label>
                <textarea
                  rows={2}
                  value={medObs}
                  onChange={(e) => setMedObs(e.target.value)}
                  placeholder="Instruções para o faturamento interno ou dados do contato no cliente..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowMedicaoModal(false)}
                  className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {medicaoEditId ? "Atualizar Medição saved" : "Consolidar Medição"}
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
