/**
 * Textos FIJOS de la interfaz del sitio (títulos de secciones, botones, opciones).
 *
 * Los DATOS DEL NEGOCIO (nombre, contacto, dirección, servicios, fotos, testimonios,
 * preguntas frecuentes, etc.) ya no están aquí: se editan desde el panel en
 * /admin/sitio y se guardan en la base de datos, sin volver a desplegar.
 */
export const siteConfig = {
  idioma: "es-CL",

  hero: {
    textoWhatsapp: "Escríbenos por WhatsApp",
    textoFormulario: "Solicitar información",
  },

  titulos: {
    nosotros: "Quiénes somos",
    servicios: "Nuestros servicios",
    instalaciones: "Nuestras instalaciones",
    porQueElegirnos: "Por qué elegirnos",
    testimonios: "Lo que dicen las familias",
    preguntas: "Preguntas frecuentes",
    contacto: "Solicita información",
    ubicacion: "Ubicación y horario de visitas",
  },

  contacto: {
    introduccion:
      "Déjanos tus datos y te contactaremos a la brevedad. Si prefieres, escríbenos directamente por WhatsApp.",
    /** Opciones del campo "parentesco" (opcional) del formulario. */
    parentescos: ["Hijo o hija", "Nieto o nieta", "Cónyuge o pareja", "Otro familiar", "Otro"],
  },
} as const;
