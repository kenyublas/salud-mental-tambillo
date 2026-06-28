// Obtener token guardado
export function getToken() {
  return localStorage.getItem('token');
}

// Obtener usuario guardado
export function getUsuario() {
  return localStorage.getItem('usuario');
}

// Obtener nombre completo
export function getNombre() {
  return localStorage.getItem('nombre');
}

// Obtener título
export function getTitulo() {
  return localStorage.getItem('titulo');
}

// Obtener nombre para mostrar: "Lic. Janeth"
export function getNombreCorto() {
  const titulo = localStorage.getItem('titulo') || 'Lic.';
  const nombre = localStorage.getItem('nombre') || '';
  const primerNombre = nombre.split(' ')[0];
  return `${titulo} ${primerNombre}`;
}

// Obtener nombre completo con título: "Lic. Janeth Karina Santa Cruz Espiritu"
export function getNombreCompleto() {
  const titulo = localStorage.getItem('titulo') || 'Lic.';
  const nombre = localStorage.getItem('nombre') || '';
  return `${titulo} ${nombre}`;
}

// Cerrar sesión
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('nombre');
  localStorage.removeItem('titulo');
}

// Verificar si hay sesión activa
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Headers con token para fetch
export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}