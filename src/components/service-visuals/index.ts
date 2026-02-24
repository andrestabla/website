import type { ComponentType } from 'react'
import { ADNVisuals } from './ADNVisuals'
import { ProcessVisuals } from './ProcessVisuals'
import { HumanTechVisuals } from './HumanTechVisuals'
import { DevVisuals } from './DevVisuals'
import { ImplementacionVisuals } from './ImplementacionVisuals'
import { MejoraVisuals } from './MejoraVisuals'

export const serviceVisuals: Record<string, ComponentType> = {
    'captura-adn': ADNVisuals,
    'mapeo-procesos': ProcessVisuals,
    'humano-vs-tecnologia': HumanTechVisuals,
    'diseno-desarrollo': DevVisuals,
    'implementacion': ImplementacionVisuals,
    'seguimiento-mejora': MejoraVisuals,
}
