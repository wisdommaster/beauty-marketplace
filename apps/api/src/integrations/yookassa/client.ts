export interface YooKassaConfig {
  shopId: string
  secretKey: string
  testMode?: boolean
}

export interface PaymentAmount {
  value: string
  currency: 'RUB'
}

export interface PaymentRequest {
  amount: PaymentAmount
  capture: boolean
  confirmation: {
    type: 'redirect'
    return_url: string
  }
  description?: string
  metadata?: Record<string, string>
  idempotencyKey: string
}

export interface PaymentResponse {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: PaymentAmount
  confirmation?: {
    type: 'redirect'
    confirmation_url: string
  }
  created_at: string
  captured_at?: string
  description?: string
  metadata?: Record<string, string>
}

export interface RefundRequest {
  payment_id: string
  amount: PaymentAmount
  description?: string
}

export interface RefundResponse {
  id: string
  status: 'pending' | 'succeeded' | 'canceled'
  amount: PaymentAmount
  created_at: string
}

export class YooKassaClient {
  private readonly config: YooKassaConfig
  private readonly baseUrl = 'https://api.yookassa.ru/v3'

  constructor(config: YooKassaConfig) {
    this.config = config
  }

  private authHeader(): string {
    const creds = Buffer.from(`${this.config.shopId}:${this.config.secretKey}`).toString('base64')
    return `Basic ${creds}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader(),
      'Content-Type': 'application/json',
    }
    if (idempotencyKey) headers['Idempotence-Key'] = idempotencyKey

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      throw new Error(`YooKassa API ${res.status}: ${await res.text()}`)
    }
    return res.json() as Promise<T>
  }

  async createPayment(req: PaymentRequest): Promise<PaymentResponse> {
    const { idempotencyKey, ...body } = req
    return this.request<PaymentResponse>('POST', '/payments', body, idempotencyKey)
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('GET', `/payments/${paymentId}`)
  }

  async capturePayment(paymentId: string, amount: PaymentAmount, idempotencyKey: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('POST', `/payments/${paymentId}/capture`, { amount }, idempotencyKey)
  }

  async cancelPayment(paymentId: string, idempotencyKey: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('POST', `/payments/${paymentId}/cancel`, {}, idempotencyKey)
  }

  async createRefund(req: RefundRequest, idempotencyKey: string): Promise<RefundResponse> {
    return this.request<RefundResponse>('POST', '/refunds', req, idempotencyKey)
  }
}

export class MockYooKassaClient {
  async createPayment(req: PaymentRequest): Promise<PaymentResponse> {
    return {
      id: `pay_mock_${Date.now()}`,
      status: 'pending',
      amount: req.amount,
      confirmation: {
        type: 'redirect',
        confirmation_url: 'https://yookassa.ru/checkout/payments/mock',
      },
      created_at: new Date().toISOString(),
      description: req.description,
      metadata: req.metadata,
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    return {
      id: paymentId,
      status: 'succeeded',
      amount: { value: '1000.00', currency: 'RUB' },
      created_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
    }
  }

  async capturePayment(paymentId: string, amount: PaymentAmount): Promise<PaymentResponse> {
    return {
      id: paymentId,
      status: 'succeeded',
      amount,
      created_at: new Date().toISOString(),
      captured_at: new Date().toISOString(),
    }
  }

  async cancelPayment(paymentId: string): Promise<PaymentResponse> {
    return {
      id: paymentId,
      status: 'canceled',
      amount: { value: '0.00', currency: 'RUB' },
      created_at: new Date().toISOString(),
    }
  }

  async createRefund(_req: RefundRequest, _idempotencyKey: string): Promise<RefundResponse> {
    return {
      id: `refund_mock_${Date.now()}`,
      status: 'succeeded',
      amount: _req.amount,
      created_at: new Date().toISOString(),
    }
  }
}
