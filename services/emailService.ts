import { User, ServiceRequest } from '@/types';
import { calculateDistance } from './geocoding';

// For demo purposes, we'll simulate email sending
// In production, you would integrate with EmailJS, SendGrid, or Firebase Functions with nodemailer

export interface EmailTemplate {
  subject: string;
  body: string;
}

export const generateServiceRequestEmail = (
  provider: User,
  serviceRequest: ServiceRequest,
  distance: number
): EmailTemplate => {
  return {
    subject: `Nova solicitação de ${serviceRequest.serviceType} próxima a você!`,
    body: `
Olá ${provider.displayName},

Uma nova solicitação de serviço foi registrada próxima à sua localização:

📋 **Detalhes da Solicitação:**
• Serviço: ${serviceRequest.serviceType}
• Cliente: ${serviceRequest.clientName}
• Localização: ${serviceRequest.location.address}
• Distância: ${distance.toFixed(1)} km de você
• Data: ${serviceRequest.createdAt.toLocaleDateString('pt-BR')}

${serviceRequest.description ? `💬 **Descrição:** ${serviceRequest.description}` : ''}

🚀 **Como proceder:**
1. Abra o app Serviço Fácil
2. Visualize os detalhes completos da solicitação
3. Entre em contato com o cliente se interessado

⏰ **Aja rápido!** Outros prestadores também foram notificados.

---
Serviço Fácil - Conectando pessoas e serviços
    `.trim()
  };
};

export const sendEmailNotification = async (
  to: string,
  template: EmailTemplate
): Promise<boolean> => {
  try {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📧 Email enviado para:', to);
    console.log('📋 Assunto:', template.subject);
    console.log('📝 Corpo:', template.body);
    
    // In production, you would use one of these approaches:
    
    // 1. EmailJS (client-side)
    /*
    import emailjs from '@emailjs/react-native';
    
    const result = await emailjs.send(
      'YOUR_SERVICE_ID',
      'YOUR_TEMPLATE_ID',
      {
        to_email: to,
        subject: template.subject,
        message: template.body,
      },
      'YOUR_PUBLIC_KEY'
    );
    */
    
    // 2. Firebase Functions with nodemailer (server-side)
    /*
    const response = await fetch('https://your-firebase-function-url/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject: template.subject,
        body: template.body,
      }),
    });
    */
    
    // 3. SendGrid API
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: template.subject,
        }],
        from: { email: 'noreply@servicofacil.com' },
        content: [{
          type: 'text/plain',
          value: template.body,
        }],
      }),
    });
    */
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
};

export const notifyProvidersInRadius = async (
  serviceRequest: ServiceRequest,
  providers: User[]
): Promise<void> => {
  const notificationPromises = providers.map(async (provider) => {
    if (!provider.latitude || !provider.longitude || !provider.email) {
      return;
    }
    
    const distance = calculateDistance(
      serviceRequest.location.latitude,
      serviceRequest.location.longitude,
      provider.latitude,
      provider.longitude
    );
    
    // Only notify providers within 5km radius
    if (distance <= 5) {
      const emailTemplate = generateServiceRequestEmail(provider, serviceRequest, distance);
      await sendEmailNotification(provider.email, emailTemplate);
    }
  });
  
  await Promise.all(notificationPromises);
  console.log(`✅ Notificações enviadas para prestadores em um raio de 5km`);
};

// Email validation helper
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};