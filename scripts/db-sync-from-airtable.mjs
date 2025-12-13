#!/usr/bin/env node
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const endpointUrl = (process.env.AIRTABLE_ENDPOINT_URL || 'https://api.airtable.com').replace(/\/$/, '');

if (!apiKey || !baseId) {
  console.error('AIRTABLE_API_KEY or AIRTABLE_BASE_ID is missing.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const rateDelayMs = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAirtableRecords(tableName) {
  const records = [];
  let offset;

  do {
    const search = new URLSearchParams({ pageSize: '100' });
    if (offset) search.set('offset', offset);
    const url = `${endpointUrl}/v0/${baseId}/${encodeURIComponent(tableName)}?${search.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`[Airtable] Table missing: ${tableName} (skipping)`);
        return records;
      }
      const text = await res.text();
      throw new Error(`Airtable fetch failed for ${tableName}: ${res.status} ${text}`);
    }

    const json = await res.json();
    records.push(...(json.records || []));
    offset = json.offset;
    if (offset) await sleep(rateDelayMs);
  } while (offset);

  console.log(`[Airtable] Fetched ${records.length} records from ${tableName}`);
  return records;
}

const normalizeRole = (value) => {
  if (Array.isArray(value)) return normalizeRole(value[0]);
  if (value === 'owner' || value === 'admin' || value === 'member') return value;
  return 'member';
};

const companyNameMap = new Map();

async function upsertCompanies(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = record.id;
    companyNameMap.set(companyId, fields.name || null);
    await pool.query(
      `INSERT INTO companies (
        id, type, name, corporate_number, address, representative_name,
        founding_date, fiscal_year_end_month, withholding_tax_type, resident_tax_type, contact_email
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        name = EXCLUDED.name,
        corporate_number = EXCLUDED.corporate_number,
        address = EXCLUDED.address,
        representative_name = EXCLUDED.representative_name,
        founding_date = EXCLUDED.founding_date,
        fiscal_year_end_month = EXCLUDED.fiscal_year_end_month,
        withholding_tax_type = EXCLUDED.withholding_tax_type,
        resident_tax_type = EXCLUDED.resident_tax_type,
        contact_email = EXCLUDED.contact_email`,
      [
        companyId,
        fields.type || null,
        fields.name || null,
        fields.corporate_number || null,
        fields.address || null,
        fields.representative_name || null,
        fields.founding_date ? new Date(fields.founding_date) : null,
        fields.fiscal_year_end_month ?? null,
        fields.withholding_tax_type || null,
        fields.resident_tax_type || null,
        fields.contact_email || null,
      ]
    );
  }
}

async function upsertUsers(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyIds = Array.isArray(fields.company) ? fields.company.map(String) : [];

    await pool.query(
      `INSERT INTO users (id, login_id, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         login_id = EXCLUDED.login_id,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
      [record.id, fields.login_id || '', fields.password_hash || '', normalizeRole(fields.role)]
    );

    for (const companyId of companyIds) {
      await pool.query(
        'INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [record.id, companyId]
      );
    }
  }
}

function findCompanyIdFromName(name) {
  for (const [id, companyName] of companyNameMap.entries()) {
    if (companyName === name) return id;
  }
  return null;
}

async function upsertSchedules(records) {
  for (const record of records) {
    const fields = record.fields || {};
    let companyId = null;
    if (Array.isArray(fields.company) && fields.company.length > 0) {
      companyId = fields.company[0];
    }
    if (!companyId && fields.company) {
      companyId = findCompanyIdFromName(fields.company);
    }
    if (!companyId) continue;

    await pool.query(
      `INSERT INTO schedules (id, company_id, title, due_date, status, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         title = EXCLUDED.title,
         due_date = EXCLUDED.due_date,
         status = EXCLUDED.status,
         category = EXCLUDED.category`,
      [
        record.id,
        companyId,
        fields.title || null,
        fields.due_date ? new Date(fields.due_date) : null,
        fields.status || null,
        fields.category || null,
      ]
    );
  }
}

async function upsertAlerts(records) {
  for (const record of records) {
    const fields = record.fields || {};
    let companyId = null;
    if (Array.isArray(fields.company) && fields.company.length > 0) {
      companyId = fields.company[0];
    }
    if (!companyId && fields.company) {
      companyId = findCompanyIdFromName(fields.company);
    }
    if (!companyId) continue;

    await pool.query(
      `INSERT INTO alerts (id, company_id, title, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         title = EXCLUDED.title,
         type = EXCLUDED.type,
         is_read = EXCLUDED.is_read,
         created_at = EXCLUDED.created_at`,
      [
        record.id,
        companyId,
        fields.title || null,
        fields.type || null,
        fields.is_read ?? false,
        fields.created_at ? new Date(fields.created_at) : null,
      ]
    );
  }
}

async function upsertFinancialStatements(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = Array.isArray(fields.company) ? fields.company[0] : null;
    if (!companyId) continue;

    await pool.query(
      `INSERT INTO financial_statements (id, company_id, drive_file_id, rating_score, rating_grade, rating_comment, uploaded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         drive_file_id = EXCLUDED.drive_file_id,
         rating_score = EXCLUDED.rating_score,
         rating_grade = EXCLUDED.rating_grade,
         rating_comment = EXCLUDED.rating_comment,
         uploaded_at = EXCLUDED.uploaded_at`,
      [
        record.id,
        companyId,
        fields.drive_file_id || null,
        fields.rating_score ?? null,
        fields.rating_grade || null,
        fields.rating_comment || null,
        fields.uploaded_at ? new Date(fields.uploaded_at) : null,
      ]
    );
  }
}

async function upsertTrialBalances(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = Array.isArray(fields.company) ? fields.company[0] : null;
    if (!companyId) continue;

    await pool.query(
      `INSERT INTO trial_balances (id, company_id, drive_file_id, period_start, period_end, uploaded_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         drive_file_id = EXCLUDED.drive_file_id,
         period_start = EXCLUDED.period_start,
         period_end = EXCLUDED.period_end,
         uploaded_at = EXCLUDED.uploaded_at,
         payload = EXCLUDED.payload`,
      [
        record.id,
        companyId,
        fields.drive_file_id || null,
        fields.period_start ? new Date(fields.period_start) : null,
        fields.period_end ? new Date(fields.period_end) : null,
        fields.uploaded_at ? new Date(fields.uploaded_at) : null,
        fields.payload || null,
      ]
    );
  }
}

async function upsertManuals(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = Array.isArray(fields.company) ? fields.company[0] : null;
    await pool.query(
      `INSERT INTO manuals (id, company_id, title)
       VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         title = EXCLUDED.title`,
      [record.id, companyId, fields.title || null]
    );
  }
}

async function upsertManualSections(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = Array.isArray(fields.company) ? fields.company[0] : null;
    const manualId = Array.isArray(fields.manual) ? fields.manual[0] : null;
    await pool.query(
      `INSERT INTO manual_sections (id, manual_id, company_id, title, body, order_index)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         manual_id = EXCLUDED.manual_id,
         company_id = EXCLUDED.company_id,
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         order_index = EXCLUDED.order_index`,
      [record.id, manualId, companyId, fields.title || null, fields.body || null, fields.order_index ?? null]
    );
  }
}

async function upsertMailLogs(records) {
  for (const record of records) {
    const fields = record.fields || {};
    const companyId = Array.isArray(fields.company) ? fields.company[0] : null;
    await pool.query(
      `INSERT INTO mail_logs (id, company_id, to_email, subject, body, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,$6, COALESCE($7, NOW()))
       ON CONFLICT (id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         to_email = EXCLUDED.to_email,
         subject = EXCLUDED.subject,
         body = EXCLUDED.body,
         status = EXCLUDED.status,
         sent_at = EXCLUDED.sent_at`,
      [
        record.id,
        companyId,
        fields.to || fields.to_email || null,
        fields.subject || null,
        fields.body || null,
        fields.status || null,
        fields.sent_at ? new Date(fields.sent_at) : null,
      ]
    );
  }
}

async function main() {
  try {
    const companies = await fetchAirtableRecords('Companies');
    await upsertCompanies(companies);

    const users = await fetchAirtableRecords('Users');
    await upsertUsers(users);

    const schedules = await fetchAirtableRecords('Schedules');
    await upsertSchedules(schedules);

    const alerts = await fetchAirtableRecords('Alerts');
    await upsertAlerts(alerts);

    const financialStatements = await fetchAirtableRecords('FinancialStatements');
    await upsertFinancialStatements(financialStatements);

    const trialBalances = await fetchAirtableRecords('TrialBalances');
    await upsertTrialBalances(trialBalances);

    const manuals = await fetchAirtableRecords('Manuals');
    await upsertManuals(manuals);

    const manualSections = await fetchAirtableRecords('ManualSections');
    await upsertManualSections(manualSections);

    const mailLogs = await fetchAirtableRecords('MailLogs');
    await upsertMailLogs(mailLogs);

    console.log('Airtable -> Postgres sync complete.');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
