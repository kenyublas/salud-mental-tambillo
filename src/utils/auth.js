// Obtener token guardado
export function getToken() {
  return localStorage.getItem('token');
}

// Obtener usuario guardado
export function getUsuario() {
  return localStorage.getItem('usuario');
}

// Cerrar sesión
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

// Verificar si hay sesión activa
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    // Decodificar payload sin verificar firma (solo para ver expiración)
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