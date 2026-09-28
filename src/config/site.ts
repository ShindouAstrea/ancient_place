/**
 * ÚNICA fuente de datos y textos del negocio.
 *
 * Todo texto o dato que dependa del hogar (nombre, contacto, dirección, servicios,
 * preguntas frecuentes…) se edita aquí, sin tocar componentes.
 *
 * Los valores entre corchetes, por ejemplo "[NOMBRE DEL HOGAR]", son MARCADORES
 * PENDIENTES: deben reemplazarse con la información real antes de publicar.
 * En producción el servidor emite una advertencia al iniciar si queda alguno
 * (ver `camposPendientes()` al final del archivo).
 */

/** Íconos disponibles (lucide-react). Para agregar uno, súmalo también en `components/ui/icono.tsx`. */
export type NombreIcono =
  | "HeartHandshake"
  | "Stethoscope"
  | "Utensils"
  | "Activity"
  | "Palette"
  | "ShieldCheck"
  | "Users"
  | "House"
  | "HeartPulse"
  | "Leaf"
  | "Sun"
  | "Sparkles";

export type Servicio = { titulo: string; descripcion: string; icono: NombreIcono };
export type Razon = { titulo: string; descripcion: string; icono: NombreIcono };
export type Foto = {
  /** Ruta dentro de /public. Reemplazar los .svg de ejemplo por fotos reales (.jpg/.webp). */
  src: string;
  /** Texto alternativo: describe la foto para personas que usan lector de pantalla. */
  alt: string;
  ancho: number;
  alto: number;
};
export type Testimonio = { texto: string; autor: string; relacion: string };
export type PreguntaFrecuente = { pregunta: string; respuesta: string };

export const siteConfig = {
  nombre: "[NOMBRE DEL HOGAR]",
  descripcionCorta:
    "[DESCRIPCIÓN BREVE DEL HOGAR, ej: Hogar de reposo para adultos mayores con cuidado 24/7]",

  /** Dominio de producción, sin protocolo. La URL completa se lee de NEXT_PUBLIC_SITE_URL. */
  dominio: "[dominio.cl]",
  idioma: "es-CL",

  ubicacion: {
    direccion: "[DIRECCIÓN]",
    ciudad: "[CIUDAD]",
    region: "[REGIÓN]",
    pais: "CL",
    /**
     * Google Maps → buscar la dirección → Compartir → "Insertar un mapa" → copiar
     * SOLO el valor del atributo src del iframe (https://www.google.com/maps/embed?pb=...).
     */
    googleMapsEmbedUrl: "[URL EMBED DE GOOGLE MAPS]",
    /** Google Maps → Compartir → "Copiar vínculo". Abre la app de mapas en el teléfono. */
    googleMapsUrl: "[URL DE GOOGLE MAPS]",
  },

  contacto: {
    /** Formato internacional, ej: +56912345678. */
    whatsapp: "[+569XXXXXXXX]",
    /** Número para llamadas (puede ser el mismo del WhatsApp). */
    telefono: "[+569XXXXXXXX]",
    email: "[correo@dominio.cl]",
    mensajeWhatsappPorDefecto:
      "Hola, me gustaría recibir información sobre el hogar de reposo para un familiar.",
  },

  notificaciones: {
    /** Correo que recibe los avisos de nuevos contactos del formulario. */
    destinatario: "[correo-notificaciones@dominio.cl]",
    /**
     * Remitente de los correos. Debe pertenecer a un dominio verificado en Resend,
     * ej: "Sitio web <no-responder@dominio.cl>".
     */
    remitente: "[Sitio web <no-responder@dominio.cl>]",
  },

  horarioVisitas: "[HORARIO DE VISITAS, ej: Lunes a domingo de 10:00 a 18:00]",

  /** Menú principal. Cada `href` apunta al id de una sección de la landing. */
  navegacion: [
    { etiqueta: "Nosotros", href: "/#nosotros" },
    { etiqueta: "Servicios", href: "/#servicios" },
    { etiqueta: "Instalaciones", href: "/#instalaciones" },
    { etiqueta: "Preguntas", href: "/#preguntas" },
    { etiqueta: "Ubicación", href: "/#ubicacion" },
  ],

  hero: {
    titulo: "Cuidamos a quienes más quieres, como parte de nuestra familia",
    subtitulo:
      "[SUBTÍTULO: una frase sobre la propuesta del hogar, ej: Atención profesional las 24 horas en un ambiente tranquilo, cálido y seguro en CIUDAD.]",
    textoWhatsapp: "Escríbenos por WhatsApp",
    textoFormulario: "Solicitar información",
    imagen: {
      src: "/images/placeholder-hero.svg",
      alt: "[Describir la foto principal, ej: Residente conversando con una cuidadora en el jardín]",
      ancho: 1200,
      alto: 900,
    } satisfies Foto,
  },

  nosotros: {
    titulo: "Quiénes somos",
    parrafos: [
      "[PÁRRAFO 1: historia del hogar, desde cuándo funciona y quiénes lo dirigen.]",
      "[PÁRRAFO 2: forma de trabajo y valores, ej: trato respetuoso, atención personalizada, comunicación permanente con las familias.]",
    ],
    /** Datos destacados (ej: años de experiencia, residentes, profesionales). Solo datos reales. */
    destacados: [
      { valor: "[N]", etiqueta: "[años de experiencia]" },
      { valor: "[N]", etiqueta: "[residentes]" },
      { valor: "24/7", etiqueta: "[atención y supervisión]" },
    ],
  },

  servicios: {
    titulo: "Nuestros servicios",
    introduccion: "[Frase breve que presente los servicios.]",
    lista: [
      {
        titulo: "[Cuidado 24/7]",
        descripcion: "[Descripción del servicio]",
        icono: "HeartHandshake",
      },
      { titulo: "[Enfermería]", descripcion: "[Descripción del servicio]", icono: "Stethoscope" },
      {
        titulo: "[Alimentación supervisada]",
        descripcion: "[Descripción del servicio]",
        icono: "Utensils",
      },
      { titulo: "[Kinesiología]", descripcion: "[Descripción del servicio]", icono: "Activity" },
      {
        titulo: "[Actividades recreativas]",
        descripcion: "[Descripción del servicio]",
        icono: "Palette",
      },
    ] satisfies readonly Servicio[],
  },

  instalaciones: {
    titulo: "Nuestras instalaciones",
    introduccion: "[Frase breve sobre los espacios del hogar.]",
    fotos: [
      {
        src: "/images/placeholder-1.svg",
        alt: "[Describir foto: ej. Habitación con cama clínica y ventana]",
        ancho: 800,
        alto: 600,
      },
      {
        src: "/images/placeholder-2.svg",
        alt: "[Describir foto: ej. Comedor iluminado]",
        ancho: 800,
        alto: 600,
      },
      {
        src: "/images/placeholder-3.svg",
        alt: "[Describir foto: ej. Jardín con bancas]",
        ancho: 800,
        alto: 600,
      },
      {
        src: "/images/placeholder-4.svg",
        alt: "[Describir foto: ej. Sala de estar]",
        ancho: 800,
        alto: 600,
      },
      {
        src: "/images/placeholder-5.svg",
        alt: "[Describir foto: ej. Sala de kinesiología]",
        ancho: 800,
        alto: 600,
      },
      {
        src: "/images/placeholder-6.svg",
        alt: "[Describir foto: ej. Baño adaptado con barras de apoyo]",
        ancho: 800,
        alto: 600,
      },
    ] satisfies readonly Foto[],
  },

  porQueElegirnos: {
    titulo: "Por qué elegirnos",
    razones: [
      {
        titulo: "[Razón 1, ej: Autorización sanitaria vigente]",
        descripcion: "[Detalle, ej: número de resolución de la SEREMI de Salud]",
        icono: "ShieldCheck",
      },
      {
        titulo: "[Razón 2, ej: Equipo profesional]",
        descripcion: "[Detalle del equipo]",
        icono: "Users",
      },
      {
        titulo: "[Razón 3, ej: Ambiente de hogar]",
        descripcion: "[Detalle]",
        icono: "House",
      },
      {
        titulo: "[Razón 4, ej: Comunicación con las familias]",
        descripcion: "[Detalle]",
        icono: "HeartPulse",
      },
    ] satisfies readonly Razon[],
  },

  /**
   * Testimonios. IMPORTANTE: publicar SOLO testimonios reales y con autorización
   * escrita de quien lo entrega. Inventarlos puede constituir publicidad engañosa.
   * Si la lista queda vacía ([]), la sección no se muestra.
   */
  testimonios: {
    titulo: "Lo que dicen las familias",
    lista: [
      {
        texto: "[Testimonio real 1, con autorización de la familia.]",
        autor: "[Nombre o iniciales]",
        relacion: "[ej: hija de residente]",
      },
      {
        texto: "[Testimonio real 2, con autorización de la familia.]",
        autor: "[Nombre o iniciales]",
        relacion: "[ej: nieto de residente]",
      },
    ] satisfies readonly Testimonio[],
  },

  preguntasFrecuentes: {
    titulo: "Preguntas frecuentes",
    lista: [
      {
        pregunta: "¿Cuentan con autorización sanitaria?",
        respuesta:
          "[Respuesta, ej: Sí. Somos un Establecimiento de Larga Estadía para Adultos Mayores (ELEAM) autorizado por la SEREMI de Salud, resolución N° ...]",
      },
      {
        pregunta: "¿Qué incluye la mensualidad?",
        respuesta: "[Respuesta: qué servicios incluye y cuáles tienen costo adicional.]",
      },
      {
        pregunta: "¿Reciben personas con dependencia severa o postradas?",
        respuesta: "[Respuesta: niveles de dependencia que atienden.]",
      },
      {
        pregunta: "¿Cuál es el horario de visitas?",
        respuesta: "[Respuesta con el horario de visitas y si se requiere aviso previo.]",
      },
      {
        pregunta: "¿Cómo es el proceso de ingreso?",
        respuesta: "[Respuesta: visita, evaluación, documentos requeridos, etc.]",
      },
      {
        pregunta: "¿Cómo me mantengo informado sobre mi familiar?",
        respuesta: "[Respuesta: canales y frecuencia de comunicación con las familias.]",
      },
    ] satisfies readonly PreguntaFrecuente[],
  },

  contactoSeccion: {
    titulo: "Solicita información",
    introduccion:
      "Déjanos tus datos y te contactaremos a la brevedad. Si prefieres, escríbenos directamente por WhatsApp.",
    /** Opciones del campo "parentesco" (opcional) del formulario. */
    parentescos: ["Hijo o hija", "Nieto o nieta", "Cónyuge o pareja", "Otro familiar", "Otro"],
  },

  ubicacionSeccion: {
    titulo: "Ubicación y horario de visitas",
  },

  /** Datos usados en la política de privacidad. Deben revisarse con un abogado. */
  legal: {
    razonSocial: "[RAZÓN SOCIAL]",
    rut: "[RUT]",
    /** Correo para ejercer derechos sobre datos personales (puede ser el de contacto). */
    emailPrivacidad: "[privacidad@dominio.cl]",
    plazoConservacionLeads: "[PLAZO, ej: 12 meses desde el último contacto]",
    plazoRespuestaSolicitudes: "[PLAZO LEGAL DE RESPUESTA, a confirmar con abogado]",
    fechaActualizacionPrivacidad: "[FECHA DE ÚLTIMA ACTUALIZACIÓN]",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Devuelve las rutas (ej: "contacto.whatsapp") de los campos que aún contienen
 * un marcador "[...]". Útil para detectar datos pendientes antes de publicar.
 */
export function camposPendientes(valor: unknown = siteConfig, ruta = ""): string[] {
  if (typeof valor === "string") {
    return /^\[.*\]$/s.test(valor.trim()) ? [ruta] : [];
  }
  if (Array.isArray(valor)) {
    return valor.flatMap((item, i) => camposPendientes(item, `${ruta}[${i}]`));
  }
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([clave, v]) =>
      camposPendientes(v, ruta ? `${ruta}.${clave}` : clave),
    );
  }
  return [];
}

/** Indica si un valor sigue siendo un marcador pendiente "[...]". */
export function esPendiente(valor: string): boolean {
  return /^\[.*\]$/s.test(valor.trim());
}
