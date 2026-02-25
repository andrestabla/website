import type { Language } from '../context/LanguageContext'

type UIStrings = {
  nav: {
    services: string
    products: string
    contact: string
  }
  footer: {
    protocols: string
    connection: string
    rights: string
    protocolHuman: string
    protocolAI: string
    protocolMaturity: string
  }
  hero: {
    stats: { stability: string; performance: string; standard: string }
  }
  services: {
    eyebrow: string
    title: string
    subtitle: string
  }
  products: {
    eyebrow: string
    title: string
    subtitle: string
    availabilityPricing: string
    deploySolution: string
  }
  frameworks: {
    eyebrow: string
    subtitle: string
  }
  contact: {
    eyebrow: string
    titlePrefix: string
    titleAccent: string
    labels: {
      officialChannel: string
      hubHq: string
      corporateNetwork: string
      linkedinProtocol: string
    }
  }
  form: {
    labels: {
      id: string
      channel: string
      requirement: string
    }
    placeholders: {
      requirement: string
    }
    successBlurb: string
    submitting: string
    privacy: string
    ssl: string
  }
  servicePage: {
    notFound: string
    backHome: string
    backServices: string
    readyNextStep: string
    methodologyApplied: string
    methodologyBlurb: string
    outcomesEyebrow: string
    outcomesTitle: string
    outcomesSubtitle: string
    variantsEyebrow: string
  }
  productPage: {
    notFound: string
    backHome: string
    backProducts: string
    packagedSolution: string
    warrantyTitle: string
    warrantyBlurb: string
    deploymentSheet: string
    deploymentBullets: string[]
    defaultCta: string
    whyModel: string
  }
}

const UI_COPY: Record<Language, UIStrings> = {
  es: {
    nav: { services: 'Servicios', products: 'Productos', contact: 'Contacto' },
    footer: {
      protocols: 'Protocolos',
      connection: 'Conexión',
      rights: 'Todos los derechos reservados.',
      protocolHuman: 'Ingeniería Humana',
      protocolAI: 'Despliegue IA',
      protocolMaturity: 'Madurez Orgánica',
    },
    hero: { stats: { stability: 'Stability', performance: 'Performance', standard: 'Standard' } },
    services: {
      eyebrow: 'Infrastructure & Operations',
      title: 'Portafolio de Servicios Digitales',
      subtitle: 'Nuestro método sistemático para capturar valor y asegurar la adopción real.',
    },
    products: {
      eyebrow: 'Performance Modules',
      title: 'Performance Modules',
      subtitle: 'Soluciones sistematizadas para resultados predecibles y escalables.',
      availabilityPricing: 'Availability & Pricing',
      deploySolution: 'Deploy Solution',
    },
    frameworks: {
      eyebrow: 'Compliance & Standards',
      subtitle: 'Alineamos cada despliegue con los marcos de trabajo globales más exigentes para garantizar resiliencia y adopción.',
    },
    contact: {
      eyebrow: 'System Access',
      titlePrefix: 'Iniciemos el',
      titleAccent: 'Despliegue',
      labels: {
        officialChannel: 'Official Channel',
        hubHq: 'Hub HQ',
        corporateNetwork: 'Corporate Network',
        linkedinProtocol: 'LinkedIn Protocol',
      },
    },
    form: {
      labels: { id: 'Identificación', channel: 'Canal de Comunicación', requirement: 'Requerimiento Técnico' },
      placeholders: { requirement: '¿En qué fase de tu transformación digital te encuentras?' },
      successBlurb: 'Analizaremos tu solicitud bajo nuestros protocolos de Industria 5.0 y te contactaremos en breve.',
      submitting: 'Sincronizando...',
      privacy: 'Cumplimos con normativas de privacidad GDPR.',
      ssl: 'Tus datos están seguros bajo protocolo SSL.',
    },
    servicePage: {
      notFound: 'Servicio no encontrado',
      backHome: 'Volver al inicio',
      backServices: 'Volver a Servicios',
      readyNextStep: '¿Listo para el siguiente paso?',
      methodologyApplied: 'Metodología Aplicada',
      methodologyBlurb: 'Basado en estándares ISO 9241 y marcos de trabajo NIST AI RMF.',
      outcomesEyebrow: 'Resultados Concretos',
      outcomesTitle: '¿Qué conseguirás exactamente?',
      outcomesSubtitle: 'Cada entregable está diseñado para que puedas tomar decisiones informadas desde el día uno y demostrar el valor internamente.',
      variantsEyebrow: 'Enfoques de Comunicación Estratégica',
    },
    productPage: {
      notFound: 'Producto no encontrado',
      backHome: 'Volver al inicio',
      backProducts: 'Volver a Productos',
      packagedSolution: 'Packaged Solution',
      warrantyTitle: 'Garantía AlgoritmoT',
      warrantyBlurb: 'Todos nuestros productos empaquetados incluyen soporte inicial y aseguramiento de calidad técnica bajo estándares Industry 5.0.',
      deploymentSheet: 'Ficha de Despliegue',
      deploymentBullets: [
        'Entrega Estándar Garantizada',
        'Integración con Ecosistemas Existentes',
        'Manual de Operaciones Incluido',
        'Soporte Premium Opcional'
      ],
      defaultCta: 'Solicitar Ahora',
      whyModel: '¿Por qué elegir este modelo?',
    },
  },
  en: {
    nav: { services: 'Services', products: 'Products', contact: 'Contact' },
    footer: {
      protocols: 'Protocols',
      connection: 'Connect',
      rights: 'All rights reserved.',
      protocolHuman: 'Human Engineering',
      protocolAI: 'AI Deployment',
      protocolMaturity: 'Organic Maturity',
    },
    hero: { stats: { stability: 'Stability', performance: 'Performance', standard: 'Standard' } },
    services: {
      eyebrow: 'Infrastructure & Operations',
      title: 'Digital Services Portfolio',
      subtitle: 'Our systematic method to capture value and ensure real adoption.',
    },
    products: {
      eyebrow: 'Performance Modules',
      title: 'Performance Modules',
      subtitle: 'Systematized solutions for predictable and scalable results.',
      availabilityPricing: 'Availability & Pricing',
      deploySolution: 'Deploy Solution',
    },
    frameworks: {
      eyebrow: 'Compliance & Standards',
      subtitle: 'We align every deployment with the most demanding global frameworks to ensure resilience and adoption.',
    },
    contact: {
      eyebrow: 'System Access',
      titlePrefix: "Let's Start the",
      titleAccent: 'Deployment',
      labels: {
        officialChannel: 'Official Channel',
        hubHq: 'Hub HQ',
        corporateNetwork: 'Corporate Network',
        linkedinProtocol: 'LinkedIn Protocol',
      },
    },
    form: {
      labels: { id: 'Identification', channel: 'Communication Channel', requirement: 'Technical Requirement' },
      placeholders: { requirement: 'What stage of your digital transformation are you currently in?' },
      successBlurb: 'We will review your request under our Industry 5.0 protocols and contact you shortly.',
      submitting: 'Syncing...',
      privacy: 'We comply with GDPR privacy regulations.',
      ssl: 'Your data is protected under SSL protocol.',
    },
    servicePage: {
      notFound: 'Service not found',
      backHome: 'Back to home',
      backServices: 'Back to Services',
      readyNextStep: 'Ready for the next step?',
      methodologyApplied: 'Applied Methodology',
      methodologyBlurb: 'Based on ISO 9241 standards and NIST AI RMF frameworks.',
      outcomesEyebrow: 'Concrete Outcomes',
      outcomesTitle: 'What exactly will you get?',
      outcomesSubtitle: 'Each deliverable is designed so you can make informed decisions from day one and demonstrate value internally.',
      variantsEyebrow: 'Strategic Communication Angles',
    },
    productPage: {
      notFound: 'Product not found',
      backHome: 'Back to home',
      backProducts: 'Back to Products',
      packagedSolution: 'Packaged Solution',
      warrantyTitle: 'AlgoritmoT Warranty',
      warrantyBlurb: 'All our packaged products include initial support and technical quality assurance under Industry 5.0 standards.',
      deploymentSheet: 'Deployment Sheet',
      deploymentBullets: [
        'Guaranteed Standard Delivery',
        'Integration with Existing Ecosystems',
        'Operations Manual Included',
        'Optional Premium Support'
      ],
      defaultCta: 'Request Now',
      whyModel: 'Why choose this model?',
    },
  },
  fr: {
    nav: { services: 'Services', products: 'Produits', contact: 'Contact' },
    footer: {
      protocols: 'Protocoles',
      connection: 'Connexion',
      rights: 'Tous droits réservés.',
      protocolHuman: 'Ingénierie Humaine',
      protocolAI: "Déploiement IA",
      protocolMaturity: 'Maturité Organique',
    },
    hero: { stats: { stability: 'Stabilité', performance: 'Performance', standard: 'Norme' } },
    services: {
      eyebrow: 'Infrastructure & Operations',
      title: 'Portefeuille de Services Numériques',
      subtitle: "Notre méthode systématique pour capturer de la valeur et garantir une adoption réelle.",
    },
    products: {
      eyebrow: 'Modules de Performance',
      title: 'Modules de Performance',
      subtitle: 'Solutions systématisées pour des résultats prévisibles et évolutifs.',
      availabilityPricing: 'Disponibilité & Tarification',
      deploySolution: 'Déployer la solution',
    },
    frameworks: {
      eyebrow: 'Conformité & Normes',
      subtitle: "Nous alignons chaque déploiement sur les cadres mondiaux les plus exigeants pour garantir résilience et adoption.",
    },
    contact: {
      eyebrow: 'Accès Système',
      titlePrefix: 'Lançons le',
      titleAccent: 'Déploiement',
      labels: {
        officialChannel: 'Canal Officiel',
        hubHq: 'Hub HQ',
        corporateNetwork: 'Réseau Corporate',
        linkedinProtocol: 'Protocole LinkedIn',
      },
    },
    form: {
      labels: { id: 'Identification', channel: 'Canal de Communication', requirement: 'Besoin Technique' },
      placeholders: { requirement: 'À quelle étape de votre transformation numérique vous trouvez-vous ?' },
      successBlurb: "Nous analyserons votre demande selon nos protocoles Industrie 5.0 et vous contacterons rapidement.",
      submitting: 'Synchronisation...',
      privacy: 'Nous respectons les réglementations de confidentialité RGPD.',
      ssl: 'Vos données sont sécurisées via le protocole SSL.',
    },
    servicePage: {
      notFound: 'Service introuvable',
      backHome: "Retour à l'accueil",
      backServices: 'Retour aux services',
      readyNextStep: 'Prêt pour la prochaine étape ?',
      methodologyApplied: 'Méthodologie Appliquée',
      methodologyBlurb: 'Basé sur les normes ISO 9241 et les cadres NIST AI RMF.',
      outcomesEyebrow: 'Résultats Concrets',
      outcomesTitle: "Qu'obtiendrez-vous exactement ?",
      outcomesSubtitle: "Chaque livrable est conçu pour vous permettre de décider en connaissance de cause dès le premier jour et de démontrer la valeur en interne.",
      variantsEyebrow: 'Angles de Communication Stratégiques',
    },
    productPage: {
      notFound: 'Produit introuvable',
      backHome: "Retour à l'accueil",
      backProducts: 'Retour aux produits',
      packagedSolution: 'Solution Packagée',
      warrantyTitle: 'Garantie AlgoritmoT',
      warrantyBlurb: 'Tous nos produits packagés incluent un support initial et une assurance qualité technique selon les standards Industrie 5.0.',
      deploymentSheet: 'Fiche de Déploiement',
      deploymentBullets: [
        'Livraison Standard Garantie',
        'Intégration aux écosystèmes existants',
        "Manuel d'exploitation inclus",
        'Support Premium optionnel'
      ],
      defaultCta: 'Demander maintenant',
      whyModel: 'Pourquoi choisir ce modèle ?',
    },
  },
}

export function getUICopy(language: Language): UIStrings {
  return UI_COPY[language] ?? UI_COPY.es
}

