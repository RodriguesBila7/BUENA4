/**
 * src/utils/vacationAlerts.js
 * Utilitário para geração e automação de mensagens de férias do SERNIC:
 * 1. Início das férias (Hoje)
 * 2. 5 dias para o término das férias
 * 3. 1 dia para o início das atividades (Apresentação / Retorno ao serviço)
 */

export const ALERT_TYPES = {
  START_TODAY: 'START_TODAY',
  FIVE_DAYS_BEFORE: 'FIVE_DAYS_BEFORE',
  ONE_DAY_BEFORE_RETURN: 'ONE_DAY_BEFORE_RETURN'
};

export const DEFAULT_TEMPLATES = {
  [ALERT_TYPES.START_TODAY]: 
`🏢 *SERNIC - Direcção de Recursos Humanos*

Prezado(a) *{NOME}* (NIP: {NIP}),

Informamos que o seu período de férias regulamentares de *{DIAS} dias* inicia hoje (*{DATA_INICIO}*), com término previsto para o dia *{DATA_FIM}*.

Desejamos-lhe um excelente e merecido período de descanso.

_SERNIC Moçambique_`,

  [ALERT_TYPES.FIVE_DAYS_BEFORE]: 
`🏢 *SERNIC - Direcção de Recursos Humanos*

Prezado(a) *{NOME}* (NIP: {NIP}),

Lembramos que restam *5 dias* para o término do seu período de férias (data final: *{DATA_FIM}*).

A sua apresentação oficial ao serviço está prevista para o dia *{DATA_RETORNO}* na unidade *{DEPARTAMENTO}*. Queira providenciar o seu regresso com a devida antecedência.

_SERNIC Moçambique_`,

  [ALERT_TYPES.ONE_DAY_BEFORE_RETURN]: 
`🏢 *SERNIC - Convocatória de Retorno ao Serviço*

Prezado(a) *{NOME}* (NIP: {NIP}),

Recordamos que o seu período de férias terminou. O reinício oficial das suas atividades laborais na unidade *{DEPARTAMENTO}* será *amanhã, {DATA_RETORNO}*, às *07:30*.

Contamos com a sua comparência e pontualidade habitual.

_SERNIC Moçambique_`
};

/**
 * Formata data no formato DD/MM/AAAA
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return 'N/D';
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Calcula a data seguinte (Data de Retorno / Apresentação)
 * Se cair num fim de semana, opcionalmente avança para segunda-feira
 */
export function calculateReturnDate(endDateStr, skipWeekends = true) {
  if (!endDateStr) return '';
  const d = new Date(`${endDateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  
  d.setDate(d.getDate() + 1);
  
  if (skipWeekends) {
    // 0 = Domingo, 6 = Sábado
    if (d.getDay() === 6) {
      d.setDate(d.getDate() + 2); // Passa para Segunda
    } else if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1); // Passa para Segunda
    }
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Sanitiza número moçambicano para WhatsApp / SMS (ex: 841234567 -> 258841234567)
 */
export function formatPhoneForMessaging(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('258') && digits.length === 12) return digits;
  if (digits.length === 9) return `258${digits}`;
  return digits;
}

/**
 * Substitui marcadores {NOME}, {NIP}, etc. no template
 */
export function buildMessageText(template, params) {
  if (!template) return '';
  let msg = template;
  msg = msg.replace(/\{NOME\}/g, params.name || 'Funcionário');
  msg = msg.replace(/\{NIP\}/g, params.nip || 'N/A');
  msg = msg.replace(/\{NUIT\}/g, params.nuit || 'N/A');
  msg = msg.replace(/\{DIAS\}/g, String(params.daysCount || 30));
  msg = msg.replace(/\{DATA_INICIO\}/g, formatDisplayDate(params.startDate));
  msg = msg.replace(/\{DATA_FIM\}/g, formatDisplayDate(params.endDate));
  msg = msg.replace(/\{DATA_RETORNO\}/g, formatDisplayDate(params.returnDate));
  msg = msg.replace(/\{DEPARTAMENTO\}/g, params.department || params.directorate || 'Direcção de Recursos Humanos');
  return msg;
}

/**
 * Gera URL do WhatsApp Web / App
 */
export function getWhatsAppUrl(phone, text) {
  const cleanPhone = formatPhoneForMessaging(phone);
  if (!cleanPhone) return null;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Gera URL para protocolo SMS móvel
 */
export function getSmsUrl(phone, text) {
  const cleanPhone = formatPhoneForMessaging(phone);
  if (!cleanPhone) return null;
  return `sms:+${cleanPhone}?body=${encodeURIComponent(text)}`;
}

/**
 * Analisa a lista de férias em relação a uma data de referência (por defeito, hoje)
 * e retorna os alertas ativos dos 3 gatilhos
 */
export function detectVacationAlerts(requests = [], employees = [], orgData = {}, customTemplates = null, targetDateStr = null) {
  const refDate = targetDateStr ? new Date(`${targetDateStr}T00:00:00`) : new Date();
  refDate.setHours(0, 0, 0, 0);

  const templates = {
    ...DEFAULT_TEMPLATES,
    ...(customTemplates || {})
  };

  const results = [];

  requests.forEach(req => {
    if (!req || req.status === 'Cancelada' || req.status === 'Rejeitada') return;
    if (!req.startDate || !req.endDate) return;

    // Encontrar funcionário correspondente
    const emp = employees.find(e => 
      e.id === req.employeeId || 
      (e.nip && String(e.nip) === String(req.employeeNip)) ||
      (e.name && req.employeeName && e.name.toLowerCase() === req.employeeName.toLowerCase())
    ) || {};

    const startDate = new Date(`${req.startDate}T00:00:00`);
    const endDate = new Date(`${req.endDate}T00:00:00`);
    const returnDateStr = calculateReturnDate(req.endDate);
    const returnDate = new Date(`${returnDateStr}T00:00:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

    // Diferenças em dias (milissegundos / 86400000)
    const diffMsStart = startDate.getTime() - refDate.getTime();
    const daysToStart = Math.round(diffMsStart / (1000 * 60 * 60 * 24));

    const diffMsEnd = endDate.getTime() - refDate.getTime();
    const daysToEnd = Math.round(diffMsEnd / (1000 * 60 * 60 * 24));

    const diffMsReturn = returnDate.getTime() - refDate.getTime();
    const daysToReturn = Math.round(diffMsReturn / (1000 * 60 * 60 * 24));

    // Determinar dados de departamento / direcção
    let deptName = 'Direcção de Recursos Humanos';
    if (orgData.departments && emp.departmentId) {
      const d = orgData.departments.find(dept => dept.id === emp.departmentId);
      if (d) deptName = d.name;
    }

    const messageParams = {
      name: emp.name || req.employeeName || 'Funcionário',
      nip: emp.nip || req.employeeNip || 'N/A',
      nuit: emp.nuit || 'N/A',
      daysCount: req.daysCount || 30,
      startDate: req.startDate,
      endDate: req.endDate,
      returnDate: returnDateStr,
      department: deptName,
      directorate: emp.directorate || 'SERNIC Central'
    };

    const contactPhone = emp.phone || emp.altPhone || req.phone || null;
    const contactEmail = emp.email || req.email || null;

    // 1. GATILHO 1: Início das Férias (Hoje é o dia de início)
    if (daysToStart === 0) {
      const messageText = buildMessageText(templates[ALERT_TYPES.START_TODAY], messageParams);
      results.push({
        id: `${req.id}_start_${refDate.toISOString().split('T')[0]}`,
        requestId: req.id,
        employeeId: emp.id || req.employeeId,
        alertType: ALERT_TYPES.START_TODAY,
        alertTitle: 'Início das Férias (Hoje)',
        alertBadgeColor: '#059669', // Emerald green
        alertBadgeBg: '#ecfdf5',
        daysRelative: 0,
        employeeName: messageParams.name,
        nip: messageParams.nip,
        department: deptName,
        phone: contactPhone,
        email: contactEmail,
        startDate: req.startDate,
        endDate: req.endDate,
        returnDate: returnDateStr,
        daysCount: messageParams.daysCount,
        messageText,
        whatsappUrl: getWhatsAppUrl(contactPhone, messageText),
        smsUrl: getSmsUrl(contactPhone, messageText),
        status: req.status,
        alreadySent: Boolean(req.notified && req.notified.start)
      });
    }

    // 2. GATILHO 2: 5 Dias para o Término
    if (daysToEnd === 5) {
      const messageText = buildMessageText(templates[ALERT_TYPES.FIVE_DAYS_BEFORE], messageParams);
      results.push({
        id: `${req.id}_five_days_${refDate.toISOString().split('T')[0]}`,
        requestId: req.id,
        employeeId: emp.id || req.employeeId,
        alertType: ALERT_TYPES.FIVE_DAYS_BEFORE,
        alertTitle: 'Faltam 5 Dias para o Término',
        alertBadgeColor: '#d97706', // Amber
        alertBadgeBg: '#fffbeb',
        daysRelative: 5,
        employeeName: messageParams.name,
        nip: messageParams.nip,
        department: deptName,
        phone: contactPhone,
        email: contactEmail,
        startDate: req.startDate,
        endDate: req.endDate,
        returnDate: returnDateStr,
        daysCount: messageParams.daysCount,
        messageText,
        whatsappUrl: getWhatsAppUrl(contactPhone, messageText),
        smsUrl: getSmsUrl(contactPhone, messageText),
        status: req.status,
        alreadySent: Boolean(req.notified && req.notified.fiveDays)
      });
    }

    // 3. GATILHO 3: 1 Dia para o Início das Atividades (Retorno é amanhã)
    if (daysToReturn === 1 || daysToEnd === 0) {
      const messageText = buildMessageText(templates[ALERT_TYPES.ONE_DAY_BEFORE_RETURN], messageParams);
      results.push({
        id: `${req.id}_return_${refDate.toISOString().split('T')[0]}`,
        requestId: req.id,
        employeeId: emp.id || req.employeeId,
        alertType: ALERT_TYPES.ONE_DAY_BEFORE_RETURN,
        alertTitle: '1 Dia para Início das Atividades (Regresso Amanhã)',
        alertBadgeColor: '#dc2626', // Red
        alertBadgeBg: '#fef2f2',
        daysRelative: 1,
        employeeName: messageParams.name,
        nip: messageParams.nip,
        department: deptName,
        phone: contactPhone,
        email: contactEmail,
        startDate: req.startDate,
        endDate: req.endDate,
        returnDate: returnDateStr,
        daysCount: messageParams.daysCount,
        messageText,
        whatsappUrl: getWhatsAppUrl(contactPhone, messageText),
        smsUrl: getSmsUrl(contactPhone, messageText),
        status: req.status,
        alreadySent: Boolean(req.notified && req.notified.returnEve)
      });
    }
  });

  return results;
}
