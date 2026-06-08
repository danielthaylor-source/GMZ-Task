/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { Plus, Edit2, Trash2, Search, Building2 } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

export const EmpresasModule: React.FC = () => {
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useDB();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
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

    if (editId) {
      updateEmpresa(editId, { nome });
      setEditId(null);
    } else {
      addEmpresa({ nome });
    }
    setNome("");
    setShowModal(false);
  };

  const handleEdit = (id: string, currentNome: string) => {
    setEditId(id);
    setNome(currentNome);
    setShowModal(true);
  };

  const filtered = empresas.filter((emp) =>
    emp.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Cadastro de Empresas</h2>
          <p className="text-sm text-neutral-400">Gerenciamento simples das entidades jurídicas parceiras e clientes.</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setNome("");
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/10 active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Cadastrar Empresa
        </button>
      </div>

      {/* Filter and stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs text-neutral-400 sm:ml-auto">
          Mostrando <span className="text-neutral-100 font-semibold">{filtered.length}</span> de{" "}
          <span className="text-neutral-100 font-semibold">{empresas.length}</span> empresas
        </div>
      </div>

      {/* Grid Grid representation of data cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp) => (
          <div
            key={emp.id}
            className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-xs hover:shadow-lg hover:shadow-indigo-500/[0.02]"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl h-fit">
                <Building2 size={20} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ID: {emp.id}</span>
                <h3 className="text-md font-semibold text-neutral-200 group-hover:text-neutral-100 transition-colors">
                  {emp.nome}
                </h3>
              </div>
            </div>

            {/* Actions strip */}
            <div className="flex items-center justify-end gap-2 border-t border-neutral-850 mt-5 pt-4">
              <button
                onClick={() => handleEdit(emp.id, emp.nome)}
                className="p-2 cursor-pointer bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-neutral-400 hover:text-indigo-400 transition-all flex items-center gap-1.5 text-xs font-medium"
                title="Editar Empresa"
              >
                <Edit2 size={13} />
                Editar
              </button>
              <button
                onClick={() => {
                  setConfirmState({
                    isOpen: true,
                    title: "Excluir Empresa",
                    description: `Tem certeza que deseja deletar a empresa "${emp.nome}"? Este cadastro será permanente removido do Firestore.`,
                    onConfirm: () => deleteEmpresa(emp.id)
                  });
                }}
                className="p-2 cursor-pointer bg-neutral-955 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 rounded-lg text-neutral-500 hover:text-rose-400 transition-all flex items-center gap-1.5 text-xs"
                title="Deletar Empresa"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-neutral-850 rounded-2xl">
            <Building2 className="mx-auto text-neutral-600 mb-3" size={36} />
            <p className="text-neutral-400 text-sm">Nenhuma empresa encontrada.</p>
          </div>
        )}
      </div>

      {/* CADASTRO MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-neutral-100">
                {editId ? "Editar Empresa" : "Cadastrar Nova Empresa"}
              </h3>
              <p className="text-xs text-neutral-400">Insira as informações básicas para cadastro no banco de dados.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Razão Social / Nome Fantasia</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TechNova LTDA"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                />
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
                  {editId ? "Salvar Alterações" : "Cadastrar"}
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
