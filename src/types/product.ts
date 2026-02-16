export type ProductType = 'PREPARED' | 'INDUSTRIALIZED' | 'PIZZA';

export interface PizzaSize {
  id: string;
  name: string;
  pieces: number;
  maxFlavors: number;
}

export interface PizzaDough {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface PizzaCrust {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface PizzaFlavor {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  prices: Record<string, number>; // Record<sizeId, price>
  available: boolean;
}

export interface PizzaDetails {
  sizes: PizzaSize[];
  doughs: PizzaDough[];
  crusts: PizzaCrust[];
  flavors: PizzaFlavor[];
}

export interface ProductMetadata {
  type: ProductType;
  ean?: string;
  pizzaDetails?: PizzaDetails;
}