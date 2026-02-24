import { type ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Briefcase,
    Package,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    ExternalLink
} from 'lucide-react'


interface AdminLayoutProps {
    children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const location = useLocation()
    const navigate = useNavigate()

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Servicios', href: '/admin/services', icon: Briefcase },
        { name: 'Productos', href: '/admin/products', icon: Package },
        { name: 'Configuración', href: '/admin/settings', icon: Settings },
    ]

    const handleLogout = () => {
        localStorage.removeItem('admin_token')
        navigate('/admin/login')
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside
                className={`bg-slate-900 text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'
                    }`}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && 'hidden'}`}>
                        <div className="w-8 h-8 bg-brand-primary flex items-center justify-center font-black">A</div>
                        <span className="font-black tracking-tighter text-xl">ADMIN</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-white/40 hover:text-white transition-colors"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-4 p-3 transition-all ${isActive
                                    ? 'bg-brand-primary text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className={`font-medium transition-opacity ${!isSidebarOpen && 'opacity-0 w-0'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <Link
                        to="/"
                        className="flex items-center gap-4 p-3 text-white/40 hover:text-white transition-colors mb-2"
                    >
                        <ExternalLink className="w-5 h-5" />
                        <span className={`${!isSidebarOpen && 'hidden'}`}>Ver Sitio</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className={`font-medium ${!isSidebarOpen && 'opacity-0 w-0'}`}>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-slate-200 h-20 px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Shield className="w-5 h-5 text-brand-primary" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
                            {navigation.find(n => n.href === location.pathname)?.name || 'Panel Control'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">Admin AlgoritmoT</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nivel de Acceso: 01</div>
                        </div>
                        <div className="w-10 h-10 bg-slate-200 rounded-none border-t-2 border-brand-primary"></div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
