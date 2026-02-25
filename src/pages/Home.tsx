import { Hero } from '../sections/Hero/Hero'
import { Services } from '../sections/Services/Services'
import { Products } from '../sections/Products/Products'
import { Frameworks } from '../sections/Frameworks/Frameworks'
import { Contact } from '../sections/Contact/Contact'
import { Layout } from '../components/layout/Layout'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function Home() {
    const { hash } = useLocation()

    useEffect(() => {
        if (hash) {
            const element = document.getElementById(hash.replace('#', ''))
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            window.scrollTo(0, 0)
        }
    }, [hash])

    return (
        <Layout>
            <Hero />
            <div id="servicios" data-track-section="home-servicios">
                <Services />
            </div>
            <div id="productos" data-track-section="home-productos">
                <Products />
            </div>
            <div id="confianza" data-track-section="home-confianza">
                <Frameworks />
            </div>
            <div id="contacto" data-track-section="home-contacto">
                <Contact />
            </div>
        </Layout>
    )
}
