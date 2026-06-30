const express = require('express');
const router = express.Router();

// POST /api/gemini — Dr. Umari, asistente IA
router.post('/gemini', async (req, res) => {
  const {mensaje,historial,contexto}=req.body;
  const ANTHROPIC_API_KEY=process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({error:'ANTHROPIC_API_KEY no configurado.'});
  try {
    const messages=[];
    if (historial?.length>0) historial.forEach(h=>messages.push({role:h.rol==='user'?'user':'assistant',content:h.texto}));
    messages.push({role:'user',content:mensaje});
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:500,system:`Eres Dr. Umari, asistente IA de la Lic. Janeth Karina Santa Cruz Espíritu, psicóloga del Centro de Salud Tambillo-Umari, Huánuco, Perú. Ayúdala con sus pacientes, citas, estadísticas y diagnósticos CIE-10. Responde siempre en español, sé conciso (máximo 3-4 oraciones), usa emojis ocasionalmente. CONTEXTO ACTUAL: ${contexto||'Sin contexto disponible'}`,messages})});
    if (!response.ok){const err=await response.json();throw new Error(err.error?.message||`Error ${response.status}`);}
    const data=await response.json();
    res.json({respuesta:data.content?.[0]?.text||'Lo siento, no pude generar una respuesta.'});
  } catch(error){
    console.error('[POST /api/gemini] ERROR:',error.message);
    res.status(500).json({error:error.message});
  }
});

module.exports = router;
