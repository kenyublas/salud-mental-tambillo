import { useState, useRef, useCallback, useEffect } from 'react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

async function interpretarConGemini(texto, campo) {
  const t = texto.toLowerCase().trim();

  if (['siguiente', 'pasa', 'omite', 'omitir', 'déjalo', 'dejalo', 'en blanco', 'saltar'].some(c => t.includes(c))) return 'SIGUIENTE';
  if (['atrás', 'atras', 'regresa', 'retrocede', 'volver'].some(c => t.includes(c))) return 'ATRAS';
  if (['corregir', 'corrige', 'cambia', 'cambiar', 'no ese', 'me equivoqué', 'equivoque'].some(c => t.includes(c))) return 'CORREGIR';
  if (['pausa', 'pausar', 'detente', 'espera', 'momento'].some(c => t.includes(c))) return 'PAUSA';
  if (['continuamos', 'continua', 'continúa', 'seguimos', 'sigue', 'ya volví', 'ya volvi'].some(c => t.includes(c))) return 'CONTINUAR';
  if (['guardar', 'guarda', 'termina', 'finalizar', 'fin', 'listo'].some(c => t.includes(c))) return 'GUARDAR';
  if (['cancelar', 'cancela', 'empezar de nuevo', 'reiniciar', 'borrar todo'].some(c => t.includes(c))) return 'CANCELAR';

  if (!GEMINI_API_KEY) return limpiarTextoSimple(texto, campo);

  const prompt = `Eres asistente médico de una psicóloga peruana.
Campo a llenar: "${campo.label}" (tipo: ${campo.type})
La psicóloga dijo: "${texto}"

Responde SOLO con el valor limpio para ese campo. Sin explicaciones, sin comillas.
- Ignora muletillas: "a ver", "mmm", "eh", "espera", "este", "o sea"
- Si hay corrección mid-sentence, toma el ÚLTIMO valor
- Fechas: "hoy" → fecha actual en YYYY-MM-DD, "ayer" → ayer en YYYY-MM-DD, si dice fecha completa → YYYY-MM-DD
- Edad → solo número
- Sexo: femenino/mujer/niña → F, masculino/hombre/niño → M
- DNI → solo dígitos unidos, máximo 8
- Tipo de atención: nuevo/nueva → N, reingreso → R, continúa/continua → C
- Si es diagnóstico, puede ser código CIE-10 o descripción corta

Responde solo el valor:`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 80 }
        })
      }
    );
    const data = await res.json();
    const resultado = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return resultado || limpiarTextoSimple(texto, campo);
  } catch {
    return limpiarTextoSimple(texto, campo);
  }
}

function limpiarTextoSimple(texto, campo) {
  const t = texto.trim();
  const tl = t.toLowerCase();

  if (campo.type === 'date') {
    const hoy = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (['hoy', 'ahora', 'hoy mismo', 'fecha de hoy'].some(p => tl.includes(p))) return fmt(hoy);
    if (['ayer'].some(p => tl.includes(p))) {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      return fmt(ayer);
    }
  }

  if (campo.key === 'tipoAtencion') {
    if (['nuevo', 'nueva', ' n ', '^n$'].some(p => tl.includes(p)) || tl === 'n') return 'N';
    if (['reingreso', ' r '].some(p => tl.includes(p)) || tl === 'r') return 'R';
    if (['continua', 'continúa', 'continuación', ' c '].some(p => tl.includes(p)) || tl === 'c') return 'C';
  }

  if (campo.key === 'sexo') {
    if (['mujer','niña','femenino','hembra','chica'].some(p => tl.includes(p)) || tl === 'f') return 'F';
    if (['hombre','niño','masculino','varón','varon','chico'].some(p => tl.includes(p)) || tl === 'm') return 'M';
  }

  if (campo.key === 'dni') return t.replace(/\D/g, '').slice(0, 8);

  if (campo.key === 'edad') {
    const n = t.match(/\d+/);
    return n ? n[0] : t;
  }

  return t;
}

function hablar(texto) {
  if (!texto || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = 'es-PE';
  utter.rate = 1.0;
  utter.pitch = 1.1;
  const voces = window.speechSynthesis.getVoices();
  const vozES = voces.find(v => v.lang.startsWith('es'));
  if (vozES) utter.voice = vozES;
  window.speechSynthesis.speak(utter);
}

export function useVoiceAssistant({ onDatosActualizados, onGuardar, camposVisibles, datosIniciales = {} }) {
  const [activo, setActivo] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [campoActualIdx, setCampoActualIdx] = useState(0);
  const [mensajeBot, setMensajeBot] = useState('');

  const recognitionRef = useRef(null);
  const intentosRef = useRef(0);
  const datosRef = useRef({});
  const camposRef = useRef([]);
  const activoRef = useRef(false);
  const pausadoRef = useRef(false);
  const idxRef = useRef(0);

  // Refs para romper dependencias circulares entre useCallback
  const iniciarReconocimientoRef = useRef(null);
  const manejarSilencioRef = useRef(null);
  const finalizarGuardadoRef = useRef(null);
  const cancelarRef = useRef(null);

  useEffect(() => { activoRef.current = activo; }, [activo]);
  useEffect(() => { pausadoRef.current = pausado; }, [pausado]);
  useEffect(() => { camposRef.current = camposVisibles || []; }, [camposVisibles]);

  const actualizarDatos = useCallback((nuevos) => {
    datosRef.current = { ...datosRef.current, ...nuevos };
    onDatosActualizados && onDatosActualizados({ ...datosRef.current });
  }, [onDatosActualizados]);

  const detenerRecognition = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onnomatch = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}
  }, []);

  // escucharCampo: deps [] porque lee estado via refs y llama funciones via refs
  const escucharCampo = useCallback((idx) => {
    if (!activoRef.current || pausadoRef.current) return;

    const campos = camposRef.current;

    if (idx >= campos.length) {
      const msg = '¿Guardamos?';
      setMensajeBot(msg);
      setCampoActualIdx(idx);
      idxRef.current = idx;
      hablar(msg);
      setTimeout(() => escucharGuardar(), 1500);
      return;
    }

    const campo = campos[idx];

    if (datosRef.current[campo.key] && datosRef.current[campo.key] !== '') {
      escucharCampo(idx + 1);
      return;
    }

    setCampoActualIdx(idx);
    idxRef.current = idx;
    intentosRef.current = 0;

    const msg = campo.label + '...';
    setMensajeBot(msg);
    hablar(msg);
    // Llama via ref para siempre usar la versión más reciente
    setTimeout(() => iniciarReconocimientoRef.current?.(idx), 1800);
  }, []);

  // iniciarReconocimiento: deps [actualizarDatos, detenerRecognition]
  // Llama manejarSilencio, finalizarGuardado y cancelar via refs para evitar deps circulares
  const iniciarReconocimiento = useCallback((idx) => {
    if (!activoRef.current || pausadoRef.current) return;
    detenerRecognition();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMensajeBot('Usa Chrome para el asistente de voz.');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    setEscuchando(true);

    recognition.onresult = async (event) => {
      if (!activoRef.current) return;
      setEscuchando(false);
      detenerRecognition();

      const transcript = event.results[0][0].transcript;
      intentosRef.current = 0;

      const campos = camposRef.current;
      const campo = campos[idx];
      if (!campo) return;

      setProcesando(true);
      const interpretado = await interpretarConGemini(transcript, campo);
      setProcesando(false);

      if (!activoRef.current) return;

      if (interpretado === 'SIGUIENTE') {
        const siguiente = camposRef.current[idx + 1];
        const msg = siguiente ? `Siguiente... ${siguiente.label}...` : '¿Guardamos?';
        setMensajeBot(msg);
        hablar(msg);
        setTimeout(() => escucharCampo(idx + 1), 1800);
        return;
      }

      if (interpretado === 'ATRAS') {
        let anteriorIdx = idx - 1;
        while (anteriorIdx >= 0 && datosRef.current[camposRef.current[anteriorIdx]?.key]) {
          anteriorIdx--;
        }
        if (anteriorIdx >= 0) {
          const campoAnterior = camposRef.current[anteriorIdx];
          setMensajeBot(`Volvemos a ${campoAnterior.label}...`);
          hablar(`Volvemos a ${campoAnterior.label}`);
          setTimeout(() => {
            actualizarDatos({ [campoAnterior.key]: '' });
            escucharCampo(anteriorIdx);
          }, 1800);
        } else {
          setMensajeBot('Ya estamos en el primer campo.');
          hablar('Ya estamos en el primer campo.');
          setTimeout(() => escucharCampo(idx), 1800);
        }
        return;
      }

      if (interpretado === 'CORREGIR') {
        actualizarDatos({ [campo.key]: '' });
        setMensajeBot(`De acuerdo, ${campo.label}...`);
        hablar(`De acuerdo, ${campo.label}`);
        // Llama via ref para siempre usar la versión más reciente (incluso auto-recursión)
        setTimeout(() => iniciarReconocimientoRef.current?.(idx), 1800);
        return;
      }

      if (interpretado === 'PAUSA') {
        detenerRecognition();
        window.speechSynthesis?.cancel();
        setPausado(true);
        pausadoRef.current = true;
        setEscuchando(false);
        setMensajeBot('Pausado. Presiona el botón para continuar.');
        hablar('Pausado.');
        return;
      }

      if (interpretado === 'GUARDAR') {
        finalizarGuardadoRef.current?.();
        return;
      }

      if (interpretado === 'CANCELAR') {
        cancelarRef.current?.();
        return;
      }

      let valorFinal = interpretado;
      if (campo.type === 'select') {
        const opcionMatch = campo.options?.find(o =>
          o.toLowerCase() === interpretado.toLowerCase() ||
          o.toLowerCase().startsWith(interpretado.toLowerCase())
        );
        valorFinal = opcionMatch || interpretado;
      }

      actualizarDatos({ [campo.key]: valorFinal });
      const msg = `Registrado: ${valorFinal}`;
      setMensajeBot(msg);
      hablar(msg);
      setTimeout(() => escucharCampo(idx + 1), 1400);
      return;
    };

    recognition.onnomatch = () => {
      if (!activoRef.current) return;
      setEscuchando(false);
      manejarSilencioRef.current?.(idx);
    };

    recognition.onerror = (e) => {
      if (!activoRef.current) return;
      setEscuchando(false);
      if (e.error === 'no-speech' || e.error === 'audio-capture') {
        manejarSilencioRef.current?.(idx);
      } else if (e.error !== 'aborted') {
        manejarSilencioRef.current?.(idx);
      }
    };

    recognition.onend = () => {
      if (activoRef.current && !pausadoRef.current) {
        setEscuchando(false);
      }
    };

    try { recognition.start(); } catch {}
  }, [actualizarDatos, detenerRecognition]);
  iniciarReconocimientoRef.current = iniciarReconocimiento;

  // manejarSilencio: deps [] porque llama iniciarReconocimiento via ref
  const manejarSilencio = useCallback((idx) => {
    if (!activoRef.current) return;
    const campos = camposRef.current;
    const campo = campos[idx];

    if (intentosRef.current < 1) {
      intentosRef.current++;
      const msg = campo ? `${campo.label}...` : '¿Guardamos?';
      setMensajeBot(`${msg} (repitiendo)`);
      hablar(msg);
      setTimeout(() => iniciarReconocimientoRef.current?.(idx), 1800);
    } else {
      intentosRef.current = 0;
      setPausado(true);
      pausadoRef.current = true;
      setEscuchando(false);
      setMensajeBot('Sin respuesta. En pausa. Presiona el botón para continuar.');
      hablar('Sin respuesta. En pausa.');
    }
  }, []);
  manejarSilencioRef.current = manejarSilencio;

  // escucharGuardar: deps [] porque llama finalizarGuardado y cancelar via refs
  const escucharGuardar = useCallback(() => {
    if (!activoRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { finalizarGuardadoRef.current?.(); return; }

    const recognition = new SR();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    setEscuchando(true);

    recognition.onresult = (event) => {
      setEscuchando(false);
      const t = event.results[0][0].transcript.toLowerCase();
      if (['sí', 'si', 'guardar', 'guarda', 'listo', 'ok', 'dale', 'ya'].some(c => t.includes(c))) {
        finalizarGuardadoRef.current?.();
      } else if (['no', 'cancelar', 'cancela'].some(c => t.includes(c))) {
        cancelarRef.current?.();
      } else {
        finalizarGuardadoRef.current?.();
      }
    };
    recognition.onerror = () => { setEscuchando(false); finalizarGuardadoRef.current?.(); };
    recognition.onnomatch = () => { setEscuchando(false); finalizarGuardadoRef.current?.(); };
    try { recognition.start(); } catch { finalizarGuardadoRef.current?.(); }
  }, []);

  const finalizarGuardado = useCallback(() => {
    const msg = 'Guardado. ¿Otro paciente?';
    setMensajeBot(msg);
    hablar(msg);
    onGuardar && onGuardar({ ...datosRef.current });
    setTimeout(() => {
      setActivo(false);
      activoRef.current = false;
      setCampoActualIdx(0);
      idxRef.current = 0;
      datosRef.current = {};
      setMensajeBot('');
    }, 3000);
  }, [onGuardar]);
  finalizarGuardadoRef.current = finalizarGuardado;

  const cancelar = useCallback(() => {
    detenerRecognition();
    window.speechSynthesis?.cancel();
    hablar('Registro cancelado.');
    setActivo(false);
    activoRef.current = false;
    setPausado(false);
    pausadoRef.current = false;
    setEscuchando(false);
    setProcesando(false);
    setCampoActualIdx(0);
    idxRef.current = 0;
    datosRef.current = {};
    setMensajeBot('');
    onDatosActualizados && onDatosActualizados({});
  }, [detenerRecognition, onDatosActualizados]);
  cancelarRef.current = cancelar;

  const iniciar = useCallback(() => {
    datosRef.current = { ...datosIniciales };
    activoRef.current = true;
    pausadoRef.current = false;
    setActivo(true);
    setPausado(false);
    setCampoActualIdx(0);
    idxRef.current = 0;
    intentosRef.current = 0;

    const campos = camposRef.current;
    let primerVacio = 0;
    while (primerVacio < campos.length && datosRef.current[campos[primerVacio]?.key]) {
      primerVacio++;
    }

    const primerCampo = campos[primerVacio];
    const msg = primerCampo
      ? `Comenzamos. ${primerCampo.label}...`
      : '¿Guardamos?';
    setMensajeBot(msg);
    hablar(`Hola Licenciada Janeth, comenzamos. ${primerCampo?.label || ''}`);
    setTimeout(() => escucharCampo(primerVacio), 3000);
  }, [datosIniciales, escucharCampo]);

  const reanudar = useCallback(() => {
    pausadoRef.current = false;
    setPausado(false);
    const idx = idxRef.current;
    const campo = camposRef.current[idx];
    const msg = `Continuamos... ${campo?.label || '¿Guardamos?'}`;
    setMensajeBot(msg);
    hablar(msg);
    setTimeout(() => {
      if (idx >= camposRef.current.length) {
        escucharGuardar();
      } else {
        iniciarReconocimientoRef.current?.(idx);
      }
    }, 1800);
  }, [escucharGuardar]);

  const toggle = useCallback(() => {
    if (!activo) {
      iniciar();
    } else if (pausado) {
      reanudar();
    } else {
      detenerRecognition();
      window.speechSynthesis?.cancel();
      setPausado(true);
      pausadoRef.current = true;
      setEscuchando(false);
      setMensajeBot('Pausado. Presiona el botón para continuar.');
      hablar('Pausado.');
    }
  }, [activo, pausado, iniciar, reanudar, detenerRecognition]);

  const detener = useCallback(() => cancelar(), [cancelar]);

  return {
    activo, pausado, escuchando, procesando,
    campoActual: campoActualIdx,
    mensajeBot,
    toggle, iniciar, reanudar, detener,
    campo: (camposVisibles || [])[campoActualIdx],
  };
}
