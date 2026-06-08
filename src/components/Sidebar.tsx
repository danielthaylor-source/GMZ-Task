/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useDB } from "../dbState";
import { 
  Building2, Users, FileText, ClipboardList, Calendar, 
  Settings, LogOut, ChevronLeft, ChevronRight, Menu, 
  ShieldCheck, CircleDot, RefreshCw, LogIn, Zap, Home, Mail, ChevronDown, Flame, Clock
} from "lucide-react";

interface SidebarProps {
  currentModule: string;
  setCurrentModule: (module: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentModule, setCurrentModule }) => {
  const { 
    activeUser, activeUserAcessos, logout, simulatedLogin, updatePessoa, pessoas, isSyncing, forceSync 
  } = useDB();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Collapse state for submenus/categories
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({
    "Gestão do Sistema": true,
    "Minha Jornada": true,
    "Área Gerencial": true
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUser) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updatePessoa(activeUser.id, { foto: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    folder: "Gestão do Sistema" | "Minha Jornada" | "Área Gerencial";
  }

  const menuItems: MenuItem[] = [
    // Gestão do Sistema Category
    { id: "empresas", label: "Empresas", icon: <Building2 size={17} />, folder: "Gestão do Sistema" },
    { id: "contratos", label: "Contratos", icon: <FileText size={17} />, folder: "Gestão do Sistema" },
    { id: "projetos", label: "Workflow Projetos", icon: <Settings size={17} />, folder: "Gestão do Sistema" },
    { id: "pessoas", label: "Pessoas (Cadastro)", icon: <Users size={17} />, folder: "Gestão do Sistema" },
    { id: "smtp", label: "E-mails", icon: <Mail size={17} />, folder: "Gestão do Sistema" },
    { id: "permissoes", label: "Permissões de Acesso", icon: <ShieldCheck size={17} />, folder: "Gestão do Sistema" },

    // Minha Jornada Category
    { id: "agenda", label: "Agenda Pessoal", icon: <Calendar size={17} />, folder: "Minha Jornada" },
    { id: "fila_prioridades", label: "Fila de Prioridades & Tarefas", icon: <Zap size={17} />, folder: "Minha Jornada" },
    { id: "demandas", label: "Kambam", icon: <ClipboardList size={17} />, folder: "Minha Jornada" },
    { id: "apontamentos_pessoal", label: "Apontamentos (Horas)", icon: <Clock size={17} />, folder: "Minha Jornada" },
    { id: "meus_beneficios", label: "Horas Extras, Férias & One-to-One", icon: <Calendar size={17} />, folder: "Minha Jornada" },

    // Área Gerencial Category
    { id: "rrhh", label: "Recursos Humanos", icon: <Users size={17} />, folder: "Área Gerencial" },
    { id: "relatorios", label: "Relatórios", icon: <FileText size={17} />, folder: "Área Gerencial" },
    { id: "fila_prioridades_gerencial", label: "Fila de Prioridades Gerencial", icon: <Zap size={17} />, folder: "Área Gerencial" },
    { id: "apontamentos_gerencial", label: "Apontamentos Gerencial", icon: <Clock size={17} />, folder: "Área Gerencial" },
    { id: "agenda_grupo", label: "Agenda Empresarial", icon: <Calendar size={17} />, folder: "Área Gerencial" },
  ];

  const isAdmin = activeUser?.perfil === "Administrador";

  const checkModuloAccess = (item: MenuItem): boolean => {
    if (activeUserAcessos) {
      return activeUserAcessos.includes(item.id);
    }
    // Fallback if not logged in / synchronized yet
    if (activeUser?.perfil === "Administrador") return true;
    return ["agenda", "fila_prioridades", "demandas", "meus_beneficios", "apontamentos_pessoal"].includes(item.id);
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  const handleMenuClick = (id: string) => {
    setCurrentModule(id);
  };

  const foldersList = ["Gestão do Sistema", "Minha Jornada", "Área Gerencial"] as const;

  const displayFolderLabel = (f: string) => {
    if (f === "Gestão do Sistema") return "Gestão do Sistema - Perfil Administrador";
    if (f === "Minha Jornada") return "Minha Jornada - Perfil Técnico";
    if (f === "Área Gerencial") return "Área Gerencial - Perfil Gerencial";
    return f;
  };

  return (
    <aside 
      className={`relative h-screen bg-neutral-900 border-r border-neutral-80 & flex flex-col transition-all duration-300 z-30 font-sans shrink-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-neutral-100 text-sm shadow-md animate-pulse">
              G
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-neutral-100 uppercase">GMZ Task</h1>
              <span className="text-[10px] text-indigo-400 font-mono block">TASK & WORKFLOW</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-neutral-100 text-sm mx-auto shadow-md">
            G
          </div>
        )}

        {/* Toggle Collapse Button */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-805 p-1.5 rounded-lg transition"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Sync State Indicator info */}
      <div className="px-4 py-2.5 bg-neutral-950/40 border-b border-neutral-800 flex flex-col gap-2">
        <div className={`flex items-center justify-between ${isCollapsed ? "justify-center" : ""}`}>
          {!isCollapsed && (
            <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? "bg-indigo-400 animate-ping" : "bg-emerald-500"}`}></span>
              {isSyncing ? "Sync..." : "Firestore Ativo"}
            </span>
          )}
          <button 
            onClick={forceSync}
            disabled={isSyncing}
            className={`text-neutral-400 hover:text-neutral-200 font-mono text-xs flex items-center gap-1 transition ${
              isSyncing ? "animate-spin text-indigo-500" : ""
            }`}
            title="Sincronizar Banco"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Submenus Folders and Links */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-4 px-3 scrollbar-thin">
        {foldersList.map((folder) => {
          // Filter items that belong to folder and user has access
          const itemsInFolder = menuItems.filter(item => item.folder === folder && checkModuloAccess(item));
          
          if (itemsInFolder.length === 0) return null;
          
          const isExpanded = expandedFolders[folder];

          return (
            <div key={folder} className="space-y-1.5">
              {/* Folder Accordion Header */}
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleFolder(folder)}
                  className="w-full text-left px-3 py-1 flex items-center justify-between text-neutral-550 hover:text-neutral-300 text-[9.5px] uppercase font-bold tracking-widest transition-all"
                >
                  <span>{displayFolderLabel(folder)}</span>
                  <ChevronDown 
                    size={11} 
                    className={`transition-transform duration-200 ${isExpanded ? "" : "-rotate-90 text-neutral-600"}`} 
                  />
                </button>
              )}

              {/* Collapsed items view */}
              {(isExpanded || isCollapsed) && (
                <div className="space-y-0.5">
                  {itemsInFolder.map((item) => {
                    const isActive = currentModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                          isActive 
                            ? "bg-indigo-500/10 border border-indigo-500/15 text-indigo-300" 
                            : "bg-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-805 border border-transparent"
                        }`}
                      >
                        <div className={`transition-colors shrink-0 ${isActive ? "text-indigo-400" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                          {item.icon}
                        </div>
                        
                        {!isCollapsed && (
                          <span className="truncate text-xs font-semibold">{item.label}</span>
                        )}

                        {/* Collapsed Sidebar tooltip trigger */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-4 py-1.5 px-3 bg-neutral-950 border border-neutral-800 text-neutral-250 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl z-50 font-sans">
                            {item.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Expanse toggling control */}
      {isCollapsed && (
        <button 
          onClick={() => setIsCollapsed(false)}
          className="mx-auto my-4 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 p-2 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Active User Credentials & Simulated Switcher */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950/20">
        {activeUser && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setCurrentModule("perfil")}
              className="flex items-center gap-2.5 text-left w-full focus:outline-hidden group"
              title="Acessar Configurações do Perfil"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-805 border border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-500 transition-all">
                {activeUser.foto ? (
                  <img src={activeUser.foto} alt={activeUser.nome} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-bold text-neutral-300 uppercase">
                    {activeUser.nome.substring(0, 2)}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex-1 truncate min-w-0">
                  <h4 className="text-xs font-bold text-neutral-200 truncate group-hover:text-indigo-400 transition-all leading-tight">{activeUser.nome}</h4>
                  <p className="text-[10px] text-neutral-500 truncate mt-0.5">{activeUser.email}</p>
                </div>
              )}
            </button>

            {!isCollapsed && (
              <div className="flex items-center justify-between bg-neutral-90 px-2.5 py-1.5 rounded-xl border border-neutral-850 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-amber-500 font-mono">
                  <ShieldCheck size={11} />
                  {activeUser.perfil || "Colaborador"}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="hover:text-indigo-400 transition underline cursor-pointer hover:font-bold text-indigo-500"
                  >
                    Simular
                  </button>
                )}
              </div>
            )}

            {showUserDropdown && !isCollapsed && isAdmin && (
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-2 flex flex-col gap-1 max-h-36 overflow-y-auto mt-1 shadow-2xl">
                <span className="text-[9px] font-bold text-neutral-500 uppercase px-2 py-1 tracking-wider">Trocar Usuário (Admin Test)</span>
                {pessoas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      simulatedLogin(p.email);
                      setShowUserDropdown(false);
                    }}
                    className={`text-left px-2 py-1.5 rounded-lg text-xs hover:bg-neutral-850 transition flex items-center justify-between ${
                      activeUser.id === p.id ? "text-indigo-400 font-bold bg-neutral-900" : "text-neutral-300"
                    }`}
                  >
                    <span className="truncate pr-2">{p.nome}</span>
                    <span className="text-[8.5px] font-mono text-neutral-500 bg-neutral-90 px-1 rounded">{p.perfil || p.tipo}</span>
                  </button>
                ))}
              </div>
            )}

            {!isCollapsed && (
              <button
                onClick={logout}
                className="w-full py-1.5 px-3 border border-neutral-800 hover:border-rose-905/40 hover:bg-rose-500/5 text-neutral-400 hover:text-rose-400 text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer font-bold"
              >
                <LogOut size={13} />
                Encerrar Sessão
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
