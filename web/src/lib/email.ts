import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const GMAIL_USER = process.env.GMAIL_USER ?? 'results@talentrank.io';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const BLUEPRINT_PDF_PATH = path.join(process.cwd(), 'public', 'blueprint.pdf');

function getTransport() {
  if (!GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export interface SendReportEmailParams {
  to: string;
  firstName: string;
  reportText: string;
  resultsUrl: string;
  attachPdf?: boolean;
}

export async function sendReportEmail(params: SendReportEmailParams): Promise<{ ok: boolean; error?: string }> {
  const transport = getTransport();
  if (!transport) {
    return { ok: false, error: 'Email not configured (GMAIL_APP_PASSWORD required)' };
  }

  const { to, firstName, reportText, resultsUrl, attachPdf } = params;
  const subject = 'Your TalentRank Assessment Report';
  const pdfNote = attachPdf ? ' Your Blueprint PDF is attached.' : '';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Hi ${firstName},</p>
  <p>Your personalized TalentRank report is ready.${pdfNote}</p>
  <p><a href="${resultsUrl}" style="display: inline-block; background-color: #4c1d95; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">View your results</a></p>
  <p>See you at the top,<br>The TalentRank Team</p>
</body>
</html>
  `.trim();

  const text = `Hi ${firstName},\n\nYour personalized TalentRank report is ready.${pdfNote}\n\nView your results: ${resultsUrl}\n\nSee you at the top,\nThe TalentRank Team`;

  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  if (attachPdf && existsSync(BLUEPRINT_PDF_PATH)) {
    try {
      const pdfBuffer = await readFile(BLUEPRINT_PDF_PATH);
      attachments.push({
        filename: 'Your-TalentRank-Blueprint.pdf',
        content: pdfBuffer,
      });
    } catch {
      //
    }
  }

  try {
    await transport.sendMail({
      from: `TalentRank <${GMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
