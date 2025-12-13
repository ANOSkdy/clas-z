export type UserRole = 'owner' | 'member' | 'admin';

export type User = {
  id: string;
  loginId: string;
  passwordHash: string;
  role: UserRole;
  companyIds: string[];
};

export type Company = {
  id: string;
  type?: string | null;
  name?: string | null;
  corporateNumber?: string | null;
  address?: string | null;
  representativeName?: string | null;
  foundingDate?: string | null;
  fiscalYearEndMonth?: number | null;
  withholdingTaxType?: string | null;
  residentTaxType?: string | null;
  contactEmail?: string | null;
};

export type CompanyInput = {
  type: string;
  name: string;
  corporateNumber?: string | null;
  address?: string | null;
  representativeName?: string | null;
  foundingDate?: string | null;
  fiscalYearEndMonth?: number | null;
  withholdingTaxType?: string | null;
  residentTaxType?: string | null;
  contactEmail?: string | null;
};

export type Alert = {
  id: string;
  title?: string | null;
  type?: string | null;
  createdAt?: string | null;
  isRead?: boolean | null;
};

export type Schedule = {
  id: string;
  title?: string | null;
  dueDate?: string | null;
  status?: string | null;
  category?: string | null;
};

export type ManualSection = {
  id: string;
  manualId: string | null;
  companyId: string | null;
  title: string | null;
  body: string | null;
  orderIndex: number | null;
};

export type MailLogInput = {
  companyId?: string | null;
  toEmail?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  sentAt?: string | null;
};

export type FinancialStatementInput = {
  companyId: string;
  driveFileId: string;
  ratingScore: number;
  ratingGrade: string;
  ratingComment: string;
  uploadedAt: string;
};

export interface DataStore {
  getUserByLoginId(loginId: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  listCompaniesByUserId(userId: string): Promise<Company[]>;
  getCompanyById(companyId: string): Promise<Company | null>;
  createCompanyForUser(userId: string, company: CompanyInput): Promise<string>;
  updateCompany(companyId: string, updates: Partial<CompanyInput>): Promise<void>;
  listAlertsByCompanyId(
    companyId: string,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<Alert[]>;
  listSchedulesByCompanyId(
    companyId: string,
    options?: { limit?: number; pendingOnly?: boolean }
  ): Promise<Schedule[]>;
  createFinancialStatement(input: FinancialStatementInput): Promise<string>;
  listManualSections(companyId: string): Promise<ManualSection[]>;
  createMailLog(log: MailLogInput): Promise<string>;
}
