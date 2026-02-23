
export type UserRole = 'Administrador' | 'Guardião';

export interface Guardiao {
  id: string;
  nomeCompleto: string;
  QRA?: string;
  email: string;
  telefone: string;
  postosAutorizados: string[]; // Array of Posto IDs
  status: 'Ativo' | 'Inativo';
  tipoUsuario: UserRole;
  dataCadastro: string;
}

export interface Posto {
  id: string;
  nomePosto: string;
  latitude: number;
  longitude: number;
  descricao: string;
  guardioesAutorizados: string[]; // Array of Guardião Names (as requested)
  dataCadastro: string;
  qrUrl: string;
  manualCode: string; // Backup numeric code
}

export interface Ronda {
  id: string;
  guardiaoId: string;
  guardiaoNome: string;
  postoId: string;
  postoNome: string;
  latitudeInicio: number;
  longitudeInicio: number;
  horarioInicio: string;
  horarioFim?: string;
  status: 'Online' | 'Offline';
  photos: string[];
}

export interface Material {
  id: string;
  nomeMaterial: string;
  tipo: 'Uniforme' | 'Equipamento' | 'Outro';
  descricao: string;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
  postoRelacionado?: string;
  quantidadeMinima: number;
  dataCadastro: string;
}

export interface Entrega {
  id: string;
  guardiaoId: string;
  guardiaoNome: string;
  guardiaoQRA?: string;
  postoId: string;
  postoNome: string;
  materialId: string;
  materialNome: string;
  quantidade: number;
  statusEntrega: 'Entregue' | 'Pendente' | 'Devolvido' | 'Não Recebido' | '';
  dataEntrega: string;
  entreguePor: string; // Admin Name
  responsavelRecebimento: string;
  assinatura?: string; // Base64 or URL
  observacoes?: string;
  createdAt: string;
}

export interface AppState {
  guardioes: Guardiao[];
  postos: Posto[];
  rondas: Ronda[];
  materiais: Material[];
  entregas: Entrega[];
}
