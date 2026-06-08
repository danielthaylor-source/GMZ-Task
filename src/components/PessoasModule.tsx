/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB, encryptPassword } from "../dbState";
import { Plus, Edit2, Trash2, Search, User, Mail, Phone, ShieldCheck, CheckSquare, Square, Calendar, Key, Camera, Image, Download, FileSpreadsheet } from "lucide-react";
import { Pessoa } from "../types";
import { ConfirmModal } from "./ConfirmModal";

export const PessoasModule: React.FC = () => {
  const { pessoas, acessos, addPessoa, updatePessoa, deletePessoa, activeUser } = useDB();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"GMZ" | "Cliente" | "Outros">("Cliente");
  const [selectedModulos, setSelectedModulos] = useState<string[]>(["demandas", "agenda"]);
  
  // New States for User Management Extensions
  const [dataAniversario, setDataAniversario] = useState("");
  const [dataContratacao, setDataContratacao] = useState("");
  const [foto, setFoto] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<string>("Técnico");

  // New fields for GMZ
  const [endereco, setEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cpf, setCpf] = useState("");
  const [recebeIfood, setRecebeIfood] = useState(false);
  const [valorIfood, setValorIfood] = useState<number | "">("");

  const [editId, setEditId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const availableModulos = [
    { id: "empresas", label: "Gestão de Empresas" },
    { id: "pessoas", label: "Controle de Pessoas (RBAC)" },
    { id: "contratos", label: "Contratos & Anexos" },
    { id: "projetos", label: "Workflow Projetos" },
    { id: "demandas", label: "Quadro Kanban (Demandas)" },
    { id: "agenda", label: "Agenda Centralizada" },
    { id: "relatorios", label: "Relatórios ERP" },
    { id: "smtp", label: "SMTP Email" },
    { id: "rh_admin", label: "Recursos Humanos (Administrador)" },
    { id: "rh_comum", label: "Recursos Humanos (Colaborador Comum)" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;

    const payload: Partial<Pessoa> = {
      nome,
      email,
      telefone,
      tipo,
      dataAniversario: dataAniversario || "",
      dataContratacao: tipo === "GMZ" ? (dataContratacao || "") : "",
      foto: foto || "",
      perfil: perfil,
      endereco: tipo === "GMZ" ? endereco : "",
      cep: tipo === "GMZ" ? cep : "",
      cidade: tipo === "GMZ" ? cidade : "",
      estado: tipo === "GMZ" ? estado : "",
      cpf: tipo === "GMZ" ? cpf : "",
      recebeIfood: tipo === "GMZ" ? recebeIfood : false,
      valorIfood: tipo === "GMZ" && recebeIfood ? Number(valorIfood) || 0 : 0
    };

    if (senha.trim() !== "") {
      payload.senha = encryptPassword(senha);
    }

    if (editId) {
      updatePessoa(editId, payload, selectedModulos);
      setEditId(null);
    } else {
      if (!payload.senha) {
        payload.senha = encryptPassword("123"); // default password 123
      }
      addPessoa({
        nome: payload.nome!,
        email: payload.email!,
        telefone: payload.telefone || "",
        tipo: payload.tipo!,
        dataAniversario: payload.dataAniversario,
        dataContratacao: payload.dataContratacao,
        foto: payload.foto,
        senha: payload.senha,
        perfil: perfil,
        endereco: payload.endereco,
        cep: payload.cep,
        cidade: payload.cidade,
        estado: payload.estado,
        cpf: payload.cpf,
        recebeIfood: payload.recebeIfood,
        valorIfood: payload.valorIfood
      }, selectedModulos);
    }

    // Reset everything
    setNome("");
    setEmail("");
    setTelefone("");
    setTipo("Cliente");
    setDataAniversario("");
    setDataContratacao("");
    setFoto("");
    setSenha("");
    setPerfil("Técnico");
    setEndereco("");
    setCep("");
    setCidade("");
    setEstado("");
    setCpf("");
    setRecebeIfood(false);
    setValorIfood("");
    setSelectedModulos(["demandas", "agenda"]);
    setShowModal(false);
  };

  const handleEdit = (p: Pessoa) => {
    setEditId(p.id);
    setNome(p.nome);
    setEmail(p.email);
    setTelefone(p.telefone);
    setTipo(p.tipo);
    setDataAniversario(p.dataAniversario || "");
    setDataContratacao(p.dataContratacao || "");
    setFoto(p.foto || "");
    setSenha(""); // keep empty for changes only
    setPerfil(p.perfil || (p.tipo === "GMZ" ? "Técnico" : p.tipo === "Cliente" ? "Cliente" : "Outros"));
    setEndereco(p.endereco || "");
    setCep(p.cep || "");
    setCidade(p.cidade || "");
    setEstado(p.estado || "");
    setCpf(p.cpf || "");
    setRecebeIfood(!!p.recebeIfood);
    setValorIfood(p.valorIfood !== undefined && p.valorIfood !== null ? p.valorIfood : "");
    
    const userAccess = acessos.find((ac) => ac.id_pessoa === p.id);
    setSelectedModulos(userAccess ? userAccess.modulos : []);
    setShowModal(true);
  };

  const toggleModulo = (modId: string) => {
    setSelectedModulos((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const filtered = pessoas.filter(
    (p) => {
      const nameVal = (p.nome || (p as any).name || "").toLowerCase();
      const emailVal = (p.email || "").toLowerCase();
      const tipoVal = (p.tipo || "").toLowerCase();
      return (
        nameVal.includes(search.toLowerCase()) ||
        emailVal.includes(search.toLowerCase()) ||
        tipoVal.includes(search.toLowerCase())
      );
    }
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Controle de Membros & Permissões (RBAC)</h2>
          <p className="text-sm text-neutral-400 font-sans">
            Cadastro de colaboradores, clientes, parceiros de negócio e suas respectivas chaves de visibilidade de telas.
          </p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setNome("");
            setEmail("");
            setTelefone("");
            setTipo("Cliente");
            setDataAniversario("");
            setDataContratacao("");
            setFoto("");
            setSenha("");
            setEndereco("");
            setCep("");
            setCidade("");
            setEstado("");
            setCpf("");
            setRecebeIfood(false);
            setValorIfood("");
            setSelectedModulos(["demandas", "agenda"]);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-neutral-100 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Cadastrar Pessoa
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs text-neutral-400 sm:ml-auto">
          Mostrando <span className="text-neutral-100 font-semibold">{filtered.length}</span> de{" "}
          <span className="text-neutral-100 font-semibold">{pessoas.length}</span> pessoas cadastradas
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const userAccess = acessos.find((ac) => ac.id_pessoa === p.id);
          const allowed = userAccess ? userAccess.modulos : [];
          const displayName = p.nome || (p as any).name || "Sem Nome";

          return (
            <div
              key={p.id}
              className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 p-5 rounded-2xl flex flex-col justify-between transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-850 border border-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                    {p.foto ? (
                      <img src={p.foto} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-bold text-neutral-300 uppercase select-none">
                        {displayName.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                      {displayName}
                      {activeUser?.id === p.id && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-full uppercase">Você</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <Mail size={12} className="text-neutral-500" />
                        {p.email}
                      </span>
                      {p.telefone && (
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                          <Phone size={12} className="text-neutral-500" />
                          {p.telefone}
                        </span>
                      )}
                      {p.dataAniversario && (
                        <span className="text-[11px] text-pink-400 flex items-center gap-1 animate-fade-in" title="Aniversário de Nascimento">
                          <Calendar size={12} className="text-pink-500 shrink-0" />
                          Aniv: {new Date(p.dataAniversario + "T12:00:00").toLocaleDateString("pt-BR", {day: "numeric", month: "short"})}
                        </span>
                      )}
                      {p.tipo === "GMZ" && p.dataContratacao && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 animate-fade-in" title="Contratado em">
                          <Calendar size={12} className="text-emerald-500 shrink-0" />
                          Admissão: {new Date(p.dataContratacao + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badge trigger color */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                    p.tipo === "GMZ"
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      : p.tipo === "Cliente"
                      ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                      : "bg-neutral-500/10 border-neutral-500/20 text-neutral-400"
                  }`}>
                    {p.tipo} User
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                    {(p.perfil || (p.tipo === "GMZ" ? "Técnico" : p.tipo)).split(",").map(pref => pref.trim()).filter(Boolean).map((pref) => (
                      <div key={pref} className={`text-[8.5px] font-bold px-2 py-0.5 rounded-lg border tracking-wide uppercase font-mono ${
                        pref === "Administrador"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : pref === "Técnico"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : pref === "Gerencial"
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                          : pref === "Cliente"
                          ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          : "bg-neutral-800 border-neutral-700/50 text-neutral-400"
                      }`}>
                        {pref}
                      </div>
                    ))}
                  </div>
                </div>
              {/* Collateral RBAC accesses list display on card */}
              <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-850 mt-4 flex items-center gap-2.5 bg-neutral-950/40">
                <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
                <div className="text-left">
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Permissões de Acesso</span>
                  <span className="block text-[10px] text-neutral-500 leading-normal mt-0.5 animate-pulse">
                    Permissões de tela gerenciadas por perfil em <strong className="text-indigo-400 font-mono">Permissões de Acesso</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons list */}
              <div className="flex items-center justify-end gap-2 border-t border-neutral-850 mt-5 pt-4">
                <button
                  onClick={() => handleEdit(p)}
                  className="p-2 cursor-pointer bg-neutral-955 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-neutral-400 hover:text-indigo-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Edit2 size={13} />
                  Editar Cadastro
                </button>
                <button
                  onClick={() => {
                    setConfirmState({
                      isOpen: true,
                      title: "Excluir Pessoa",
                      description: `Excluir permanentemente o cadastro de "${displayName}" do Firestore? Todas as permissões e dados serão apagados definitivamente.`,
                      onConfirm: () => deletePessoa(p.id)
                    });
                  }}
                  className="p-2 cursor-pointer bg-neutral-955 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 rounded-lg text-neutral-500 hover:text-rose-400 transition-all flex items-center gap-1.5 text-xs"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-neutral-900/40 border border-neutral-850 rounded-2xl">
            <User className="mx-auto text-neutral-600 mb-3" size={36} />
            <p className="text-neutral-400 text-sm">Nenhuma pessoa encontrada na base de dados.</p>
          </div>
        )}
      </div>

      {/* CADASTRO & ALTERAR ACESSOS MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-neutral-100">
                {editId ? "Editar Credenciais & Acessos RBAC" : "Cadastrar Pessoa Coletiva"}
              </h3>
              <p className="text-xs text-neutral-400">
                Configuração direta da tabela Pessoas e coleção Acessos (NoSQL Firestore).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Daniel Thaylor"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">E-mail Comercial (Log-in Firebase)</label>
                  <input
                    type="email"
                    required
                    placeholder="daniel.thaylor@gmz.solutions"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300">Celular / Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-5555"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300">Tipo de Usuário</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["GMZ", "Cliente", "Outros"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTipo(t as any);
                          if (t !== "GMZ") {
                            setDataContratacao("");
                          }
                          // Auto set matching default profile if not set
                          if (t === "GMZ") setPerfil("Técnico");
                          else if (t === "Cliente") setPerfil("Cliente");
                          else setPerfil("Outros");
                        }}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                          tipo === t
                            ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700/80"
                        }`}
                      >
                        {t} Group
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-indigo-400" />
                    Perfis Funcionais Acumulativos (Regras de Priorização / Simulação)
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {["Administrador", "Técnico", "Gerencial", "Cliente", "Outros"].map((perf) => {
                      const selectedProfiles = (perfil || "").split(",").map(p => p.trim()).filter(Boolean);
                      const isSelected = selectedProfiles.includes(perf);
                      return (
                        <button
                          key={perf}
                          type="button"
                          onClick={() => {
                            let newProfiles: string[];
                            if (isSelected) {
                              newProfiles = selectedProfiles.filter(p => p !== perf);
                            } else {
                              newProfiles = [...selectedProfiles, perf];
                            }
                            if (newProfiles.length === 0) {
                              newProfiles = ["Técnico"];
                            }
                            setPerfil(newProfiles.join(", "));
                          }}
                          className={`py-2 px-1 border rounded-xl text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-605 bg-amber-500/10 border-amber-500 text-amber-400 shadow-xs"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700/80"
                          }`}
                        >
                          {perf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Password Setting Field */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <Key size={12} className="text-indigo-400" />
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    placeholder={editId ? "Deixe em branco p/ manter" : "Senha (padrão: 123)"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Birthday Input Field */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <Calendar size={12} className="text-pink-400" />
                    Data de Aniversário
                  </label>
                  <input
                    type="date"
                    value={dataAniversario}
                    onChange={(e) => setDataAniversario(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 focus:outline-hidden transition-all [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                {/* GMZ Hiring Date picker (visible only to GMZ users) */}
                {tipo === "GMZ" && (
                  <div className="space-y-1.5 col-span-2 sm:col-span-1 animate-fade-in/70">
                    <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Calendar size={12} className="text-emerald-400 shrink-0" />
                      Data de Contratação
                    </label>
                    <input
                      type="date"
                      value={dataContratacao}
                      onChange={(e) => setDataContratacao(e.target.value)}
                      className="w-full bg-neutral-950 border border-indigo-900/30 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-neutral-100 focus:outline-hidden transition-all [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                )}

                {/* Dados Extras GMZ (Endereço, CEP, Cidade, Estado, CPF, iFood) */}
                {tipo === "GMZ" && (
                  <div className="col-span-2 space-y-4 border border-neutral-800/60 bg-neutral-950/40 p-4 rounded-xl mt-2 animate-fade-in">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Ficha Adicional GMZ</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">CPF</label>
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">CEP</label>
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold text-neutral-300">Endereço Completo</label>
                        <input
                          type="text"
                          placeholder="Rua, número, complemento, bairro"
                          value={endereco}
                          onChange={(e) => setEndereco(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Cidade</label>
                        <input
                          type="text"
                          placeholder="Ex: São Paulo"
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-300">Estado</label>
                        <input
                          type="text"
                          placeholder="Ex: SP"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 border-t border-neutral-800/40 pt-3">
                        <label className="text-xs font-bold text-neutral-300 block mb-1">Recebe Auxílio iFood?</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
                              <input
                                type="radio"
                                checked={recebeIfood === true}
                                onChange={() => setRecebeIfood(true)}
                                className="text-indigo-600 border-neutral-800 focus:ring-indigo-500 cursor-pointer"
                              />
                              Sim
                            </label>
                            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
                              <input
                                type="radio"
                                checked={recebeIfood === false}
                                onChange={() => {
                                  setRecebeIfood(false);
                                  setValorIfood("");
                                }}
                                className="text-indigo-600 border-neutral-800 focus:ring-indigo-500 cursor-pointer"
                              />
                              Não
                            </label>
                          </div>
                          {recebeIfood && (
                            <div className="flex-1 animate-scale-in">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                placeholder="Valor do Benefício (R$)"
                                value={valorIfood}
                                onChange={(e) => setValorIfood(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full bg-neutral-950 border border-indigo-900/35 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-hidden transition-all font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo Upload and selection field */}
                <div className={`space-y-1.5 col-span-2 ${tipo === "GMZ" ? "sm:col-span-1" : "sm:col-span-2"}`}>
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                    <Camera size={12} className="text-indigo-400" />
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-3 bg-neutral-950 p-2 border border-neutral-800 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                      {foto ? (
                        <img src={foto} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={16} className="text-neutral-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer py-1.5 px-3 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 hover:border-neutral-700 rounded-lg text-[11px] font-bold text-neutral-300 transition-all text-center block">
                        Carregar Imagem...
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => {
                                setFoto(r.result as string);
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {foto && (
                      <button
                        type="button"
                        onClick={() => setFoto("")}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline font-semibold shrink-0 cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>
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
                  {editId ? "Confirmar Alterações" : "Cadastrar Pessoa"}
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
