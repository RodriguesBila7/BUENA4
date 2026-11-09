/**
 * server/services/emailService.js
 * Serviço de Envio de E-mails do SERNIC-DRH via Google SMTP (Nodemailer)
 */

import nodemailer from 'nodemailer';

/**
 * Verifica se as credenciais do Google SMTP estão devidamente configuradas no ambiente
 */
export function isEmailConfigured() {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  return Boolean(
    user && 
    pass && 
    !user.includes('seu_email') && 
    !pass.includes('sua_senha')
  );
}

/**
 * Cria o transporte Nodemailer configurado para Google SMTP / Gmail
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      // Rejeita certificados inválidos em produção
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
}

/**
 * Envia um e-mail genérico formatado
 */
export async function sendEmail({ to, subject, html, text }) {
  const fromName = process.env.SMTP_FROM_NAME || 'SERNIC - Direcção de Recursos Humanos';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'drh@sernic.gov.mz';

  // Se o servidor Google ainda não estiver configurado com credenciais reais no .env
  if (!isEmailConfigured()) {
    console.warn('\n⚠️ [SERVIÇO DE E-MAIL - SIMULAÇÃO]');
    console.warn(`Para activar o envio real de e-mails via Google, defina SMTP_USER e SMTP_PASS no ficheiro .env.`);
    console.warn(`Destinatário: ${to}`);
    console.warn(`Assunto:      ${subject}\n`);
    return {
      success: true,
      simulated: true,
      message: 'Modo simulação: credenciais SMTP Google pendentes no .env.'
    };
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || '',
      html: html || text
    });

    console.log(`[EMAIL ENVIADO] ID: ${info.messageId} para ${to}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('[ERRO AO ENVIAR E-MAIL]', error);
    throw new Error(`Falha no envio de e-mail via Google SMTP: ${error.message}`);
  }
}

/**
 * Envia e-mail institucional de recuperação de palavra-passe
 */
export async function sendPasswordRecoveryEmail({ to, name, recoveryCode }) {
  const subject = 'SERNIC DRH — Recuperação de Palavra-passe';
  const anoActual = new Date().getFullYear();

  const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #BA1B1D; padding: 24px 20px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 16px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; }
        .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
        .content { padding: 30px 25px; line-height: 1.6; font-size: 14px; }
        .code-box { background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 6px; padding: 18px; text-align: center; margin: 25px 0; }
        .code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #BA1B1D; font-family: monospace; }
        .footer { background-color: #0f172a; padding: 18px 20px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; }
        .footer p { margin: 2px 0; }
        .warning { font-size: 12px; color: #64748b; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Serviço Nacional de Investigação Criminal</h1>
          <p>Direcção Geral — Direcção de Recursos Humanos</p>
        </div>
        <div class="content">
          <p>Prezado(a) <strong>${name || 'Funcionário'}</strong>,</p>
          <p>Recebemos uma solicitação de recuperação de palavra-passe para o seu acesso ao <strong>Sistema de Informação e Gestão de Recursos Humanos (SERNIC-DRH)</strong>.</p>
          <p>Utilize o código de verificação abaixo para confirmar a sua identidade:</p>
          
          <div class="code-box">
            <span class="code">${recoveryCode}</span>
          </div>

          <p>Este código tem a validade de <strong>30 minutos</strong> a partir do momento do pedido.</p>
          
          <div class="warning">
            <p>Se não realizou esta solicitação, por favor ignore esta mensagem ou contacte de imediato o Administrador do Sistema da DRH.</p>
          </div>
        </div>
        <div class="footer">
          <p>Copyright © ${anoActual} – Serviço Nacional de Investigação Criminal (SERNIC).</p>
          <p>Mensagem automática institucional. Por favor, não responda a este endereço.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)
DIRECÇÃO GERAL — DIRECÇÃO DE RECURSOS HUMANOS

Prezado(a) ${name || 'Funcionário'},

Recebemos uma solicitação de recuperação de palavra-passe para o seu acesso ao SERNIC-DRH.
Código de Verificação: ${recoveryCode}

Validade: 30 minutos.
Se não solicitou esta alteração, contacte o Administrador do Sistema.
  `.trim();

  return sendEmail({ to, subject, html, text });
}
