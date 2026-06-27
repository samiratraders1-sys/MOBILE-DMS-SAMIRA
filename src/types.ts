export interface Company {
  id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  tradeLicense: string;
  bin: string;
  tin: string;
  currency: string;
  timezone: string;
  invoiceFooter: string;
  reportHeader: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  roleId: string;
  companyId?: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  companyId?: string;
}

export interface Permission {
  id: string;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  companyId?: string;
  contactDetails: {
    phone: string;
    email?: string;
    address?: string;
  };
  orderHistory: string[];
  deliveryPreferences: {
    preferredTime?: string;
    deliveryInstructions?: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  companyId?: string;
  contactDetails: {
    phone: string;
    email?: string;
    address?: string;
  };
  productCatalog: {
    productId: string;
    productName: string;
    currentPrice: number;
  }[];
}
