/**
 * Base de conocimiento del agente Atenea — Metodología AlgoritmoT.
 * Resumen fiel del documento "Metodología AlgoritmoT" (Construcción del Dashboard
 * de Madurez Digital & IA y servicio de transformación digital).
 */

export const METHODOLOGY_KB = `
# Metodología de Transformación Digital de AlgoritmoT

## Modelos de evaluación de madurez
AlgoritmoT integra marcos reconocidos para evaluar madurez digital e IA:
- McKinsey — Digital Quotient (DQ) y AI Quotient (AIQ): índices de 0 a 100 que miden cuánto valor captura la organización con lo digital (DQ) y con la IA (AIQ), comparables contra promedios de industria y líderes.
- Capgemini / MIT Sloan (Digital Mastery): evalúa dos ejes, intensidad digital (capacidades tecnológicas) e intensidad de transformación (liderazgo y gestión del cambio).
- Deloitte (7 digital pivots): infraestructura, datos, talento, ecosistemas, flujos de trabajo inteligentes, experiencia del cliente y modelos de negocio adaptables.

## Modelo propio MD-IA (6 dimensiones)
AlgoritmoT combina lo anterior en su modelo MD-IA, que evalúa seis dimensiones:
1. Estrategia: visión y alineación de lo digital/IA con el negocio.
2. Talento y Cultura: personas, mentalidad innovadora, habilidades digitales.
3. Procesos y Automatización: eficiencia operativa, flujos inteligentes.
4. Experiencia del Cliente: canales digitales, enfoque omnicanal.
5. Infraestructura y Datos: tecnología, nube, ciberseguridad, analítica.
6. Gobernanza y Liderazgo: estructura, comités, decisiones basadas en datos.

Cada dimensión se puntúa de 0 a 100. Niveles: 0–33 bajo, 34–66 intermedio, 67–100 alto.
Índices globales: DQ es el promedio de las dimensiones; AIQ pondera más fuerte Infraestructura/Datos, Estrategia y Gobernanza (las capacidades que más impulsan la IA). Pesos AIQ usados: Infraestructura & Datos 30%, Estrategia 25%, Gobernanza & Liderazgo 25%, Talento & Cultura 10%, Procesos 5%, Experiencia del Cliente 5%.

## Etapas del servicio
1. Diagnóstico de Madurez (MD-IA): assessment de las 6 dimensiones con encuestas estructuradas (escala Likert 1–5 normalizada a 0–100), entrevistas a stakeholders, revisión de documentos y benchmark sectorial. Entregable: Informe MD-IA con nivel global (DQ/AIQ), puntaje por dimensión con fortalezas y brechas, mapa de oportunidades, quick wins y un workshop de alineación con dirección.
2. Priorización de Brechas: se ordenan por impacto en el negocio, urgencia/dependencias, capacidad de la organización y alineación estratégica. Se agrupan en horizontes: H1 (0–6 meses, quick wins), H2 (6–12 meses, escalar), H3 (12+ meses, innovar).
3. Diseño de la Hoja de Ruta: roadmap por horizontes con proyectos, hitos, responsables, business case (beneficios e inversión, ROI) y KPIs. Se acompaña de gobernanza de ejecución (PMO/comité de transformación).
4. Implementación: desarrollo e integración tecnológica (nube, data lake, BI, chatbots, RPA, IA), rediseño de procesos, gestión del cambio y capacitación, entrega de soluciones en producción y monitoreo iterativo por KPIs.
5. Mejora Continua: operar y optimizar lo implementado, medir el aumento de madurez (re-evaluar MD-IA), sostener la cultura digital, con acompañamiento/retainer.

## Instrumentos y herramientas
- Encuestas (Google/Microsoft Forms) con preguntas por dimensión; entrevistas y workshops cualitativos; benchmark con datos de industria y líderes.
- Procesamiento en Excel/Google Sheets (normalización 0–100, promedios por dimensión, cálculo de DQ/AIQ).
- Visualización en Power BI, Looker Studio (Data Studio) o dashboards web a medida; informes en PowerPoint/PDF.

## Dashboard de Madurez Digital & IA
Sintetiza el diagnóstico: scores globales DQ y AIQ con interpretación y comparación contra sector y líderes; insight ejecutivo en lenguaje natural; radar de madurez por dimensión (empresa vs benchmark); casos de uso de IA recomendados con tiempos y beneficios; roadmap por horizontes; un simulador de impacto ("gap analyzer") que recalcula DQ/AIQ proyectado al mejorar dimensiones; y una tabla que mapea brechas a servicios de AlgoritmoT, con un llamado a la acción para agendar diagnóstico.

## Cómo se conecta con el simulador
El simulador de AlgoritmoT recorre 6 fases de transformación: 1) Captura del ADN Digital (diagnóstico MD-IA, entrada desde 5.000 USD), 2) Mapeo de Procesos (BPMN; depende del número de procesos), 3) Humano vs. Tecnología (IA responsable), 4) Diseño y Desarrollo (depende del número de soluciones y su alcance), 5) Implementación (gestión del cambio), 6) Mejora Continua (retainer mensual). La inversión es referencial y se precisa tras el diagnóstico.
`.trim()
