import type { SendMailOptions } from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getFileStream } from '@/lib/google/drive';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, attachmentFileId } = await request.json();

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

    const mailOptions: SendMailOptions = {
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

    if (!process.env.SMTP_USER) {
      console.log('Mock Send:', mailOptions);
      return NextResponse.json({ success: true, mode: 'mock' });
    }

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Mail send error:', error);
    return NextResponse.json({ error: 'Failed to send mail' }, { status: 500 });
  }
}
