const USUARIOS = [
  {
    usuario:  'janeth',
    password: process.env.ADMIN_PASSWORD,
    nombre:   'Janeth Karina Santa Cruz Espiritu',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
  {
    usuario:  'lina',
    password: process.env.PASSWORD_LINA,
    nombre:   'Lina Jesarell Cabanillas Beraun',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
  {
    usuario:  'ana',
    password: process.env.PASSWORD_ANA,
    nombre:   'Ana Paula Trujillo Molina',
    titulo:   'Lic.',
    rol:      'psicologa',
  },
];

module.exports = USUARIOS;
