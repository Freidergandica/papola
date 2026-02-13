// ============================================================================
// R4 Conecta V3.0 — Tipos de la API
// ============================================================================

/** Configuración del cliente R4 */
export interface R4Config {
  /** Token del comercio proporcionado por el banco (usado como Commerce header y clave HMAC) */
  commerce: string;
  /** URL base de la API (default: https://r4conecta.mibanco.com.ve) */
  baseUrl?: string;
}

// ============================================================================
// Consulta tasa BCV — POST /MBbcv
// HMAC: fechavalor + moneda
// ============================================================================

export interface BcvRequest {
  /** Código ISO moneda (ej: "USD") */
  Moneda: string;
  /** Fecha consulta tasa BCV (yyyy-mm-dd) */
  Fechavalor: string;
}

export interface BcvResponse {
  code: string;
  fechavalor: string;
  tipocambio: number;
}

// ============================================================================
// Webhook: R4 consulta si aceptas pago — POST dominio.cliente/R4consulta
// (Implementado por el comercio, NO se llama desde el SDK)
// ============================================================================

export interface ConsultaRequest {
  /** Identificación del cliente (8 numérico) */
  IdCliente: string;
  /** Monto de la operación (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Teléfono del comercio (11 numérico) */
  TelefonoComercio: string;
}

export interface ConsultaResponse {
  status: boolean;
}

/** Request vía SIMF (modelo alternativo) */
export interface ConsultaSimfRequest {
  IdComercio: string;
  TelefonoComercio: string;
  TelefonoEmisor: string;
  Concepto: string;
  BancoEmisor: string;
  Monto: string;
  FechaHora: string;
  Referencia: string;
  CodigoRed: string;
}

export interface ConsultaSimfResponse {
  abono: boolean;
}

// ============================================================================
// Webhook: R4 notifica pago acreditado — POST dominio.cliente/R4notifica
// (Implementado por el comercio, NO se llama desde el SDK)
// ============================================================================

export interface NotificaRequest {
  /** Cédula o RIF del Comercio (8 numérico) */
  IdComercio: string;
  /** Teléfono del comercio (11 numérico) */
  TelefonoComercio: string;
  /** Teléfono de origen del pago (11 numérico) */
  TelefonoEmisor: string;
  /** Motivo del pago (30 alfanumérico, opcional) */
  Concepto?: string;
  /** Código del banco del pago (3 numérico) */
  BancoEmisor: string;
  /** Monto con decimales separados por punto */
  Monto: string;
  /** Fecha y hora ISO */
  FechaHora: string;
  /** Referencia interbancaria */
  Referencia: string;
  /** Código de respuesta de la red interbancaria */
  CodigoRed: string;
}

export interface NotificaResponse {
  abono: boolean;
}

// ============================================================================
// Dispersión de pagos — POST /R4pagos
// HMAC: monto + fecha (formato MM/DD/AAAA)
// ============================================================================

export interface PagosPersona {
  /** Nombre y apellido del beneficiario */
  nombres: string;
  /** Tipo de documento(V,E,J,P) + Documento (ej: "V05503673") */
  documento: string;
  /** Número de cuenta a abonar (20 dígitos) */
  destino: string;
  /** Monto parcial a repartir al beneficiario */
  montoPart: string;
}

export interface PagosRequest {
  /** Monto total para la dispersión (máximo 8 números y 2 decimales) */
  monto: string;
  /** Fecha del pago — Formato MM/DD/YYYY (10 alfanumérico) */
  fecha: string;
  /** Referencia (8 numérico) */
  Referencia: string;
  /** Array de beneficiarios */
  personas: PagosPersona[];
}

export interface PagosResponse {
  success: boolean;
  message: string;
  error?: string;
}

// ============================================================================
// Vuelto (pago móvil saliente) — POST /MBvuelto
// HMAC: TelefonoDestino + Monto + Banco + Cedula
// ============================================================================

export interface VueltoRequest {
  /** Teléfono del beneficiario (11 numérico) */
  TelefonoDestino: string;
  /** Tipo de Documento(V,E) + Documento de identidad (9 alfanumérico, ej: "V12345678") */
  Cedula: string;
  /** Código del banco del beneficiario (4 numérico) */
  Banco: string;
  /** Monto con decimales separados por punto (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Motivo del pago (30 alfanumérico, opcional) */
  Concepto?: string;
  /** IP de la máquina (opcional) */
  Ip?: string;
}

export interface VueltoResponse {
  code: string;
  message: string;
  reference?: string;
}

// ============================================================================
// Cobro C2P — POST /MBc2p
// HMAC: TelefonoDestino + Monto + Banco + Cedula
// ============================================================================

export interface C2pRequest {
  /** Teléfono del pagador (11 numérico) */
  TelefonoDestino: string;
  /** Tipo de Documento + Documento (9 alfanumérico) */
  Cedula: string;
  /** Motivo del cobro (30 alfanumérico, opcional) */
  Concepto?: string;
  /** Código del banco del pagador (4 numérico) */
  Banco: string;
  /** IP del solicitante (opcional) */
  Ip?: string;
  /** Monto con decimales (máximo 8 números y 2 decimales) */
  Monto: string;
  /** OTP del pagador (8 numérico) */
  Otp: string;
}

export interface C2pResponse {
  code: string;
  message: string;
  reference?: string;
}

// ============================================================================
// Anulación C2P — POST /MBanulacionC2P
// HMAC: Banco
// ============================================================================

export interface AnulacionC2pRequest {
  /** Tipo de Documento + Documento */
  Cedula: string;
  /** Código del banco (4 numérico) */
  Banco: string;
  /** Referencia de la transacción a anular */
  Referencia: string;
}

export interface AnulacionC2pResponse {
  code: string;
  message: string;
  reference?: string;
}

// ============================================================================
// Generar OTP — POST /GenerarOtp
// HMAC: Banco + Monto + Telefono + Cedula
// ============================================================================

export interface GenerarOtpRequest {
  /** Código del banco (4 numérico) */
  Banco: string;
  /** Monto con decimales (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Teléfono del pagador (11 numérico) */
  Telefono: string;
  /** Tipo de Documento + Documento (9 alfanumérico) */
  Cedula: string;
}

export interface GenerarOtpResponse {
  code: string;
  message: string;
  success: boolean;
}

// ============================================================================
// Débito Inmediato — POST /DebitoInmediato
// HMAC: Banco + Cedula + Telefono + Monto + OTP
// ============================================================================

export interface DebitoInmediatoRequest {
  /** Código del banco (4 numérico) */
  Banco: string;
  /** Monto con decimales (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Teléfono del pagador (11 numérico) */
  Telefono: string;
  /** Tipo de Documento + Documento (9 alfanumérico) */
  Cedula: string;
  /** Nombre del pagador (20 alfa) */
  Nombre: string;
  /** OTP generado (8 numérico) */
  OTP: string;
  /** Concepto del débito (30 alfanumérico) */
  Concepto: string;
}

export interface DebitoInmediatoResponse {
  code: string;
  message: string;
  reference?: string;
  id?: string;
  Id?: string;
}

// ============================================================================
// Crédito Inmediato (por teléfono) — POST /CreditoInmediato
// HMAC: Banco + Cedula + Telefono + Monto
// ============================================================================

export interface CreditoInmediatoRequest {
  /** Código del banco (4 numérico) */
  Banco: string;
  /** Tipo de Documento + Documento (9 alfanumérico) */
  Cedula: string;
  /** Teléfono del beneficiario (11 numérico) */
  Telefono: string;
  /** Monto con decimales (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Concepto (30 alfanumérico) */
  Concepto: string;
}

export interface CreditoInmediatoResponse {
  code: string;
  message: string;
  reference?: string;
  id?: string;
  Id?: string;
}

// ============================================================================
// Crédito Inmediato cuentas 20 dígitos — POST /CICuentas
// HMAC: Cedula + Cuenta + Monto
// ============================================================================

export interface CreditoInmediatoCuentaRequest {
  /** Tipo de Documento + Documento (9 alfanumérico) */
  Cedula: string;
  /** Número de cuenta 20 dígitos */
  Cuenta: string;
  /** Monto con decimales (máximo 8 números y 2 decimales) */
  Monto: string;
  /** Concepto (30 alfanumérico) */
  Concepto: string;
}

export interface CreditoInmediatoCuentaResponse {
  code: string;
  message: string;
  reference?: string;
  id?: string;
  Id?: string;
}

// ============================================================================
// Domiciliación por cuenta 20 dígitos — POST /TransferenciaOnline/DomiciliacionCNTA
// HMAC: cuenta
// ============================================================================

export interface DomiciliacionCuentaRequest {
  /** Tipo de Documento + Documento */
  docId: string;
  /** Nombre del titular */
  nombre: string;
  /** Número de cuenta 20 dígitos */
  cuenta: string;
  /** Monto con decimales */
  monto: string;
  /** Concepto */
  concepto: string;
}

export interface DomiciliacionCuentaResponse {
  codigo: string;
  mensaje: string;
  uuid?: string;
}

// ============================================================================
// Domiciliación por teléfono — POST /TransferenciaOnline/DomiciliacionCELE
// HMAC: telefono
// ============================================================================

export interface DomiciliacionTelefonoRequest {
  /** Tipo de Documento + Documento */
  docId: string;
  /** Teléfono del titular (11 numérico) */
  telefono: string;
  /** Nombre del titular */
  nombre: string;
  /** Código del banco (4 numérico) */
  banco: string;
  /** Monto con decimales */
  monto: string;
  /** Concepto */
  concepto: string;
}

export interface DomiciliacionTelefonoResponse {
  codigo: string;
  mensaje: string;
  uuid?: string;
}

// ============================================================================
// Consultar Operaciones — POST /ConsultarOperaciones
// HMAC: Id
// ============================================================================

export interface ConsultarOperacionesRequest {
  /** UUID de la operación (36 alfanumérico) */
  Id: string;
}

export interface ConsultarOperacionesResponse {
  code: string;
  reference?: string;
  success?: boolean;
  message?: string;
  Id?: string;
}

// ============================================================================
// Códigos de respuesta conocidos
// ============================================================================

/** Códigos de red interbancaria (pago móvil / vuelto / C2P) */
export type R4CodigoRed =
  | '00' // Aprobado
  | '01' // Referirse al cliente
  | '08' // Token inválido
  | '12' // Transacción inválida
  | '13' // Monto inválido
  | '14' // Número teléfono receptor errado
  | '05' // Tiempo de respuesta excedido
  | '15' // Llave errónea
  | '30' // Error de formato
  | '41' // Servicio no activo
  | '43' // Servicio no activo
  | '51' // Fondos insuficientes
  | '55' // Teléfono origen no existe
  | '56' // Celular no coincide
  | '57' // Negada por el receptor
  | '62' // Cuenta restringida
  | '68' // Respuesta tardía, procede reverso
  | '80' // Cédula o pasaporte errado
  | '87' // Time out
  | '90' // Cierre bancario en proceso
  | '91' // Institución no disponible
  | '92' // Banco receptor no afiliado
  | '99'; // Error en notificación

/** Códigos de respuesta para Débito/Crédito Inmediato y Domiciliación */
export type R4TransferenciaCode =
  | 'ACCP' // Operación aceptada
  | 'AC00' // Operación en espera de respuesta del receptor
  | 'AB01' // Tiempo de espera agotado
  | 'AB07' // Agente fuera de línea
  | 'AC01' // Número de cuenta incorrecto
  | 'AC04' // Cuenta cancelada
  | 'AC06' // Cuenta bloqueada
  | 'AC09' // Moneda no válida
  | 'AG01' // Transacción restringida
  | 'AG09' // Pago no recibido
  | 'AG10' // Agente suspendido o excluido
  | 'AM02' // Monto de la transacción no permitido
  | 'AM04' // Saldo insuficiente
  | 'AM05' // Operación duplicada
  | 'BE01' // Datos del cliente no corresponden a la cuenta
  | 'BE20' // Longitud del nombre inválida
  | 'CH20' // Número de decimales incorrecto
  | 'CUST' // Cancelación solicitada por el deudor
  | 'DS02' // Operación cancelada
  | 'DT03' // Fecha de procesamiento no bancaria no válida
  | 'DU01' // Identificación de mensaje duplicado
  | 'ED05' // Liquidación fallida
  | 'FF05' // Código del producto incorrecto
  | 'FF07' // Código del sub producto incorrecto
  | 'MD01' // No posee afiliación
  | 'MD09' // Afiliación inactiva
  | 'MD15' // Monto incorrecto
  | 'MD21' // Cobro no permitido
  | 'MD22' // Afiliación suspendida
  | 'RC08' // Código del banco no existe en el sistema
  | 'RJCT' // Operación rechazada
  | 'TKCM' // Código único de operación de débito incorrecto
  | 'TM01' // Rechazo técnico
  | 'VE01'; // Fuera del horario permitido

/** Union de todos los códigos de respuesta */
export type R4ResponseCode = R4CodigoRed | R4TransferenciaCode;

/** Tipo de error del SDK */
export interface R4Error {
  code: string;
  message: string;
}
