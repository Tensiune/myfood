export type UserRole = 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';

export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
}

export interface MerchantProfile extends UserProfile {
  store_name: string;
  status: MerchantStatus;
  cnpj?: string;
}