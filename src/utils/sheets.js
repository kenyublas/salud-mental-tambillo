// =====================================================
// CONFIGURACIÓN GOOGLE SHEETS API
// Kenyu: cuando tengas las credenciales, completa aquí
// =====================================================

const SHEET_CONFIG = {
  // Reemplaza con tu Spreadsheet ID (de la URL del Google Sheet)
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',
  
  // URL base del backend (cuando lo despliegues en Railway/Render)
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
};

// =====================================================
// FUNCIONES DE GOOGLE SHEETS
// =====================================================

export async function obtenerRegistros(mes) {
  try {
    const res = await fetch(`${SHEET_CONFIG.API_URL}/api/registros?mes=${mes}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    // Retorna datos mock para desarrollo
    return DATOS_MOCK;
  }
}

export async function crearRegistro(datos) {
  try {
    const res = await fetch(`${SHEET_CONFIG.API_URL}/api/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return await res.json();
  } catch (error) {
    console.error('Error creando registro:', error);
    // En modo desarrollo, simula guardado exitoso
    return { success: true, id: Date.now(), mock: true };
  }
}

export async function editarRegistro(id, datos) {
  try {
    const res = await fetch(`${SHEET_CONFIG.API_URL}/api/registro/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    return await res.json();
  } catch (error) {
    console.error('Error editando registro:', error);
    return { success: true, mock: true };
  }
}

export async function eliminarRegistro(id) {
  try {
    const res = await fetch(`${SHEET_CONFIG.API_URL}/api/registro/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (error) {
    console.error('Error eliminando registro:', error);
    return { success: true, mock: true };
  }
}

export async function buscarPaciente(dni) {
  try {
    const res = await fetch(`${SHEET_CONFIG.API_URL}/api/paciente/${dni}`);
    return await res.json();
  } catch (error) {
    return null;
  }
}

// =====================================================
// DATOS MOCK PARA DESARROLLO (sin API conectada)
// =====================================================
export const DATOS_MOCK = [
  {
    id: 1, fechaAtencion: '2026-01-03', profesional: 'KRISTEL ALVARADO',
    tipoAtencion: 'N', nombres: 'Odalia Tolentino Rojas', dni: '72363430',
    fechaNacimiento: '1997-01-02', edad: '27', sexo: 'F', gestante: '-',
    hcl: '01-344-07', sector: 'Tambillo', seguro: 'SIS',
    motivoConsulta: 'Atención integral', tamizaje: '96150.03',
    resultadoTamizaje: 'Negativo', diagnostico: 'f41.2',
  },
  {
    id: 2, fechaAtencion: '2026-01-03', profesional: 'KRISTEL ALVARADO',
    tipoAtencion: 'N', nombres: 'Jhassumy Hurtado Tolentino', dni: '79451273',
    fechaNacimiento: '2016-01-02', edad: '9', sexo: 'F', gestante: '',
    hcl: '01-344-08', sector: 'Tambillo', seguro: '',
    motivoConsulta: 'Atención integral', tamizaje: '96150.08',
    resultadoTamizaje: 'Positivo', diagnostico: 'Z635',
  },
  {
    id: 3, fechaAtencion: '2026-01-05', profesional: 'KRISTEL ALVARADO',
    tipoAtencion: 'C', nombres: 'Nayeli Aranda Vasquez', dni: '75379120',
    fechaNacimiento: '2004-03-21', edad: '21', sexo: 'F', gestante: 'G',
    fur: '2025-06-16', semanaGestacional: '28ss',
    hcl: '01-007-02', sector: 'Chinchinca', seguro: 'SIS',
    motivoConsulta: 'Atención prenatal', tamizaje: '96150.08',
    resultadoTamizaje: 'Negativo', diagnostico: 'f41.9',
  },
  {
    id: 4, fechaAtencion: '2026-01-12', profesional: 'KRISTEL ALVARADO',
    tipoAtencion: 'N', nombres: 'Luz Eugenio Espinoza', dni: '80989674',
    fechaNacimiento: '2013-01-09', edad: '13', sexo: 'F', gestante: '',
    hcl: '16-161-66', sector: 'Panaocoha', seguro: 'SIS',
    motivoConsulta: 'Atención Adolescente', tamizaje: '96150.08',
    resultadoTamizaje: 'Negativo', diagnostico: 'Z003',
  },
  {
    id: 5, fechaAtencion: '2026-01-14', profesional: 'KRISTEL ALVARADO',
    tipoAtencion: 'N', nombres: 'Ruth Lino Runi', dni: '91411906',
    fechaNacimiento: '2019-07-13', edad: '6', sexo: 'F', gestante: '',
    hcl: '1-339-4', sector: 'Tambillo', seguro: 'SIS',
    motivoConsulta: 'Atención integral', tamizaje: '96150.08',
    resultadoTamizaje: 'Negativo', diagnostico: '',
  },
];

export const MES_ACTUAL = () => {
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  return meses[new Date().getMonth()] + ' ' + new Date().getFullYear();
};
