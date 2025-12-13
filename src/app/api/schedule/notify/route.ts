import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

const UPCOMING_DAYS = 30;

const isDueSoon = (dateText?: string | null) => {
  if (!dateText) return false;
  const due = new Date(dateText);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + UPCOMING_DAYS);
  return due >= now && due <= limit;
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = getDataStore();
    const company = await store.getCompanyById(session.companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const schedules = await store.listSchedulesByCompanyId(session.companyId, { pendingOnly: true });
    const targets = schedules.filter((schedule) => isDueSoon(schedule.dueDate));

    if (targets.length === 0) {
      return NextResponse.json({ success: true, logs: [], message: 'No upcoming schedules' });
    }

    const recipient = company.contactEmail || process.env.MAIL_FROM_ADDRESS;
    if (!recipient) {
      console.warn('[Schedule Notify] No recipient email found');
      return NextResponse.json({ error: 'Recipient email missing' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const logs: { scheduleId: string; status: string }[] = [];
    for (const schedule of targets) {
      const subject = `【スケジュール通知】${schedule.title ?? '未設定'} が間もなく期限です`;
      const body = `以下のスケジュールが${UPCOMING_DAYS}日以内に期限を迎えます。\n\n- 件名: ${
        schedule.title ?? '未設定'
      }\n- 期限日: ${schedule.dueDate ?? '未設定'}\n- カテゴリ: ${schedule.category ?? 'tax'}`;

      let status = 'queued';
      if (!process.env.SMTP_USER) {
        console.log('[Schedule Notify] Mock send', { to: recipient, subject });
        status = 'mock-sent';
      } else {
        await transporter.sendMail({
          from: process.env.MAIL_FROM_ADDRESS,
          to: recipient,
          subject,
          text: body,
        });
        status = 'sent';
      }

      logs.push({ scheduleId: schedule.id, status });
      try {
        await store.createMailLog({
          companyId: session.companyId,
          toEmail: recipient,
          subject,
          body,
          status,
          sentAt: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('[Schedule Notify] Failed to log mail', logError);
      }
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Notify Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
