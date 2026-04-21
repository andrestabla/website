import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'

type Slot = {
  id: string
  startTime: string
  endTime: string
}

export function CalendarPicker({ onSelect }: { onSelect: (slot: Slot) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/booking/slots')
      .then(res => res.json())
      .then(data => {
        setSlots(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching slots:', err)
        setLoading(false)
      })
  }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const availableDates = slots.map(s => startOfDay(new Date(s.startTime)))
  const hasSlots = (date: Date) => availableDates.some(d => isSameDay(d, date))

  const selectedDateSlots = selectedDate 
    ? slots.filter(s => isSameDay(new Date(s.startTime), selectedDate))
    : []

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando disponibilidad...</div>
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-50 border border-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: getDay(monthStart) }).map((_, i) => (
            <div key={`blank-${i}`} className="h-12" />
          ))}
          {daysInMonth.map((date: Date, i: number) => {
            const isAvailable = hasSlots(date)
            const isPast = isBefore(date, startOfDay(new Date()))
            const isSelected = selectedDate && isSameDay(date, selectedDate)

            return (
              <button
                key={i}
                disabled={!isAvailable || isPast}
                onClick={() => setSelectedDate(date)}
                className={clsx(
                  "h-12 flex items-center justify-center text-sm font-bold transition-all relative",
                  isSelected ? "bg-brand-primary text-white scale-105 z-10 shadow-lg" : 
                  isAvailable ? "bg-slate-50 text-slate-900 hover:bg-brand-primary/10" : "text-slate-300 cursor-not-allowed",
                  isToday(date) && !isSelected && "border border-brand-primary text-brand-primary"
                )}
              >
                {format(date, 'd')}
                {isAvailable && !isSelected && (
                  <span className="absolute bottom-1.5 w-1 h-1 bg-brand-primary rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
            Horas disponibles para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedDateSlots.map(slot => (
              <button
                key={slot.id}
                onClick={() => onSelect(slot)}
                className="flex items-center justify-center gap-3 p-4 border border-slate-200 hover:border-brand-primary hover:bg-brand-primary/5 transition-all group"
              >
                <Clock className="w-4 h-4 text-slate-400 group-hover:text-brand-primary" />
                <span className="text-sm font-bold text-slate-900">
                  {format(new Date(slot.startTime), 'HH:mm')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
