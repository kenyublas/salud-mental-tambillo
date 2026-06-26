export const CIE10 = [
  { code: 'F10', desc: 'Trastornos mentales y del comportamiento debidos al uso de alcohol' },
  { code: 'F11', desc: 'Trastornos mentales debidos al uso de opioides' },
  { code: 'F19', desc: 'Trastornos mentales debidos al uso de múltiples drogas' },
  { code: 'F20', desc: 'Esquizofrenia' },
  { code: 'F25', desc: 'Trastorno esquizoafectivo' },
  { code: 'F31', desc: 'Trastorno afectivo bipolar' },
  { code: 'F32', desc: 'Episodio depresivo' },
  { code: 'F33', desc: 'Trastorno depresivo recurrente' },
  { code: 'F40', desc: 'Trastornos de ansiedad fóbica' },
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada' },
  { code: 'F41.2', desc: 'Trastorno mixto ansioso-depresivo' },
  { code: 'F41.9', desc: 'Trastorno de ansiedad, no especificado' },
  { code: 'F43', desc: 'Reacción al estrés grave y trastornos de adaptación' },
  { code: 'F43.1', desc: 'Trastorno de estrés postraumático' },
  { code: 'F44', desc: 'Trastornos disociativos (de conversión)' },
  { code: 'F45', desc: 'Trastornos somatomorfos' },
  { code: 'F50', desc: 'Trastornos de la conducta alimentaria' },
  { code: 'F60', desc: 'Trastornos específicos de la personalidad' },
  { code: 'F70', desc: 'Retraso mental leve' },
  { code: 'F71', desc: 'Retraso mental moderado' },
  { code: 'F80', desc: 'Trastornos específicos del desarrollo del habla y del lenguaje' },
  { code: 'F84', desc: 'Trastornos generalizados del desarrollo (autismo)' },
  { code: 'F90', desc: 'Trastornos hipercinéticos (TDAH)' },
  { code: 'F91', desc: 'Trastornos de la conducta' },
  { code: 'F98', desc: 'Otros trastornos emocionales y del comportamiento en la infancia' },
  { code: 'Z03', desc: 'Observación y evaluación médica' },
  { code: 'Z63', desc: 'Problemas relacionados con el grupo de apoyo' },
  { code: 'Z635', desc: 'Ruptura familiar por separación o divorcio' },
  { code: 'Z637', desc: 'Otros problemas relacionados con la familia' },
  { code: 'T740', desc: 'Abandono o negligencia' },
  { code: 'T741', desc: 'Abuso físico' },
  { code: 'T742', desc: 'Abuso sexual' },
  { code: 'T743', desc: 'Abuso psicológico' },
  { code: 'f41.2', desc: 'Trastorno mixto ansioso-depresivo' },
  { code: 'f41.9', desc: 'Trastorno de ansiedad no especificado' },
  { code: 'f80', desc: 'Trastorno del habla y lenguaje' },
  { code: 'f81.3', desc: 'Trastorno mixto del desarrollo' },
];

export const SECTORES = [
  'Tambillo', 'Chinchinca', 'Cruz Punta', 'Chachaspata', 'Panaocoha',
  'Shalla Baja', 'Cochapampa', 'Goyar Punta', 'Montehuasi', 'Wilca',
  'Cachigaga', 'Inkapozo', 'Ushumayo', 'Ushno', 'T-006'
];

export const TAMIZAJES = [
  '96150.01', '96150.02', '96150.03', '96150.04', '96150.05',
  '96150.06', '96150.07', '96150.08'
];

export const MOTIVOS = [
  'Atención integral', 'Atención prenatal', 'Atención Adolescente',
  'Seguimiento', 'Primera vez', 'Reingreso', 'Interconsulta'
];

export const SEGUROS = ['SIS', 'ES SALUD', 'SOAT', 'Particular', 'Ninguno'];

export const CAMPOS_RUA = [
  { key: 'fechaAtencion', label: 'Fecha de Atención', type: 'date', required: true },
  { key: 'profesional', label: 'Profesional', type: 'text', required: true },
  { key: 'responsableAtencion', label: 'Responsable Atención', type: 'text' },
  { key: 'tipoAtencion', label: 'Tipo (N/R/C)', type: 'select', options: ['N', 'R', 'C'], required: true },
  { key: 'apoderado', label: 'Apoderado (si es menor)', type: 'text', conditionalOn: 'esMenor' },
  { key: 'nombres', label: 'Nombres y Apellidos', type: 'text', required: true },
  { key: 'dni', label: 'DNI', type: 'text', required: true },
  { key: 'fechaNacimiento', label: 'Fecha de Nacimiento', type: 'date', required: true },
  { key: 'edad', label: 'Edad Actual', type: 'text' },
  { key: 'sexo', label: 'Sexo', type: 'select', options: ['F', 'M'], required: true },
  { key: 'gestante', label: 'Gestante/Puérpera', type: 'select', options: ['-', 'G', 'P'] },
  { key: 'fur', label: 'FUR (Fecha Última Regla)', type: 'date', conditionalOn: 'esGestante' },
  { key: 'semanaGestacional', label: 'Semana Gestacional', type: 'text', conditionalOn: 'esGestante' },
  { key: 'fechaProbableParto', label: 'Fecha Probable de Parto', type: 'date', conditionalOn: 'esGestante' },
  { key: 'hcl', label: 'H.CL (Historia Clínica)', type: 'text' },
  { key: 'sector', label: 'Sector', type: 'select', options: SECTORES, required: true },
  { key: 'sectorista', label: 'Sectorista', type: 'text' },
  { key: 'seguro', label: 'SIS / ES SALUD', type: 'select', options: SEGUROS },
  { key: 'celular', label: 'N° Celular', type: 'text' },
  { key: 'motivoConsulta', label: 'Motivo de Consulta', type: 'textarea', required: true },
  { key: 'tamizaje', label: 'Tamizaje', type: 'tamizaje-multi', options: TAMIZAJES },
  { key: 'resultadoTamizaje', label: 'Resultado Tamizaje', type: 'select', options: ['Negativo', 'Positivo'] },
  { key: 'diagnostico', label: 'Diagnóstico (CIE-10)', type: 'cie10', required: true },
  { key: 'segundoControl', label: '2do Control', type: 'text' },
  { key: 'intervencion', label: 'N° Intervención', type: 'text', conditionalOn: 'tamizajePositivo' },
  { key: 'fechaProxCita', label: 'Fecha Próxima Cita', type: 'date' },
  { key: 'terminoAtencion', label: 'Término de Atención (TA)', type: 'text' },
  { key: 'referencia', label: 'Referencia', type: 'text' },
  { key: 'contrarreferencia', label: 'Contrarreferencia', type: 'text' },
  { key: 'valoracionRiesgo', label: 'Valoración Riesgo VIF', type: 'text' },
  { key: 'sesionMovilizacion', label: 'Sesión Movilización Redes', type: 'text' },
  { key: 'visitaDomiciliaria', label: 'Visita Domiciliaria', type: 'text' },
  { key: 'medicamentos', label: 'Medicamentos', type: 'text' },
  { key: 'teleorientacion', label: 'Teleorientación/Telemonitoreo', type: 'text' },
  { key: 'promsa', label: 'PROMSA', type: 'text' },
  { key: 'campana', label: 'Campaña', type: 'text' },
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
];

export const COMANDOS_VOZ = ['siguiente', 'atrás', 'atras', 'corregir', 'pausa', 
  'continuamos', 'continua', 'seguimos', 'cancelar', 'guardar', 'listo', 'ya'];
