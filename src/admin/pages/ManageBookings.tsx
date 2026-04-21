import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Building, Mail, ChevronRight, CheckCircle2, Trash2, Plus, Loader2 } from 'lucide-react'
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
  const [view, setView] = useState<'appointments' | 'slots'>('appointments')
  
  // New slot form
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)

  useEffect(() => {
    fetchData()
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
      ) : (
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
      )}
    </div>
  )
}
