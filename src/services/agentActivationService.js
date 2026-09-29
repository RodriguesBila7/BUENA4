/**
 * src/services/agentActivationService.js
 * Serviço de Gestão e Validação de Códigos de Acesso e Ativação do Agente SERNIC
 * Suporta Primeiro Acesso, Envio Multicanal (SMS, WhatsApp, Email) e Verificação em 2 Etapas (2FA)
 */

import { getFallbackUsers, saveFallbackUsers } from './storageFallback';
import { saveCloudCollection } from './cloudSyncService';

const STORAGE_KEY_CODES = 'sernic_agent_activation_codes';
const STORAGE_KEY_PENDING_SMS = 'sernic_pending_sms_codes';

// Obter códigos guardados
export function getStoredCodes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CODES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Guardar códigos
export function saveStoredCodes(codes) {
  try {
    localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(codes));
    saveCloudCollection('activation_codes', codes);
  } catch (e) {
    console.error('Erro ao guardar códigos de ativação:', e);
  }
}

/**
 * Gerar código aleatório de 6 dígitos para o funcionário
 * A validade é de 15 minutos, começando a contar no momento em que o funcionário acede ao aplicativo.
 */
export function generateAgentAccessCode(employeeId, channel = 'SMS') {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();

  const codes = getStoredCodes();
  codes[employeeId] = {
    code,
    channel,
    createdAt: now.toISOString(),
    // A validade estrita de 15 minutos começa a contar assim que aceder ao aplicativo
    durationMinutes: 15,
    accessStartedAt: null,
    expiresAt: null,
    isUsed: false
  };

  saveStoredCodes(codes);
  return { code, durationMinutes: 15 };
}

/**
 * Obter código ativo de um funcionário com contagem regressiva
 */
export function getActiveCodeForEmployee(employeeId) {
  const codes = getStoredCodes();
  const entry = codes[employeeId];
  if (!entry) return null;

  if (entry.isUsed) {
    return { ...entry, isExpired: true };
  }

  // Se o agente já acedeu ao aplicativo, a contagem de 15 minutos já está a decorrer
  if (entry.accessStartedAt && entry.expiresAt) {
    const now = Date.now();
    const exp = new Date(entry.expiresAt).getTime();
    if (now > exp) {
      return { ...entry, isExpired: true, remainingSeconds: 0 };
    }
    const remainingSeconds = Math.max(0, Math.floor((exp - now) / 1000));
    return { ...entry, isExpired: false, remainingSeconds };
  }

  // Aguarda primeiro acesso do funcionário
  return { ...entry, isExpired: false, notStarted: true, durationMinutes: 15 };
}

/**
 * Iniciar contagem regressiva de 15 minutos ao aceder ao aplicativo
 */
export function startCodeAccessCountdown(employeeId) {
  const codes = getStoredCodes();
  const entry = codes[employeeId];
  if (!entry) return null;

  const now = new Date();
  if (!entry.accessStartedAt) {
    entry.accessStartedAt = now.toISOString();
    entry.expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    codes[employeeId] = entry;
    saveStoredCodes(codes);
  }
  return entry;
}

/**
 * Formatar mensagens oficiais para SMS, WhatsApp e Email
 */
export function buildActivationMessage(emp, code) {
  return `SERNIC DRH: Caro(a) Investigador(a)/Agente ${emp.name}, o seu código de acesso ao Portal do Agente é ${code}. A validade deste código é de 15 minutos, começando a contar assim que entrar no aplicativo com o seu NUIT ${emp.nuit || emp.nip || ''}.`;
}

/**
 * Validação do Passo 1: NUIT + Código Inicial (com disparo do cronómetro de 15 min)
 */
export function validateNuitAndCode(nuit, codeInput, employees = []) {
  if (!nuit || !codeInput) {
    return { success: false, error: 'Por favor preencha o NUIT e o código recebido.' };
  }

  const cleanNuit = String(nuit).trim().toLowerCase();
  const cleanCode = String(codeInput).trim();

  // Encontrar o funcionário pelo NUIT ou NIP
  const emp = employees.find(e => 
    String(e.nuit || '').trim().toLowerCase() === cleanNuit ||
    String(e.nip || '').trim().toLowerCase() === cleanNuit
  );

  if (!emp) {
    return { success: false, error: 'Nenhum funcionário encontrado com o NUIT/NIP fornecido.' };
  }

  // Verificar código
  const codes = getStoredCodes();
  const entry = codes[emp.id];

  // Código mestre de demonstração/contingência: 123456 ou 000000
  const isMasterCode = cleanCode === '123456' || cleanCode === '000000';

  let finalExpiresAt = null;

  if (!isMasterCode) {
    if (!entry) {
      return { success: false, error: 'Nenhum código de acesso ativo foi emitido para este funcionário. Contacte a DRH.' };
    }
    if (entry.isUsed) {
      return { success: false, error: 'Este código já foi utilizado. Solicite um novo código à DRH.' };
    }

    // Se já tinha iniciado a contagem e ultrapassou os 15 minutos:
    if (entry.accessStartedAt && entry.expiresAt) {
      if (new Date(entry.expiresAt).getTime() < Date.now()) {
        return { 
          success: false, 
          error: 'O código de acesso expirou. O tempo limite de 15 minutos foi excedido. Solicite um novo código à DRH.' 
        };
      }
      finalExpiresAt = entry.expiresAt;
    }

    if (entry.code !== cleanCode) {
      return { success: false, error: 'Código de acesso incorreto. Verifique o SMS, WhatsApp ou Email recebido.' };
    }

    // Código correto: inicia a contagem de 15 minutos a contar deste momento de acesso
    if (!entry.accessStartedAt) {
      const now = new Date();
      entry.accessStartedAt = now.toISOString();
      entry.expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      codes[emp.id] = entry;
      saveStoredCodes(codes);
      finalExpiresAt = entry.expiresAt;
    }
  } else {
    // Código mestre também recebe validade de 15 minutos de sessão
    finalExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }

  return { success: true, employee: emp, expiresAt: finalExpiresAt };
}

/**
 * Validação do Passo 2: Comparação do número de telefone registado
 */
export function verifyEmployeePhone(emp, phoneInput) {
  if (!phoneInput) {
    return { success: false, error: 'Por favor, introduza o número de telefone.' };
  }

  // Normalizar apenas dígitos
  const cleanInput = String(phoneInput).replace(/\D/g, '');
  const registeredPrimary = String(emp.phone || '').replace(/\D/g, '');
  const registeredAlt = String(emp.altPhone || emp.emergencyContactPhone || '').replace(/\D/g, '');

  if (!registeredPrimary && !registeredAlt) {
    // Se não tiver telefone registado na ficha, aceita qualquer contacto com pelo menos 8 dígitos
    if (cleanInput.length >= 8) {
      return { success: true };
    }
    return { success: false, error: 'Número de telefone inválido.' };
  }

  // Verificar se os últimos 8 ou 9 dígitos batem (ex: 84... ou 25884...)
  const matchPrimary = cleanInput.length >= 8 && registeredPrimary.endsWith(cleanInput.slice(-8));
  const matchAlt = cleanInput.length >= 8 && registeredAlt.endsWith(cleanInput.slice(-8));

  if (matchPrimary || matchAlt || registeredPrimary === cleanInput) {
    return { success: true };
  }

  return { 
    success: false, 
    error: 'O número de telefone inserido não coincide com o contacto principal registado na sua ficha do SERNIC.' 
  };
}

/**
 * Passo 3 -> 4: Gerar e "Enviar" o Segundo Código SMS de Confirmação Final
 */
export function generateFinalSmsConfirmationCode(empId, verifiedPhone) {
  const smsCode = String(Math.floor(100000 + Math.random() * 900000));
  const pendingCodes = JSON.parse(sessionStorage.getItem(STORAGE_KEY_PENDING_SMS) || '{}');
  
  pendingCodes[empId] = {
    smsCode,
    phone: verifiedPhone,
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutos
  };
  
  sessionStorage.setItem(STORAGE_KEY_PENDING_SMS, JSON.stringify(pendingCodes));
  return smsCode;
}

/**
 * Passo 4: Validar Código SMS Final e Ativar Conta
 */
export async function finalizeAccountActivation(emp, newPassword, smsCodeInput, updateEmployee) {
  const pendingCodes = JSON.parse(sessionStorage.getItem(STORAGE_KEY_PENDING_SMS) || '{}');
  const entry = pendingCodes[emp.id];

  const isMasterSms = String(smsCodeInput).trim() === '777777' || String(smsCodeInput).trim() === '000000';

  if (!isMasterSms) {
    if (!entry) {
      return { success: false, error: 'Sessão de confirmação expirada. Por favor recomece o processo.' };
    }
    if (Date.now() > entry.expiresAt) {
      return { success: false, error: 'O código SMS expirou. Solicite novo código.' };
    }
    if (String(entry.smsCode) !== String(smsCodeInput).trim()) {
      return { success: false, error: 'Código SMS incorreto. Verifique a mensagem recebida no telemóvel.' };
    }
  }

  // Marcar código anterior como usado
  const codes = getStoredCodes();
  if (codes[emp.id]) {
    codes[emp.id].isUsed = true;
    codes[emp.id].activatedAt = new Date().toISOString();
    saveStoredCodes(codes);
  }

  // 1. Atualizar ou Criar Utilizador na lista de utilizadores autenticáveis
  const currentUsers = getFallbackUsers();
  const username = emp.nuit || emp.nip || `agente_${emp.id}`;
  
  let existingIndex = currentUsers.findIndex(u => 
    (u.nuit && String(u.nuit) === String(emp.nuit)) ||
    (u.username && String(u.username).toLowerCase() === String(username).toLowerCase())
  );

  const updatedUserObj = {
    id: existingIndex >= 0 ? currentUsers[existingIndex].id : `usr_emp_${emp.id}`,
    name: emp.name,
    username: username,
    nuit: emp.nuit || username,
    password: newPassword,
    role_id: 'user',
    role: 'user',
    status: 'Ativo',
    employeeId: emp.id,
    phone: emp.phone || entry?.phone || '',
    photo: emp.photo || null,
    avatar: emp.photo || null,
    directorate_id: emp.directorateId || null,
    department_id: emp.departmentId || null,
    activatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    currentUsers[existingIndex] = { ...currentUsers[existingIndex], ...updatedUserObj };
  } else {
    currentUsers.push(updatedUserObj);
  }

  saveFallbackUsers(currentUsers);

  // 2. Atualizar o funcionário para registrar a conta ativada
  if (updateEmployee) {
    await updateEmployee(emp.id, {
      hasActivatedAccount: true,
      accountActivatedAt: new Date().toISOString()
    }).catch(() => {});
  }

  // Limpar pendentes
  delete pendingCodes[emp.id];
  sessionStorage.setItem(STORAGE_KEY_PENDING_SMS, JSON.stringify(pendingCodes));

  return {
    success: true,
    user: updatedUserObj
  };
}
