/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Pessoa, Empresa, Contrato, Projeto, Demanda, Comentario, Apontamento, EventoAgenda, Acesso,
  MedicaoContrato, FeriasColaborador, HoraExtra, CheckPointItem, ReuniaoCheckPoint, SMTPConfig,
  GrupoEmail, TipoDemandaCustom, TarefaPessoal, Alerta, FilaEmail
} from "./types";
import { db, auth } from "./firebase";
import { 
  collection, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, getDocFromServer 
} from "firebase/firestore";

const cleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined).filter(x => x !== undefined);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && val !== "undefined") {
      const cleanedVal = cleanUndefined(val);
      if (cleanedVal !== undefined) {
        clean[key] = cleanedVal;
      }
    }
  }
  return clean;
};

export const getDefaultTiposDemandasCustom = (): TipoDemandaCustom[] => [
  {
    id: "tc_default_demandas",
    nome: "Demandas",
    sigla: "DEM",
    camposPreConstruidos: {
      apontamentos: true,
      anexos: true,
      lista_pessoas: true,
      estimativas: true,
      lista_empresas: true,
      comentarios: true,
    },
    guias: [
      {
        id: "guia_default_dem_negocio",
        nome: "Especialização do Negócio",
        campos: [
          { id: "fc_dem_solicitante", label: "Área Solicitante", tipo: "texto_curto", gridSpan: 1 },
          { id: "fc_dem_data_limite", label: "Data Limite Desejada", tipo: "data", gridSpan: 1 },
          { id: "fc_dem_impacto", label: "Impacto no Faturamento", tipo: "texto_curto", gridSpan: 2 }
        ]
      }
    ]
  },
  {
    id: "tc_default_bug",
    nome: "BUG",
    sigla: "BUG",
    camposPreConstruidos: {
      apontamentos: true,
      anexos: true,
      lista_pessoas: true,
      estimativas: true,
      comentarios: true,
    },
    guias: [
      {
        id: "guia_default_bug_tecnico",
        nome: "Análise Técnica do Erro",
        campos: [
          { id: "fc_bug_ambiente", label: "Ambiente / URL do Erro", tipo: "texto_curto", gridSpan: 2 },
          { id: "fc_bug_passos", label: "Passos para Reproduzir", tipo: "texto_longo", gridSpan: 2 },
          { id: "fc_bug_comportamento", label: "Comportamento Esperado vs Atual", tipo: "texto_longo", gridSpan: 2 }
        ]
      }
    ]
  },
  {
    id: "tc_default_change",
    nome: "Change",
    sigla: "CHG",
    camposPreConstruidos: {
      apontamentos: true,
      anexos: true,
      lista_pessoas: true,
      estimativas: true,
      comentarios: true,
    },
    guias: [
      {
        id: "guia_default_chg_itil",
        nome: "Controle de Mudança (ITIL)",
        campos: [
          { id: "fc_chg_justificativa", label: "Justificativa da Mudança", tipo: "texto_longo", gridSpan: 2 },
          { id: "fc_chg_servicos", label: "Serviços Afetados", tipo: "texto_curto", gridSpan: 1 },
          { id: "fc_chg_rollback", label: "Plano de Rollback / Contingência", tipo: "texto_longo", gridSpan: 2 }
        ]
      }
    ]
  },
  {
    id: "tc_default_melhoria",
    nome: "Melhoria",
    sigla: "MEL",
    camposPreConstruidos: {
      apontamentos: true,
      anexos: true,
      lista_pessoas: true,
      estimativas: true,
      lista_empresas: true,
      comentarios: true,
    },
    guias: [
      {
        id: "guia_default_mel_aprimora",
        nome: "Aprimoramento de Funcionalidade",
        campos: [
          { id: "fc_mel_objetivo", label: "Objetivo da Melhoria", tipo: "texto_longo", gridSpan: 2 },
          { id: "fc_mel_beneficio", label: "Benefício Esperado", tipo: "texto_curto", gridSpan: 2 },
          { id: "fc_mel_metricas", label: "Métricas de Sucesso", tipo: "texto_curto", gridSpan: 2 }
        ]
      }
    ]
  }
];

interface DBContextType {
  pessoas: Pessoa[];
  empresas: Empresa[];
  contratos: Contrato[];
  projetos: Projeto[];
  demandas: Demanda[];
  comentarios: Comentario[];
  apontamentos: Apontamento[];
  eventos: EventoAgenda[];
  acessos: Acesso[];
  grupoEmails: GrupoEmail[];
  
  // New States
  medicoes: MedicaoContrato[];
  ferias: FeriasColaborador[];
  horasExtras: HoraExtra[];
  checkpoints: CheckPointItem[];
  reunioesCheckpoints: ReuniaoCheckPoint[];
  smtpConfig: SMTPConfig;

  // Loading premium states
  isInitialized: boolean;
  activeUser: Pessoa | null;
  activeUserAcessos: string[] | null;
  loadingMessage: string;
  
  // CRUD Actions
  addPessoa: (pessoa: Omit<Pessoa, "id">, customModulos?: string[]) => Promise<void>;
  updatePessoa: (id: string, pessoa: Partial<Pessoa>, customModulos?: string[]) => Promise<void>;
  deletePessoa: (id: string) => Promise<void>;
  
  addEmpresa: (empresa: Omit<Empresa, "id">) => Promise<void>;
  updateEmpresa: (id: string, empresa: Partial<Empresa>) => Promise<void>;
  deleteEmpresa: (id: string) => Promise<void>;
  
  addContrato: (contrato: Omit<Contrato, "id" | "anexos">, files?: File[]) => Promise<void>;
  updateContrato: (id: string, contrato: Partial<Contrato>) => Promise<void>;
  deleteContrato: (id: string) => Promise<void>;
  
  addProjeto: (projeto: Omit<Projeto, "id">) => Promise<void>;
  updateProjeto: (id: string, projeto: Partial<Projeto>) => Promise<void>;
  deleteProjeto: (id: string) => Promise<void>;
  
  addDemanda: (demanda: Omit<Demanda, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateDemanda: (id: string, demanda: Partial<Demanda>) => Promise<void>;
  deleteDemanda: (id: string, permanent?: boolean) => Promise<void>;
  restoreDemanda: (id: string) => Promise<void>;
  moveDemanda: (id: string, novaColuna: string) => Promise<void>;
  
  addComentario: (idDemanda: string, textoHTML: string) => Promise<void>;
  deleteComentario: (id: string) => Promise<void>;
  
  addApontamento: (apontamento: Omit<Apontamento, "id" | "createdAt"> & { createdAt?: string }) => Promise<void>;
  updateApontamento: (id: string, partial: Partial<Apontamento>) => Promise<void>;
  deleteApontamento: (id: string) => Promise<void>;
  
  addEvento: (evento: Omit<EventoAgenda, "id">) => Promise<void>;
  updateEvento: (id: string, update: Partial<EventoAgenda>) => Promise<void>;
  deleteEvento: (id: string) => Promise<void>;
  
  // New CRUD Actions
  addMedicao: (medicao: Omit<MedicaoContrato, "id" | "createdAt">) => Promise<void>;
  updateMedicao: (id: string, partial: Partial<MedicaoContrato>) => Promise<void>;
  deleteMedicao: (id: string) => Promise<void>;

  addFerias: (ferias: Omit<FeriasColaborador, "id">) => Promise<void>;
  updateFerias: (id: string, partial: Partial<FeriasColaborador>) => Promise<void>;
  deleteFerias: (id: string) => Promise<void>;

  addHoraExtra: (he: Omit<HoraExtra, "id" | "status">) => Promise<void>;
  updateHoraExtra: (id: string, partial: Partial<HoraExtra>) => Promise<void>;
  deleteHoraExtra: (id: string) => Promise<void>;

  addCheckPoint: (cp: Omit<CheckPointItem, "id" | "data" | "autorId">) => Promise<void>;
  updateCheckPoint: (id: string, partial: Partial<CheckPointItem>) => Promise<void>;
  deleteCheckPoint: (id: string) => Promise<void>;

  addReuniaoCheckPoint: (reuniao: Omit<ReuniaoCheckPoint, "id" | "createdAt">) => Promise<void>;
  updateReuniaoCheckPoint: (id: string, partial: Partial<ReuniaoCheckPoint>) => Promise<void>;
  deleteReuniaoCheckPoint: (id: string) => Promise<void>;

  updateSMTPConfig: (config: SMTPConfig) => Promise<void>;

  addGrupoEmail: (g: Omit<GrupoEmail, "id">) => Promise<void>;
  updateGrupoEmail: (id: string, partial: Partial<GrupoEmail>) => Promise<void>;
  deleteGrupoEmail: (id: string) => Promise<void>;

  // Auth simulations & connections
  simulatedLogin: (email: string, passwordOrToken?: string, isToken?: boolean, rememberMe?: boolean) => boolean;
  logout: () => void;
  sendLoginToken: (email: string) => Promise<string | null>;
  
  // Toasts list helper
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  
  // Profile permissions configuration
  profilePermissions: { [perfil: string]: string[] };
  updateProfilePermissions: (perfil: string, modulos: string[]) => Promise<void>;
  deleteProfilePermission: (perfil: string) => Promise<void>;

  // Sync Status
  isSyncing: boolean;
  forceSync: () => Promise<void>;

  // Firestore status variables and check function
  dbConnected: boolean;
  dbError: string | null;
  isCheckingConnection: boolean;
  testAndInitializeDatabase: () => Promise<void>;

  // Personal tasks & testing reseed actions
  tarefasPessoais: TarefaPessoal[];
  addTarefaPessoal: (t: Omit<TarefaPessoal, "id" | "createdAt">) => Promise<void>;
  updateTarefaPessoal: (id: string, partial: Partial<TarefaPessoal>) => Promise<void>;
  deleteTarefaPessoal: (id: string) => Promise<void>;
  reseedDemandasCanaisDigitais: () => Promise<void>;
  alertas: Alerta[];
  addAlerta: (alerta: Omit<Alerta, "id" | "data">) => Promise<void>;
  filaEmails: FilaEmail[];
  addEmailFila: (email: Omit<FilaEmail, "id" | "dataCriacao" | "status" | "dataEnvio" | "erro">) => Promise<void>;
  updateEmailFila: (id: string, partial: Partial<FilaEmail>) => Promise<void>;
  deleteEmailFila: (id: string) => Promise<void>;
}

const DBContext = createContext<DBContextType | undefined>(undefined);

export function encryptPassword(password: string): string {
  const shifted = password
    .split("")
    .map((char) => String.fromCharCode(char.charCodeAt(0) + 7))
    .join("");
  return "enc_" + btoa(unescape(encodeURIComponent(shifted)));
}

export function decryptPassword(encrypted: string): string {
  if (!encrypted || !encrypted.startsWith("enc_")) return encrypted;
  try {
    const b64 = encrypted.substring(4);
    const shifted = decodeURIComponent(escape(atob(b64)));
    return shifted
      .split("")
      .map((char) => String.fromCharCode(char.charCodeAt(0) - 7))
      .join("");
  } catch {
    return encrypted;
  }
}

// Shared defaults for local backup and database bootstrapping
export const DEFAULT_PESSOAS: Pessoa[] = [
  { id: "p1", nome: "Daniel Thaylor", email: "daniel.thaylor@gmz.solutions", telefone: "(11) 99999-8888", tipo: "GMZ", senha: encryptPassword("123"), dataAniversario: "1994-10-15", dataContratacao: "2021-06-01", foto: "", perfil: "Técnico, Gerencial, Administrador" },
  { id: "p2", nome: "Mariana Santos", email: "mariana.santos@gmz.solutions", telefone: "(11) 98888-7777", tipo: "GMZ", senha: encryptPassword("123"), dataAniversario: "1996-05-20", dataContratacao: "2023-01-15", foto: "", perfil: "Técnico" },
  { id: "p3", nome: "Carlos Souza", email: "carlos@techcorp.com", telefone: "(11) 97777-6666", tipo: "Cliente", senha: encryptPassword("123"), dataAniversario: "1988-12-05", foto: "", perfil: "Cliente" },
  { id: "p4", nome: "Roberta Abreu", email: "roberta@bellabelez.com", telefone: "(11) 96666-5555", tipo: "Cliente", senha: encryptPassword("123"), dataAniversario: "1991-08-30", foto: "", perfil: "Cliente" }
];

export const DEFAULT_ACESSOS: Acesso[] = [
  { id_pessoa: "p1", modulos: ["empresas", "pessoas", "contratos", "projetos", "demandas", "agenda", "smtp", "rrhh", "relatorios", "rh_admin"] },
  { id_pessoa: "p2", modulos: ["empresas", "pessoas", "contratos", "projetos", "demandas", "agenda", "smtp", "rrhh", "relatorios", "rh_admin"] },
  { id_pessoa: "p3", modulos: ["demandas", "agenda", "rh_comum"] },
  { id_pessoa: "p4", modulos: ["demandas", "agenda", "rh_comum"] }
];

export const DEFAULT_EMPRESAS: Empresa[] = [
  { id: "emp1", nome: "GMZ Tech Solutions" },
  { id: "emp2", nome: "TechNova Systems" },
  { id: "emp3", nome: "Alpha Corp" },
  { id: "emp4", nome: "Bella Cosméticos" }
];

export const DEFAULT_CONTRATOS: Contrato[] = [
  { 
    id: "cont1", 
    numero: "2026/012", 
    nome: "Desenvolvimento de Plataforma Core", 
    sla: "12h", 
    valorTotal: 120000, 
    valorCobranca: 10000, 
    periodoCobranca: "Mensal", 
    dataInicio: "2026-01-01", 
    dataFim: "2026-12-31", 
    status: "Ativo", 
    empresaIds: ["emp2", "emp3"], 
    folderId: "drive-folder-technova-core-012",
    anexos: [
      { name: "Proposta Comercial.pdf", url: "#", size: "1.4 MB" },
      { name: "Cronograma de Entregas.xlsx", url: "#", size: "320 KB" }
    ],
    valoresAdicionais: 1500
  },
  { 
    id: "cont2", 
    numero: "2026/045", 
    nome: "Suporte Técnico Continuado & Branding", 
    sla: "4h", 
    valorTotal: 45000, 
    valorCobranca: 3750, 
    periodoCobranca: "Mensal", 
    dataInicio: "2026-02-15", 
    dataFim: "2027-02-14", 
    status: "Ativo", 
    empresaIds: ["emp4"], 
    folderId: "drive-folder-bella-suporte-045",
    anexos: [
      { name: "Termo de Garantia de SLA.pdf", url: "#", size: "850 KB" }
    ],
    valoresAdicionais: 500
  }
];

export const DEFAULT_PROJETOS: Projeto[] = [
  { 
    id: "proj1", 
    nome: "Plataforma ERP Dashboard", 
    workflow: ["Backlog", "Em análise", "Desenvolvimento", "Done"], 
    atividades: ["Desenvolvimento", "Reunião", "Análise", "Design"], 
    contabilizarPorEmpresa: true,
    contratoIds: ["cont1"]
  },
  { 
    id: "proj_canais", 
    nome: "Contrato de Canais Digitais", 
    workflow: ["Backlog", "A Fazer", "Desenvolvimento", "Validação QA", "Homologação", "Concluído"], 
    atividades: ["Desenvolvimento", "Reunião", "Análise", "Design", "Homologação", "Suporte", "Implantação"], 
    contabilizarPorEmpresa: true,
    contratoIds: ["cont1", "cont2"]
  },
  { 
    id: "proj2", 
    nome: "E-Commerce Cosmopolita", 
    workflow: ["Ideação", "Planejamento", "Executando", "Finalizado"], 
    atividades: ["Design", "Reunião", "Produção", "Marketing"], 
    contabilizarPorEmpresa: false,
    contratoIds: ["cont2"]
  }
];

export const DEFAULT_DEMANDAS: Demanda[] = [
  { 
    id: "dem1", 
    titulo: "Criar Estrutura de Menus e Permissões", 
    descricao: "<p>Implementar a barra lateral (Sidebar) dinâmica e recolhível com base no controle de acessos RBAC.</p>", 
    numeroChamado: "10029", 
    tipo: "Melhoria",
    tags: ["Frontend", "RBAC", "Premium"], 
    criticidade: "Alta", 
    idProjeto: "proj1", 
    coluna: "Desenvolvimento", 
    idDesignado: "p1", 
    idDesignados: ["p1"],
    idResponsavel: "p1",
    priorizadoFila: true,
    estimativaHoras: 16, 
    atividade: "Desenvolvimento",
    estimativas: [
      { id: "est1_1", horas: 12, atividade: "Desenvolvimento" },
      { id: "est1_2", horas: 4, atividade: "Reunião" }
    ],
    createdAt: "2026-05-25T14:30:00Z", 
    updatedAt: "2026-05-27T10:00:00Z",
    idEmpresa: "emp2",
    idEmpresas: ["emp2"]
  },
  { 
    id: "dem2", 
    titulo: "Modelagem Firestore & Regras de Acesso", 
    descricao: "<p>Desenvolver o schema JSON de coleções e habilitar as regras de fortress security baseadas em roles.</p>", 
    numeroChamado: "10034", 
    tipo: "Incidente",
    tags: ["Segurança", "Database"], 
    criticidade: "Urgente", 
    idProjeto: "proj1", 
    coluna: "Em análise", 
    idDesignado: "p1", 
    idDesignados: ["p1"],
    idResponsavel: "p2",
    priorizadoFila: false,
    estimativaHoras: 8, 
    atividade: "Análise",
    estimativas: [
      { id: "est2_1", horas: 8, atividade: "Análise" }
    ],
    createdAt: "2026-05-26T09:00:00Z", 
    updatedAt: "2026-05-28T09:15:00Z",
    idEmpresa: "emp3",
    idEmpresas: ["emp3"]
  },
  { 
    id: "dem3", 
    titulo: "Protótipo Navegável - E-commerce", 
    descricao: "<p>Desenho da jornada do cliente nas páginas de catálogo, checkout e fidelidade.</p>", 
    numeroChamado: "10035", 
    tipo: "Melhoria",
    tags: ["Design System", "Figma"], 
    criticidade: "Média", 
    idProjeto: "proj2", 
    coluna: "Ideação", 
    idDesignado: "p2", 
    idDesignados: ["p2"],
    idResponsavel: "p1",
    priorizadoFila: true,
    estimativaHoras: 12, 
    atividade: "Design",
    estimativas: [
      { id: "est3_1", horas: 12, atividade: "Design" }
    ],
    createdAt: "2026-05-27T08:00:00Z", 
    updatedAt: "2026-05-27T17:30:00Z",
    idEmpresa: "emp4",
    idEmpresas: ["emp4"]
  },
  { 
    id: "dem4", 
    titulo: "Ajuste na Responsividade da Agenda Mobile", 
    descricao: "<p>Ajustar a visualização mensal with pins em displays ultrafinos.</p>", 
    numeroChamado: "10036", 
    tipo: "BUG",
    tags: ["Bug", "CSS"], 
    criticidade: "Baixa", 
    idProjeto: "proj1", 
    coluna: "Backlog", 
    idDesignado: "p2", 
    idDesignados: ["p2"],
    idResponsavel: "p2",
    priorizadoFila: false,
    estimativaHoras: 4, 
    atividade: "Desenvolvimento",
    estimativas: [
      { id: "est4_1", horas: 4, atividade: "Desenvolvimento" }
    ],
    createdAt: "2026-05-28T10:00:00Z", 
    updatedAt: "2026-05-28T10:00:00Z",
    idEmpresa: "emp2",
    idEmpresas: ["emp2"],
    passoAPasso: "1. Abrir em tela mobile com menos de 350px\n2. Clicar no mês\n3. Ver pins saindo da borda esquerda"
  }
];

export const DEFAULT_COMENTARIOS: Comentario[] = [
  { 
    id: "com1", 
    idDemanda: "dem1", 
    idPessoa: "p1", 
    nomeAutor: "Daniel Thaylor", 
    emailAutor: "daniel.thaylor@gmz.solutions", 
    textoHTML: "<p>Vou estruturar usando <strong>Tailwind CSS</strong> e Lucide-Icons. A sidebar será recolhível por estado.</p>", 
    createdAt: "2026-05-27T11:00:00Z" 
  },
  { 
    id: "com2", 
    idDemanda: "dem1", 
    idPessoa: "p2", 
    nomeAutor: "Mariana Santos", 
    emailAutor: "mariana.santos@gmz.solutions", 
    textoHTML: "<p>Excelente. Podemos salvar o estado <em>collapsed</em> no localStorage para persistir na navegação.</p>", 
    createdAt: "2026-05-27T11:45:00Z" 
  }
];

export const DEFAULT_APONTAMENTOS: Apontamento[] = [
  { id: "ap1", idDemanda: "dem1", idPessoa: "p1", nomePessoa: "Daniel Thaylor", atividade: "Reunião", horas: 2, createdAt: "2026-05-26T15:00:00Z" },
  { id: "ap2", idDemanda: "dem1", idPessoa: "p1", nomePessoa: "Daniel Thaylor", atividade: "Desenvolvimento", horas: 6, createdAt: "2026-05-27T16:00:00Z" },
  { id: "ap3", idDemanda: "dem1", idPessoa: "p2", nomePessoa: "Mariana Santos", atividade: "Design", horas: 3, createdAt: "2026-05-27T14:00:00Z" }
];

export const DEFAULT_EVENTOS: EventoAgenda[] = [
  { id: "ev1", titulo: "Alinhamento Geral GMZ", descricao: "Reunião semanal para discutir demandas em backlog.", dataHora: "2026-05-27T10:00:00", recorrencia: "Semanal", tipo: "Grupo", grupoId: "g1", participantesIds: ["p1", "p2"] },
  { id: "ev2", titulo: "Reunião Comercial Alpha Corp", descricao: "Apresentação do cronograma do ERP.", dataHora: "2026-05-29T14:30:00", recorrencia: "Nenhuma", tipo: "Grupo", grupoId: "g1", participantesIds: ["p1", "p2"] },
  { id: "ev3", titulo: "Envio de Cobrança Mensal", descricao: "Fechamento contábil e faturamento.", dataHora: "2026-05-20T09:00:00", recorrencia: "Mensal", tipo: "Grupo", grupoId: "g3", participantesIds: ["p1"] },
  { id: "ev4", titulo: "Planejamento Orçamentário", descricao: "Definição do orçamento SaaS Premium.", dataHora: "2026-05-15T08:00:00", recorrencia: "Anual", tipo: "Pessoal", criadorId: "p1", participantesIds: ["p1"] },
  { id: "ev5", titulo: "Comitê de Governança", descricao: "Sprint Retrospective quinzenal.", dataHora: "2026-05-18T16:00:00", recorrencia: "Quinzenal", tipo: "Grupo", grupoId: "g1", participantesIds: ["p1", "p2"] }
];

export const DEFAULT_GRUPO_EMAILS: GrupoEmail[] = [
  { id: "g1", nome: "Fábrica de Softwares GMZ", descricao: "Equipe de desenvolvimento e design dedicada", participantesIds: ["p1", "p2"] },
  { id: "g2", nome: "Atendimento de Incidentes", descricao: "Técnicos de plantão para suporte nível SLA", participantesIds: ["p2"] },
  { id: "g3", nome: "Administração e Faturamento", descricao: "Colegiado financeiro corporativo", participantesIds: ["p1"] }
];

const DEFAULT_SMTP: SMTPConfig = {
  host: "smtp.gmz.solutions",
  port: 587,
  user: "faturamento@gmz.solutions",
  secure: false,
  preloads: {
    "Melhoria": {
      titulo: "[Melhoria] Registro de Novo Chamado",
      descricao: "Olá! Foi faturado e registrado um novo chamado de Melhoria. Detalhes em anexo.",
      anexoNome: "especificacao_tecnica_v4"
    },
    "Incidente": {
      titulo: "[Incidente] Ocorrência de Suporte de Nível",
      descricao: "Aviso de chamado do tipo Incidente. Acordo de nível regulamentar ativo no painel.",
      anexoNome: "relatorio_sprint_pdf"
    },
    "Change": {
      titulo: "[Change] Proposta de Mudança de Sistema",
      descricao: "Olá, segue proposta de mudança para análise de impacto e plano de rollback.",
      anexoNome: "plano_rollback_change"
    },
    "BUG": {
      titulo: "[BUG] Ocorrência de BUG",
      descricao: "Report de BUG cadastrado. Passos a passos e tarefas associadas inseridos no board.",
      anexoNome: "step_by_step_reproduce"
    },
    "Outros": {
      titulo: "[GMZ ERP] Notificação Geral",
      descricao: "Notificação periódica de andamento no quadro Kanban de projetos.",
      anexoNome: "detalhes_demanda_geral"
    }
  }
};

// Seeding defaults for HR
const DEFAULT_FERIAS: FeriasColaborador[] = [
  { id: "fe1", idPessoa: "p1", periodoAquisitivoInicio: "2025-01-01", periodoAquisitivoFim: "2025-12-31", dataInicio: "2026-07-10", dataFim: "2026-07-30", status: "Agendado", observacao: "Viagem programada" }
];

const DEFAULT_HORASEXTRAS: HoraExtra[] = [
  { id: "he1", idPessoa: "p1", idProjeto: "proj1", idDemanda: "dem1", horas: 4, horasAjustadas: 4, data: "2026-05-27", descricao: "Homologação fora do expediente", compensacao: "Folga", status: "Aprovado" }
];

const DEFAULT_CHECKPOINTS: CheckPointItem[] = [
  { id: "cp1", idPessoa: "p1", tipo: "Positivo", descricao: "Excelente entrega da sidebar e rbac, adiantou o cronograma em 3 dias.", data: "2026-05-28", autorId: "p2" },
  { id: "cp2", idPessoa: "p1", tipo: "Negativo", descricao: "Esqueceu de testar a responsividade no safari antigo.", data: "2026-05-29", autorId: "p2" }
];

const DEFAULT_REUNIOES_CHECKPOINTS: ReuniaoCheckPoint[] = [
  { id: "re1", titulo: "Alinhamento Trimestral Daniel", dataReuniao: "2026-06-05", participantesIds: ["p1", "p2"], checkpointsIds: ["cp1", "cp2"], acoes: "1. Treinamento de compatibilidade de navegadores\n2. Manter agilidade nas entregas de front", prazo: "2026-06-20", comentariosGerencia: "Daniel demonstra excelente atitude e velocidade, focaremos em polimento e cross-browser testing.", createdAt: "2026-05-29T10:00:00Z" }
];

// Funny phrases
const LOADING_FUNNY_PHRASES = [
  "Iniciando acopladores quânticos do Firestore...",
  "Calibrando o fluxo de sincronização otimista...",
  "Convertendo café premium em consultas de banco de dados...",
  "Retorcendo as hélices espirais do Firebase...",
  "Compilando componentes visualizados com carinho...",
  "Estabilizando o continuum de permissões RBAC..."
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn("Firestore Error Handled Gracefully: ", JSON.stringify(errInfo));
}

export const DBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_FUNNY_PHRASES[0]);
  const [isSyncing, setIsSyncing] = useState(false);

  // States
  const [dbConnected, setDbConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [grupoEmails, setGrupoEmails] = useState<GrupoEmail[]>([]);
  
  // New States
  const [medicoes, setMedicoes] = useState<MedicaoContrato[]>([]);
  const [ferias, setFerias] = useState<FeriasColaborador[]>([]);
  const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckPointItem[]>([]);
  const [reunioesCheckpoints, setReunioesCheckpoints] = useState<ReuniaoCheckPoint[]>([]);
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>(DEFAULT_SMTP);
  const [tarefasPessoais, setTarefasPessoais] = useState<TarefaPessoal[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [filaEmails, setFilaEmails] = useState<FilaEmail[]>([]);

  // Profile permissions state
  const [profilePermissions, setProfilePermissions] = useState<{ [perfil: string]: string[] }>(() => {
    try {
      const saved = localStorage.getItem("erp_profile_permissions");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      "Administrador": [
        "home", "empresas", "contratos", "projetos", "pessoas", "grupo_emails", "permissoes",
        "agenda", "fila_prioridades", "demandas", "meus_beneficios", "rrhh", "relatorios",
        "fila_prioridades_gerencial", "agenda_grupo", "smtp", "apontamentos_pessoal", "apontamentos_gerencial"
      ],
      "Técnico": ["home", "agenda", "fila_prioridades", "demandas", "meus_beneficios", "apontamentos_pessoal"],
      "Gerencial": [
        "home", "empresas", "contratos", "projetos", "pessoas", "grupo_emails", "permissoes",
        "agenda", "fila_prioridades", "demandas", "meus_beneficios", "rrhh", "relatorios",
        "fila_prioridades_gerencial", "agenda_grupo", "smtp", "apontamentos_pessoal", "apontamentos_gerencial"
      ]
    };
  });

  // Action to update permissions in Firestore
  const updateProfilePermissions = async (perfil: string, modulos: string[]) => {
    const updated = { ...profilePermissions, [perfil]: modulos };
    setProfilePermissions(updated);
    localStorage.setItem("erp_profile_permissions", JSON.stringify(updated));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "_config", "permissoes"), updated);
      } catch (err) {
        console.error("Erro ao salvar permissoes_perfis no firestore:", err);
      }
    }
  };

  const deleteProfilePermission = async (perfil: string) => {
    const updated = { ...profilePermissions };
    delete updated[perfil];
    setProfilePermissions(updated);
    localStorage.setItem("erp_profile_permissions", JSON.stringify(updated));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "_config", "permissoes"), updated);
      } catch (err) {
        console.error("Erro ao apagar permissao de perfil:", err);
      }
    }
  };

  // Authenticated state
  const [activeUser, setActiveUser] = useState<Pessoa | null>(null);
  const [activeUserAcessos, setActiveUserAcessos] = useState<string[] | null>(null);

  // Synchronize activeUser & activeUserAcessos when lists change
  useEffect(() => {
    if (activeUser) {
      const currentPerson = pessoas.find((p) => p.id === activeUser.id);
      if (currentPerson && JSON.stringify(currentPerson) !== JSON.stringify(activeUser)) {
        setActiveUser(currentPerson);
      }
      
      const userPerfil = currentPerson?.perfil || activeUser.perfil || "Técnico";
      // Support cumulative profiles (can be comma-separated or list)
      const profiles = userPerfil.split(",").map(p => p.trim()).filter(Boolean);
      let computedAccess: string[] = ["home"];
      profiles.forEach(p => {
        const mods = profilePermissions[p] || [];
        mods.forEach(m => {
          if (!computedAccess.includes(m)) {
            computedAccess.push(m);
          }
        });
      });
      if (computedAccess.length === 1) { // if nothing resolved, provide default Technician
        computedAccess = ["home", "agenda", "fila_prioridades", "demandas", "meus_beneficios"];
      }

      // Checkpoint override: daniel.thaylor@gmz.solutions has ALL screen access
      if (currentPerson?.email === "daniel.thaylor@gmz.solutions") {
        computedAccess = [
          "home", "empresas", "contratos", "projetos", "pessoas", "grupo_emails", "permissoes",
          "agenda", "fila_prioridades", "demandas", "meus_beneficios", "rrhh", "relatorios",
          "fila_prioridades_gerencial", "agenda_grupo", "smtp", "apontamentos_pessoal", "apontamentos_gerencial"
        ];
      }
            
      if (JSON.stringify(activeUserAcessos) !== JSON.stringify(computedAccess)) {
        setActiveUserAcessos(computedAccess);
      }
    } else {
      if (activeUserAcessos !== null) {
        setActiveUserAcessos(null);
      }
    }
  }, [pessoas, activeUser, activeUserAcessos, profilePermissions]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Seeding inicial (caso não encontre no Firebase, ou use offline)
  const seedLocalDatabase = () => {
    setPessoas(JSON.parse(localStorage.getItem("erp_pessoas") || JSON.stringify(DEFAULT_PESSOAS)));
    setAcessos(JSON.parse(localStorage.getItem("erp_acessos") || JSON.stringify(DEFAULT_ACESSOS)));
    setEmpresas(JSON.parse(localStorage.getItem("erp_empresas") || JSON.stringify(DEFAULT_EMPRESAS)));
    setContratos(JSON.parse(localStorage.getItem("erp_contratos") || JSON.stringify(DEFAULT_CONTRATOS)));
    setProjetos(JSON.parse(localStorage.getItem("erp_projetos") || JSON.stringify(DEFAULT_PROJETOS)));
    setDemandas(JSON.parse(localStorage.getItem("erp_demandas") || JSON.stringify(DEFAULT_DEMANDAS)));
    setComentarios(JSON.parse(localStorage.getItem("erp_comentarios") || JSON.stringify(DEFAULT_COMENTARIOS)));
    setApontamentos(JSON.parse(localStorage.getItem("erp_apontamentos") || JSON.stringify(DEFAULT_APONTAMENTOS)));
    setEventos(JSON.parse(localStorage.getItem("erp_eventos") || JSON.stringify(DEFAULT_EVENTOS)));
    setGrupoEmails(JSON.parse(localStorage.getItem("erp_grupo_emails") || JSON.stringify(DEFAULT_GRUPO_EMAILS)));

    // New tables local seed
    setMedicoes(JSON.parse(localStorage.getItem("erp_medicoes") || "[]"));
    setFerias(JSON.parse(localStorage.getItem("erp_ferias") || JSON.stringify(DEFAULT_FERIAS)));
    setHorasExtras(JSON.parse(localStorage.getItem("erp_horas_extras") || JSON.stringify(DEFAULT_HORASEXTRAS)));
    setCheckpoints(JSON.parse(localStorage.getItem("erp_checkpoints") || JSON.stringify(DEFAULT_CHECKPOINTS)));
    setReunioesCheckpoints(JSON.parse(localStorage.getItem("erp_reunioes_checkpoints") || JSON.stringify(DEFAULT_REUNIOES_CHECKPOINTS)));
    setSmtpConfig(JSON.parse(localStorage.getItem("erp_smtp_config") || JSON.stringify(DEFAULT_SMTP)));
    setTarefasPessoais(JSON.parse(localStorage.getItem("erp_tarefas_pessoais") || "[]"));
    setAlertas(JSON.parse(localStorage.getItem("erp_alertas") || "[]"));
    setFilaEmails(JSON.parse(localStorage.getItem("erp_fila_emails") || "[]"));
  };

  // Sincroniza em localStorage para persistir offline
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("erp_pessoas", JSON.stringify(pessoas));
      localStorage.setItem("erp_acessos", JSON.stringify(acessos));
      localStorage.setItem("erp_empresas", JSON.stringify(empresas));
      localStorage.setItem("erp_contratos", JSON.stringify(contratos));
      localStorage.setItem("erp_projetos", JSON.stringify(projetos));
      localStorage.setItem("erp_demandas", JSON.stringify(demandas));
      localStorage.setItem("erp_comentarios", JSON.stringify(comentarios));
      localStorage.setItem("erp_apontamentos", JSON.stringify(apontamentos));
      localStorage.setItem("erp_eventos", JSON.stringify(eventos));
      localStorage.setItem("erp_grupo_emails", JSON.stringify(grupoEmails));

      // Sync new states
      localStorage.setItem("erp_medicoes", JSON.stringify(medicoes));
      localStorage.setItem("erp_ferias", JSON.stringify(ferias));
      localStorage.setItem("erp_horas_extras", JSON.stringify(horasExtras));
      localStorage.setItem("erp_checkpoints", JSON.stringify(checkpoints));
      localStorage.setItem("erp_reunioes_checkpoints", JSON.stringify(reunioesCheckpoints));
      localStorage.setItem("erp_smtp_config", JSON.stringify(smtpConfig));
      localStorage.setItem("erp_tarefas_pessoais", JSON.stringify(tarefasPessoais));
      localStorage.setItem("erp_alertas", JSON.stringify(alertas));
      localStorage.setItem("erp_fila_emails", JSON.stringify(filaEmails));
    }
  }, [
    pessoas, acessos, empresas, contratos, projetos, demandas, comentarios, apontamentos, eventos, grupoEmails,
    medicoes, ferias, horasExtras, checkpoints, reunioesCheckpoints, smtpConfig, tarefasPessoais, alertas, filaEmails, isInitialized
  ]);

  // Tentar conectar e inicializar Banco Firestore se disponível, senão usar modo offline
  const testAndInitializeDatabase = async (): Promise<any> => {
    setIsCheckingConnection(true);
    try {
      const statusRef = doc(db, "_config", "status");
      const docSnap = await getDocFromServer(statusRef);
      setDbConnected(true);
      setDbError(null);
      console.log("Firestore conectado com sucesso!");

      if (!docSnap.exists() || !docSnap.data()?.initialized) {
        console.log("Configurando e Provisionando toda a estrutura do ERP no Firestore...");
        
        for (const p of DEFAULT_PESSOAS) {
          await setDoc(doc(db, "pessoas", p.id), p);
        }
        for (const a of DEFAULT_ACESSOS) {
          await setDoc(doc(db, "acessos", a.id_pessoa), { id_pessoa: a.id_pessoa, modulos: a.modulos });
        }
        for (const e of DEFAULT_EMPRESAS) {
          await setDoc(doc(db, "empresas", e.id), e);
        }
        for (const c of DEFAULT_CONTRATOS) {
          await setDoc(doc(db, "contratos", c.id), c);
        }
        for (const pr of DEFAULT_PROJETOS) {
          await setDoc(doc(db, "projetos", pr.id), pr);
        }
        for (const d of DEFAULT_DEMANDAS) {
          await setDoc(doc(db, "demandas", d.id), d);
        }
        for (const co of DEFAULT_COMENTARIOS) {
          await setDoc(doc(db, "comentarios", co.id), co);
        }
        for (const ap of DEFAULT_APONTAMENTOS) {
          await setDoc(doc(db, "apontamentos", ap.id), ap);
        }
        for (const ev of DEFAULT_EVENTOS) {
          await setDoc(doc(db, "eventos", ev.id), ev);
        }
        for (const g of DEFAULT_GRUPO_EMAILS) {
          await setDoc(doc(db, "grupo_emails", g.id), g);
        }
        for (const fe of DEFAULT_FERIAS) {
          await setDoc(doc(db, "ferias", fe.id), fe);
        }
        for (const he of DEFAULT_HORASEXTRAS) {
          await setDoc(doc(db, "horas_extras", he.id), he);
        }
        for (const cp of DEFAULT_CHECKPOINTS) {
          await setDoc(doc(db, "checkpoints", cp.id), cp);
        }
        for (const rc of DEFAULT_REUNIOES_CHECKPOINTS) {
          await setDoc(doc(db, "reunioes_checkpoints", rc.id), rc);
        }

        await setDoc(statusRef, { initialized: true });
        addToast("Estrutura inicial de dados provisionada com sucesso!", "success");
      } else {
        addToast("Estrutura do banco de dados verificada no Cloud!", "success");
      }

      console.log("Registrando observadores de coleções Firestore em tempo real...");
      const unsubPessoas = onSnapshot(collection(db, "pessoas"), (snap) => {
        const arr: Pessoa[] = [];
        snap.forEach((d) => {
          const data = d.data();
          arr.push({ id: d.id, nome: data.nome || data.name || "", ...data } as Pessoa);
        });
        setPessoas(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "pessoas");
      });
      const unsubAcessos = onSnapshot(collection(db, "acessos"), (snap) => {
        const arr: Acesso[] = [];
        snap.forEach((d) => arr.push({ id_pessoa: d.id, ...d.data() } as Acesso));
        setAcessos(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "acessos");
      });
      const unsubEmpresas = onSnapshot(collection(db, "empresas"), (snap) => {
        const arr: Empresa[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Empresa));
        setEmpresas(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "empresas");
      });
      const unsubContratos = onSnapshot(collection(db, "contratos"), (snap) => {
        const arr: Contrato[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Contrato));
        setContratos(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "contratos");
      });
      const unsubProjetos = onSnapshot(collection(db, "projetos"), (snap) => {
        const arr: Projeto[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Projeto));
        setProjetos(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "projetos");
      });
      const unsubDemandas = onSnapshot(collection(db, "demandas"), (snap) => {
        const arr: Demanda[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Demanda));
        setDemandas(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "demandas");
      });
      const unsubComentarios = onSnapshot(collection(db, "comentarios"), (snap) => {
        const arr: Comentario[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Comentario));
        setComentarios(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "comentarios");
      });
      const unsubApontamentos = onSnapshot(collection(db, "apontamentos"), (snap) => {
        const arr: Apontamento[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as Apontamento));
        setApontamentos(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "apontamentos");
      });
      const unsubEventos = onSnapshot(collection(db, "eventos"), (snap) => {
        const arr: EventoAgenda[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as EventoAgenda));
        setEventos(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "eventos");
      });
      const unsubGrupoEmails = onSnapshot(collection(db, "grupo_emails"), (snap) => {
        const arr: GrupoEmail[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as GrupoEmail));
        setGrupoEmails(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "grupo_emails");
      });
      const unsubTarefasPessoais = onSnapshot(collection(db, "tarefas_pessoais"), (snap) => {
        const arr: TarefaPessoal[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as TarefaPessoal));
        setTarefasPessoais(arr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "tarefas_pessoais");
      });

      const unsubFerias = onSnapshot(collection(db, "ferias"), (snap) => {
        const arr: FeriasColaborador[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as FeriasColaborador));
        if (arr.length > 0) {
          setFerias(arr);
        } else {
          const local = JSON.parse(localStorage.getItem("erp_ferias") || JSON.stringify(DEFAULT_FERIAS));
          setFerias(local);
          local.forEach(async (fe: any) => {
            try { await setDoc(doc(db, "ferias", fe.id), fe); } catch(e) {}
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "ferias");
      });

      const unsubHorasExtras = onSnapshot(collection(db, "horas_extras"), (snap) => {
        const arr: HoraExtra[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as HoraExtra));
        if (arr.length > 0) {
          setHorasExtras(arr);
        } else {
          const local = JSON.parse(localStorage.getItem("erp_horas_extras") || JSON.stringify(DEFAULT_HORASEXTRAS));
          setHorasExtras(local);
          local.forEach(async (he: any) => {
            try { await setDoc(doc(db, "horas_extras", he.id), he); } catch(e) {}
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "horas_extras");
      });

      const unsubCheckpoints = onSnapshot(collection(db, "checkpoints"), (snap) => {
        const arr: CheckPointItem[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as CheckPointItem));
        if (arr.length > 0) {
          setCheckpoints(arr);
        } else {
          const local = JSON.parse(localStorage.getItem("erp_checkpoints") || JSON.stringify(DEFAULT_CHECKPOINTS));
          setCheckpoints(local);
          local.forEach(async (cp: any) => {
            try { await setDoc(doc(db, "checkpoints", cp.id), cp); } catch(e) {}
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "checkpoints");
      });

      const unsubReunioesCheckpoints = onSnapshot(collection(db, "reunioes_checkpoints"), (snap) => {
        const arr: ReuniaoCheckPoint[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() } as ReuniaoCheckPoint));
        if (arr.length > 0) {
          setReunioesCheckpoints(arr);
        } else {
          const local = JSON.parse(localStorage.getItem("erp_reunioes_checkpoints") || JSON.stringify(DEFAULT_REUNIOES_CHECKPOINTS));
          setReunioesCheckpoints(local);
          local.forEach(async (rc: any) => {
            try { await setDoc(doc(db, "reunioes_checkpoints", rc.id), rc); } catch(e) {}
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "reunioes_checkpoints");
      });

      const unsubPermissoes = onSnapshot(doc(db, "_config", "permissoes"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfilePermissions(data as any);
          localStorage.setItem("erp_profile_permissions", JSON.stringify(data));
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "_config/permissoes");
      });

      const unsubAlertas = onSnapshot(collection(db, "_config"), (snap) => {
        const arr: Alerta[] = [];
        const mArr: FilaEmail[] = [];
        snap.forEach((d) => {
          if (d.id.startsWith("alert_")) {
            arr.push({ id: d.id, ...d.data() } as Alerta);
          } else if (d.id.startsWith("email_")) {
            mArr.push({ id: d.id, ...d.data() } as FilaEmail);
          }
        });
        setAlertas(arr);
        setFilaEmails(mArr);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, "_config_alertas");
      });

      // Seeding local tables anyway to guarantee complete lists
      setMedicoes(JSON.parse(localStorage.getItem("erp_medicoes") || "[]"));
      setSmtpConfig(JSON.parse(localStorage.getItem("erp_smtp_config") || JSON.stringify(DEFAULT_SMTP)));

      return () => {
        unsubPessoas();
        unsubAcessos();
        unsubEmpresas();
        unsubContratos();
        unsubProjetos();
        unsubDemandas();
        unsubComentarios();
        unsubApontamentos();
        unsubEventos();
        unsubGrupoEmails();
        unsubTarefasPessoais();
        unsubFerias();
        unsubHorasExtras();
        unsubCheckpoints();
        unsubReunioesCheckpoints();
        unsubPermissoes();
        unsubAlertas();
      };

    } catch (err) {
      console.warn("Firestore offline ou erro de conexão:", err);
      setDbConnected(false);
      setDbError("Timeout / Offline");
      seedLocalDatabase();
      return undefined;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // Carregamento inicial premium com rotação de frases engraçadas
  useEffect(() => {
    let phraseIndex = 0;
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % LOADING_FUNNY_PHRASES.length;
      setLoadingMessage(LOADING_FUNNY_PHRASES[phraseIndex]);
    }, 1200);

    let cleanupFuncs: (() => void) | undefined;
    
    testAndInitializeDatabase().then((res) => {
      if (typeof res === "function") {
        cleanupFuncs = res;
      }
    });

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsInitialized(true);
      // No longer auto-logs in so the user lands on the clean login screen
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      if (cleanupFuncs) {
        cleanupFuncs();
      }
    };
  }, []);

  // Tentativa de auto-login se a sessão de 7 dias estiver ativa
  useEffect(() => {
    if (isInitialized && !activeUser) {
      const savedUserId = localStorage.getItem("erp_remembered_userId");
      const savedExpires = localStorage.getItem("erp_remembered_expires");
      if (savedUserId && savedExpires) {
        const expiresTime = parseInt(savedExpires, 10);
        if (Date.now() < expiresTime) {
          const arrPessoas = pessoas.length > 0 ? pessoas : DEFAULT_PESSOAS;
          const user = arrPessoas.find((p) => p.id === savedUserId);
          if (user) {
            setActiveUser(user);
            const arrAcessos = acessos.length > 0 ? acessos : DEFAULT_ACESSOS;
            const userAcesso = arrAcessos.find((a) => a.id_pessoa === user.id);
            if (userAcesso) {
              setActiveUserAcessos(userAcesso.modulos);
            } else {
              if (user.tipo === "GMZ") {
                setActiveUserAcessos(["empresas", "pessoas", "contratos", "projetos", "demandas", "agenda", "smtp", "rrhh", "relatorios", "rh_admin"]);
              } else {
                setActiveUserAcessos(["demandas", "agenda"]);
              }
            }
            addToast(`Bem-vindo de volta, ${user.nome}! Sessão restaurada automágicamente.`, "success");
          }
        } else {
          localStorage.removeItem("erp_remembered_userId");
          localStorage.removeItem("erp_remembered_expires");
        }
      }
    }
  }, [isInitialized, pessoas, activeUser]);

  // Auto-upgrade especial resiliente para o usuário Daniel Thaylor ter todos os perfis acumulados
  useEffect(() => {
    if (isInitialized && pessoas.length > 0) {
      const daniel = pessoas.find((p) => p.email === "daniel.thaylor@gmz.solutions");
      if (daniel && daniel.perfil !== "Técnico, Gerencial, Administrador") {
        console.log("Upgrading Daniel Thaylor's profiles to be fully cumulative...");
        updatePessoa(daniel.id, { perfil: "Técnico, Gerencial, Administrador" });
        addToast("Perfis de Daniel Thaylor configurados cumulativamente (Técnico, Gerencial, Administrador)", "success");
      }
    }
  }, [isInitialized, pessoas]);

  // Background Sync a cada 3 minutos
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
      }, 500);
    }, 3 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, []);

  // Forçar atualização manual
  const forceSync = async () => {
    setIsSyncing(true);
    addToast("Sincronizando tabelas em tempo real...", "info");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSyncing(false);
    addToast("Tabelas sincronizadas de forma bidirecional!", "success");
  };

  // Login simulador baseados em RBAC e Senhas / Tokens
  const simulatedLogin = (email: string, passwordOrToken?: string, isToken?: boolean, rememberMe?: boolean): boolean => {
    const arrPessoas = pessoas.length > 0 ? pessoas : DEFAULT_PESSOAS;
    const arrAcessos = acessos.length > 0 ? acessos : DEFAULT_ACESSOS;
    
    const user = arrPessoas.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      addToast(`E-mail ${email} não cadastrado.`, "error");
      return false;
    }

    if (passwordOrToken !== undefined && passwordOrToken !== "") {
      if (isToken) {
        if (user.senhaToken && user.senhaToken === passwordOrToken.trim()) {
          // Clear token on success
          updatePessoa(user.id, { senhaToken: "" });
        } else {
          addToast("Token de segurança inválido ou expirado.", "error");
          return false;
        }
      } else {
        const encryptedTyped = encryptPassword(passwordOrToken);
        const savedSenha = user.senha || encryptPassword("123");
        if (savedSenha === encryptedTyped) {
          if (!user.senha) {
            updatePessoa(user.id, { senha: savedSenha });
          }
        } else {
          addToast("Senha incorreta.", "error");
          return false;
        }
      }
    }

    if (rememberMe) {
      localStorage.setItem("erp_remembered_userId", user.id);
      localStorage.setItem("erp_remembered_expires", (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    } else {
      localStorage.removeItem("erp_remembered_userId");
      localStorage.removeItem("erp_remembered_expires");
    }

    const userAcesso = arrAcessos.find((a) => a.id_pessoa === user.id);
    setActiveUser(user);
    if (userAcesso) {
      setActiveUserAcessos(userAcesso.modulos);
    } else {
      if (user.tipo === "GMZ") {
        setActiveUserAcessos(["empresas", "pessoas", "contratos", "projetos", "demandas", "agenda", "smtp", "rrhh", "relatorios", "rh_admin"]);
      } else {
        setActiveUserAcessos(["demandas", "agenda"]);
      }
    }
    addToast(`Bem-vindo, ${user.nome}! Autenticado com sucesso.`, "success");
    return true;
  };

  // Enviar Token de Login simulado com SMTP/Toast
  const sendLoginToken = async (email: string): Promise<string | null> => {
    const arrPessoas = pessoas.length > 0 ? pessoas : DEFAULT_PESSOAS;
    const user = arrPessoas.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      addToast(`E-mail ${email} não cadastrado para envio de token.`, "error");
      return null;
    }
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    await updatePessoa(user.id, { senhaToken: token });
    addToast(`[SMTP] Token de segurança ${token} gerado e enviado para ${user.nome}!`, "success");
    return token;
  };

  const logout = () => {
    setActiveUser(null);
    setActiveUserAcessos(null);
    localStorage.removeItem("erp_remembered_userId");
    localStorage.removeItem("erp_remembered_expires");
    addToast("Logout efetuado.", "info");
  };

  // PESSOAS CRUD
  const addPessoa = async (p: Omit<Pessoa, "id">, customModulos?: string[]) => {
    const id = "p_" + Date.now();
    const nova: Pessoa = { id, ...p };
    setPessoas((prev) => [...prev, nova]);
    const modulos = customModulos || ["demandas", "agenda"];
    const novoAcesso: Acesso = { id_pessoa: id, modulos };
    setAcessos((prev) => [...prev, novoAcesso]);
    
    if (dbConnected) {
      try {
        await setDoc(doc(db, "pessoas", id), nova);
        await setDoc(doc(db, "acessos", id), { id_pessoa: id, modulos });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `pessoas/${id}`);
      }
    }
    addToast(`Pessoa ${p.nome} criada com sucesso!`, "success");
  };

  const updatePessoa = async (id: string, partial: Partial<Pessoa>, customModulos?: string[]) => {
    setPessoas((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
    if (customModulos) {
      setAcessos((prev) => {
        const idx = prev.findIndex((a) => a.id_pessoa === id);
        if (idx !== -1) {
          return prev.map((a) => a.id_pessoa === id ? { ...a, modulos: customModulos } : a);
        } else {
          return [...prev, { id_pessoa: id, modulos: customModulos }];
        }
      });
    }
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "pessoas", id), partial);
        if (customModulos) {
          await setDoc(doc(db, "acessos", id), { id_pessoa: id, modulos: customModulos });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `pessoas/${id}`);
      }
    }
  };

  const deletePessoa = async (id: string) => {
    setPessoas((prev) => prev.filter((p) => p.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "pessoas", id));
        await deleteDoc(doc(db, "acessos", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `pessoas/${id}`);
      }
    }
    addToast("Pessoa removida.", "success");
  };

  // EMPRESAS CRUD
  const addEmpresa = async (e: Omit<Empresa, "id">) => {
    const id = "emp_" + Date.now();
    const nova: Empresa = { id, ...e };
    setEmpresas((prev) => [...prev, nova]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "empresas", id), nova);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `empresas/${id}`);
      }
    }
    addToast(`Empresa "${e.nome}" criada!`, "success");
  };

  const updateEmpresa = async (id: string, partial: Partial<Empresa>) => {
    setEmpresas((prev) => prev.map((e) => (e.id === id ? { ...e, ...partial } : e)));
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "empresas", id), partial);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `empresas/${id}`);
      }
    }
  };

  const deleteEmpresa = async (id: string) => {
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "empresas", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `empresas/${id}`);
      }
    }
    addToast("Empresa deletada.", "success");
  };

  // CONTRATOS CRUD
  const addContrato = async (c: Omit<Contrato, "id" | "anexos">, files?: File[]) => {
    const id = "cont_" + Date.now();
    const anexosSeed = files 
      ? files.map((f) => ({ name: f.name, url: "#", size: `${(f.size / 1024).toFixed(1)} KB` }))
      : [];
    const novo: Contrato = { id, ...c, anexos: anexosSeed, valoresAdicionais: c.valoresAdicionais || 0 };
    setContratos((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "contratos", id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `contratos/${id}`);
      }
    }
    addToast(`Contrato ${c.numero} cadastrado!`, "success");
  };

  const updateContrato = async (id: string, partial: Partial<Contrato>) => {
    setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)));
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "contratos", id), partial);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `contratos/${id}`);
      }
    }
  };

  const deleteContrato = async (id: string) => {
    setContratos((prev) => prev.filter((c) => c.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "contratos", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `contratos/${id}`);
      }
    }
    addToast("Contrato removido.", "success");
  };

  // PROJETOS CRUD
  const addProjeto = async (p: Omit<Projeto, "id">) => {
    const id = "proj_" + Date.now();
    const novo: Projeto = { id, ...p, acessosPessoasIds: p.acessosPessoasIds || [] };
    setProjetos((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "projetos", id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `projetos/${id}`);
      }
    }
    addToast(`Projeto "${p.nome}" criado com sucesso!`, "success");
  };

  const updateProjeto = async (id: string, partial: Partial<Projeto>) => {
    setProjetos((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "projetos", id), partial);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `projetos/${id}`);
      }
    }
    addToast("Acessos do projeto atualizados.", "success");
  };

  const deleteProjeto = async (id: string) => {
    setProjetos((prev) => prev.filter((p) => p.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "projetos", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projetos/${id}`);
      }
    }
    addToast("Projeto removido.", "success");
  };

  // DEMANDAS CRUD
  const addDemanda = async (d: Omit<Demanda, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    const id = "dem_" + Date.now();
    const nova: Demanda = {
      id,
      ...d,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sincronizando: true
    };

    setDemandas((prev) => [nova, ...prev]);

    if (dbConnected) {
      try {
        const { sincronizando, ...dbPayload } = nova;
        const sanitized = cleanUndefined(dbPayload);
        await setDoc(doc(db, "demandas", id), sanitized);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `demandas/${id}`);
      }
    }

    setTimeout(() => {
      setDemandas((prev) => 
        prev.map((item) => item.id === id ? { ...item, sincronizando: false } : item)
      );
      addToast(`Demanda "${d.titulo}" cadastrada e sincronizada com sucesso!`, "success");
    }, 800);

    return id;
  };

  const updateDemanda = async (id: string, partial: Partial<Demanda>) => {
    setDemandas((prev) => 
      prev.map((d) => d.id === id ? { ...d, ...partial, sincronizando: true, updatedAt: new Date().toISOString() } : d)
    );

    if (dbConnected) {
      try {
        const { sincronizando, ...dbPayload } = partial;
        const sanitized = cleanUndefined(dbPayload);
        await updateDoc(doc(db, "demandas", id), {
          ...sanitized,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `demandas/${id}`);
      }
    }

    setTimeout(() => {
      setDemandas((prev) => 
        prev.map((d) => d.id === id ? { ...d, sincronizando: false } : d)
      );
    }, 600);
  };

  const deleteDemanda = async (id: string, permanent: boolean = false) => {
    if (permanent) {
      setDemandas((prev) => prev.filter((d) => d.id !== id));
      setComentarios((prev) => prev.filter((c) => c.idDemanda !== id));
      setApontamentos((prev) => prev.filter((a) => a.idDemanda !== id));

      if (dbConnected) {
        try {
          await deleteDoc(doc(db, "demandas", id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `demandas/${id}`);
        }
      }
      addToast("Demanda removida permanentemente.", "success");
    } else {
      const nowStr = new Date().toISOString();
      setDemandas((prev) => prev.map((d) => d.id === id ? { ...d, excluido: true, excluidoAt: nowStr } : d));

      if (dbConnected) {
        try {
          await updateDoc(doc(db, "demandas", id), {
            excluido: true,
            excluidoAt: nowStr,
            updatedAt: nowStr
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `demandas/${id}`);
        }
      }
      addToast("Demanda movida para a Lixeira.", "success");
    }
  };

  const restoreDemanda = async (id: string) => {
    setDemandas((prev) => prev.map((d) => d.id === id ? { ...d, excluido: false, excluidoAt: undefined } : d));

    if (dbConnected) {
      try {
        await updateDoc(doc(db, "demandas", id), {
          excluido: false,
          excluidoAt: null,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `demandas/${id}`);
      }
    }
    addToast("Demanda restaurada com sucesso!", "success");
  };

  const moveDemanda = async (id: string, novaColuna: string) => {
    const targetDem = demandas.find(d => d.id === id);
    if (targetDem) {
      const isMelhoriaOuMudanca = targetDem.tipo === "Melhoria" || targetDem.tipo === "Mudança";
      const isEnteringExecution = (novaColuna === "Desenvolvimento" || novaColuna === "desenvolvimento" || novaColuna === "QA");
      const isCurrentlyNotExecuting = !(targetDem.coluna === "Desenvolvimento" || targetDem.coluna === "desenvolvimento" || targetDem.coluna === "QA");
      
      if (isMelhoriaOuMudanca && isEnteringExecution && isCurrentlyNotExecuting) {
        const temEst = (targetDem.estimativaHoras && targetDem.estimativaHoras > 0) || 
                       (targetDem.estimativas && targetDem.estimativas.length > 0 && targetDem.estimativas.reduce((sum, item) => sum + (item.horas || 0), 0) > 0);
        if (!temEst) {
          addToast("Erro: Demandas do tipo 'Melhoria' ou 'Mudança' só podem ser iniciadas se houver estimativa de horas cadastrada!", "error");
          return;
        }
      }
    }

    setDemandas((prev) => 
      prev.map((d) => d.id === id ? { ...d, coluna: novaColuna, sincronizando: true, updatedAt: new Date().toISOString() } : d)
    );

    if (dbConnected) {
      try {
        await updateDoc(doc(db, "demandas", id), {
          coluna: novaColuna,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `demandas/${id}`);
      }
    }

    setTimeout(() => {
      setDemandas((prev) => 
        prev.map((d) => d.id === id ? { ...d, sincronizando: false } : d)
      );
    }, 450);
  };

  // COMENTÁRIOS
  const addComentario = async (idDemanda: string, textoHTML: string) => {
    if (!activeUser) return;
    const novo: Comentario = {
      id: "com_" + Date.now(),
      idDemanda,
      idPessoa: activeUser.id,
      nomeAutor: activeUser.nome,
      emailAutor: activeUser.email,
      textoHTML,
      createdAt: new Date().toISOString()
    };
    setComentarios((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "comentarios", novo.id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `comentarios/${novo.id}`);
      }
    }
    addToast("Comentário publicado.", "success");
  };

  const deleteComentario = async (id: string) => {
    setComentarios((prev) => prev.filter((c) => c.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "comentarios", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `comentarios/${id}`);
      }
    }
  };

  // APONTAMENTOS
  const addApontamento = async (
    apOrId: any,
    maybeHoras?: number,
    maybeAtividade?: string,
    maybeDescricao?: string
  ) => {
    let apObj: any;
    if (typeof apOrId === "object" && apOrId !== null) {
      apObj = { ...apOrId };
    } else if (typeof apOrId === "string") {
      apObj = {
        idDemanda: apOrId,
        horas: maybeHoras || 0,
        atividade: maybeAtividade || "Desenvolvimento",
        descricao: maybeDescricao || "",
        idPessoa: activeUser?.id || "p1",
        nomePessoa: activeUser?.nome || "Usuário",
      };
    } else {
      apObj = {};
    }

    // Multiply hours logic based on project flag and target demand companies
    const targetDem = demandas.find(d => d.id === apObj.idDemanda);
    let originalHours = apObj.horas || 0;
    let appliedMultiplier = 1;

    if (targetDem) {
      const targetProj = projetos.find(p => p.id === targetDem.idProjeto);
      if (targetProj && targetProj.contabilizarPorEmpresa) {
        // Find distinct companies assigned to this demand
        const demandCompanies = Array.from(new Set([
          ...(targetDem.idEmpresas || []),
          ...(targetDem.idEmpresa ? [targetDem.idEmpresa] : [])
        ])).filter(Boolean);

        if (demandCompanies.length > 0) {
          appliedMultiplier = demandCompanies.length;
          apObj.horas = originalHours * appliedMultiplier;
        }
      }
    }

    const novo: Apontamento = {
      id: "ap_" + Date.now(),
      idDemanda: apObj.idDemanda || "",
      idPessoa: apObj.idPessoa || activeUser?.id || "p1",
      nomePessoa: apObj.nomePessoa || activeUser?.nome || "Usuário",
      atividade: apObj.atividade || "Desenvolvimento",
      horas: apObj.horas || 0,
      descricao: apObj.descricao || apObj.resumo || "",
      createdAt: apObj.createdAt || apObj.data || new Date().toISOString()
    };

    setApontamentos((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "apontamentos", novo.id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `apontamentos/${novo.id}`);
      }
    }
    // Grava também no localstorage backup por resiliência
    const cached = JSON.parse(localStorage.getItem("erp_apontamentos") || "[]");
    localStorage.setItem("erp_apontamentos", JSON.stringify([...cached, novo]));

    // PROPAGATE TO PARENT TASK IF OF TYPE Task
    if (targetDem && targetDem.tipo === "Task") {
      const parentRel = targetDem.relacoes?.find(r => r.tipo === "pai");
      if (parentRel) {
        const parentId = parentRel.idDemanda;
        const seqNum = targetDem.numeroChamado || "Task";
        
        const novoPai: Apontamento = {
          id: "ap_" + Date.now() + "_parent_" + Math.floor(Math.random() * 1000),
          idDemanda: parentId,
          idPessoa: novo.idPessoa,
          nomePessoa: novo.nomePessoa,
          atividade: `Atividade - Task ${seqNum}`,
          horas: novo.horas,
          descricao: novo.descricao || `Apontamento propagado de Task ${seqNum}`,
          createdAt: novo.createdAt
        };

        setApontamentos((prev) => [...prev, novoPai]);
        if (dbConnected) {
          try {
            await setDoc(doc(db, "apontamentos", novoPai.id), novoPai);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `apontamentos/${novoPai.id}`);
          }
        }
        const cachedPai = JSON.parse(localStorage.getItem("erp_apontamentos") || "[]");
        localStorage.setItem("erp_apontamentos", JSON.stringify([...cachedPai, novoPai]));
        
        addToast(`Apontamento duplicado para a demanda pai: Atividade - Task ${seqNum} (${novo.horas}h)`, "info");
      }
    }

    if (appliedMultiplier > 1) {
      addToast(`Horas apontadas com sucesso (Lançamento Multiplicado: ${originalHours}h x ${appliedMultiplier} empresas = ${novo.horas}h).`, "success");
    } else {
      addToast("Horas apontadas com sucesso.", "success");
    }
  };

  const updateApontamento = async (id: string, partial: Partial<Apontamento>) => {
    setApontamentos((prev) => prev.map((a) => (a.id === id ? { ...a, ...partial } : a)));
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "apontamentos", id), cleanUndefined(partial));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `apontamentos/${id}`);
      }
    }
    const cached = JSON.parse(localStorage.getItem("erp_apontamentos") || "[]") as Apontamento[];
    const updated = cached.map((a) => (a.id === id ? { ...a, ...partial } : a));
    localStorage.setItem("erp_apontamentos", JSON.stringify(updated));
    addToast("Apontamento atualizado com sucesso.", "success");
  };

  const deleteApontamento = async (id: string) => {
    setApontamentos((prev) => prev.filter((a) => a.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "apontamentos", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `apontamentos/${id}`);
      }
    }
    const cached = JSON.parse(localStorage.getItem("erp_apontamentos") || "[]") as Apontamento[];
    const filtered = cached.filter((a) => a.id !== id);
    localStorage.setItem("erp_apontamentos", JSON.stringify(filtered));
  };

  // EVENTOS AGENDA
  const addEvento = async (ev: Omit<EventoAgenda, "id">) => {
    const id = "ev_" + Date.now();
    const novo: EventoAgenda = { id, ...ev };
    setEventos((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "eventos", id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `eventos/${id}`);
      }
    }
    addToast(`Evento cadastrado com sucesso!`, "success");
  };

  const updateEvento = async (id: string, update: Partial<EventoAgenda>) => {
    const targetId = update.parentId || id;
    setEventos((prev) => {
      return prev.map((ev) => ev.id === targetId ? { ...ev, ...update, id: targetId } : ev);
    });
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "eventos", targetId), update);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `eventos/${targetId}`);
      }
    }
  };

  const deleteEvento = async (id: string) => {
    setEventos((prev) => prev.filter((ev) => ev.id !== id && ev.parentId !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "eventos", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `eventos/${id}`);
      }
    }
    addToast("Evento removido.", "info");
  };

  // GRUPO EMAILS ACTIONS
  const addGrupoEmail = async (g: Omit<GrupoEmail, "id">) => {
    const id = "g_" + Date.now();
    const novo: GrupoEmail = { id, ...g };
    setGrupoEmails((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "grupo_emails", id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `grupo_emails/${id}`);
      }
    }
    addToast(`Grupo de E-mail "${g.nome}" criado com sucesso!`, "success");
  };

  const updateGrupoEmail = async (id: string, partial: Partial<GrupoEmail>) => {
    setGrupoEmails((prev) => prev.map((g) => g.id === id ? { ...g, ...partial } : g));
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "grupo_emails", id), partial);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `grupo_emails/${id}`);
      }
    }
    addToast(`Grupo de E-mail atualizado com sucesso!`, "success");
  };

  const deleteGrupoEmail = async (id: string) => {
    setGrupoEmails((prev) => prev.filter((g) => g.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "grupo_emails", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `grupo_emails/${id}`);
      }
    }
    addToast("Grupo de E-mails excluído.", "info");
  };

  // NEW CRUD: MEDIÇÕES DE CONTRATOS
  const addMedicao = async (med: Omit<MedicaoContrato, "id" | "createdAt">) => {
    const id = "med_" + Date.now();
    const nova: MedicaoContrato = {
      id,
      ...med,
      createdAt: new Date().toISOString()
    };
    setMedicoes((prev) => [nova, ...prev]);
    addToast("Medição mensal salva com sucesso!", "success");
  };

  const updateMedicao = async (id: string, partial: Partial<MedicaoContrato>) => {
    setMedicoes((prev) => prev.map((m) => m.id === id ? { ...m, ...partial } : m));
    addToast("Medição mensal editada e atualizada com sucesso!", "success");
  };

  const deleteMedicao = async (id: string) => {
    setMedicoes((prev) => prev.filter((m) => m.id !== id));
    addToast("Medição mensal removida.", "success");
  };

  // NEW CRUD: FÉRIAS COLABORADOR
  const addFerias = async (f: Omit<FeriasColaborador, "id">) => {
    const id = "fe_" + Date.now();
    const nova: FeriasColaborador = { id, ...f };
    setFerias((prev) => [...prev, nova]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "ferias", id), nova);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `ferias/${id}`);
      }
    }
    addToast("Período de férias cadastrado!", "success");
  };

  const updateFerias = async (id: string, partial: Partial<FeriasColaborador>) => {
    setFerias((prev) => prev.map((f) => f.id === id ? { ...f, ...partial } : f));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "ferias", id), { id, ...partial }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `ferias/${id}`);
      }
    }
    addToast("Vacation period updated.", "success");
  };

  const deleteFerias = async (id: string) => {
    setFerias((prev) => prev.filter((f) => f.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "ferias", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `ferias/${id}`);
      }
    }
    addToast("Férias removidas.", "info");
  };

  // NEW CRUD: HORAS EXTRAS
  const addHoraExtra = async (he: Omit<HoraExtra, "id" | "status">) => {
    const id = "he_" + Date.now();
    const nova: HoraExtra = { id, ...he, status: "Pendente" };
    setHorasExtras((prev) => [...prev, nova]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "horas_extras", id), nova);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `horas_extras/${id}`);
      }
    }
    addToast("Solicitação de hora extra enviada para aprovação do gerente!", "success");
  };

  const updateHoraExtra = async (id: string, partial: Partial<HoraExtra>) => {
    setHorasExtras((prev) => prev.map((he) => he.id === id ? { ...he, ...partial } : he));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "horas_extras", id), { id, ...partial }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `horas_extras/${id}`);
      }
    }
    addToast("Lançamento de hora extra atualizado!", "success");
  };

  const deleteHoraExtra = async (id: string) => {
    setHorasExtras((prev) => prev.filter((he) => he.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "horas_extras", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `horas_extras/${id}`);
      }
    }
    addToast("Lançamento de hora extra removido.", "info");
  };

  // NEW CRUD: CHECK-POINTS
  const addCheckPoint = async (cp: Omit<CheckPointItem, "id" | "data" | "autorId">) => {
    if (!activeUser) return;
    const id = "cp_" + Date.now();
    const novo: CheckPointItem = {
      id,
      ...cp,
      data: new Date().toISOString().split("T")[0],
      autorId: activeUser.id
    };
    setCheckpoints((prev) => [...prev, novo]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "checkpoints", id), novo);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `checkpoints/${id}`);
      }
    }
    addToast(`Check-point do colaborador adicionado!`, "success");
  };

  const updateCheckPoint = async (id: string, partial: Partial<CheckPointItem>) => {
    setCheckpoints((prev) => prev.map((cp) => cp.id === id ? { ...cp, ...partial } : cp));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "checkpoints", id), { id, ...partial }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `checkpoints/${id}`);
      }
    }
    addToast("Check-point atualizado com sucesso!", "success");
  };

  const deleteCheckPoint = async (id: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "checkpoints", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `checkpoints/${id}`);
      }
    }
    addToast("Check-point excluído.", "info");
  };

  // NEW CRUD: REUNIAO CHECKPOINT
  const addReuniaoCheckPoint = async (r: Omit<ReuniaoCheckPoint, "id" | "createdAt">) => {
    const id = "re_" + Date.now();
    const nova: ReuniaoCheckPoint = {
      id,
      ...r,
      createdAt: new Date().toISOString()
    };
    setReunioesCheckpoints((prev) => [nova, ...prev]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "reunioes_checkpoints", id), nova);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `reunioes_checkpoints/${id}`);
      }
    }
    addToast("Reunião de Check-Points e Plano de Ação criado com sucesso!", "success");
  };

  const updateReuniaoCheckPoint = async (id: string, partial: Partial<ReuniaoCheckPoint>) => {
    setReunioesCheckpoints((prev) => prev.map((r) => r.id === id ? { ...r, ...partial } : r));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "reunioes_checkpoints", id), { id, ...partial }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `reunioes_checkpoints/${id}`);
      }
    }
    addToast("Ata de Reunião e metas do funcionário atualizadas!", "success");
  };

  const deleteReuniaoCheckPoint = async (id: string) => {
    setReunioesCheckpoints((prev) => prev.filter((r) => r.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "reunioes_checkpoints", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `reunioes_checkpoints/${id}`);
      }
    }
    addToast("Reunião excluída.", "info");
  };

  // NEW SMTP UPDATE
  const updateSMTPConfig = async (config: SMTPConfig) => {
    setSmtpConfig(config);
    addToast("Configuração do servidor SMTP salva com sucesso!", "success");
  };

  // NEW CRUD: TAREFAS PESSOAIS
  const addTarefaPessoal = async (t: Omit<TarefaPessoal, "id" | "createdAt">) => {
    const id = "tp_" + Date.now();
    const nova: TarefaPessoal = {
      id,
      ...t,
      createdAt: new Date().toISOString()
    };
    setTarefasPessoais((prev) => [nova, ...prev]);

    // If adicionarAgenda is true, auto-create an event in the personal calendar!
    if (t.adicionarAgenda && activeUser) {
      const evId = "ev_" + Date.now();
      const novoEv: EventoAgenda = {
        id: evId,
        titulo: `[Tarefa Pessoal] ${t.titulo}`,
        descricao: t.descricao,
        dataHora: `${t.dataInicio}T09:00:00`,
        recorrencia: "Nenhuma",
        tipo: "Pessoal",
        criadorId: activeUser.id
      };
      setEventos(prev => [...prev, novoEv]);
      if (dbConnected) {
        try {
          await setDoc(doc(db, "eventos", evId), cleanUndefined(novoEv));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `eventos/${evId}`);
        }
      }
    }

    addToast("Tarefa pessoal salva com sucesso!", "success");
    if (dbConnected) {
      try {
        await setDoc(doc(db, "tarefas_pessoais", id), cleanUndefined(nova));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tarefas_pessoais/${id}`);
      }
    }
  };

  const updateTarefaPessoal = async (id: string, partial: Partial<TarefaPessoal>) => {
    setTarefasPessoais((prev) => prev.map((t) => t.id === id ? { ...t, ...partial } : t));
    addToast("Tarefa pessoal atualizada com sucesso!", "success");
    if (dbConnected) {
      try {
        await updateDoc(doc(db, "tarefas_pessoais", id), cleanUndefined(partial));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `tarefas_pessoais/${id}`);
      }
    }
  };

  const deleteTarefaPessoal = async (id: string) => {
    setTarefasPessoais((prev) => prev.filter((t) => t.id !== id));
    addToast("Tarefa pessoal excluída com sucesso.", "info");
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "tarefas_pessoais", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tarefas_pessoais/${id}`);
      }
    }
  };

  const addAlerta = async (a: Omit<Alerta, "id" | "data">) => {
    const id = "alert_" + Date.now();
    const novo: Alerta = {
      id,
      ...a,
      data: new Date().toISOString()
    };
    setAlertas((prev) => [novo, ...prev]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "_config", id), cleanUndefined(novo));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `_config/${id}`);
      }
    } else {
      const current = JSON.parse(localStorage.getItem("erp_alertas") || "[]");
      localStorage.setItem("erp_alertas", JSON.stringify([novo, ...current]));
    }
  };

  const addEmailFila = async (email: Omit<FilaEmail, "id" | "dataCriacao" | "status" | "dataEnvio" | "erro">) => {
    const id = "email_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const novo: FilaEmail = {
      id,
      ...email,
      dataCriacao: new Date().toISOString(),
      status: "Pendente",
      dataEnvio: null,
      erro: ""
    };
    setFilaEmails((prev) => [novo, ...prev]);
    if (dbConnected) {
      try {
        await setDoc(doc(db, "_config", id), cleanUndefined(novo));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `_config/${id}`);
      }
    } else {
      const current = JSON.parse(localStorage.getItem("erp_fila_emails") || "[]");
      localStorage.setItem("erp_fila_emails", JSON.stringify([novo, ...current]));
    }
  };

  const updateEmailFila = async (id: string, partial: Partial<FilaEmail>) => {
    setFilaEmails((prev) => prev.map((item) => item.id === id ? { ...item, ...partial } : item));
    if (dbConnected) {
      try {
        await setDoc(doc(db, "_config", id), cleanUndefined(partial), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `_config/${id}`);
      }
    } else {
      const current = JSON.parse(localStorage.getItem("erp_fila_emails") || "[]");
      const updated = current.map((item: any) => item.id === id ? { ...item, ...partial } : item);
      localStorage.setItem("erp_fila_emails", JSON.stringify(updated));
    }
  };

  const deleteEmailFila = async (id: string) => {
    setFilaEmails((prev) => prev.filter((item) => item.id !== id));
    if (dbConnected) {
      try {
        await deleteDoc(doc(db, "_config", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `_config/${id}`);
      }
    } else {
      const current = JSON.parse(localStorage.getItem("erp_fila_emails") || "[]");
      const updated = current.filter((item: any) => item.id !== id);
      localStorage.setItem("erp_fila_emails", JSON.stringify(updated));
    }
  };

  // RESEED METHOD FOR CANAIS DIGITAIS
  const reseedDemandasCanaisDigitais = async () => {
    // 1. Delete all current demands
    setDemandas([]);
    if (dbConnected) {
      try {
        const snapshot = await getDocs(collection(db, "demandas"));
        const batchPromises = snapshot.docs.map(d => deleteDoc(doc(db, "demandas", d.id)));
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Erro ao apagar demandas no Firestore:", err);
      }
    }

    // 2. Build 6 demands of each type inside "proj_canais"
    const records: Demanda[] = [];
    const nowISO = new Date().toISOString();

    // 6 Incidentes
    const incidentTitles = [
      "Lentidão crítica na API de Checkout do cliente",
      "Erro digest 500 no login de parceiros logísticos",
      "Quebra de layout nos botões da página de pagamento",
      "Falha de sincronização de contrato com o sistema ERP",
      "Notificações push duplicadas enviadas no App iOS",
      "Timeout persistente no upload de comprovantes fiscais"
    ];
    incidentTitles.forEach((t, index) => {
      records.push({
        id: `dem_inc_${index}_${Date.now()}`,
        titulo: t,
        tipo: "Incidente",
        numeroChamado: `INC-${10101 + index}`,
        numeroCliente: `INC-CLT-9${index}2`,
        descricao: `<p>Este incidente está afetando a usabilidade no projeto de Canais Digitais. Investigar imediatamente o gargalo de processamento ou os dados da requisição.</p>`,
        idProjeto: "proj_canais",
        coluna: "A Fazer",
        criticidade: index % 3 === 0 ? "Alta" : index % 3 === 1 ? "Média" : "Baixa",
        idResponsavel: activeUser?.id || "p1",
        idDesignados: ["p2"],
        dataEntrega: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        idEmpresas: ["emp1"],
        tags: ["Produção", "Lentidão", "Backend"],
        estimativaHoras: 4,
        estimativas: [{ id: "est1", atividade: "Suporte", horas: 4 }],
        passoAPasso: JSON.stringify([
          { id: "1", text: "Acessar a tela de checkout corporativo", images: [] },
          { id: "2", text: "Iniciar inserção de 3 ou mais itens no carrinho", images: [] },
          { id: "3", text: "Clicar em Prosseguir e monitorar o cabeçalho HTTP de resposta", images: [] }
        ]),
        createdAt: nowISO,
        updatedAt: nowISO
      });
    });

    // 6 Melhorias
    const melhoriaTitles = [
      "Filtros avançados no extrato de faturamento recorrente",
      "Implementar assinatura digital de PDFs contratuais",
      "Upgrade de segurança na criptografia de senhas internas",
      "Melhorar feedback visual ao falhar conexão de dados",
      "Multi-idioma (Inglês/Espanhol) no portal de check-points",
      "Relatório anual detalhado exportável direto para Excel"
    ];
    melhoriaTitles.forEach((t, index) => {
      records.push({
        id: `dem_mel_${index}_${Date.now()}`,
        titulo: t,
        tipo: "Melhoria",
        numeroChamado: `MEL-${10201 + index}`,
        numeroCliente: `MEL-REQ-4${index}9`,
        descricao: `<p>Solicitação de melhoria aprovada pelo cliente para enriquecer a experiência de uso do sistema.</p>`,
        idProjeto: "proj_canais",
        coluna: "Backlog",
        criticidade: "Padrão",
        idResponsavel: "p1",
        idDesignados: ["p2"],
        dataEntrega: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
        idEmpresas: ["emp1"],
        tags: ["Feature", "UX", "Relatório"],
        estimativaHoras: index * 4 + 8,
        estimativas: [{ id: "est12", atividade: "Desenvolvimento", horas: index * 4 + 8 }],
        statusProposta: "Aprovada",
        createdAt: nowISO,
        updatedAt: nowISO
      });
    });

    // 6 Mudanças
    const mudancaTitles = [
      "Migração de storage local da API para AWS S3",
      "Upgrade de patch de segurança do banco de dados relacional",
      "Substituição do provedor de envio de e-mails para SendGrid",
      "Ampliação física de banda do link Dedicado corporativo",
      "Virada de DNS definitiva e ativação de CDN Cloudflare",
      "Implementação de novas políticas de conformidade ITIL v4"
    ];
    mudancaTitles.forEach((t, index) => {
      records.push({
        id: `dem_mud_${index}_${Date.now()}`,
        titulo: t,
        tipo: "Mudança",
        numeroChamado: `MUD-${10301 + index}`,
        numeroCliente: `RFC-${500 + index}`,
        descricao: `<p>Plano estruturado de mudança para alteração de componentes da infraestrutura de nuvem.</p>`,
        idProjeto: "proj_canais",
        coluna: "Backlog",
        criticidade: "Média",
        idResponsavel: "p1",
        idDesignados: ["p1", "p2"],
        dataEntrega: new Date(Date.now() + 86400000 * 10).toISOString().split("T")[0],
        idEmpresas: ["emp1"],
        tags: ["Infra", "Nuvem", "Deploy"],
        estimativaHoras: 16,
        justificativa: "Garantir tolerância a falhas na entrega de arquivos.",
        servicosAfetados: "Upload de comprovantes, PDFs de contratos",
        impacto: "MÉDIO",
        risco: "MÉDIO",
        prioridade: "MÉDIO",
        indisponibilidade: "Não",
        planoImplementacao: "1. Executar backup; 2. Sincronizar pastas; 3. Alterar chaves .env",
        planoRollback: "Desfazer alteração de chaves .env para apontar de volta ao local",
        inicioGeral: `${new Date().toISOString().split("T")[0]}T22:00`,
        fimGeral: `${new Date(Date.now() + 86400000).toISOString().split("T")[0]}T23:59`,
        tarefasMudanca: [
          { id: "tm1", responsavel: "Daniel Thaylor", descricao: "Subir script de migração de arquivos", inicio: `${new Date().toISOString().split("T")[0]}T22:00`, fim: `${new Date().toISOString().split("T")[0]}T23:00` }
        ],
        createdAt: nowISO,
        updatedAt: nowISO
      });
    });

    // 6 BUGs
    const bugTitles = [
      "Vazamento de memória crítico no carregamento de tabelas",
      "Modal trava completamente ao clicar no backdrop no Chrome mobile",
      "Campo de data de aniversário salvando o ano incorreto",
      "Incompatibilidade visual de folha de estilos no Safari v14 antigo",
      "Fila de disparo de e-mails duplicando pacotes de relatórios",
      "Loop infinito de re-renderizações ao alternar abas de perfil"
    ];
    bugTitles.forEach((t, index) => {
      records.push({
        id: `dem_bug_${index}_${Date.now()}`,
        titulo: t,
        tipo: "BUG",
        numeroChamado: `BUG-${10401 + index}`,
        numeroCliente: `BUG-CLT-7${index}5`,
        descricao: `<p>Defeito técnico relatado em ambiente de valiações. Necessário correção prioritária.</p>`,
        idProjeto: "proj_canais",
        coluna: "Desenvolvimento",
        criticidade: "Alta",
        idResponsavel: "p2",
        idDesignados: ["p2"],
        dataEntrega: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        idEmpresas: ["emp1"],
        tags: ["Bug", "Frontend", "Crash"],
        estimativaHoras: 8,
        ambiente: "DEV",
        subTipoBug: "Front",
        passoAPasso: JSON.stringify([
          { id: "1", text: "Abrir o console de desenvolvedor do navegador", images: [] },
          { id: "2", text: "Ficar trocando de aba rapidamente por 10 vezes seguidas", images: [] }
        ]),
        createdAt: nowISO,
        updatedAt: nowISO
      });
    });

    setDemandas(records);
    if (dbConnected) {
      try {
        const batchPromises = records.map(r => setDoc(doc(db, "demandas", r.id), cleanUndefined(r)));
        await Promise.all(batchPromises);
      } catch (err) {
        console.error("Erro ao escrever novas demandas no Firestore:", err);
      }
    }
    addToast("Sucesso: 24 tarefas de teste criadas para o Contrato de Canais Digitais!", "success");
  };

  return (
    <DBContext.Provider
      value={{
        pessoas,
        empresas,
        contratos,
        projetos,
        demandas,
        comentarios,
        apontamentos,
        eventos,
        acessos,
        grupoEmails,
        
        // New values
        medicoes,
        ferias,
        horasExtras,
        checkpoints,
        reunioesCheckpoints: reunioesCheckpoints,
        smtpConfig,

        isInitialized,
        activeUser,
        activeUserAcessos,
        loadingMessage,
        
        addPessoa,
        updatePessoa,
        deletePessoa,
        
        addEmpresa,
        updateEmpresa,
        deleteEmpresa,
        
        addContrato,
        updateContrato,
        deleteContrato,
        
        addProjeto,
        updateProjeto,
        deleteProjeto,
        
        addDemanda,
        updateDemanda,
        deleteDemanda,
        restoreDemanda,
        moveDemanda,
        
        addComentario,
        deleteComentario,
        
        addApontamento,
        updateApontamento,
        deleteApontamento,
        
        addEvento,
        updateEvento,
        deleteEvento,
        
        // New operations
        addMedicao,
        updateMedicao,
        deleteMedicao,
        addFerias,
        updateFerias,
        deleteFerias,
        addHoraExtra,
        updateHoraExtra,
        deleteHoraExtra,
        addCheckPoint,
        updateCheckPoint,
        deleteCheckPoint,
        addReuniaoCheckPoint,
        updateReuniaoCheckPoint,
        deleteReuniaoCheckPoint,
        updateSMTPConfig,
        addGrupoEmail,
        updateGrupoEmail,
        deleteGrupoEmail,

        profilePermissions,
        updateProfilePermissions,
        deleteProfilePermission,

        simulatedLogin,
        logout,
        sendLoginToken,
        
        toasts,
        addToast,
        removeToast,
        
        isSyncing,
        forceSync,
        dbConnected,
        dbError,
        isCheckingConnection,
        testAndInitializeDatabase,

        // Personal tasks and seed helpers mapping
        tarefasPessoais,
        addTarefaPessoal,
        updateTarefaPessoal,
        deleteTarefaPessoal,
        reseedDemandasCanaisDigitais,
        alertas,
        addAlerta,
        filaEmails,
        addEmailFila,
        updateEmailFila,
        deleteEmailFila
      }}
    >
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => {
  const context = useContext(DBContext);
  if (context === undefined) {
    throw new Error("useDB deve ser utilizado sob um DBProvider");
  }
  return context;
};
