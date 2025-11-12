// netlify/functions/ping-supabase-background.js
export async function handler(event, context) {
  try {
    // Replace with your Supabase URL and anon key
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // Simple ping: fetch a lightweight endpoint
    const res = await fetch(`${SUPABASE_URL}/rest/v1/your_table?select=id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    console.log("Pinged Supabase:", res.status);
    return { statusCode: 200, body: "Supabase pinged successfully" };
  } catch (err) {
    console.error("Error pinging Supabase:", err);
    return { statusCode: 500, body: "Ping failed" };
  }
}