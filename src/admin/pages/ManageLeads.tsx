import { useState, useEffect } from 'react'
import { 
    User, 
    Calendar, 
    MapPin, 
    CheckCircle2, 
    Clock, 
    Trash2, 
    ExternalLink, 
    Search,
    ChevronRight,
    MessageSquare,
    Globe,
    AlertCircle,
    Loader2,
    RefreshCw,
    Reply
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContactLead {
    id: string
    name: string
    email: string
    requirement: string
    context: string | null
    serviceSlug: string | null
    path: string | null
    country: string | null
    region: string | null
    city: string | null
    status: 'pending' | 'read' | 'replied' | 'archived'
    notes: string | null
    createdAt: string
    updatedAt: string
}

export function ManageLeads() {
    const [leads, setLeads] = useState<ContactLead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    const fetchLeads = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/leads')
            const data = await res.json()
            if (data.ok) {
                setLeads(data.leads)
            } else {
                setError(data.error || 'Error al cargar leads')
            }
        } catch (err) {
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
    }, [])

    const updateStatus = async (id: string, status: ContactLead['status']) => {
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            })
            const data = await res.json()
            if (data.ok) {
                setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
                if (selectedLead?.id === id) {
                    setSelectedLead(prev => prev ? { ...prev, status } : null)
                }
            }
        } catch (err) {
            alert('Error al actualizar el estado')
        }
    }

    const deleteLead = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return
        try {
            const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.ok) {
                setLeads(prev => prev.filter(l => l.id !== id))
                if (selectedLead?.id === id) setSelectedLead(null)
            }
        } catch (err) {
            alert('Error al eliminar')
        }
    }

    const filteredLeads = leads
        .filter(l => filterStatus === 'all' || l.status === filterStatus)
        .filter(l => 
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.requirement.toLowerCase().includes(searchQuery.toLowerCase())
        )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'read': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'replied': return 'bg-green-100 text-green-700 border-green-200'
            case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200'
            default: return 'bg-slate-100 text-slate-600 border-slate-200'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'read': return 'Leído'
            case 'replied': return 'Respondido'
            case 'archived': return 'Archivado'
            default: return status
        }
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-tight">
                        Gestión de <span className="text-brand-primary">Contactos</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Controla y haz seguimiento de los leads recibidos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchLeads}
                        className="p-3 text-slate-400 hover:text-brand-primary hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-sm"
                        title="Refrescar datos"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading && 'animate-spin'}`} />
                    </button>
                    <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-brand-primary" />
                    </div>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, email o mensaje..."
                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['all', 'pending', 'read', 'replied', 'archived'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                filterStatus === s 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-brand-primary hover:text-brand-primary'
                            }`}
                        >
                            {s === 'all' ? 'Todos' : getStatusLabel(s)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leads List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading && !leads.length ? (
                        <div className="bg-white border border-slate-100 p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Cargando registros...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                            <p className="text-red-700 font-bold">{error}</p>
                            <button onClick={fetchLeads} className="mt-4 text-sm font-black uppercase tracking-widest text-red-600 underline">Reintentar</button>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="bg-white border border-slate-100 p-12 rounded-3xl flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">No se encontraron mensajes con estos criterios.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLeads.map((lead) => (
                                <motion.div
                                    layoutId={lead.id}
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`group bg-white border cursor-pointer p-5 rounded-2xl transition-all hover:shadow-xl hover:shadow-slate-200/50 relative overflow-hidden ${
                                        selectedLead?.id === lead.id ? 'border-brand-primary ring-1 ring-brand-primary shadow-lg' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-primary/10 transition-colors">
                                                <User className="w-5 h-5 text-slate-400 group-hover:text-brand-primary" />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 tracking-tight group-hover:text-brand-primary transition-colors">{lead.name}</div>
                                                <div className="text-sm text-slate-500 font-medium">{lead.email}</div>
                                                <div className="mt-2 flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(lead.status)}`}>
                                                        {getStatusLabel(lead.status)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(lead.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 text-slate-300 group-hover:text-brand-primary transition-all ${selectedLead?.id === lead.id ? 'translate-x-1' : ''}`} />
                                    </div>
                                    <p className="mt-4 text-sm text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 border border-slate-100">
                                        {lead.requirement}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    )
                    }
                </div>

                {/* Details Sidebar / Selection */}
                <div className="lg:col-span-1">
                    <div className="sticky top-32">
                        <AnimatePresence mode="wait">
                            {selectedLead ? (
                                <motion.div
                                    key={selectedLead.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border ${getStatusColor(selectedLead.status)}`}>
                                            {getStatusLabel(selectedLead.status)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => deleteLead(selectedLead.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Eliminar lead"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => setSelectedLead(null)}
                                                className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden"
                                            >
                                                <ChevronRight className="w-4 h-4 rotate-180" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tighter text-slate-900">{selectedLead.name}</h3>
                                            <a href={`mailto:${selectedLead.email}`} className="text-brand-primary font-bold hover:underline inline-flex items-center gap-2 mt-1">
                                                {selectedLead.email}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-6">
                                            <DetailItem icon={Calendar} label="Fecha" value={new Date(selectedLead.createdAt).toLocaleString()} />
                                            <DetailItem icon={Globe} label="Origen" value={selectedLead.path || '/'} />
                                            <DetailItem icon={MapPin} label="Ubicación" value={`${selectedLead.city || 'Desconocida'}, ${selectedLead.country || ''}`} />
                                            <DetailItem icon={CheckCircle2} label="Contexto" value={selectedLead.context || 'General'} />
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <MessageSquare className="w-3 h-3" />
                                                Mensaje / Requerimiento
                                            </p>
                                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedLead.requirement}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            <a 
                                                href={`mailto:${selectedLead.email}?subject=RE: Solicitud AlgoritmoT - ${selectedLead.name}`}
                                                onClick={() => updateStatus(selectedLead.id, 'replied')}
                                                className="w-full h-14 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <Reply className="w-4 h-4" />
                                                Responder por Correo
                                            </a>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => updateStatus(selectedLead.id, selectedLead.status === 'archived' ? 'pending' : 'archived')}
                                                    className="h-12 border border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                                                >
                                                    {selectedLead.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                                                </button>
                                                <button 
                                                    onClick={() => updateStatus(selectedLead.id, 'read')}
                                                    className="h-12 border border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                                                >
                                                    Marcar Leído
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-[500px]">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-slate-200 mb-6">
                                        <User className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-bold max-w-xs leading-relaxed uppercase tracking-widest text-[10px]">
                                        Selecciona un contacto para ver los detalles completos y responder.
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            <div className="text-xs font-bold text-slate-900 truncate" title={value}>{value}</div>
        </div>
    )
}
