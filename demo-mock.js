/* =====================================================
   ANDES CONSTRUCCIONES — MOCK DE BACKEND PARA LA DEMO
   Intercepta cualquier fetch al Apps Script (URL que
   contenga "script.google.com" o el dominio DEMO) y
   responde con datos ficticios en memoria, sin tocar
   ningún servidor real. Los cambios (crear/eliminar
   anuncios, eventos, etc.) viven solo durante la sesión
   del navegador: al recargar la página, todo vuelve al
   estado inicial.
   ===================================================== */
(function () {
  const ORIG_FETCH = window.fetch.bind(window);

  function hoyISO(offsetDias) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDias || 0));
    return d.toISOString().substring(0, 10);
  }

  const store = {
    usuarios: [
      { nombre: 'martin', pin: '1234', rol: 'empleado', empleadoNombre: 'Martín Pérez', celular: '2995551234' },
      { nombre: 'diego',  pin: '1234', rol: 'empleado', empleadoNombre: 'Diego Soto',   celular: '2995555678' },
    ],
    anuncios: [
      {
        id: 'ANC-DEMO-1', titulo: '🦺 Uso obligatorio de EPP',
        mensaje: 'Recordamos que en todas las obras es obligatorio el uso de casco, chaleco y botines de seguridad durante toda la jornada.',
        destinatarios: 'todos', fecha: hoyISO(-2) + ' 09:00', autor: 'Admin', vigencia: hoyISO(20),
      },
      {
        id: 'ANC-DEMO-2', titulo: '📌 Corte de calle — Obra Centro',
        mensaje: 'El viernes habrá corte parcial de calle por trabajos de hormigonado. Coordinar ingreso de materiales con el capataz.',
        destinatarios: 'todos', fecha: hoyISO(-1) + ' 14:30', autor: 'Admin', vigencia: hoyISO(2),
      },
    ],
    eventos: [
      {
        id: 'EVT-DEMO-1', titulo: 'Capacitación de seguridad', fecha: hoyISO(3), fecha_fin: hoyISO(3),
        descripcion: 'Charla obligatoria sobre trabajo en altura, a cargo del responsable de higiene y seguridad.',
        destinatarios: 'todos', autor: 'Admin', tipo: '',
      },
    ],
    solicitudesVac: [
      {
        id: 'VAC-DEMO-1', empleado: 'Diego Soto', fecha_desde: hoyISO(10), fecha_hasta: hoyISO(15),
        estado: 'pendiente', dias: 5, nota_admin: '',
      },
    ],
    config: { email_admin: '', emails_contactos: '[]' },
  };

  function jsonRes(obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
  }

  function parseDatos(u) {
    try { return JSON.parse(decodeURIComponent(u.searchParams.get('datos') || '{}')); }
    catch (e) { return {}; }
  }

  function nuevoId(prefijo) { return prefijo + '-' + Date.now(); }

  function handle(accion, u) {
    switch (accion) {
      case 'horarios':
        // DEMO_DATA la define app.js (cargado después de este script) con `const`;
        // para cuando se dispara este fetch esa declaración ya se ejecutó, y al
        // compartir todos los <script> el mismo scope global podemos referenciarla.
        return jsonRes({ ok: true, data: (typeof DEMO_DATA !== 'undefined' ? DEMO_DATA : []) });

      case 'cargar_usuarios':
        return jsonRes({ ok: true, usuarios: store.usuarios });

      case 'perfiles': {
        // Perfiles demo: empresa + tipo de jornada por empleado (derivados de DEMO_DATA)
        const empresas = ['Andes Construcciones', 'Andes Servicios'];
        const cats = ['JC', 'MJ', 'FR'];
        const nombres = (typeof DEMO_DATA !== 'undefined')
          ? Array.from(new Set(DEMO_DATA.map(r => r.EMPLEADO)))
          : [];
        const empleados = nombres.map((nombre, i) => ({
          nombre,
          empresa: empresas[i % empresas.length],
          categoria_id: cats[i % cats.length],
        }));
        return jsonRes({ ok: true, empleados, categorias: [] });
      }

      case 'cargar_certificados':
        return jsonRes({ ok: true, certificados: [] });

      case 'get_config':
        return jsonRes({ ok: true, config: store.config });
      case 'guardar_config':
        store.config[u.searchParams.get('clave')] = u.searchParams.get('valor') || '';
        return jsonRes({ ok: true });

      case 'get_anuncios':
        return jsonRes({ ok: true, anuncios: store.anuncios });
      case 'guardar_anuncio': {
        const d = parseDatos(u);
        const id = nuevoId('ANC');
        store.anuncios.push({
          id, titulo: d.titulo || '', mensaje: d.mensaje || '',
          destinatarios: Array.isArray(d.destinatarios) && d.destinatarios.length ? JSON.stringify(d.destinatarios) : 'todos',
          fecha: hoyISO() + ' ' + new Date().toTimeString().substring(0, 5),
          autor: 'Admin', vigencia: d.vigencia || '',
        });
        return jsonRes({ ok: true, id });
      }
      case 'eliminar_anuncio': {
        const id = u.searchParams.get('id');
        store.anuncios = store.anuncios.filter(a => a.id !== id);
        return jsonRes({ ok: true });
      }

      case 'get_eventos':
        return jsonRes({ ok: true, eventos: store.eventos });
      case 'guardar_evento': {
        const d = parseDatos(u);
        const id = nuevoId('EVT');
        store.eventos.push({
          id, titulo: d.titulo || '', fecha: d.fecha || hoyISO(),
          fecha_fin: d.fecha_fin || d.fecha || hoyISO(),
          descripcion: d.descripcion || '',
          destinatarios: d.destinatarios || d.destinatario || 'todos',
          autor: 'Admin', tipo: d.tipo || '',
        });
        return jsonRes({ ok: true, id });
      }
      case 'eliminar_evento': {
        const id = u.searchParams.get('id');
        store.eventos = store.eventos.filter(e => e.id !== id);
        return jsonRes({ ok: true });
      }

      case 'get_vacaciones':
        return jsonRes({ ok: true, vacaciones: [] });
      case 'get_solicitudes_vac':
        return jsonRes({ ok: true, solicitudes: store.solicitudesVac });
      case 'responder_solicitud': {
        const id = u.searchParams.get('id');
        const estado = u.searchParams.get('estado');
        const sol = store.solicitudesVac.find(s => s.id === id);
        if (sol) sol.estado = estado;
        return jsonRes({ ok: true });
      }
      case 'ajustar_vac':
      case 'inicializar_vac':
      case 'guardar_perfil':
      case 'guardar_categoria':
        return jsonRes({ ok: true });

      default:
        return jsonRes({ ok: true });
    }
  }

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('script.google.com') === -1 && url.indexOf('DEMO-ANDES') === -1) {
      return ORIG_FETCH(input, init);
    }
    let u;
    try { u = new URL(url); } catch (e) { return ORIG_FETCH(input, init); }
    const accion = u.searchParams.get('accion');
    return handle(accion, u);
  };
})();
