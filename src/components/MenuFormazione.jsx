import React from 'react';

function formattaNome(nomeCompleto) {
  const parti = nomeCompleto.trim().split(" ");
  if (parti.length === 1) return nomeCompleto;
  const cognome = parti.pop();
  const nome = parti.join(" ");
  return `${cognome} ${nome}`;
}

function MenuFormazione({ giocatori }) {
  const giocatoriOrdinati = [...giocatori].sort((a, b) => {
    const cognomeA = a.nomeCompleto.trim().split(" ").pop().toLowerCase();
    const cognomeB = b.nomeCompleto.trim().split(" ").pop().toLowerCase();
    return cognomeA.localeCompare(cognomeB);
  });

  return (
    <ul>
      {giocatoriOrdinati.map((giocatore, index) => (
        <li key={index}>{formattaNome(giocatore.nomeCompleto)}</li>
      ))}
    </ul>
  );
}

export default MenuFormazione;
