export type PaymentCategory = 'app' | 'delivery';

export interface PaymentFlag {
  id: string;
  name: string;
}

export interface PaymentMethodConfig {
  id: string;
  label: string;
  category: PaymentCategory;
  enabled: boolean;
  requiresFlag?: boolean;
  flags?: PaymentFlag[];
}

export interface GlobalPaymentSettings {
  methods: PaymentMethodConfig[];
}

export interface MerchantPaymentSettings {
  enabledMethods: string[]; // IDs dos métodos ativos
  enabledFlags: Record<string, string[]>; // { methodId: [flagIds] }
}