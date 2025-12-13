import type { FieldSet, Record } from 'airtable';
import { getAirtableBase } from '../airtable';
import type {
  Alert,
  Company,
  CompanyInput,
  DataStore,
  FinancialStatementInput,
  Schedule,
  User,
  UserRole,
} from './types';

const normalizeRole = (value: unknown): UserRole => {
  if (Array.isArray(value)) {
    return normalizeRole(value[0]);
  }
  if (value === 'owner' || value === 'member' || value === 'admin') {
    return value;
  }
  return 'member';
};

const ensureBase = () => {
  const base = getAirtableBase();
  if (!base) {
    throw new Error('Airtable is not configured.');
  }
  return base;
};

const mapCompany = (record: Record<FieldSet>): Company => ({
  id: record.id,
  type: (record.get('type') as string | null) ?? null,
  name: (record.get('name') as string | null) ?? null,
  corporateNumber: (record.get('corporate_number') as string | null) ?? null,
  address: (record.get('address') as string | null) ?? null,
  representativeName: (record.get('representative_name') as string | null) ?? null,
  foundingDate: (record.get('founding_date') as string | null) ?? null,
  fiscalYearEndMonth: (record.get('fiscal_year_end_month') as number | null) ?? null,
  withholdingTaxType: (record.get('withholding_tax_type') as string | null) ?? null,
  residentTaxType: (record.get('resident_tax_type') as string | null) ?? null,
  contactEmail: (record.get('contact_email') as string | null) ?? null,
});

const mapUser = (record: Record<FieldSet>): User => {
  const rawCompany = record.get('company');
  const companyIds = Array.isArray(rawCompany)
    ? rawCompany.map(String)
    : rawCompany
      ? [String(rawCompany)]
      : [];

  return {
    id: record.id,
    loginId: (record.get('login_id') as string | null) ?? '',
    passwordHash: (record.get('password_hash') as string | null) ?? '',
    role: normalizeRole(record.get('role')),
    companyIds,
  };
};

const escapeFormulaValue = (value: string) => value.replace(/'/g, "\\'");

export const getAirtableStore = (): DataStore => {
  return {
    async getUserByLoginId(loginId) {
      const base = ensureBase();
      const records = await base('Users')
        .select({ filterByFormula: `{login_id} = '${escapeFormulaValue(loginId)}'`, maxRecords: 1 })
        .firstPage();
      const record = records[0];
      return record ? mapUser(record) : null;
    },

    async getUserById(userId) {
      const base = ensureBase();
      const record = await base('Users').find(userId);
      return record ? mapUser(record) : null;
    },

    async listCompaniesByUserId(userId) {
      const base = ensureBase();
      const userRecord = await base('Users').find(userId);
      const companyIds = (userRecord.get('company') as string[] | undefined) ?? [];
      const companies: Company[] = [];

      for (const companyId of companyIds) {
        try {
          const record = await base('Companies').find(companyId);
          companies.push(mapCompany(record));
        } catch (error) {
          console.error('[Airtable] Failed to fetch company from user', { userId, companyId, error });
        }
      }

      return companies;
    },

    async getCompanyById(companyId) {
      const base = ensureBase();
      try {
        const record = await base('Companies').find(companyId);
        return mapCompany(record);
      } catch (error) {
        console.error('[Airtable] Company not found', { companyId, error });
        return null;
      }
    },

    async createCompanyForUser(userId, company) {
      const base = ensureBase();
      const record = await (base('Companies') as any).create({
        fields: {
          type: company.type,
          name: company.name,
          corporate_number: company.corporateNumber || undefined,
          address: company.address,
          representative_name: company.representativeName,
          founding_date: company.foundingDate || undefined,
          fiscal_year_end_month: company.fiscalYearEndMonth ?? undefined,
          withholding_tax_type: company.withholdingTaxType,
          resident_tax_type: company.residentTaxType,
          contact_email: company.contactEmail,
        },
      });

      const userRecord = await base('Users').find(userId);
      const companies = (userRecord.get('company') as string[] | undefined) ?? [];
      if (!companies.includes(record.id)) {
        await base('Users').update(userId, { company: [...companies, record.id] });
      }
      return record.id;
    },

    async updateCompany(companyId, updates) {
      const base = ensureBase();
      await (base('Companies') as any).update(companyId, {
        type: updates.type,
        name: updates.name,
        corporate_number: updates.corporateNumber || undefined,
        address: updates.address,
        representative_name: updates.representativeName,
        founding_date: updates.foundingDate || undefined,
        fiscal_year_end_month: updates.fiscalYearEndMonth ?? undefined,
        withholding_tax_type: updates.withholdingTaxType,
        resident_tax_type: updates.residentTaxType,
        contact_email: updates.contactEmail,
      });
    },

    async listAlertsByCompanyId(companyId, options) {
      const base = ensureBase();
      const company = await this.getCompanyById(companyId);
      if (!company?.name) return [];

      const filters = [`{company} = '${escapeFormulaValue(company.name)}'`];
      if (options?.unreadOnly) {
        filters.push(`{is_read} != 'true'`);
      }

      const records = await base('Alerts')
        .select({
          filterByFormula: filters.length > 1 ? `AND(${filters.join(',')})` : filters[0],
          sort: [{ field: 'created_at', direction: 'desc' }],
          maxRecords: options?.limit ?? 5,
        })
        .all();

      return records.map((rec) => ({
        id: rec.id,
        title: rec.get('title') as string,
        type: (rec.get('type') as string) ?? 'info',
        createdAt: (rec.get('created_at') as string) ?? null,
        isRead: (rec.get('is_read') as boolean | undefined) ?? false,
      }));
    },

    async listSchedulesByCompanyId(companyId, options) {
      const base = ensureBase();
      const company = await this.getCompanyById(companyId);
      if (!company?.name) return [];

      const filters = [`{company} = '${escapeFormulaValue(company.name)}'`];
      if (options?.pendingOnly) {
        filters.push(`{status} != 'done'`);
      }

      const records = await base('Schedules')
        .select({
          filterByFormula: filters.length > 1 ? `AND(${filters.join(',')})` : filters[0],
          sort: [{ field: 'due_date', direction: 'asc' }],
          maxRecords: options?.limit,
        })
        .all();

      return records.map((rec) => ({
        id: rec.id,
        title: rec.get('title') as string,
        dueDate: rec.get('due_date') as string,
        status: (rec.get('status') as string) ?? 'pending',
        category: (rec.get('category') as string) ?? 'tax',
      }));
    },

    async createFinancialStatement(input) {
      const base = ensureBase();
      const [record] = await base('FinancialStatements').create([
        {
          fields: {
            company: [input.companyId],
            drive_file_id: input.driveFileId,
            rating_score: input.ratingScore,
            rating_grade: input.ratingGrade,
            rating_comment: input.ratingComment,
            uploaded_at: input.uploadedAt,
          },
        },
      ]);

      return record.id;
    },
  };
};
