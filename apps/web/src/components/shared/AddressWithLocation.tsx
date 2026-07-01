import { MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface AddressValue {
  address: string
  lat?: number
  lng?: number
}

interface AddressWithLocationProps {
  value: string
  lat?: number
  lng?: number
  onChange: (value: AddressValue) => void
  placeholder?: string
  error?: string
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'es' } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { display_name?: string }
    return data.display_name ?? null
  } catch {
    return null
  }
}

export function AddressWithLocation({
  value,
  lat,
  lng,
  onChange,
  placeholder = 'Dirección de la planta',
  error,
}: AddressWithLocationProps) {
  const [detecting, setDetecting] = useState(false)
  const hasCoords = lat != null && lng != null

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización')
      return
    }

    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLat = position.coords.latitude
        const detectedLng = position.coords.longitude
        const detectedAddress = (await reverseGeocode(detectedLat, detectedLng)) ?? value

        onChange({
          address: detectedAddress || `Ubicación: ${detectedLat.toFixed(5)}, ${detectedLng.toFixed(5)}`,
          lat: detectedLat,
          lng: detectedLng,
        })
        toast.success('Ubicación detectada correctamente')
        setDetecting(false)
      },
      () => {
        toast.error('Permiso de ubicación denegado o no disponible')
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={value}
          onChange={(e) => onChange({ address: e.target.value, lat, lng })}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={detectLocation}
        disabled={detecting}
        className="w-full sm:w-auto"
      >
        <Navigation className="h-4 w-4" />
        {detecting ? 'Detectando...' : 'Detectar ubicación al aceptar'}
      </Button>
      {hasCoords && (
        <p className="text-xs text-emerald-700">
          Ubicación registrada: {lat!.toFixed(5)}, {lng!.toFixed(5)}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Al pulsar el botón, el navegador pedirá permiso. Si aceptas, se guardan las coordenadas de la planta.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
