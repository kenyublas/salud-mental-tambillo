const express = require('express');
const router = express.Router();

// Mapeo de rutas a nombres legibles para que Dr. Umari sepa dónde está la psicóloga
const PAGINAS = {
  '/':             'Dashboard (resumen general, estadísticas del mes, alertas y metas 2026)',
  '/registro':     'Nuevo Registro RUA (formulario para registrar una nueva atención de salud mental)',
  '/pacientes':    'Pacientes (lista y búsqueda de todos los pacientes del RUA)',
  '/gestantes':    'Gestantes (seguimiento de pacientes embarazadas o puérperas)',
  '/seguimiento':  'Seguimiento (programas de salud mental: depresión, ansiedad, violencia familiar, etc.)',
  '/cem':          'CEM Pachitea (Centro de Emergencia Mujer - casos de violencia derivados)',
};

function describirPagina(ruta) {
  return PAGINAS[ruta] || `una sección del sistema (${ruta})`;
}

// POST /api/gemini — Dr. Umari, asistente IA (corriendo en Llama via Groq)
router.post('/gemini', async (req, res) => {
  const { mensaje, historial, contexto, nombreUsuario, tituloUsuario, paginaActual, datosPagina } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY no configurado.' });

  try {
    const nombrePsicologa = nombreUsuario ? `${tituloUsuario || 'Lic.'} ${nombreUsuario.split(' ')[0]}` : 'Licenciada';
    const descPagina = describirPagina(paginaActual);

    const messages = [
      {
        role: 'system',
        content: `Eres Dr. Umari, asistente clínico de ${nombrePsicologa}, psicóloga del Centro de Salud Tambillo-Umari, Huánuco, Perú. Te diriges a ella como "${nombrePsicologa}" o "Licenciada", con un tono profesional, formal pero cercano, como una asistente clínica experta y de confianza. Ayúdala con sus pacientes, citas, estadísticas y diagnósticos CIE-10. Responde siempre en español, de forma concisa (máximo 3-4 oraciones), sin emojis ni símbolos decorativos, solo texto plano y claro.

CONTEXTO DE NAVEGACIÓN: La licenciada está actualmente en la página: ${descPagina}. Si te pregunta "qué página es esta", "dónde estoy" o similar, explícale brevemente qué es esa sección y para qué sirve. Usa esta información de contexto de página para dar respuestas relevantes a lo que está viendo en este momento.

${datosPagina ? `DATOS VISIBLES EN ESTA PÁGINA AHORA MISMO: ${datosPagina}` : ''}

CONTEXTO GENERAL DEL SISTEMA: ${contexto || 'Sin contexto disponible'}`,
      },
    ];

    if (historial?.length > 0) {
      historial.forEach(h => messages.push({ role: h.rol === 'user' ? 'user' : 'assistant', content: h.texto }));
    }
    messages.push({ role: 'user', content: mensaje });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Error ${response.status}`);
    }

    const data = await response.json();
    res.json({ respuesta: data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.' });
  } catch (error) {
    console.error('[POST /api/gemini] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tts — convierte texto a voz natural usando ElevenLabs (voz: Martin Osborne)
router.post('/tts', async (req, res) => {
  const { texto } = req.body;
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Martin Osborne - Deep and Passionate

  if (!ELEVENLABS_API_KEY) return res.status(500).json({ error: 'ELEVENLABS_API_KEY no configurado.' });
  if (!texto) return res.status(400).json({ error: 'texto requerido.' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: texto,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || `Error ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (error) {
    console.error('[POST /api/tts] ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;