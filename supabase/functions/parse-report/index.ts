import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    console.log(`[REQUEST] Method: ${req.method} | URL: ${req.url}`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!OPENAI_API_KEY) {
            console.error("CRITICAL: OPENAI_API_KEY is not set in environment variables.");
            return new Response(JSON.stringify({
                error: "Configuração ausente: OPENAI_API_KEY não encontrada no Supabase. Por favor, adicione-a nos Secrets da Edge Function."
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        const bodyText = await req.text();
        console.log(`[BODY] Received length: ${bodyText.length}`);

        let fileBase64, fileName;
        try {
            const parsed = JSON.parse(bodyText);
            fileBase64 = parsed.fileBase64;
            fileName = parsed.fileName;
        } catch (e) {
            throw new Error("Invalid JSON body received.");
        }

        if (!fileBase64) throw new Error("Missing fileBase64 in request body.");

        const binaryString = atob(fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const isPdf = fileName.toLowerCase().endsWith(".pdf");
        let extractedText = "";

        if (isPdf) {
            try {
                // Dynamic import to avoid boot-time failure if the library has issues
                const { default: pdf } = await import("https://esm.sh/pdf-parse@1.1.1?no-check");
                const data = await pdf(bytes);
                extractedText = data.text;
                if (!extractedText || extractedText.trim().length === 0) {
                    console.log("PDF parsed but no text found.");
                }
            } catch (err) {
                console.error("PDF Parse Error (Attempt 1):", err.message);
                // Fallback or just proceed (OpenAI might still work if we send it as image or if it's not actually needed)
            }
        }

        const prompt = `
      Você é um especialista em logística hospitalar e análise de documentos fiscais/pedidos de compra.
      Sua tarefa é extrair os dados do "Relatório de Produtos Confirmados" ou OC.
      
      IMPORTANTE: O documento pode (e provavelmente vai) conter MÚLTIPLOS FORNECEDORES.
      Cada fornecedor tem seu próprio bloco de itens, número de OC e prazo de entrega.
      NÃO misture itens de fornecedores diferentes.
      
      DADOS BRUTOS (TEXTO EXTRAÍDO DO PDF):
      ---
      ${isPdf ? extractedText : "(Documento enviado como imagem - use visão para extrair)"}
      ---

      INSTRUÇÕES DE EXTRAÇÃO:
      1. Identifique o Número da Cotação (Quotation Number) global do relatório.
      2. Identifique CADA fornecedor individualmente.
      3. Para cada fornecedor, extraia:
         - Nome exato do Fornecedor.
         - Número da OC (Ordem de Compra) correspondente a ele.
         - Prazo de entrega (Deadline).
         - Lista completa de itens confirmados para ESSE fornecedor.
      4. Para cada item, extraia: Código (Code), Descrição (Description), Quantidade (Quantity), Preço Unitário (UnitPrice) e Unidade (Unit).

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
    `;

        const messages = [
            {
                role: "system",
                content: "Você é um extrator de dados JSON altamente preciso. Sua prioridade é a integridade dos dados e a correta separação de fornecedores."
            },
            {
                role: "user",
                content: isPdf ? prompt : [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: "data:image/jpeg;base64," + fileBase64
                        }
                    }
                ]
            }
        ];

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + OPENAI_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o", // Always use 4o for better reasoning in multi-supplier scenarios
                messages,
                response_format: { type: "json_object" },
                temperature: 0 // Keep it deterministic
            }),
        });

        const aiData = await openaiResponse.json();
        if (aiData.error) throw new Error("OpenAI Error: " + aiData.error.message);

        const result = JSON.parse(aiData.choices[0].message.content);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
