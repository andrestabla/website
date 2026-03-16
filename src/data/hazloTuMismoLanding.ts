const LANDING_PATH = '/hazlo-tu-mismo'

export const hazloTuMismoLandingPageConfig = {
  id: 'hazlo-tu-mismo',
  title: 'Hazlo tú mismo(a): webinar y metodología para automatizar procesos con no-code e IA',
  path: LANDING_PATH,
  description:
    'Landing de invitación al webinar Hazlo tú mismo(a): conoce la metodología, analiza casos prácticos y elige entre construir guiado o delegar con AlgoritmoT.',
  category: 'marketing',
  status: 'published',
  editor: 'marketing',
  template: 'immersive',
  navLabel: 'Hazlo tú mismo(a)',
  showInNavigation: false,
  previewPath: LANDING_PATH,
  accentColor: '#22d3ee',
  notes:
    'Landing tipo embudo para registro de webinar y presentación de la metodología Hazlo tú mismo(a) vs AlgoritmoT lo hace por ti.',
  order: 10,
  locked: false,
} as const

export function createHazloTuMismoLandingBlocks() {
  return [
    {
      id: 'hero',
      type: 'hero',
      name: 'Hero webinar',
      visible: true,
      order: 0,
      content: {
        anchor: 'inicio',
        eyebrow: 'Webinar gratuito en vivo · 24 de marzo de 2026 · 6:00 p. m. COT',
        title: 'Convierte tus procesos manuales en sistemas útiles con no-code e IA',
        subtitle:
          'Descubre la metodología paso a paso, analiza 5 casos prácticos y detecta qué podrías construir hoy mismo en tu negocio, tu trabajo o tu proyecto personal.',
        body:
          'Este webinar es la puerta de entrada a la metodología. Vas a salir con claridad para elegir entre construir guiado o delegar la ejecución completa.',
        primaryLabel: 'Quiero registrarme y empezar a construir',
        primaryHref: '#inscripcion',
        secondaryLabel: 'Ver la metodología',
        secondaryHref: '#metodologia',
      },
      style: {
        backgroundColor: '#060b1a',
        backgroundGradient:
          'radial-gradient(circle at 82% 18%, rgba(34,211,238,0.14), transparent 24%), radial-gradient(circle at 12% 10%, rgba(99,102,241,0.18), transparent 22%), linear-gradient(180deg, #050816 0%, #0a1024 56%, #0b1328 100%)',
        textColor: '#f8fafc',
        align: 'left',
        paddingY: '6rem',
      },
    },
    {
      id: 'tension',
      type: 'text',
      name: 'Tensión principal',
      visible: true,
      order: 1,
      content: {
        anchor: 'tension',
        eyebrow: 'La paradoja actual',
        title: 'Si las herramientas existen, ¿por qué todavía sigues resolviendo todo a mano?',
        body:
          'Porque la mayoría de personas y empresas no necesitan más herramientas. Necesitan una ruta clara para priorizar, combinar y aterrizar lo que ya existe a un caso real. El problema no suele ser técnico. Suele ser metodológico.',
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4.75rem',
      },
    },
    {
      id: 'bloqueos',
      type: 'feature-list',
      name: 'Bloqueos frecuentes',
      visible: true,
      order: 2,
      content: {
        anchor: 'bloqueos',
        eyebrow: 'Lo que frena el avance',
        title: '¿Te suena familiar alguno de estos obstáculos?',
        body: 'Si te identificas con varios de estos puntos, el webinar te va a ayudar a salir de la parálisis con una ruta aplicable.',
        items: [
          'Exceso de teoría: consumes mucho contenido, pero construyes poco.',
          'Parálisis por análisis: demasiadas herramientas y poca claridad para elegir.',
          'Dependencia: sigues atado a terceros para tareas que ya podrías iniciar tú.',
          'Fuga de tiempo: procesos manuales que consumen horas valiosas del equipo.',
          'Incertidumbre: no tienes visibilidad del resultado antes de invertir más dinero.',
        ],
      },
      style: {
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'metodologia',
      type: 'feature-list',
      name: 'Puente metodológico',
      visible: true,
      order: 3,
      content: {
        anchor: 'metodologia',
        eyebrow: 'Cambio de paradigma',
        title: 'No vienes a consumir contenido. Vienes a construir algo útil con acompañamiento.',
        body:
          'Hazlo tú mismo(a) es una metodología guiada para convertir una necesidad concreta en una automatización, un flujo operativo o un producto digital liviano. El webinar es la sesión de entrada para entender y activar el método.',
        items: [
          'Verás cómo funciona la metodología en la práctica.',
          'Analizaremos 5 casos de uso reales con lógica de ejecución.',
          'Identificarás por dónde empezar sin fricción ni sobrecarga técnica.',
        ],
      },
      style: {
        backgroundColor: '#0b1328',
        backgroundGradient:
          'linear-gradient(150deg, rgba(7,11,28,0.98) 0%, rgba(10,16,34,0.96) 100%)',
        textColor: '#f8fafc',
        align: 'left',
        columns: '1',
        paddingY: '4.75rem',
      },
    },
    {
      id: 'rutas',
      type: 'grid',
      name: 'Rutas de ejecución',
      visible: true,
      order: 4,
      content: {
        anchor: 'rutas',
        eyebrow: 'Dos caminos posibles',
        title: 'Elige la ruta que mejor se ajusta a tu contexto',
        body:
          'Durante el webinar entenderás cuándo conviene construir contigo y cuándo conviene delegar la ejecución para acelerar resultados.',
        items: [
          {
            eyebrow: 'Ruta 1',
            icon: 'rocket',
            title: 'Hazlo tú mismo(a)',
            body:
              'Construyes con sesiones guiadas sobre tu caso real, con criterio técnico y enfoque de resultados.',
            label: 'Quiero esta ruta',
            url: '#inscripcion',
          },
          {
            eyebrow: 'Ruta 2',
            icon: 'building2',
            title: 'AlgoritmoT lo hace por ti',
            body:
              'Nuestro equipo define, implementa y entrega la solución funcional con acompañamiento estratégico.',
            label: 'Quiero esta ruta',
            url: '#inscripcion',
          },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'autoridad',
      type: 'grid',
      name: 'Autoridad y logística',
      visible: true,
      order: 5,
      content: {
        anchor: 'detalles',
        eyebrow: 'Quién te guía y cuándo',
        title: 'Una sesión clara, aplicada y orientada a resultados',
        body: 'Con facilitación de ProfeTabla y enfoque práctico para transformar una necesidad real en un sistema útil.',
        items: [
          {
            eyebrow: 'Facilitador',
            icon: 'userround',
            title: 'ProfeTabla',
            body:
              'Acompaño a personas y equipos a sistematizar procesos con IA y no-code, pasando de la idea a soluciones funcionales con impacto medible.',
            imageUrl: '/assets/landing/tuprofe-mockup.png',
          },
          {
            eyebrow: 'Detalles del webinar',
            icon: 'clock3',
            title: '24 de marzo de 2026 · 6:00 p. m. COT',
            body:
              'Duración estimada: 90 minutos. Incluye explicación metodológica, análisis de casos y guía para decidir la ruta más conveniente.',
            label: 'Reservar mi lugar',
            url: '#inscripcion',
          },
        ],
      },
      style: {
        backgroundColor: '#f8fafc',
        textColor: '#0f172a',
        align: 'left',
        columns: '2',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'faq-caso',
      type: 'accordion',
      name: 'Preguntas frecuentes',
      visible: true,
      order: 6,
      content: {
        anchor: 'faq',
        eyebrow: 'Preguntas frecuentes',
        title: 'Resolvamos dudas antes de registrarte',
        items: [
          {
            title: '¿Necesito saber programar?',
            body:
              'No. El enfoque del webinar y de la metodología es no-code, con criterio operativo y apoyo profesional.',
          },
          {
            title: '¿Me van a vender algo durante el webinar?',
            body:
              'La sesión es de valor práctico. Al cierre te mostraremos opciones para seguir trabajando juntos si decides aplicar la metodología completa.',
          },
          {
            title: '¿Quedará grabado?',
            body:
              'Compartiremos el material clave con las personas registradas. El acceso completo se define según la dinámica de la cohorte.',
          },
          {
            title: '¿Qué pasa después de registrarme?',
            body:
              'Recibirás confirmación por correo, recordatorio previo y recomendaciones para llegar con un caso listo para trabajar.',
          },
        ],
      },
      style: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        align: 'left',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'contacto',
      type: 'form',
      name: 'Registro webinar',
      visible: true,
      order: 7,
      content: {
        anchor: 'inscripcion',
        title: 'Reserva tu lugar gratis',
        body:
          'Haz clic y completa un registro rápido. Te enviaremos acceso al webinar y guía inicial para preparar tu caso.',
        serviceSlug: 'hazlo-tu-mismo-webinar',
        context: 'webinar_hazlo_tu_mismo',
        nameLabel: 'Nombre',
        namePlaceholder: 'Tu nombre',
        emailLabel: 'Correo electrónico',
        emailPlaceholder: 'tu@correo.com',
        requirementLabel: 'Reto principal',
        requirementPlaceholder: '¿Qué te gustaría automatizar primero?',
        submitLabel: 'Reservar mi lugar',
        successTitle: 'Registro completado',
        successMessage:
          'Te enviaremos acceso y recordatorio para el webinar del martes 24 de marzo de 2026.',
        resetLabel: 'Registrar otro correo',
      },
      style: {
        backgroundColor: '#0a1024',
        backgroundGradient:
          'radial-gradient(circle at 14% 20%, rgba(34,211,238,0.1), transparent 26%), linear-gradient(180deg, #060b1a 0%, #0a1024 100%)',
        textColor: '#f8fafc',
        align: 'left',
        paddingY: '4.5rem',
      },
    },
    {
      id: 'cta-final',
      type: 'cta',
      name: 'Cierre final',
      visible: true,
      order: 8,
      content: {
        anchor: 'cierre',
        eyebrow: 'Último paso',
        title: 'Empieza con el webinar. Sigue con una ruta real de ejecución.',
        body:
          'Si ya sabes qué quieres construir, te ayudamos a definir el camino más corto para lograrlo.',
        primaryLabel: 'Hablar con un asesor',
        primaryHref: 'https://wa.me/573044544525',
      },
      style: {
        backgroundColor: '#060b1a',
        backgroundGradient:
          'linear-gradient(135deg, rgba(8,12,29,0.98) 0%, rgba(10,16,34,0.94) 100%)',
        textColor: '#f8fafc',
        align: 'center',
        paddingY: '4rem',
      },
    },
  ]
}
