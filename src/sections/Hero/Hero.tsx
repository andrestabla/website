import { useLanguage } from '../../context/LanguageContext'
import { HeroView } from './HeroView'

export function Hero() {
    const { translatedState } = useLanguage()
    return <HeroView hero={translatedState.hero} heroSection={translatedState.homePage.hero} />
}
