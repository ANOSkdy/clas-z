import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getFileStream } from '@/lib/google/drive';
import { getSession } from '@/lib/auth';
import { getDataStore } from '@/lib/datastore';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, attachmentFileId } = await request.json();
    const session = await getSession();
    const companyId = session?.companyId;

    // Nodemailer 設定
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.MAIL_FROM_ADDRESS,
      to,
      subject,
      text: body,
    };

    // Driveからファイルを添付する場合
    if (attachmentFileId) {
      const stream = await getFileStream(attachmentFileId);
      if (stream) {
        mailOptions.attachments = [
          {
            filename: 'TrialBalance.pdf', // 本来は元ファイル名を保持して使用
            content: stream,
          },
        ];
      }
    }

    let status: string = 'queued';
    if (!process.env.SMTP_USER) {
      console.log('Mock Send:', mailOptions);
      status = 'mock-sent';
    } else {
      await transporter.sendMail(mailOptions);
      status = 'sent';
    }

    try {
      const store = getDataStore();
      await store.createMailLog({
        companyId,
        toEmail: to,
        subject,
        body,
        status,
        sentAt: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[Mail] Failed to persist mail log', logError);
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Mail send error:', error);
    return NextResponse.json({ error: 'Failed to send mail' }, { status: 500 });
  }
}
