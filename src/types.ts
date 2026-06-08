/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Pessoa {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: "GMZ" | "Cliente" | "Outros";
  senha?: string;
  senhaToken?: string;
  foto?: string;
  dataAniversario?: string;
  dataContratacao?: string;
  perfil?: string;
  idioma?: "PT" | "EN" | "ES";
  tema?: "dark" | "metro" | "clean";
  endereco?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  cpf?: string;
  recebeIfood?: boolean;
  valorIfood?: number;
}

export interface Acesso {
  id_pessoa: string;
  modulos: string[]; // e.g. ['empresas', 'pessoas', 'contratos', 'projetos', 'demandas', 'agenda']
}

export interface Empresa {
  id: string;
  nome: string;
}

export interface Contrato {
  id: string;
  numero: string;
  nome: string;
  sla: string; // e.g. "24h"
  valorTotal: number;
  valorCobranca: number;
  periodoCobranca: "Mensal" | "Bimestral" | "Trimestral" | "Semestral" | "Anual";
  dataInicio: string;
  dataFim: string;
  status: "Ativo" | "Rascunho" | "Suspenso" | "Cancelado";
  empresaIds: string[]; // Selection multiples
  folderId: string;
  anexos: { name: string; url: string; size: string }[];
  valoresAdicionais?: number; // Additional month costs
  horasMensais?: number;
  divisaoIgual?: boolean;
  divisaoHorasEmpresas?: { [empresaId: string]: number };
  acumulativoTrimestre?: boolean;
}

export interface MedicaoContrato {
  id: string;
  contratoIds: string[]; // Multiple contracts selection
  nomeDocumento: string;
  periodoRef: string; // "YYYY-MM" month
  valorMes: number; // calculated sum of the contracts and billing
  valorAcumulado: number; // historical value billed so far
  valoresAdicionaisTotais: number;
  pedido: string; // P.O. Number
  folha: string; // sheet / page
  dataRecebimento: string;
  createdAt: string;
  status: "Salvo" | "Faturado";
  observacao?: string;
}

export interface CampoCustom {
  id: string;
  label: string;
  tipo: "texto_curto" | "texto_longo" | "data" | "lista_coisas" | "imagem";
  subTipoLista?: "empresas" | "pessoas"; // For list of things
  gridSpan: 1 | 2; // 1 = half width, 2 = full width
  imagemUrl?: string; // Static image base64 or placeholder URL
}

export interface GuiaCustom {
  id: string;
  nome: string;
  campos: CampoCustom[];
}

export interface TipoDemandaCustom {
  id: string;
  nome: string;
  sigla: string;
  camposPreConstruidos: {
    apontamentos?: boolean;
    anexos?: boolean;
    lista_pessoas?: boolean;
    estimativas?: boolean;
    lista_empresas?: boolean;
    comentarios?: boolean;
  };
  guias: GuiaCustom[];
}

export interface Projeto {
  id: string;
  nome: string;
  workflow: string[]; // Column names
  atividades: string[]; // Allowed activities Custom List
  contabilizarPorEmpresa: boolean;
  contratoIds?: string[]; // Linked contracts
  acessosPessoasIds?: string[]; // IDs of users allowed to see this project in Kanban 
  tiposDemandasCustom?: TipoDemandaCustom[]; // Custom field/demand types
  gestoresIds?: string[]; // Project managers
}

export interface EstimativaItem {
  id: string;
  horas: number;
  atividade: string;
}

export interface AnexoDemanda {
  id: string;
  nome: string;
  size: string;
  base64: string;
  uploading?: boolean;
}

export interface TarefaMudanca {
  id: string;
  responsavel: string; // ID of pessoa or manual text typed
  descricao: string;
  inicio: string; // ISO date format YYYY-MM-DDTHH:MM
  fim: string; // ISO date format YYYY-MM-DDTHH:MM
}

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string; // HTML format (Quill or Custom)
  numeroChamado: string;
  tipo?: string; // Standard or custom demand type
  tipoCustomId?: string; // Links to TipoDemandaCustom.id if custom built
  valoresCamposCustom?: Record<string, any>; // Stores key-value custom input values
  tags: string[];
  criticidade: "Baixa" | "Média" | "Alta" | "Urgente" | "Padrão";
  idProjeto: string;
  coluna: string; // Column workflow step
  idDesignado?: string; 
  idDesignados?: string[]; 
  idResponsavel?: string;
  priorizadoFila?: boolean;
  estimativaHoras: number;
  atividade?: string; 
  estimativas?: EstimativaItem[]; 
  anexos?: AnexoDemanda[]; 
  excluido?: boolean; 
  excluidoAt?: string; 
  createdAt: string;
  updatedAt: string;
  dataEntrega?: string;
  idEmpresa?: string; 
  idEmpresas?: string[]; 
  sincronizando?: boolean; 
  filaConcluida?: boolean;
  filaConcluidaAt?: string | null; 
  filaAprovada?: boolean | null;
  inicioExecucao?: string | null;

  // Billing filter
  cobrarEmContrato?: boolean; // Flag to charge contract
  cobrarContratoMes?: string; // Target billing month e.g. "2026-05"
  numeroCliente?: string; // Nº do cliente for all demand types

  // BUG type step-by-step
  passoAPasso?: string; // Steps to reproduce BUG

  // Change type fields
  justificativa?: string;
  servicosAfetados?: string;
  impacto?: "BAIXO" | "MÉDIO" | "ALTO";
  risco?: "BAIXO" | "MÉDIO" | "ALTO";
  prioridade?: "BAIXO" | "MÉDIO" | "ALTO";
  indisponibilidade?: "Sim" | "Não" | "Parcial";
  planoImplementacao?: string;
  planoRollback?: string;
  responsavelGeral?: string; // Name or ID
  inicioGeral?: string; // ISO date-time
  fimGeral?: string; // ISO date-time
  tarefasMudanca?: TarefaMudanca[];

  // Linked tasks association (for BUG & Change)
  tarefasAssociadasIds?: string[]; // other Demanda IDs
  relacoes?: { idDemanda: string; tipo: "filha" | "pai" | "irma" }[];

  // New reconstructed fields
  statusQA?: "Reproduzido" | "Corrigido" | "Validado";
  statusProposta?: "Em analise" | "Proposta Enviada" | "Aprovada" | "Re-analise" | "Reprovada" | "";
  idClienteResponsavel?: string;
  ambiente?: string;
  subTipoBug?: string;
  idQAManager?: string;
  comentarioAprovacaoGestor?: string;
  comentarioEnvioQA?: string;
}

export interface Comentario {
  id: string;
  idDemanda: string;
  idPessoa: string;
  nomeAutor: string;
  emailAutor: string;
  textoHTML: string;
  createdAt: string;
}

export interface Apontamento {
  id: string;
  idDemanda: string;
  idPessoa: string;
  nomePessoa: string;
  atividade: string; 
  horas: number;
  createdAt: string;
  descricao?: string;
}

export interface GrupoEmail {
  id: string;
  nome: string;
  descricao?: string;
  participantesIds: string[]; // List of Pessoa IDs belonging to this group
  status?: "Ativo" | "Inativo";
}

export interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string;
  dataHora: string; // ISO String
  recorrencia: "Anual" | "Mensal" | "Semanal" | "Quinzenal" | "Nenhuma";
  parentId?: string;
  tipo?: "Pessoal" | "Grupo"; // "Pessoal" or "Grupo"
  criadorId?: string; // ID of the person who created the event
  grupoId?: string; // If tipo === "Grupo", references GrupoEmail.id
  empresaId?: string; // If tipo === "Grupo", references Empresa.id
  participantesIds?: string[]; // Array of Pessoa.id that should see this event/receive alerts
}

// HR - Vacation state
export interface PeriodoGozo {
  id: string;
  dataInicio: string;
  dataFim: string;
}

export interface FeriasColaborador {
  id: string;
  idPessoa: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicio: string; // Maintain for legacy
  dataFim: string; // Maintain for legacy
  status: "Agendado" | "Em Gozo" | "Concluído";
  observacao?: string;
  diasDisponiveis?: number;
  periodosGozo?: PeriodoGozo[];
  visivelColaborador?: boolean;
}

// HR - Overtime state
export interface HoraExtra {
  id: string;
  idPessoa: string;
  idProjeto?: string;
  idDemanda?: string;
  horas: number;
  horasAjustadas?: number;
  data: string;
  descricao: string;
  compensacao: "Pagamento" | "Folga";
  status: "Pendente" | "Aprovado" | "Ajustado" | "Rejeitado";
  observacaoGerente?: string;
}

// HR - Checkpoint and meetings
export interface CheckPointItem {
  id: string;
  idPessoa: string;
  tipo: "Positivo" | "Negativo";
  descricao: string;
  data: string;
  autorId: string;
}

export interface ReuniaoCheckPoint {
  id: string;
  titulo: string;
  dataReuniao: string;
  participantesIds: string[];
  checkpointsIds: string[];
  acoes: string;
  prazo: string;
  comentariosGerencia: string;
  createdAt: string;
  visivelColaborador?: boolean;
}

// SMTP configurations
export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  secure: boolean;
  preloads: {
    [serviceType: string]: {
      titulo: string;
      descricao: string;
      anexoNome: string;
    }
  };
}

export interface TarefaPessoal {
  id: string;
  idPessoa: string;
  titulo: string;
  descricao: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  status: "Pendente" | "Em Andamento" | "Pausada" | "Concluída";
  adicionarAgenda: boolean;
  createdAt: string;
}

export interface Alerta {
  id: string;
  titulo: string;
  mensagem: string;
  recipientId: string; // Recipient persona ID, or "gerencial" represent managers
  type?: string;
  data: string; // ISO datetime
  targetPessoaId?: string; // Preselected technician queue for redirect
}

export interface FilaEmail {
  id: string;
  dataCriacao: string; // ISO DateTime
  dataEnvio: string | null; // ISO DateTime or null
  assunto: string;
  destinatarios: string; // Comma separated emails
  processo: string;
  status: "Pendente" | "Enviado" | "Erro";
  erro: string;
}


