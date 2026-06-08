/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { GrupoEmail, Pessoa } from "../types";
import { Plus, Edit2, Trash2, Search, Mail, Users, CheckSquare, Square, X, Calendar, Info } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

export const GrupoEmailModule: React.FC = () => {
  const { grupoEmails, pessoas, addGrupoEmail, updateGrupoEmail, deleteGrupoEmail, activeUser } = useDB();
  
  const isGroupEmailAdmin = activeUser ? (
    activeUser.perfil?.includes("Administrador") || 
    activeUser.perfil?.includes("Gerencial") || 
    activeUser.tipo === "GMZ"
  ) : false;

  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selectedPessoas, setSelectedPessoas] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const payload = {
      nome,
      descricao: descricao || "",
      participantesIds: selectedPessoas
    };

    if (editId) {
      updateGrupoEmail(editId, payload);
    } else {
      addGrupoEmail(payload);
    }

    // Reset fields
    setNome("");
    setDescricao("");
    setSelectedPessoas([]);
    setEditId(null);
    setShowModal(false);
  };

  const handleEdit = (g: GrupoEmail) => {
    setEditId(g.id);
    setNome(g.nome);
    setDescricao(g.descricao || "");
    setSelectedPessoas(g.participantesIds || []);
    setShowModal(true);
  };

  const togglePessoaSelection = (pid: string) => {
    setSelectedPessoas((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const filteredGroups = grupoEmails.filter((g) => {
    const nomeVal = (g.nome || "").toLowerCase();
    const descVal = (g.descricao || "").toLowerCase();
    return nomeVal.includes(search.toLowerCase()) || descVal.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
            <Mail className="text-indigo-400" size={22} />
            Gestão de Grupos de E-mails & Agenda
          </h2>
          <p className="text-sm text-neutral-400">
            Crie listas de correspondência que servem para alertas automáticos de eventos criados na agenda empresarial.
          </p>
        </div>
        
        {isGroupEmailAdmin && (
          <button
            onClick={() => {
              setEditId(null);
              setNome("");
              setDescricao("");
              setSelectedPessoas([]);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 cursor-pointer ml-auto shrink-0"
          >
            <Plus size={16} />
            Criar Grupo de Alerta
          </button>
        )}
      </div>

      {/* Info Warning Tip */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-center gap-3 text-amber-400">
        <Info size={16} className="text-amber-500 shrink-0" />
        <span className="text-xs leading-normal">
          <strong>Integração de Agenda:</strong> Ao agendar qualquer evento de grupo na agenda corporativa, todos os membros do grupo de e-mail correspondente receberão um alerta de notificação SMTP e herdarão o compromisso em suas agendas individuais de forma automática.
        </span>
      </div>

      {/* Search Filter */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome do grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-955 border border-neutral-850 rounded-xl py-1.5 pl-10 pr-4 text-xs text-neutral-200 placeholder-neutral-550 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-neutral-400 sm:ml-auto font-mono">
          {filteredGroups.length} grupo(s) cadastrado(s)
        </div>
      </div>

      {/* Group Grid Display Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGroups.map((group) => {
          const totalMembersCount = group.participantesIds?.length || 0;

          return (
            <div
              key={group.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-705/85 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/20 border border-indigo-900/30 flex items-center justify-center text-indigo-400 font-bold">
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-200">{group.nome}</h3>
                      <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider block mt-0.5">Grupo ID: {group.id}</span>
                    </div>
                  </div>

                  <span className="text-[10px] bg-neutral-950 px-2 py-0.5 border border-neutral-850 rounded text-neutral-400 font-mono shrink-0">
                    {totalMembersCount} {totalMembersCount === 1 ? "Membro" : "Membros"}
                  </span>
                </div>

                <p className="text-xs text-neutral-450 leading-relaxed mt-4.5">
                  {group.descricao || "Sem justificativa ou descrição descrita para o grupo."}
                </p>

                {/* Integrantes List badges */}
                <div className="mt-4 pt-3 border-t border-neutral-850 space-y-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Integrantes Vinculados:</span>
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
                      <span className="text-[11px] text-neutral-600 italic">Disparo nulo - nenhum integrante.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer action targets */}
              {isGroupEmailAdmin && (
                <div className="flex items-center justify-end gap-2 border-t border-neutral-850 mt-5 pt-4">
                  <button
                    onClick={() => handleEdit(group)}
                    className="p-1 px-3 cursor-pointer bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-750 text-neutral-400 hover:text-indigo-400 transition-all rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Edit2 size={12} />
                    Editar Grupo
                  </button>
                  <button
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: "Deletar Grupo de E-mails",
                        description: `Tem certeza que deseja apagar o grupo "${group.nome}"? Os alertas da agenda para este grupo serão desconectados.`,
                        onConfirm: () => deleteGrupoEmail(group.id)
                      });
                    }}
                    className="p-1 px-3 cursor-pointer bg-neutral-955 hover:bg-rose-500/15 border border-neutral-850 text-neutral-500 hover:text-rose-400 transition-all rounded-lg text-xs flex items-center gap-1.5"
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
            <Mail className="mx-auto text-neutral-650 mb-3" size={36} />
            <p className="text-neutral-400 text-sm">Nenhum grupo de e-mail e agenda registrado.</p>
          </div>
        )}
      </div>

      {/* MODAL EDIT & CREATE GRUPO */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-805 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-800 bg-neutral-955">
              <h3 className="text-base font-bold text-neutral-100">
                {editId ? "Configurar Grupo de E-mails" : "Novo Grupo de E-mails para Alerta"}
              </h3>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Preencha os dados e escolha quais pessoas receberão as notificações SMTP automáticas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Nome do Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="EX: Departamento De Engenharia"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-300">Descrição Comercial / Justificativa</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Alinhamento de todos os desenvolvedores seniores e PMs de produto..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden resize-none"
                />
              </div>

              {/* Members Selection List */}
              <div className="space-y-2 border-t border-neutral-800/80 pt-4">
                <div>
                  <label className="text-xs font-bold text-neutral-200">Selecionar Membros Incorporados ({selectedPessoas.length} selecionados)</label>
                  <p className="text-[10px] text-neutral-500">Adicione pessoas da corporação para receberem os e-mails e herdarem os eventos na agenda.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-850 p-3 rounded-xl scrollbar-thin">
                  {pessoas.map((p) => {
                    const isChecked = selectedPessoas.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePessoaSelection(p.id)}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-900 text-left text-xs text-neutral-300 rounded-lg transition-colors cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare size={14} className="text-indigo-500 shrink-0" />
                        ) : (
                          <Square size={14} className="text-neutral-700 shrink-0" />
                        )}
                        <span className="truncate">{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-955 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 font-medium text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                >
                  {editId ? "Salvar Alterações" : "Gravar Grupo"}
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
