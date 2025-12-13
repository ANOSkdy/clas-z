import { Pool } from '@neondatabase/serverless';
import type { Company, CompanyInput, DataStore, User, UserRole } from './types';

let pool: Pool | null = null;

const getPool = () => {
  if (typeof window !== 'undefined') {
    throw new Error('DataStore is server-only');
  }
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
};

const normalizeRole = (role: string | null): UserRole => {
  if (role === 'owner' || role === 'admin' || role === 'member') return role;
  return 'member';
};

const mapCompanyRow = (row: any): Company => ({
  id: row.id,
  type: row.type,
  name: row.name,
  corporateNumber: row.corporate_number,
  address: row.address,
  representativeName: row.representative_name,
  foundingDate: row.founding_date ? row.founding_date.toISOString().slice(0, 10) : null,
  fiscalYearEndMonth: row.fiscal_year_end_month,
  withholdingTaxType: row.withholding_tax_type,
  residentTaxType: row.resident_tax_type,
  contactEmail: row.contact_email,
});

export const getPostgresStore = (): DataStore => {
  return {
    async getUserByLoginId(loginId) {
      const client = getPool();
      const { rows } = await client.query(
        'SELECT id, login_id, password_hash, role FROM users WHERE login_id = $1 LIMIT 1',
        [loginId]
      );
      const user = rows[0];
      if (!user) return null;

      const companyRows = await client.query(
        'SELECT company_id FROM user_companies WHERE user_id = $1',
        [user.id]
      );

      return {
        id: user.id,
        loginId: user.login_id,
        passwordHash: user.password_hash ?? '',
        role: normalizeRole(user.role),
        companyIds: companyRows.rows.map((r: any) => r.company_id),
      } satisfies User;
    },

    async getUserById(userId) {
      const client = getPool();
      const { rows } = await client.query(
        'SELECT id, login_id, password_hash, role FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );
      const user = rows[0];
      if (!user) return null;

      const companyRows = await client.query(
        'SELECT company_id FROM user_companies WHERE user_id = $1',
        [user.id]
      );

      return {
        id: user.id,
        loginId: user.login_id,
        passwordHash: user.password_hash ?? '',
        role: normalizeRole(user.role),
        companyIds: companyRows.rows.map((r: any) => r.company_id),
      } satisfies User;
    },

    async listCompaniesByUserId(userId) {
      const client = getPool();
      const { rows } = await client.query(
        `SELECT c.*
         FROM companies c
         INNER JOIN user_companies uc ON uc.company_id = c.id
         WHERE uc.user_id = $1`,
        [userId]
      );
      return rows.map(mapCompanyRow);
    },

    async getCompanyById(companyId) {
      const client = getPool();
      const { rows } = await client.query('SELECT * FROM companies WHERE id = $1 LIMIT 1', [companyId]);
      const row = rows[0];
      if (!row) return null;
      return mapCompanyRow(row);
    },

    async createCompanyForUser(userId, company) {
      const client = getPool();
      const connection = await client.connect();
      try {
        await connection.query('BEGIN');
        const { rows } = await connection.query(
          `INSERT INTO companies (
            type, name, corporate_number, address, representative_name, founding_date,
            fiscal_year_end_month, withholding_tax_type, resident_tax_type, contact_email
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING id`,
          [
            company.type,
            company.name,
            company.corporateNumber || null,
            company.address || null,
            company.representativeName || null,
            company.foundingDate ? new Date(company.foundingDate) : null,
            company.fiscalYearEndMonth ?? null,
            company.withholdingTaxType || null,
            company.residentTaxType || null,
            company.contactEmail || null,
          ]
        );
        const companyId = rows[0].id as string;

        await connection.query(
          'INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, companyId]
        );
        await connection.query('COMMIT');
        return companyId;
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    },

    async updateCompany(companyId, updates) {
      const client = getPool();
      await client.query(
        `UPDATE companies SET
          type = COALESCE($2, type),
          name = COALESCE($3, name),
          corporate_number = $4,
          address = $5,
          representative_name = $6,
          founding_date = $7,
          fiscal_year_end_month = $8,
          withholding_tax_type = $9,
          resident_tax_type = $10,
          contact_email = $11
        WHERE id = $1`,
        [
          companyId,
          updates.type ?? null,
          updates.name ?? null,
          updates.corporateNumber || null,
          updates.address || null,
          updates.representativeName || null,
          updates.foundingDate ? new Date(updates.foundingDate) : null,
          updates.fiscalYearEndMonth ?? null,
          updates.withholdingTaxType || null,
          updates.residentTaxType || null,
          updates.contactEmail || null,
        ]
      );
    },

    async listAlertsByCompanyId(companyId, options) {
      const client = getPool();
      const { rows } = await client.query(
        `SELECT id, title, type, is_read, created_at FROM alerts
         WHERE company_id = $1
         ${options?.unreadOnly ? 'AND is_read IS NOT TRUE' : ''}
         ORDER BY created_at DESC
         LIMIT $2`,
        [companyId, options?.limit ?? 5]
      );
      return rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type ?? 'info',
        isRead: row.is_read ?? false,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      }));
    },

    async listSchedulesByCompanyId(companyId, options) {
      const client = getPool();
      const params: (string | number)[] = [companyId];
      const limit = options?.limit;
      const query = `SELECT id, title, due_date, status, category FROM schedules
         WHERE company_id = $1
         ${options?.pendingOnly ? "AND (status IS NULL OR status != 'done')" : ''}
         ORDER BY due_date ASC NULLS LAST${limit ? ' LIMIT $2' : ''}`;
      if (limit) params.push(limit);

      const { rows } = await client.query(query, params);

      return rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
        status: row.status ?? 'pending',
        category: row.category ?? 'tax',
      }));
    },

    async createFinancialStatement(input) {
      const client = getPool();
      const { rows } = await client.query(
        `INSERT INTO financial_statements (
          company_id, drive_file_id, rating_score, rating_grade, rating_comment, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          input.companyId,
          input.driveFileId,
          input.ratingScore,
          input.ratingGrade,
          input.ratingComment,
          input.uploadedAt ? new Date(input.uploadedAt) : new Date(),
        ]
      );
      return rows[0].id as string;
    },
  };
};
