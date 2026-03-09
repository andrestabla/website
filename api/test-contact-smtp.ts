import nodemailer from 'nodemailer';
import { prisma } from '../api/_lib/prisma.js';
import { INTEGRATIONS_SNAPSHOT_ID, applyServerEnv, sanitizeIntegrations } from '../api/_lib/integrations.js';

async function testContactEmail() {
  console.log('--- Starting Contact SMTP Test ---');
  
  try {
    // 1. Get Config
    const snapshot = await prisma.cmsSnapshot.findUnique({ where: { id: INTEGRATIONS_SNAPSHOT_ID } });
    const integrations = applyServerEnv(sanitizeIntegrations(snapshot?.data));
    const smtp = integrations.smtp.config;
    
    if (!integrations.smtp.enabled) {
      console.error('SMTP is not enabled in integrations');
      return;
    }

    const mainSnapshot = await prisma.cmsSnapshot.findUnique({ where: { id: 'main' } });
    const mainData = mainSnapshot?.data as any;
    const siteEmail = mainData?.site?.contactEmail || mainData?.siteEmail || 'hola@algoritmot.com';

    console.log('Using SMTP Host:', smtp.host);
    console.log('Sending Notification to:', siteEmail);

    // 2. Setup Transporter
    const secure = smtp.encryption === 'ssl' || String(smtp.port) === '465';
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port || '587'),
      secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    });

    // 3. Send
    const info = await transporter.sendMail({
      from: `"${smtp.fromName || 'Test'}" <${smtp.fromEmail}>`,
      to: siteEmail,
      subject: 'Test de Integración: Formulario de Contacto',
      text: 'Este es un correo de prueba para verificar que la vinculación del formulario de contacto con SMTP funciona correctamente.',
      html: '<h1>Prueba de Integración</h1><p>Si recibes esto, el sistema ahora puede enviar notificaciones de leads.</p>',
    });

    console.log('Message sent: %s', info.messageId);
    console.log('--- Test Finished Successfully ---');
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

testContactEmail();
