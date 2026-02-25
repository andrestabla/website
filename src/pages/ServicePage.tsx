import { useParams, Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { useLanguage } from '../context/LanguageContext'
import { ServicePageView } from './ServicePageView'

export function ServicePage() {
    const { slug } = useParams<{ slug: string }>()
    const { translatedState, uiText } = useLanguage()
    const service = translatedState.services.find(s => s.slug === slug)

    if (!service) {
        return (
            <Layout>
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-black mb-8">{uiText.servicePage.notFound}</h1>
                    <Link to="/"><Button>{uiText.servicePage.backHome}</Button></Link>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <ServicePageView service={service as any} uiText={uiText.servicePage} />
        </Layout>
    )
}
