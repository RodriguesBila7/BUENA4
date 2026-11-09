/**
 * api/recover-password.js
 * Vercel Serverless Function para envio de e-mails de recuperação de palavra-passe
 * Utiliza o Google SMTP (Nodemailer) ou modo de simulação seguro.
 */

import nodemailer from 'nodemailer';

const GIST_ID = process.env.GIST_ID;
const GIST_FILENAME = 'sernic_sync.json';
const GITHUB_TOKEN = process.env.GITHUB_SYNC_TOKEN || process.env.GITHUB_TOKEN;

function isOriginAllowed(origin, host) {
  if (!origin) return true;
  if (process.env.ALLOWED_ORIGIN) {
    const list = process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim().toLowerCase());
    return list.includes(origin.toLowerCase());
  }
  const cleanOrigin = origin.replace(/^https?:\/\//, '').toLowerCase();
  const cleanHost = host ? host.toLowerCase() : '';
  if (cleanHost && cleanOrigin === cleanHost) return true;
  if (cleanOrigin.includes('vercel.app') || cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (isOriginAllowed(origin, host)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { email } = req.body || {};
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'E-mail institucional obrigatório.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const isConfigured = Boolean(
    smtpUser &&
    smtpPass &&
    !smtpUser.includes('seu_email') &&
    !smtpPass.includes('sua_senha')
  );

  if (!isConfigured) {
    console.warn('[RECOVER-PASSWORD SIMULADO] Credenciais SMTP Google não configuradas no .env. Destinatário:', cleanEmail);
    return res.json({
      success: true,
      simulated: true,
      message: 'Instruções de recuperação processadas (Modo Simulação: defina SMTP_USER e SMTP_PASS no Vercel).'
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 465,
      secure: process.env.SMTP_SECURE === 'true' || (parseInt(process.env.SMTP_PORT, 10) || 465) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const fromName = process.env.SMTP_FROM_NAME || 'SERNIC - Direcção de Recursos Humanos';
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
    const anoActual = new Date().getFullYear();

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: cleanEmail,
      subject: 'SERNIC DRH — Recuperação de Palavra-passe',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
          <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #BA1B1D; padding: 20px; text-align: center; color: #ffffff;">
              <h2 style="margin: 0; font-size: 16px;">SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL</h2>
              <p style="margin: 4px 0 0; font-size: 12px;">DIRECÇÃO DE RECURSOS HUMANOS</p>
            </div>
            <div style="padding: 24px;">
              <p>Recebemos uma solicitação de recuperação de acesso ao sistema SERNIC-DRH.</p>
              <p>O seu código de verificação institucional é:</p>
              <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #BA1B1D; margin: 20px 0;">
                ${recoveryCode}
              </div>
              <p style="font-size: 12px; color: #64748b;">Válido durante 30 minutos. Se não reconhece o pedido, ignore esta mensagem.</p>
            </div>
            <div style="background: #0f172a; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8;">
              Copyright © ${anoActual} – SERNIC. Todos os direitos reservados.
            </div>
          </div>
        </div>
      `
    });

    return res.json({
      success: true,
      simulated: false,
      message: `Instruções de recuperação enviadas com sucesso para ${cleanEmail}.`
    });
  } catch (error) {
    console.error('[ERRO VERCEL RECOVER-PASSWORD]', error);
    return res.status(500).json({ error: `Erro ao enviar e-mail: ${error.message}` });
  }
}
