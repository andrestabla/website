import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Building, Mail, CheckCircle2, Trash2, Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '../../components/ui/Button'

type Appointment = {
  id: string
  name: string
  email: string
  company: string
  role: string
  industry: string
  employeeCount: string
  startTime: string
  endTime: string
  status: string
  message: string
}

type Slot = {
  id: string
  startTime: string
  endTime: string
  isBooked: boolean
}

export function ManageBookings() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'appointments' | 'slots' | 'settings'>('appointments')
  
  // Google Calendar status
  const [googleStatus, setGoogleStatus] = useState<{
    enabled: boolean
    status: string
    connectedAccount: string
    hasRefreshToken: boolean
  } | null>(null)

  // New slot form
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)

  useEffect(() => {
    fetchData()
    fetchGoogleStatus()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [appRes, slotRes] = await Promise.all([
        fetch('/api/admin/booking/list'),
        fetch('/api/admin/booking/slots')
      ])
      const appData = await appRes.json()
      const slotData = await slotRes.json()
      setAppointments(appData)
      setSlots(slotData)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/admin/google-calendar/status')
      const data = await res.json()
      setGoogleStatus(data)
    } catch (err) {
      console.error('Error fetching google status:', err)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/admin/google-calendar/auth-url')
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      alert('Error al obtener URL de autenticación')
    }
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSlotDate || !newSlotTime) return
    setAddingSlot(true)
    
    const startTime = new Date(`${newSlotDate}T${newSlotTime}`)
    const endTime = new Date(startTime.getTime() + 30 * 60000) // 30 min duration

    try {
      const res = await fetch('/api/admin/booking/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime })
      })
      if (res.ok) {
        setNewSlotTime('')
        fetchData()
      }
    } catch (error) {
      console.error('Error adding slot:', error)
    } finally {
      setAddingSlot(false)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este espacio?')) return
    try {
      const res = await fetch(`/api/admin/booking/slots?id=${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (error) {
      console.error('Error deleting slot:', error)
    }
  }

  if (loading) return <div className="p-12 text-center text-xs font-black uppercase tracking-widest text-slate-400">Cargando gestión de citas...</div>

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">Gestión de Citas</h1>
          <p className="text-slate-500 font-medium">Administra la disponibilidad y revisa las reservaciones realizadas.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('appointments')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${view === 'appointments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Reservaciones
          </button>
          <button 
            onClick={() => setView('slots')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${view === 'slots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Disponibilidad
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${view === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Configuración
          </button>
        </div>
      </div>

      {view === 'appointments' ? (
        <div className="space-y-6">
          {appointments.length === 0 ? (
            <div className="bg-white border border-slate-200 p-20 text-center rounded-2xl">
              <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay reservaciones registradas aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {appointments.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 p-6 flex flex-col md:flex-row gap-8 hover:border-brand-primary transition-colors group">
                  <div className="md:w-64 shrink-0">
                    <div className="flex items-center gap-3 text-brand-primary mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-black uppercase tracking-widest">
                        {format(new Date(app.startTime), "d 'de' MMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-lg font-bold text-slate-900">
                        {format(new Date(app.startTime), 'HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-900">{app.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-500">{app.email}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-900">{app.company}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        {app.role} • {app.industry} • {app.employeeCount} emp.
                      </div>
                    </div>
                  </div>

                  <div className="md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mensaje</div>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed italic">
                      "{app.message}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'slots' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 p-8 sticky top-8">
              <h3 className="text-lg font-black tracking-tight text-slate-900 mb-6 flex items-center gap-3">
                <Plus className="w-5 h-5 text-brand-primary" />
                Nuevo espacio
              </h3>
              <form onSubmit={handleAddSlot} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</label>
                  <input 
                    type="date" 
                    value={newSlotDate}
                    onChange={e => setNewSlotDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hora de inicio</label>
                  <input 
                    type="time" 
                    value={newSlotTime}
                    onChange={e => setNewSlotTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400 italic">Duración predefinida: 30 minutos</p>
                </div>
                <Button type="submit" className="w-full" disabled={addingSlot}>
                  {addingSlot ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Habilitar espacio'}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map(slot => (
                <div key={slot.id} className="bg-white border border-slate-200 p-6 flex justify-between items-center group">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                      {format(new Date(slot.startTime), "EEEE d 'de' MMM", { locale: es })}
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {format(new Date(slot.startTime), 'HH:mm')}
                    </div>
                    {slot.isBooked && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black uppercase tracking-widest rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        Reservado
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
                    disabled={slot.isBooked}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {slots.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                  No has habilitado espacios de tiempo todavía
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <div className="bg-white border border-slate-200 p-10 rounded-[2rem]">
            <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-4">Sincronización con Google Calendar</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Conecta tu cuenta de Google para agendar automáticamente las citas en tu calendario y enviar invitaciones de Google Meet a los usuarios.
            </p>

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">Estado de conexión</div>
                {googleStatus?.enabled ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">Conectado</span>
                ) : (
                  <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">Desconectado</span>
                )}
              </div>
              
              {googleStatus?.enabled && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{googleStatus.connectedAccount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Cuenta vinculada</div>
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleConnectGoogle}
              className="w-full py-6 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              {googleStatus?.enabled ? 'Cambiar cuenta de Google' : 'Conectar con Google Calendar'}
            </Button>

            <p className="mt-6 text-[10px] text-center text-slate-400 uppercase font-bold tracking-widest leading-loose">
              Se requiere permiso para editar eventos del calendario <br /> y acceso a Google Meet.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
