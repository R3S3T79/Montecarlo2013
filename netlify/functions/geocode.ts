import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q || "Montecarlo";

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Montecarlo2013App/1.0 (https://montecarlo2013.netlify.app)",
        "Accept-Language": "it",
      },
    });

    if (!res.ok) {
      throw new Error(`OpenStreetMap response ${res.status}`);
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error("❌ Errore nella geocode function:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Errore interno geocode" }),
    };
  }
};
