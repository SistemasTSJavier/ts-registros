interface LocationPreviewProps {
  lat: number
  lng: number
  address?: string
}

export function LocationPreview({ lat, lng, address }: LocationPreviewProps) {
  const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
      {address && <p className="text-sm text-slate-700">{address}</p>}
      <p className="mt-1 font-mono text-xs text-slate-500">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        Ver en mapa →
      </a>
    </div>
  )
}
