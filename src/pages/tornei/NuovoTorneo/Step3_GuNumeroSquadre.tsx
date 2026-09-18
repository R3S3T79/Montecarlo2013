// src/pages/tornei/NuovoTorneo/Step3_GuNumeroSquadre.tsx 
 
import { useNavigate, useLocation } from 'react-router-dom'; 
 
export default function Step3_GuNumeroSquadre() { 
  const navigate = useNavigate(); 
  const location = useLocation(); 
 
  const state = location.state as { 
    torneoId: string; 
    torneoNome: string; 
    torneoLuogo: string; 
    stagioneSelezionata: string; 
    formatoTorneo: string; 
  } | null; 
 
  if (!state) { 
    navigate('/tornei/nuovo/step1'); 
    return null; 
  } 
 
  const handleClick = (num: number) => { 
    navigate(`/tornei/nuovo/step4-gironeunico/${state.torneoId}`, { 
      state: { 
        ...state, 
        numSquadre: num, 
        formatoTorneo: 'Girone_Unico', 
      }, 
    }); 
  }; 
 
  const teamNumbers = Array.from({ length: 13 }, (_, i) => i + 3); // da 3 a 15 
 
  return ( 
    <div className="min-h-screen mt-2 w-full px-2 pb-6 box-border">
      <div className="w-full max-w-3xl mx-auto space-y-4">

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-montecarlo">
          <div className="h-1 w-full bg-gradient-to-r from-[#d61f1f] to-[#f45e5e]" />

          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-xl ring-1 ring-inset ring-red-200">
                ⚽
              </div>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Numero squadre
                </h1>

                <p className="mt-0.5 text-sm text-gray-500">
                  Seleziona il numero di squadre del girone unico
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"> 
            {teamNumbers.map((n) => ( 
              <button 
                key={n} 
                onClick={() => handleClick(n)} 
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-semibold text-montecarlo-secondary transition hover:bg-red-100 hover:border-red-300" 
              > 
                {n} squadre 
              </button> 
            ))} 
          </div> 
        </div>

        <button 
          onClick={() => navigate(-1)} 
          className="w-full bg-gray-100 border border-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-200 transition" 
        > 
          Indietro 
        </button> 

      </div>
    </div> 
  ); 
} 