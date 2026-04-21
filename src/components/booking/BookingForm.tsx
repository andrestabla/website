import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

const bookingSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  company: z.string().min(2, 'La empresa es requerida'),
  role: z.string().min(2, 'El cargo es requerido'),
  industry: z.string().min(2, 'El sector es requerido'),
  employeeCount: z.string().min(1, 'Seleccione un rango'),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  message: z.string().min(10, 'Cuéntenos un poco más (mínimo 10 caracteres)'),
})

type BookingFormValues = z.infer<typeof bookingSchema>

export function BookingForm({ 
  onSubmit, 
  onBack,
  isSubmitting 
}: { 
  onSubmit: (data: BookingFormValues) => void 
  onBack: () => void
  isSubmitting: boolean 
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema)
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombres *</label>
          <input 
            {...register('name')}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors"
            placeholder="Tu nombre completo"
          />
          {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Corporativo *</label>
          <input 
            {...register('email')}
            type="email"
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors"
            placeholder="ejemplo@empresa.com"
          />
          {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empresa *</label>
          <input 
            {...register('company')}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors"
            placeholder="Nombre de la organización"
          />
          {errors.company && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.company.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo o Rol *</label>
          <input 
            {...register('role')}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors"
            placeholder="Ej: Gerente de Operaciones"
          />
          {errors.role && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.role.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector *</label>
          <select 
            {...register('industry')}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors appearance-none"
          >
            <option value="">Seleccione un sector</option>
            <option value="Tecnología">Tecnología / Software</option>
            <option value="Educación">Educación</option>
            <option value="Finanzas">Finanzas / Banca</option>
            <option value="Retail">Retail / E-commerce</option>
            <option value="Manufactura">Manufactura / Logística</option>
            <option value="Salud">Salud / Medicina</option>
            <option value="Servicios">Servicios Profesionales</option>
            <option value="Otro">Otro</option>
          </select>
          {errors.industry && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.industry.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de Empleados *</label>
          <select 
            {...register('employeeCount')}
            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors appearance-none"
          >
            <option value="">Seleccione un rango</option>
            <option value="1-10">1 - 10 empleados</option>
            <option value="11-50">11 - 50 empleados</option>
            <option value="51-200">51 - 200 empleados</option>
            <option value="201-500">201 - 500 empleados</option>
            <option value="500+">Más de 500 empleados</option>
          </select>
          {errors.employeeCount && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.employeeCount.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sitio Web</label>
        <input 
          {...register('website')}
          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors"
          placeholder="https://www.empresa.com"
        />
        {errors.website && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.website.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cuéntenos qué está buscando *</label>
        <textarea 
          {...register('message')}
          rows={4}
          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm focus:border-brand-primary focus:ring-0 transition-colors resize-none"
          placeholder="Describa brevemente el cuello de botella o desafío de escalabilidad que desea conversar..."
        />
        {errors.message && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.message.message}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 border border-slate-200 text-sm font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al calendario
        </button>
        <Button 
          type="submit" 
          className="flex-[2] py-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Agendando...
            </>
          ) : (
            <>
              Confirmar y Agendar Cita
              <ArrowRight className="ml-2 w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
