export { R4Client } from './client';
export type {
  R4Config,
  R4Error,
  R4ResponseCode,
  R4CodigoRed,
  R4TransferenciaCode,
  // BCV
  BcvRequest,
  BcvResponse,
  // Webhooks (tipos para que el comercio implemente)
  ConsultaRequest,
  ConsultaResponse,
  ConsultaSimfRequest,
  ConsultaSimfResponse,
  NotificaRequest,
  NotificaResponse,
  // Pagos (dispersión)
  PagosPersona,
  PagosRequest,
  PagosResponse,
  // Vuelto
  VueltoRequest,
  VueltoResponse,
  // C2P
  C2pRequest,
  C2pResponse,
  AnulacionC2pRequest,
  AnulacionC2pResponse,
  // OTP + Débito Inmediato
  GenerarOtpRequest,
  GenerarOtpResponse,
  DebitoInmediatoRequest,
  DebitoInmediatoResponse,
  // Crédito Inmediato
  CreditoInmediatoRequest,
  CreditoInmediatoResponse,
  CreditoInmediatoCuentaRequest,
  CreditoInmediatoCuentaResponse,
  // Domiciliación
  DomiciliacionCuentaRequest,
  DomiciliacionCuentaResponse,
  DomiciliacionTelefonoRequest,
  DomiciliacionTelefonoResponse,
  // Consultar Operaciones
  ConsultarOperacionesRequest,
  ConsultarOperacionesResponse,
} from './types';
