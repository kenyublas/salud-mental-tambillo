# 🧠 Sistema de Salud Mental - C.S. Tambillo

Sistema de gestión de pacientes para la Lic. Janeth - Centro de Salud Tambillo, Huánuco, Perú.

## 🚀 Instalación y uso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env con tus credenciales
```

### 3. Ejecutar en desarrollo
```bash
npm run dev
```

### 4. Build para producción
```bash
npm run build
```

---

## 🔑 Configuración Google Sheets (Fase 2)

Cuando tengas las credenciales de Google Cloud:

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → Habilitar **Google Sheets API**
3. Crear **Service Account** → Descargar JSON
4. Compartir el Google Sheet con el email del Service Account
5. Copiar el **Spreadsheet ID** de la URL del Sheet
6. Configurar el backend en `/backend`

---

## 🎤 Asistente de Voz (IA)

El botón flotante 🎤 activa el asistente de voz Gemini.

**Comandos disponibles:**
- **"siguiente"** → deja el campo en blanco y avanza
- **"atrás"** → vuelve al campo anterior
- **"corregir"** → elimina el dato actual y repite el campo
- **"pausa"** → pausa el asistente
- **"continuamos"** → reanuda desde donde se quedó
- **"cancelar"** → descarta todo el registro
- **"guardar"** → guarda el registro en Google Sheets

**Para activar Gemini:**
- Obtén tu API Key gratis en [aistudio.google.com](https://aistudio.google.com)
- Agrega `VITE_GEMINI_API_KEY=tu_key` en el archivo `.env`

---

## 📦 Stack tecnológico

| Tecnología | Uso |
|---|---|
| React + Vite | Frontend |
| Tailwind CSS | Estilos responsive |
| React Router | Navegación |
| Recharts | Gráficas dashboard |
| jsPDF | Generación de PDFs |
| Web Speech API | Reconocimiento de voz |
| Gemini API | Interpretación IA |
| Google Sheets API | Base de datos |
| Vercel | Deploy frontend |
| Railway/Render | Deploy backend |

---

## 📁 Estructura del proyecto

```
salud-mental-tambillo/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── BotFlotante.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Registro.jsx
│   │   ├── Pacientes.jsx
│   │   └── OtrasPaginas.jsx (Gestantes, Referencias, APPs)
│   ├── hooks/
│   │   └── useVoiceAssistant.js
│   ├── utils/
│   │   ├── sheets.js (Google Sheets API)
│   │   └── pdf.js (Generador PDF)
│   └── data/
│       └── cie10.js (Campos, CIE-10, catálogos)
├── .env.example
├── .gitignore
└── README.md
```

---

Desarrollado por **Kenyu** para la **Lic. Janeth** 💖
Centro de Salud Tambillo - Red de Salud Pachitea - Huánuco, Perú
