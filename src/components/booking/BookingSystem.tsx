import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarPicker } from './CalendarPicker'
import { BookingForm } from './BookingForm'
import { CheckCircle2, Calendar, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Slot = {
  id: string
  startTime: string
  endTime: string
}

export function BookingSystem() {
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot)
    setStep('form')
    // Smooth scroll to top of component if needed
    document.getElementById('booking-system')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleFormSubmit = async (data: any) => {
    if (!selectedSlot) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          slotId: selectedSlot.id
        })
      })

      if (response.ok) {
        setStep('success')
      } else {
        const err = await response.json()
        alert(err.error || 'Ocurrió un error al agendar la cita. Por favor intente de nuevo.')
      }
    } catch (error) {
      console.error('Error submitting booking:', error)
      alert('Error de conexión. Por favor intente de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="booking-system" className="w-full">
      <AnimatePresence mode="wait">
        {step === 'calendar' && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Selecciona una fecha y hora</h3>
              <p className="text-slate-500 text-sm">Todas las citas se realizan de forma virtual vía Google Meet.</p>
            </div>
            <CalendarPicker onSelect={handleSlotSelect} />
          </motion.div>
        )}

        {step === 'form' && selectedSlot && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-slate-950 p-6 mb-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-brand-primary">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-full">
                  <Calendar className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Fecha seleccionada</div>
                  <div className="text-lg font-bold">
                    {format(new Date(selectedSlot.startTime), "EEEE d 'de' MMMM", { locale: es })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-full">
                  <Clock className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Hora</div>
                  <div className="text-lg font-bold">
                    {format(new Date(selectedSlot.startTime), 'HH:mm')} (30 min)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 flex items-center justify-center rounded-full">
                  <MapPin className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Ubicación</div>
                  <div className="text-lg font-bold">Virtual / Google Meet</div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Información del contacto</h3>
              <p className="text-slate-500 text-sm">Complete los siguientes datos para finalizar la reserva.</p>
            </div>

            <BookingForm 
              onSubmit={handleFormSubmit} 
              onBack={() => setStep('calendar')}
              isSubmitting={isSubmitting} 
            />
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-6 bg-slate-50 border border-slate-200"
          >
            <div className="w-20 h-20 bg-brand-secondary/10 flex items-center justify-center mx-auto mb-8 rounded-full">
              <CheckCircle2 className="w-10 h-10 text-brand-secondary" />
            </div>
            <h3 className="text-4xl font-black tracking-tighter text-slate-900 mb-4">¡Cita Agendada!</h3>
            <p className="text-xl text-slate-600 font-light max-w-2xl mx-auto leading-relaxed">
              Hemos enviado una invitación a tu correo electrónico con los detalles y el enlace de la reunión. 
              ¡Nos vemos pronto!
            </p>
            <button 
              onClick={() => setStep('calendar')}
              className="mt-12 text-sm font-black uppercase tracking-widest text-brand-primary hover:underline"
            >
              Agendar otra cita
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
