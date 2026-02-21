import { createHmac } from 'crypto';
import type {
  R4Config,
  R4Error,
  BcvRequest,
  BcvResponse,
  VueltoRequest,
  VueltoResponse,
  C2pRequest,
  C2pResponse,
  AnulacionC2pRequest,
  AnulacionC2pResponse,
  PagosRequest,
  PagosResponse,
  GenerarOtpRequest,
  GenerarOtpResponse,
  DebitoInmediatoRequest,
  DebitoInmediatoResponse,
  CreditoInmediatoRequest,
  CreditoInmediatoResponse,
  CreditoInmediatoCuentaRequest,
  CreditoInmediatoCuentaResponse,
  DomiciliacionCuentaRequest,
  DomiciliacionCuentaResponse,
  DomiciliacionTelefonoRequest,
  DomiciliacionTelefonoResponse,
  ConsultarOperacionesResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://r4conecta.mibanco.com.ve';

function hmacSha256(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

export class R4Client {
  private commerce: string;
  private baseUrl: string;

  constructor(config: R4Config) {
    this.commerce = config.commerce;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private async request<T>(path: string, body: unknown, hmacData: string): Promise<T> {
    const authorization = hmacSha256(hmacData, this.commerce);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        Commerce: this.commerce,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: R4Error = await response.json().catch(() => ({
        code: String(response.status),
        message: response.statusText,
      }));
      throw new Error(`R4 API error [${error.code}]: ${error.message}`);
    }

    return response.json() as Promise<T>;
  }

  // ── Consulta tasa BCV ──────────────────────────────────────────────
  // POST /MBbcv — HMAC: fechavalor + moneda
  async consultarTasaBcv(moneda: string, fechavalor: string): Promise<BcvResponse> {
    const body: BcvRequest = { Moneda: moneda, Fechavalor: fechavalor };
    return this.request<BcvResponse>('/MBbcv', body, fechavalor + moneda);
  }

  // ── Vuelto (pago móvil saliente) ───────────────────────────────────
  // POST /MBvuelto — HMAC: TelefonoDestino + Monto + Banco + Cedula
  async enviarVuelto(data: VueltoRequest): Promise<VueltoResponse> {
    const hmac = data.TelefonoDestino + data.Monto + data.Banco + data.Cedula;
    return this.request<VueltoResponse>('/MBvuelto', data, hmac);
  }

  // ── Cobro C2P ──────────────────────────────────────────────────────
  // POST /MBc2p — HMAC: " TelefonoDestino + Monto + Banco + Cedula" (leading space per PDF)
  async cobrarC2p(data: C2pRequest): Promise<C2pResponse> {
    const hmac = ' ' + data.TelefonoDestino + data.Monto + data.Banco + data.Cedula;
    return this.request<C2pResponse>('/MBc2p', data, hmac);
  }

  // ── Anulación C2P ──────────────────────────────────────────────────
  // POST /MBanulacionC2P — HMAC: Banco
  async anularC2p(data: AnulacionC2pRequest): Promise<AnulacionC2pResponse> {
    return this.request<AnulacionC2pResponse>('/MBanulacionC2P', data, data.Banco);
  }

  // ── Dispersión de pagos ────────────────────────────────────────────
  // POST /R4pagos — HMAC: monto + fecha (formato MM/DD/AAAA)
  async dispersarPagos(data: PagosRequest): Promise<PagosResponse> {
    const hmac = data.monto + data.fecha;
    return this.request<PagosResponse>('/R4pagos', data, hmac);
  }

  // ── Generar OTP ────────────────────────────────────────────────────
  // POST /GenerarOtp — HMAC: Banco + Monto + Telefono + Cedula
  async generarOtp(data: GenerarOtpRequest): Promise<GenerarOtpResponse> {
    const hmac = data.Banco + data.Monto + data.Telefono + data.Cedula;
    return this.request<GenerarOtpResponse>('/GenerarOtp', data, hmac);
  }

  // ── Débito Inmediato ───────────────────────────────────────────────
  // POST /DebitoInmediato — HMAC: Banco + Cedula + Telefono + Monto + OTP
  async debitoInmediato(data: DebitoInmediatoRequest): Promise<DebitoInmediatoResponse> {
    const hmac = data.Banco + data.Cedula + data.Telefono + data.Monto + data.OTP;
    return this.request<DebitoInmediatoResponse>('/DebitoInmediato', data, hmac);
  }

  // ── Crédito Inmediato (por teléfono) ───────────────────────────────
  // POST /CreditoInmediato — HMAC: Banco + Cedula + Telefono + Monto
  async creditoInmediato(data: CreditoInmediatoRequest): Promise<CreditoInmediatoResponse> {
    const hmac = data.Banco + data.Cedula + data.Telefono + data.Monto;
    return this.request<CreditoInmediatoResponse>('/CreditoInmediato', data, hmac);
  }

  // ── Crédito Inmediato cuentas 20 dígitos ───────────────────────────
  // POST /CICuentas — HMAC: Cedula + Cuenta + Monto
  async creditoInmediatoCuenta(data: CreditoInmediatoCuentaRequest): Promise<CreditoInmediatoCuentaResponse> {
    const hmac = data.Cedula + data.Cuenta + data.Monto;
    return this.request<CreditoInmediatoCuentaResponse>('/CICuentas', data, hmac);
  }

  // ── Domiciliación por cuenta ───────────────────────────────────────
  // POST /TransferenciaOnline/DomiciliacionCNTA — HMAC: cuenta
  async domiciliacionCuenta(data: DomiciliacionCuentaRequest): Promise<DomiciliacionCuentaResponse> {
    return this.request<DomiciliacionCuentaResponse>(
      '/TransferenciaOnline/DomiciliacionCNTA',
      data,
      data.cuenta,
    );
  }

  // ── Domiciliación por teléfono ─────────────────────────────────────
  // POST /TransferenciaOnline/DomiciliacionCELE — HMAC: telefono
  async domiciliacionTelefono(data: DomiciliacionTelefonoRequest): Promise<DomiciliacionTelefonoResponse> {
    return this.request<DomiciliacionTelefonoResponse>(
      '/TransferenciaOnline/DomiciliacionCELE',
      data,
      data.telefono,
    );
  }

  // ── Consultar Operaciones ──────────────────────────────────────────
  // POST /ConsultarOperaciones — HMAC: Id
  async consultarOperaciones(id: string): Promise<ConsultarOperacionesResponse> {
    const body = { Id: id };
    return this.request<ConsultarOperacionesResponse>('/ConsultarOperaciones', body, id);
  }
}
