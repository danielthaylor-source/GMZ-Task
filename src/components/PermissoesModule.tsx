/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { Shield, CheckSquare, Square, Save, ArrowRight, UserCheck, Plus, Trash2 } from "lucide-react";

export const PermissoesModule: React.FC = () => {
  const { profilePermissions, updateProfilePermissions, deleteProfilePermission, addToast } = useDB();
  const [selectedPerfil, setSelectedPerfil] = useState<string>("Técnico");
  const [modulesState, setModulesState] = useState<string[]>(
    profilePermissions[selectedPerfil] || []
  );
  
  const [novoPerfilNome, setNovoPerfilNome] = useState("");

  const perfisList = Object.keys(profilePermissions) as string[];

  const categorizedModules = [
    {
      group: "Gestão do Sistema - Perfil Administrador",
      items: [
        { id: "empresas", label: "Empresas", desc: "Acesso total à lista de corporações parceiras." },
        { id: "contratos", label: "Contratos", desc: "Visualização e aditamento de termos contratuais e medição." },
        { id: "projetos", label: "Workflow Projetos", desc: "Configuração global de colunas, atividades e equipes." },
        { id: "pessoas", label: "Pessoas (Cadastro)", desc: "Cadastro geral de colaboradores, sem toggles de RBAC." },
        { id: "grupo_emails", label: "Grupos de E-mails & Agenda", desc: "Criação de canais de emails e canhotos de eventos." },
        { id: "permissoes", label: "Permissões de Acesso", desc: "Tolerância ríspida das chaves de segurança dos perfis." },
        { id: "smtp", label: "Serviço de Notificação SMTP", desc: "Configuração do servidor SMTP de disparo e gerenciamento da fila de e-mails em lote." }
      ]
    },
    {
      group: "Minha Jornada - Perfil Técnico",
      items: [
        { id: "agenda", label: "Agenda Pessoal", desc: "Visualizar eventos atribuídos e incluir anotações pessoais." },
        { id: "fila_prioridades", label: "Fila de Prioridades & Tarefas", desc: "Quadro de tarefas prioritárias e gestor de ociosidade." },
        { id: "demandas", label: "Kambam", desc: "Atuação direta em demandas e mudas no quadro Kanban." },
        { id: "meus_beneficios", label: "Horas Extras, Férias & One-to-One", desc: "Solicitação de folgas e gozos e visualização de reuniões." }
      ]
    },
    {
      group: "Área Gerencial - Perfil Gerencial",
      items: [
        { id: "rrhh", label: "Recursos Humanos", desc: "Controle de aprovação de banco de horas e férias." },
        { id: "relatorios", label: "Relatórios", desc: "Gerar gráficos de horas, medição financeira e SLAs." },
        { id: "fila_prioridades_gerencial", label: "Fila de Prioridades Gerencial", desc: "Gestão de triagem de demandas e direção executiva." },
        { id: "agenda_grupo", label: "Agenda Empresarial", desc: "Atribuição de grupos e convocação de reuniões amplas." }
      ]
    }
  ];

  const handlePerfilSelect = (perfil: string) => {
    setSelectedPerfil(perfil);
    setModulesState(profilePermissions[perfil] || []);
  };

  const toggleModule = (id: string) => {
    setModulesState((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSavePermissions = async () => {
    try {
      const finalModules = modulesState.includes("home") ? modulesState : ["home", ...modulesState];
      await updateProfilePermissions(selectedPerfil, finalModules);
      addToast(`Permissões do Perfil ${selectedPerfil} salvas com sucesso!`, "success");
    } catch (_) {
      addToast("Erro ao gravar permissões.", "error");
    }
  };

  const handleCreatePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoPerfilNome.trim();
    if (!nomeLimpo) return;
    if (profilePermissions[nomeLimpo]) {
      addToast("Este perfil já existe!", "error");
      return;
    }
    await updateProfilePermissions(nomeLimpo, ["home"]);
    setSelectedPerfil(nomeLimpo);
    setModulesState(["home"]);
    setNovoPerfilNome("");
    addToast(`Perfil "${nomeLimpo}" criado com sucesso!`, "success");
  };

  const handleDeletePerfil = async (perfil: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (perfil === "Administrador" || perfil === "Técnico" || perfil === "Gerencial") {
      addToast("Os perfis padrão do sistema não podem ser removidos.", "error");
      return;
    }
    if (confirm(`Deseja realmente excluir o perfil "${perfil}"? Colaboradores vinculados perderão acessos especiais.`)) {
      await deleteProfilePermission(perfil);
      setSelectedPerfil("Técnico");
      setModulesState(profilePermissions["Técnico"] || []);
      addToast(`Perfil "${perfil}" foi removido do sistema.`, "info");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-left">
      {/* Title Header */}
      <div className="bg-neutral-900/40 border border-neutral-800 p-6 rounded-3xl">
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
          <Shield className="text-indigo-400" size={22} />
          Controle de Permissões de Perfis (RBAC)
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Gerencie permissões de acesso modular e crie perfis de cargos personalizados de forma dinâmica. O usuário especial Daniel Thaylor herda acessibilidade ampla automática sob qualquer perfil operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left pane: Profile selection & Creation */}
        <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-5">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block mb-3">
              Criar Novo Perfil
            </span>
            <form onSubmit={handleCreatePerfil} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Suporte, Auditoria"
                value={novoPerfilNome}
                onChange={(e) => setNovoPerfilNome(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-hidden focus:outline-hidden"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer flex items-center justify-center transition shrink-0"
                title="Adicionar Perfil"
              >
                <Plus size={16} />
              </button>
            </form>
          </div>

          <div className="border-t border-neutral-800/60 my-2"></div>

          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono block mb-3">
              Perfis de Acesso Ativos
            </span>

            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto scrollbar-thin">
              {perfisList.map((perf) => {
                const active = perf === selectedPerfil;
                const count = profilePermissions[perf]?.filter(m => m !== "home")?.length || 0;
                const isDefault = perf === "Administrador" || perf === "Técnico" || perf === "Gerencial";

                return (
                  <button
                    key={perf}
                    onClick={() => handlePerfilSelect(perf)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                      active
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                        : "bg-neutral-950/40 border-neutral-850 hover:border-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                        active ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-neutral-850 border-neutral-800 text-neutral-400"
                      }`}>
                        <UserCheck size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-neutral-105 truncate">{perf}</span>
                        <span className="block text-[10px] text-neutral-500">
                          {count} {count === 1 ? "tela liberada" : "telas liberadas"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePerfil(perf, e)}
                          className="p-1 px-1.5 rounded hover:bg-rose-950/40 text-neutral-500 hover:text-rose-400 cursor-pointer transition"
                          title="Remover Perfil"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <ArrowRight size={13} className={`text-neutral-600 transition-transform ${active ? "translate-x-1 text-indigo-400" : "group-hover:translate-x-1"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right pane: categorization matrix */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-200 font-sans">Definições de Acessos</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Ajustando visibilidades globais para o nível: <strong className="text-amber-500 font-mono text-[11px] tracking-wide uppercase">{selectedPerfil}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePermissions}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition active:scale-95 cursor-pointer shadow-lg font-sans"
            >
              <Save size={13} />
              Salvar Permissões
            </button>
          </div>

          <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin font-sans">
            {categorizedModules.map((cat) => (
              <div key={cat.group} className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-widest block bg-neutral-950/40 p-2 border border-neutral-855 rounded-lg">
                  {cat.group}
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.items.map((item) => {
                    const isChecked = modulesState.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleModule(item.id)}
                        className={`flex items-start gap-3 p-3 rounded-2xl transition hover:bg-neutral-950/40 text-xs text-neutral-300 text-left border cursor-pointer group ${
                          isChecked 
                            ? "border-indigo-500/20 bg-indigo-950/5 text-neutral-200" 
                            : "border-transparent bg-transparent hover:border-neutral-850"
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare size={16} className="text-indigo-500 animate-scale-in" />
                          ) : (
                            <Square size={16} className="text-neutral-700 group-hover:text-neutral-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-neutral-250 truncate">{item.label}</span>
                          <span className="block text-[10px] text-neutral-500 leading-normal mt-0.5">{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
