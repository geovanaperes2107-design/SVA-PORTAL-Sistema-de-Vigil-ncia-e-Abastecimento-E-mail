import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

Deno.serve(async (req) => {
    // 1. Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { fileBase64, fileName } = await req.json();

        if (!fileBase64) {
            throw new Error("Missing file data");
        }

        // 2. Call OpenAI for PDF/Image Analysis
        // Note: Since this is a PDF, we'll ask GPT-4o to extract text or analyze if vision is needed.
        // In a more robust version, we'd use a PDF-to-Text library first, but for this POC 
        // we'll assume the user might upload images or small PDFs that vision can handle 
        // or we'll wrap the text extraction.

        // For now, let's use a structured prompt for data extraction
        const prompt = `
      Você é um especialista em logística hospitalar. Extraia os dados do "Relatório de Produtos Confirmados" ou OC em anexo.
      
      RETORNE APENAS UM JSON VÁLIDO no seguinte formato:
      {
        "quotationNumber": "string",
        "suppliers": [
          {
            "name": "string",
            "orderNumber": "string",
            "deliveryDeadline": "string",
            "items": [
              {
                "code": "string",
                "description": "string",
                "quantity": number,
                "unitPrice": number,
                "unit": "string"
              }
            ]
          }
        ]
      }
      
      Caso não identifique o valor, preencha com null ou 0.
    `;

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Você é um extrator de dados JSON preciso. Extraia dados de documentos hospitalares."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${fileBase64}` // We assume base64 is provided
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" }
            }),
        });

        const aiData = await openaiResponse.json();
        const result = JSON.parse(aiData.choices[0].message.content);

        return new Response(JSON.stringify(result), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            status: 400,
        });
    }
});
