/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Calendar, Filter, TrendingUp, Building, Clock, ArrowLeft, Table, ChevronRight, Info, Download, FileSpreadsheet
} from "lucide-react";

export const RelatoriosModule: React.FC = () => {
  const { contratos, demandas, empresas, apontamentos, projetos, pessoas } = useDB();

  const exportToExcel = (data: any[][], headers: string[], fileName: string) => {
    const csvContent = "\uFEFF" + [
      headers.join(";"),
      ...data.map(row => row.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(";"))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active view state: null for main menu, or ID of report to view
  const [activeReport, setActiveReport] = useState<string | null>(null);

  // Filters state (shared or passed to active report)
  const [filterContratoId, setFilterContratoId] = useState("");
  const [filterDataInicio, setFilterDataInicio] = useState("2026-01");
  const [filterDataFim, setFilterDataFim] = useState("2026-12");
  const [billingSource, setBillingSource] = useState<"apontamentos" | "estimativa">("estimativa");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const getCompanyName = (id: string) => {
    const e = empresas.find(item => item.id === id);
    return e ? e.nome : "Sem Empresa";
  };

  /**
   * Main Menu View featuring cards of available reports
   */
  if (activeReport === null) {
    return (
      <div className="space-y-8 animate-fade-in font-sans p-2 select-none" id="relatorios-menu-container">
        {/* Header Block with Zero-slop Display Typography */}
        <div className="flex flex-col gap-1.5" id="relatorios-header-title">
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            📊 BI & Relatórios Dinâmicos
          </h2>
          <p className="text-sm text-neutral-400">
            Selecione uma categoria de relatório abaixo para analisar os dados corporativos em tempo real.
          </p>
        </div>

        {/* Real-time Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="relatorios-cards-grid">
          {/* Card 1: Horas x Contrato x Empresas x Período */}
          <div 
            id="card-horas-contrato-empresas"
            onClick={() => setActiveReport("horasContratoEmpresas")}
            className="group bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-indigo-550 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-650 group-hover:text-white transition-all">
                <Clock size={20} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">
                  Horas x Contrato x Empresas x Período
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Consolidado histórico de faturamento sob franquia mensal e horas executadas, rateado pelas empresas vinculadas com cálculo trimestral acumulativo.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center justify-between text-neutral-400 group-hover:text-neutral-200 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-indigo-400" />
                Dados em Tempo Real
              </span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Relatório de Benefício iFood */}
          <div 
            id="card-ifood-membros"
            onClick={() => setActiveReport("ifoodGMZ")}
            className="group bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-indigo-550 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-pink-400 group-hover:bg-indigo-650 group-hover:text-white transition-all">
                <FileSpreadsheet size={20} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">
                  Relatório de Benefício iFood (Colaboradores GMZ)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Lista de colaboradores do tipo GMZ contendo as informações cadastrais e o valor respectivo de iFood.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center justify-between text-neutral-400 group-hover:text-neutral-200 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-indigo-400" />
                Dados de Benefícios
              </span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Relatório de Colaboradores GMZ (Ficha Cadastral) */}
          <div 
            id="card-cadastral-membros"
            onClick={() => setActiveReport("cadastralGMZ")}
            className="group bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-indigo-550 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-650 group-hover:text-white transition-all">
                <Building size={20} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">
                  Relatório de Colaboradores GMZ (Ficha Cadastral)
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Ficha de endereço e CPF individual unificado de todos os profissionais do grupo GMZ Solutions.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center justify-between text-neutral-400 group-hover:text-neutral-200 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-indigo-400" />
                Dados Cadastrais
              </span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Active Report View: "horasContratoEmpresas"
   */
  return (
    <div className="space-y-6 animate-fade-in font-sans p-2">
      {/* Header with quick BACK button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="back-to-menu-btn"
            onClick={() => {
              setActiveReport(null);
              // Clean states when going back
              setExpandedRows({});
            }}
            className="h-9 w-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider font-mono">
              {activeReport === "horasContratoEmpresas" && "BI & Faturamento"}
              {activeReport === "ifoodGMZ" && "Recursos Humanos & Benefícios"}
              {activeReport === "cadastralGMZ" && "Recursos Humanos & Ficha Cadastral"}
            </span>
            <h2 className="text-lg font-bold text-neutral-100 tracking-tight">
              {activeReport === "horasContratoEmpresas" && "Faturamento de Horas x Contrato x Empresas"}
              {activeReport === "ifoodGMZ" && "Relatório de Benefício iFood (Colaboradores GMZ)"}
              {activeReport === "cadastralGMZ" && "Relatório unificado de Colaboradores GMZ"}
            </h2>
          </div>
        </div>
      </div>

      {activeReport === "horasContratoEmpresas" && (() => {
        // Range helper function for consecutive months - slices to YYYY-MM
        const fetchMonthsInRange = (startDate: string, endDate: string) => {
          if (!startDate || !endDate) return [];
          const start = startDate.slice(0, 7);
          const end = endDate.slice(0, 7);
          const months: string[] = [];
          const [sYear, sMonth] = start.split("-").map(Number);
          const [eYear, eMonth] = end.split("-").map(Number);
          
          let cy = sYear;
          let cm = sMonth;
          while (cy < eYear || (cy === eYear && cm <= eMonth)) {
            months.push(`${cy}-${String(cm).padStart(2, "0")}`);
            cm++;
            if (cm > 12) {
              cm = 1;
              cy++;
            }
          }
          return months;
        };

        const listMonths = fetchMonthsInRange(filterDataInicio, filterDataFim);

        const getMonthsInQuarterUpToMonth = (monthStr: string) => {
          const [year, mNum] = monthStr.split("-").map(Number);
          const quarter = Math.ceil(mNum / 3);
          const startMonth = (quarter - 1) * 3 + 1;
          
          const months: string[] = [];
          for (let m = startMonth; m <= mNum; m++) {
            months.push(`${year}-${String(m).padStart(2, "0")}`);
          }
          return months;
        };

        // Month balance helper
        const calculateMonthBalanceForContractCompany = (mStr: string, con: any, empId: string) => {
          let contracted = 0;
          const assocCompanyIds = con.empresaIds || [];
          const companyCount = assocCompanyIds.length || 1;
          const totalContractHours = con.horasMensais || 100;
          
          if (con.divisaoIgual !== false) {
            contracted = totalContractHours / companyCount;
          } else {
            contracted = (con.divisaoHorasEmpresas && con.divisaoHorasEmpresas[empId] !== undefined)
              ? con.divisaoHorasEmpresas[empId]
              : totalContractHours / companyCount;
          }

          // Demands linked to contract and company
          const matchedDemands = demandas.filter(d => {
            if (d.excluido) return false;

            // Resolve reference date with fallback to Kanban completion or system dates
            let referenceDateStr = "";
            const isCompletedInKanban = d.filaConcluida === true || (d.coluna && (
              d.coluna.toLowerCase().trim() === "concluído" || 
              d.coluna.toLowerCase().trim() === "concluido" || 
              d.coluna.toLowerCase().trim() === "finalizado"
            ));

            if (d.cobrarEmContrato && d.cobrarContratoMes) {
              referenceDateStr = `${d.cobrarContratoMes}-01`;
            } else if (isCompletedInKanban) {
              referenceDateStr = (d.filaConcluidaAt || d.updatedAt || d.createdAt).slice(0, 10);
            } else {
              return false; // Not billed and not completed, so skip
            }

            if (!referenceDateStr) return false;

            // Enforce selected date-range filter using month strings
            const refMonth = referenceDateStr.slice(0, 7);
            if (refMonth < filterDataInicio || refMonth > filterDataFim) return false;

            // Must fall in this specific month
            if (refMonth !== mStr) return false;

            const belongsCompany = d.idEmpresa === empId || d.idEmpresas?.includes(empId);
            if (!belongsCompany) return false;

            const belongsContract = d.idContrato === con.id || projetos.find(p => p.id === d.idProjeto)?.contratoIds?.includes(con.id);
            return belongsContract;
          });

          let executed = 0;
          if (billingSource === "estimativa") {
            executed = matchedDemands.reduce((acc, curr) => {
              const assocCompanies = Array.from(new Set([
                ...(curr.idEmpresas || []),
                ...(curr.idEmpresa ? [curr.idEmpresa] : [])
              ])).filter(Boolean);
              const divisor = assocCompanies.length || 1;
              return acc + ((curr.estimativaHoras || 0) / divisor);
            }, 0);
          } else {
            executed = matchedDemands.reduce((acc, curr) => {
              const assocCompanies = Array.from(new Set([
                ...(curr.idEmpresas || []),
                ...(curr.idEmpresa ? [curr.idEmpresa] : [])
              ])).filter(Boolean);
              const divisor = assocCompanies.length || 1;
              const dApontamentos = apontamentos.filter(ap => ap.idDemanda === curr.id);
              const sumApontamentos = dApontamentos.reduce((sum, ap) => sum + (ap.horas || 0), 0);
              return acc + (sumApontamentos / divisor);
            }, 0);
          }

          return {
            contracted,
            executed,
            balance: contracted - executed,
            demands: matchedDemands.map(d => {
              const assocCompanies = Array.from(new Set([
                ...(d.idEmpresas || []),
                ...(d.idEmpresa ? [d.idEmpresa] : [])
              ])).filter(Boolean);
              const divisor = assocCompanies.length || 1;

              let hours = 0;
              if (billingSource === "estimativa") {
                hours = (d.estimativaHoras || 0) / divisor;
              } else {
                const dApontamentos = apontamentos.filter(ap => ap.idDemanda === d.id);
                hours = dApontamentos.reduce((sum, curr) => sum + (curr.horas || 0), 0) / divisor;
              }
              return {
                id: d.id,
                numeroChamado: d.numeroChamado,
                titulo: d.titulo,
                tipo: d.tipo || "Geral",
                hours
              };
            })
          };
        };

        const calculateQuarterCumulativeBalanceForContractCompany = (mStr: string, con: any, empId: string) => {
          const quarterMonths = getMonthsInQuarterUpToMonth(mStr);
          let sum = 0;
          quarterMonths.forEach(qm => {
            const { balance } = calculateMonthBalanceForContractCompany(qm, con, empId);
            sum += balance;
          });
          return sum;
        };

        const reportRows: any[] = [];
        const allExcelRows: any[] = [];
        const allExcelDemands: any[] = [];

        const activeContractsList = contratos.filter(con => {
          return filterContratoId ? con.id === filterContratoId : true;
        });

        activeContractsList.forEach(con => {
          const assocCompanyIds = con.empresaIds || [];
          assocCompanyIds.forEach(empId => {
            listMonths.forEach(mStr => {
              const { contracted, executed, balance, demands } = calculateMonthBalanceForContractCompany(mStr, con, empId);
              const qCumulative = calculateQuarterCumulativeBalanceForContractCompany(mStr, con, empId);

              const rowKey = `${con.id}-${empId}-${mStr}`;
              const companyName = getCompanyName(empId);
              const conLabel = `${con.numero} - ${con.nome}`;

              reportRows.push({
                key: rowKey,
                contractId: con.id,
                contractName: conLabel,
                companyId: empId,
                companyName,
                monthStr: mStr,
                contractedHours: contracted,
                executedHours: executed,
                monthBalance: balance,
                quarterlyBalance: qCumulative,
                hasQuarterly: !!con.acumulativoTrimestre,
                demands
              });

              allExcelRows.push({
                contractName: conLabel,
                companyName,
                monthStr: mStr,
                contractedHours: contracted,
                executedHours: executed,
                monthBalance: balance,
                quarterlyBalance: qCumulative,
                hasQuarterly: !!con.acumulativoTrimestre
              });

              demands.forEach(d => {
                allExcelDemands.push({
                  numeroChamado: d.numeroChamado,
                  titulo: d.titulo,
                  contractName: conLabel,
                  companyName,
                  calculatedHours: d.hours
                });
              });
            });
          });
        });

        const triggerExcelExport = () => {
          let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:Bold="1" ss:Size="14"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Detalhamento Horas">
    <Table>
      <Column ss:Width="160"/>
      <Column ss:Width="160"/>
      <Column ss:Width="80"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Column ss:Width="160"/>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Contrato</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Empresa Vinculada</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Mes Ref</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Franquia Contratada</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Horas Executadas</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Saldo Mes</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Saldo Trimestral Acumulado</Data></Cell>
      </Row>`;

          allExcelRows.forEach(row => {
            const formattedBalance = row.monthBalance.toFixed(2);
            const formattedQuarterly = row.hasQuarterly ? row.quarterlyBalance.toFixed(2) : "-";
            xml += `
      <Row>
        <Cell><Data ss:Type="String">${row.contractName}</Data></Cell>
        <Cell><Data ss:Type="String">${row.companyName}</Data></Cell>
        <Cell><Data ss:Type="String">${row.monthStr}</Data></Cell>
        <Cell><Data ss:Type="Number">${row.contractedHours.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${row.executedHours.toFixed(2)}</Data></Cell>
        <Cell><Data ss:Type="Number">${formattedBalance}</Data></Cell>
        <Cell><Data ss:Type="String">${formattedQuarterly}</Data></Cell>
      </Row>`;
          });

          xml += `
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Demandas Concluidas">
    <Table>
      <Column ss:Width="100"/>
      <Column ss:Width="250"/>
      <Column ss:Width="150"/>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Codigo</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Titulo Demanda</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Contrato Associado</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Empresa Faturamento</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Horas Cobradas</Data></Cell>
      </Row>`;

          allExcelDemands.forEach(d => {
            xml += `
      <Row>
        <Cell><Data ss:Type="String">CH-${d.numeroChamado}</Data></Cell>
        <Cell><Data ss:Type="String">${d.titulo}</Data></Cell>
        <Cell><Data ss:Type="String">${d.contractName}</Data></Cell>
        <Cell><Data ss:Type="String">${d.companyName}</Data></Cell>
        <Cell><Data ss:Type="Number">${d.calculatedHours.toFixed(2)}</Data></Cell>
      </Row>`;
          });

          xml += `
    </Table>
  </Worksheet>
</Workbook>`;

          const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Relatorio_Horas_Contrato_Empresas_${new Date().toISOString().slice(0, 10)}.xls`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="space-y-6 animate-fade-in font-sans">
            {/* Extended configuration box */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-5 items-stretch justify-between font-sans">
                {/* Contract Input + Consecutive Months Choices */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono flex items-center gap-1">
                      <Filter size={10} className="text-indigo-400" />
                      Contrato de Escopo
                    </label>
                    <select
                      value={filterContratoId}
                      onChange={(e) => setFilterContratoId(e.target.value)}
                      className="w-full bg-neutral-955 border border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Todos da Base</option>
                      {contratos.map(c => (
                        <option key={c.id} value={c.id}>{(c.numero ?? "S/N")} | {c.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      Mês Início de Período
                    </label>
                    <input
                      type="month"
                      value={filterDataInicio}
                      onChange={(e) => setFilterDataInicio(e.target.value)}
                      className="w-full bg-neutral-955 border border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      Mês Fim de Período
                    </label>
                    <input
                      type="month"
                      value={filterDataFim}
                      onChange={(e) => setFilterDataFim(e.target.value)}
                      className="w-full bg-neutral-955 border border-neutral-850 rounded-xl px-4 py-2 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Calculation Type Toggle Block */}
                <div className="flex flex-col justify-center space-y-1.5 sm:min-w-[280px]">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                    Método de Faturamento de Horas
                  </label>
                  <div className="bg-neutral-950 border border-neutral-800 p-1 rounded-xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => setBillingSource("estimativa")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                        billingSource === "estimativa"
                          ? "bg-indigo-600 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Por Estimativa
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingSource("apontamentos")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
                        billingSource === "apontamentos"
                          ? "bg-indigo-600 text-white"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Por Apontamentos
                    </button>
                  </div>
                </div>

                {/* Export Action Block */}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={triggerExcelExport}
                    className="w-full lg:w-auto bg-indigo-605 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer font-sans"
                  >
                    <Table size={15} />
                    <span>Exportar Excel (Duas Abas)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main reporting table view */}
            <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest border-b border-neutral-850 pb-3 mb-4 flex items-center justify-between">
                <span>Contratos em Faturamento e Horas por Empresa Vinculada</span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {listMonths.length} meses consecutivos calculados
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-mono text-[10px]">
                      <th className="py-3 px-4">Contrato</th>
                      <th className="py-3 px-4">Empresa Vinculada</th>
                      <th className="py-3 px-4">Mês Competência</th>
                      <th className="py-3 px-4 text-center">Horas Contratadas</th>
                      <th className="py-3 px-4 text-center">Horas Executadas ({billingSource === "estimativa" ? "Estimada" : "Apontada"})</th>
                      <th className="py-3 px-4 text-center">Saldo Mês</th>
                      <th className="py-3 px-4 text-center">Saldo Trimestre Acumulativo</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-350">
                    {reportRows.map((row) => {
                      const expanded = !!expandedRows[row.key];
                      const isPositive = row.monthBalance >= 0;
                      const hasQuarterlyVal = row.hasQuarterly;

                      return (
                        <React.Fragment key={row.key}>
                          <tr className="hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-neutral-250">{row.contractName}</td>
                            <td className="py-3.5 px-4 font-medium text-neutral-300">{row.companyName}</td>
                            <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{row.monthStr}</td>
                            <td className="py-3.5 px-4 text-center font-mono text-neutral-200 font-semibold">{row.contractedHours.toFixed(2)}h</td>
                            <td className="py-3.5 px-4 text-center font-mono text-neutral-200 font-semibold">{row.executedHours.toFixed(2)}h</td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPositive 
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                              }`}>
                                {row.monthBalance >= 0 ? "+" : ""}{row.monthBalance.toFixed(2)}h
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {hasQuarterlyVal ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.quarterlyBalance >= 0 
                                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                                }`}>
                                  {row.quarterlyBalance >= 0 ? "+" : ""}{row.quarterlyBalance.toFixed(2)}h
                                </span>
                              ) : (
                                <span className="text-neutral-500 font-bold">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedRows(prev => ({ ...prev, [row.key]: !prev[row.key] }));
                                }}
                                className="px-2.5 py-1 bg-neutral-950/60 border border-neutral-800 hover:border-indigo-505 rounded-lg text-[10px] font-bold text-neutral-400 hover:text-indigo-400 transition-all cursor-pointer font-sans"
                              >
                                {expanded ? "Recolher" : `Ver Demandas (${row.demands.length})`}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded sub-table showing linked demands */}
                          {expanded && (
                            <tr>
                              <td colSpan={8} className="bg-neutral-900/50 p-4 border-l-2 border-indigo-500">
                                <div className="space-y-2 font-sans pl-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                      Detalhamento de demandas contidas no fechamento do faturamento
                                    </h4>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                      {row.demands.length} chamado(s) faturável(eis)
                                    </span>
                                  </div>

                                  {row.demands.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {row.demands.map((dem: any) => (
                                        <div 
                                          key={dem.id} 
                                          className="bg-neutral-955 p-2.5 rounded-xl border border-neutral-850 flex items-center justify-between shadow-sm"
                                        >
                                          <div>
                                            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono">CH-{dem.numeroChamado}</span>
                                            <p className="text-xs font-semibold text-neutral-200 line-clamp-1">{dem.titulo}</p>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-indigo-400">{dem.hours.toFixed(2)}h</span>
                                            <p className="text-[9px] text-neutral-500">{dem.tipo}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-neutral-500 italic pl-1 font-sans">
                                      Nenhuma demanda foi cadastrada ou cobrada para esta vinculação de empresa no mês de competência {row.monthStr}.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {reportRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-neutral-500 italic">
                          Nenhum contrato ativo com empresas associadas foi encontrado no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {activeReport === "ifoodGMZ" && (() => {
        const gmzMembros = pessoas.filter(p => p.tipo === "GMZ");
        return (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in" id="ifood-report-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  Benefício iFood dos Colaboradores (GMZ)
                </h3>
                <p className="text-xs text-neutral-400">
                  Informações cadastrais e de rateio financeiro de iFood dos profissionais GMZ Solutions.
                </p>
              </div>
              <button
                onClick={() => {
                  const headers = ["Nome", "CPF", "Data de Nascimento", "Email", "Celular", "Valor do Ifood"];
                  const data = gmzMembros.map(p => [
                    p.nome,
                    p.cpf || "",
                    p.dataAniversario ? new Date(p.dataAniversario + "T12:00:00").toLocaleDateString("pt-BR") : "",
                    p.email,
                    p.telefone || "",
                    p.recebeIfood ? `R$ ${(p.valorIfood || 0).toFixed(2)}` : "R$ 0,00"
                  ]);
                  exportToExcel(data, headers, "relatorio_ifood");
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-505 text-neutral-100 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <Download size={14} />
                Exportar para Excel (iFood)
              </button>
            </div>

            <div className="overflow-x-auto border border-neutral-850 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                    <th className="p-3">Nome</th>
                    <th className="p-3">CPF</th>
                    <th className="p-3">Data de Nascimento</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Celular</th>
                    <th className="p-3 text-right">Valor do iFood</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 bg-neutral-900/40 text-neutral-300">
                  {gmzMembros.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-neutral-500 font-mono">Nenhum colaborador GMZ ativo.</td>
                    </tr>
                  ) : (
                    gmzMembros.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-850/30 transition-all">
                        <td className="p-3 font-semibold text-neutral-200">{p.nome}</td>
                        <td className="p-3 font-mono">{p.cpf || <span className="text-neutral-600">-</span>}</td>
                        <td className="p-3 font-mono">
                          {p.dataAniversario ? new Date(p.dataAniversario + "T12:00:00").toLocaleDateString("pt-BR") : <span className="text-neutral-600">-</span>}
                        </td>
                        <td className="p-3">{p.email}</td>
                        <td className="p-3 font-mono">{p.telefone || <span className="text-neutral-600">-</span>}</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-400">
                          {p.recebeIfood ? `R$ ${(p.valorIfood || 0).toFixed(2)}` : <span className="text-neutral-500">R$ 0,00</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {activeReport === "cadastralGMZ" && (() => {
        const gmzMembros = pessoas.filter(p => p.tipo === "GMZ");
        return (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-sm animate-fade-in" id="cadastral-report-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  Ficha Cadastral GMZ Solutions
                </h3>
                <p className="text-xs text-neutral-400">
                  CPFs, contatos e endereços unificados de todos os profissionais do grupo GMZ Solutions.
                </p>
              </div>
              <button
                onClick={() => {
                  const headers = ["Nome", "CPF", "Endereço Completo"];
                  const data = gmzMembros.map(p => {
                    const addressParts = [
                      p.endereco,
                      p.cep ? `CEP ${p.cep}` : "",
                      p.cidade,
                      p.estado
                    ].filter(Boolean);
                    const unifiedAddress = addressParts.join(", ");
                    return [
                      p.nome,
                      p.cpf || "",
                      unifiedAddress || "Endereço Completo não informado"
                    ];
                  });
                  exportToExcel(data, headers, "relatorio_colaboradores_gmz");
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-505 text-neutral-100 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <Download size={14} />
                Exportar para Excel (Colaboradores)
              </button>
            </div>

            <div className="overflow-x-auto border border-neutral-850 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                    <th className="p-3 w-1/4">Nome</th>
                    <th className="p-3 w-1/4">CPF</th>
                    <th className="p-3 w-2/4">Endereço Completo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 bg-neutral-900/40 text-neutral-300">
                  {gmzMembros.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-neutral-500 font-mono">Nenhum colaborador GMZ cadastrado.</td>
                    </tr>
                  ) : (
                    gmzMembros.map(p => {
                      const addressParts = [
                        p.endereco,
                        p.cep ? `CEP ${p.cep}` : "",
                        p.cidade,
                        p.estado
                      ].filter(Boolean);
                      const unifiedAddress = addressParts.join(", ");

                      return (
                        <tr key={p.id} className="hover:bg-neutral-850/30 transition-all">
                          <td className="p-3 font-semibold text-neutral-200">{p.nome}</td>
                          <td className="p-3 font-mono text-neutral-350">{p.cpf || <span className="text-neutral-600">-</span>}</td>
                          <td className="p-3 text-neutral-300 font-medium whitespace-normal">
                            {unifiedAddress || <span className="text-neutral-550 italic">Endereço não cadastrado</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
