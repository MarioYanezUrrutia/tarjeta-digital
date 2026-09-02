import React, {useEffect, useState} from 'react'

export default function App(){
  const [status, setStatus] = useState('loading')

  useEffect(()=>{
    fetch(import.meta.env.VITE_API_BASE + '/health/')
      .then(r=>r.json())
      .then(d=>setStatus(d.status))
      .catch(()=>setStatus('error'))
  },[])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-6 bg-white rounded shadow">
        <h1 className="text-xl font-semibold mb-2">Tarjeta Digital</h1>
        <p>API health: {status}</p>
      </div>
    </div>
  )
}
