import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Vercel Cron からは Authorization ヘッダー等で保護することを推奨
export async function GET() {
  try {
    // 1. メールトランスポーター設定 (Nodemailer)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 2. 通知対象の抽出 (Mock: 本来は Airtable から抽出)
    // 期限が30日以内で notified_at が空のものを探す
    const targets = [
      { email: 'user@example.com', item: 'Consumption Tax Interim', dueDate: '2025-11-30' }
    ];

    const logs = [];

    // 3. 送信ループ
    // 環境変数が未設定の場合はスキップ
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP settings are missing. Skipping email send.');
      return NextResponse.json({ status: 'skipped', message: 'SMTP config missing' });
    }

    for (const target of targets) {
      // 実際にはここで await transporter.sendMail(...)
      console.log(`Sending email to ${target.email} for ${target.item}`);
      logs.push({ email: target.email, item: target.item, status: 'sent (mock)' });
      
      // 送信成功したら Airtable の notified_at を更新
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Notify Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
