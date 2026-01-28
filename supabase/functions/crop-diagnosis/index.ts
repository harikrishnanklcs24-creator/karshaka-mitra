import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, district, cropCategory, language, imageBase64, imageMimeType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const languageInstruction = language === "ml" 
      ? "Respond ONLY in Malayalam language. All text must be in Malayalam script."
      : "Respond in simple English.";

    const cropCategoryText = cropCategory ? `Crop Category: ${cropCategory}` : "Crop Category: Not specified";

    const systemPrompt = `You are an experienced agricultural expert specializing in Kerala's crops and farming conditions. You help small farmers diagnose crop issues and provide practical, affordable solutions.

${languageInstruction}

When analyzing crop issues, consider Kerala's tropical climate and common crops like coconut, rubber, banana, rice, pepper, cardamom, vegetables, and spices.

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just pure JSON):
{
  "problemType": "Identify if it's Pest Attack, Plant Disease, or Nutrient Deficiency",
  "riskLevel": "Assess severity as High, Medium, or Low based on crop damage potential and urgency",
  "possibleCause": "Explain the likely cause in 2-3 simple sentences",
  "recommendedAction": "Provide 3-4 specific, practical remedies suitable for small farmers",
  "preventiveMeasures": "List 3-4 preventive steps to avoid this issue in future"
}`;

    const userPrompt = `Analyze this crop issue:
- Farmer's Description: ${description || "No description provided"}
- ${cropCategoryText}
- District: ${district || "Not specified"} (Kerala, India)

${imageBase64 ? "An image of the affected crop has been provided for analysis." : "No image was provided."}

Provide your diagnosis.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Build user message with optional image
    if (imageBase64 && imageMimeType) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType};base64,${imageBase64}`
            }
          },
          {
            type: "text",
            text: userPrompt
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new Error("No response from AI");
    }

    // Clean and parse JSON response
    let cleanedResponse = textResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const diagnosis = JSON.parse(cleanedResponse);

    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Crop diagnosis error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
