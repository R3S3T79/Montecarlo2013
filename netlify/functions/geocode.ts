import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const luogo = event.queryStringParameters?.q;
  if (!luogo) return { statusCode: 400, body: "Missing q" };

  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(luogo)}`
  );
  const json = await resp.text();
  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: json,
  };
};
