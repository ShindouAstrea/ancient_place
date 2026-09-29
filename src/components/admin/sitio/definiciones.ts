import type { TipoLista } from "@/types/contenido";

/** Definición (serializable) de un campo de los formularios del módulo Sitio web. */
export type CampoEditable = {
  nombre: string;
  etiqueta: string;
  tipo?: "texto" | "area" | "email" | "tel" | "url" | "icono" | "horario";
  ayuda?: string;
  maximo?: number;
  requerido?: boolean;
  placeholder?: string;
  filas?: number;
  /** Ocupa media fila en pantallas medianas (para campos cortos). */
  medio?: boolean;
};

export type SeccionEditable = {
  clave: string;
  titulo: string;
  descripcion?: string;
  campos: CampoEditable[];
};

/** Secciones de "Información del sitio" (cada una se guarda por separado). */
export const SECCIONES_INFORMACION: SeccionEditable[] = [
  {
    clave: "hogar",
    titulo: "Datos del hogar",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre del hogar", requerido: true, maximo: 100 },
      {
        nombre: "descripcion_corta",
        etiqueta: "Descripción breve",
        tipo: "area",
        filas: 2,
        maximo: 300,
        ayuda: "Aparece en el pie de página y en Google, debajo del nombre.",
      },
    ],
  },
  {
    clave: "contacto",
    titulo: "Contacto",
    descripcion: "Si dejas un dato vacío, el botón correspondiente no se muestra en el sitio.",
    campos: [
      {
        nombre: "whatsapp",
        etiqueta: "Número de WhatsApp",
        tipo: "tel",
        placeholder: "+56 9 1234 5678",
        medio: true,
      },
      {
        nombre: "telefono",
        etiqueta: "Teléfono para llamadas",
        tipo: "tel",
        placeholder: "+56 9 1234 5678",
        medio: true,
      },
      {
        nombre: "mensaje_whatsapp",
        etiqueta: "Mensaje de WhatsApp prellenado",
        tipo: "area",
        filas: 2,
        maximo: 500,
        ayuda: "Texto que aparece escrito cuando alguien toca «Escríbenos por WhatsApp».",
      },
      { nombre: "email_contacto", etiqueta: "Correo de contacto", tipo: "email", maximo: 254 },
    ],
  },
  {
    clave: "avisos",
    titulo: "Avisos por correo de nuevos contactos",
    descripcion:
      "Cada vez que alguien llena el formulario te llega un aviso (requiere la clave de Resend en el servidor).",
    campos: [
      {
        nombre: "email_notificaciones",
        etiqueta: "Correo que recibe los avisos",
        tipo: "email",
        maximo: 254,
      },
      {
        nombre: "email_remitente",
        etiqueta: "Remitente",
        maximo: 200,
        placeholder: "Sitio web <no-responder@tudominio.cl>",
        ayuda:
          "Debe ser de un dominio verificado en Resend. Mientras no tengas uno, usa «Sitio web <onboarding@resend.dev>» (solo envía al correo de tu cuenta de Resend).",
      },
    ],
  },
  {
    clave: "ubicacion",
    titulo: "Ubicación y horario de visitas",
    campos: [
      { nombre: "direccion", etiqueta: "Dirección", maximo: 200 },
      { nombre: "ciudad", etiqueta: "Ciudad o comuna", maximo: 100, medio: true },
      { nombre: "region", etiqueta: "Región", maximo: 100, medio: true },
      {
        nombre: "horario_tramos",
        etiqueta: "Días y horas de visita",
        tipo: "horario",
        ayuda:
          "Marca los días y las horas. Así se muestra en el sitio y Google lo entiende. Usa otro tramo si hay horarios distintos (ej: fines de semana).",
      },
      {
        nombre: "horario_visitas",
        etiqueta: "Aclaraciones del horario",
        tipo: "area",
        filas: 2,
        maximo: 300,
        placeholder: "Festivos, con aviso previo.",
        ayuda: "Se muestra bajo los días y horas.",
      },
      {
        nombre: "maps_embed_url",
        etiqueta: "Mapa (código para insertar de Google Maps)",
        tipo: "area",
        filas: 3,
        maximo: 2000,
        ayuda:
          "En Google Maps busca la dirección → Compartir → «Insertar un mapa» → Copiar HTML, y pégalo aquí completo.",
      },
      {
        nombre: "maps_url",
        etiqueta: "Enlace «Cómo llegar»",
        tipo: "url",
        maximo: 500,
        ayuda: "En Google Maps → Compartir → «Copiar vínculo».",
      },
    ],
  },
  {
    clave: "portada",
    titulo: "Portada",
    descripcion: "La foto de portada se cambia en Fotos.",
    campos: [
      { nombre: "hero_titulo", etiqueta: "Título principal", requerido: true, maximo: 150 },
      { nombre: "hero_subtitulo", etiqueta: "Subtítulo", tipo: "area", filas: 2, maximo: 300 },
    ],
  },
  {
    clave: "nosotros",
    titulo: "Quiénes somos",
    campos: [
      {
        nombre: "nosotros_texto",
        etiqueta: "Texto",
        tipo: "area",
        filas: 6,
        maximo: 3000,
        ayuda: "Deja una línea en blanco para separar párrafos.",
      },
      ...([1, 2, 3, 4] as const).flatMap((n) => [
        {
          nombre: `destacado_valor_${n}`,
          etiqueta: `Dato destacado ${n}: cifra`,
          maximo: 20,
          medio: true,
          placeholder: n === 1 ? "15" : undefined,
        },
        {
          nombre: `destacado_etiqueta_${n}`,
          etiqueta: `Dato destacado ${n}: descripción`,
          maximo: 60,
          medio: true,
          placeholder: n === 1 ? "años de experiencia" : undefined,
        },
      ]),
    ],
  },
  {
    clave: "textos",
    titulo: "Textos de introducción",
    campos: [
      {
        nombre: "servicios_intro",
        etiqueta: "Introducción de «Nuestros servicios»",
        tipo: "area",
        filas: 2,
        maximo: 300,
      },
      {
        nombre: "instalaciones_intro",
        etiqueta: "Introducción de «Nuestras instalaciones»",
        tipo: "area",
        filas: 2,
        maximo: 300,
      },
    ],
  },
  {
    clave: "privacidad",
    titulo: "Política de privacidad",
    descripcion: "Datos que aparecen en la página /privacidad. El texto debe revisarlo un abogado.",
    campos: [
      { nombre: "razon_social", etiqueta: "Razón social", maximo: 150, medio: true },
      { nombre: "rut", etiqueta: "RUT", maximo: 20, medio: true, placeholder: "76.123.456-7" },
      {
        nombre: "email_privacidad",
        etiqueta: "Correo para consultas de privacidad",
        tipo: "email",
        maximo: 254,
      },
      {
        nombre: "plazo_conservacion",
        etiqueta: "Plazo de conservación de los datos",
        maximo: 200,
        placeholder: "12 meses desde el último contacto",
      },
      {
        nombre: "plazo_respuesta",
        etiqueta: "Plazo de respuesta a solicitudes",
        maximo: 200,
      },
      {
        nombre: "fecha_privacidad",
        etiqueta: "Fecha de última actualización",
        maximo: 50,
        medio: true,
        placeholder: "1 de octubre de 2026",
      },
    ],
  },
];

/** Listas editables: textos del panel y sus campos. */
export const DEFINICIONES_LISTA: Record<
  TipoLista,
  {
    titulo: string;
    descripcion: string;
    singular: string;
    textoAgregar: string;
    campoTitulo: string;
    campoDetalle: string;
    campos: CampoEditable[];
    aviso?: string;
  }
> = {
  servicios: {
    titulo: "Servicios",
    descripcion:
      "Tarjetas de la sección «Nuestros servicios». Si no hay ninguno, la sección no se muestra.",
    singular: "servicio",
    textoAgregar: "Agregar servicio",
    campoTitulo: "titulo",
    campoDetalle: "descripcion",
    campos: [
      { nombre: "titulo", etiqueta: "Nombre del servicio", requerido: true, maximo: 100 },
      { nombre: "descripcion", etiqueta: "Descripción", tipo: "area", filas: 3, maximo: 500 },
      { nombre: "icono", etiqueta: "Ícono", tipo: "icono", requerido: true },
    ],
  },
  razones: {
    titulo: "Por qué elegirnos",
    descripcion: "Razones que distinguen al hogar. Si no hay ninguna, la sección no se muestra.",
    singular: "razón",
    textoAgregar: "Agregar razón",
    campoTitulo: "titulo",
    campoDetalle: "descripcion",
    campos: [
      { nombre: "titulo", etiqueta: "Título", requerido: true, maximo: 100 },
      { nombre: "descripcion", etiqueta: "Detalle", tipo: "area", filas: 3, maximo: 500 },
      { nombre: "icono", etiqueta: "Ícono", tipo: "icono", requerido: true },
    ],
  },
  testimonios: {
    titulo: "Testimonios",
    descripcion: "Opiniones de familias. Si no hay ninguno, la sección no se muestra.",
    singular: "testimonio",
    textoAgregar: "Agregar testimonio",
    campoTitulo: "autor",
    campoDetalle: "texto",
    aviso:
      "Publica solo testimonios reales y con autorización escrita de quien los entrega: inventarlos puede constituir publicidad engañosa.",
    campos: [
      {
        nombre: "texto",
        etiqueta: "Testimonio",
        tipo: "area",
        filas: 4,
        requerido: true,
        maximo: 800,
      },
      {
        nombre: "autor",
        etiqueta: "Nombre o iniciales",
        requerido: true,
        maximo: 100,
        medio: true,
        placeholder: "M. S.",
      },
      {
        nombre: "relacion",
        etiqueta: "Relación con el residente",
        maximo: 100,
        medio: true,
        placeholder: "hija de residente",
      },
    ],
  },
  preguntas: {
    titulo: "Preguntas frecuentes",
    descripcion: "Preguntas y respuestas del sitio. Si no hay ninguna, la sección no se muestra.",
    singular: "pregunta",
    textoAgregar: "Agregar pregunta",
    campoTitulo: "pregunta",
    campoDetalle: "respuesta",
    campos: [
      { nombre: "pregunta", etiqueta: "Pregunta", requerido: true, maximo: 200 },
      {
        nombre: "respuesta",
        etiqueta: "Respuesta",
        tipo: "area",
        filas: 4,
        requerido: true,
        maximo: 2000,
      },
    ],
  },
};
