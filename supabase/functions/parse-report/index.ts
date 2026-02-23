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
      Você é um especialista em logística hospitalar. Analise este relatório da "Apoio Cotações" e extraia os dados organizando por fornecedor (âncora de repetição).
      
      INSTRUÇÕES DE EXTRAÇÃO:
      1. Para cada fornecedor (geralmente identificado por um bloco de título com o nome da empresa), extraia:
         - Identificação: Número da Cotação (Quotation Number) e Título.
         - Dados do Fornecedor: Nome Fantasia, CNPJ, E-mail e Número da Ordem de Compra.
         - Logística: Prazo de Entrega (Delivery Deadline) em dias.
         - Itens: Uma lista completa de itens confirmados, incluindo código, descrição, quantidade, valor unitário, valor total e unidade de medida.

      2. Regras de Negócio:
         - Se o valor total de um item não estiver explícito, calcule (Quantidade * Valor Unitário).
         - Normalize nomes de fornecedores e remova espaços extras.
         - Retorne APENAS o JSON no formato especificado abaixo.

      DADOS BRUTOS (TEXTO EXTRAÍDO):
      ---
      ${isPdf ? (extractedText || "Nenhum texto extraído.") : "(Documento enviado como imagem - use visão para extrair)"}
      ---

      FORMATO DE SAÍDA:
      {
        "quotationNumber": "string",
        "quotationTitle": "string",
        "suppliers": [
          {
            "name": "string",
            "cnpj": "string",
            "email": "string",
            "orderNumber": "string",
            "deliveryDeadline": "string",
            "items": [
              {
                "code": "string",
                "description": "string",
                "quantity": number,
                "unitPrice": number,
                "totalValue": number,
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
                content: (extractedText && extractedText.trim().length > 0) ? prompt : [
                    { type: "text", text: prompt },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${fileBase64}`
                        }
                    }
                ]
            }
        ];

        // Se for PDF mas não extraiu texto, provavelmente é um scan.
        if (isPdf && (!extractedText || extractedText.trim().length === 0)) {
            console.error("PDF detected but no text extracted (likely a scan).");
            return new Response(JSON.stringify({
                error: "Este PDF parece ser uma imagem ou estar escaneado, o que impede a extração direta de texto. \n\nDICA: Tente tirar um print (screenshot) das partes principais do relatório e envie como imagem (JPG/PNG). Nosso sistema consegue ler imagens perfeitamente!"
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200, 
            });
        }

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + OPENAI_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages,
                response_format: { type: "json_object" },
                temperature: 0,
                max_tokens: 4096 // Increased for multiple suppliers/pages
            }),
        });

        const aiData = await openaiResponse.json();
        if (aiData.error) {
            console.error("OpenAI Error Response:", JSON.stringify(aiData.error));
            const isTooLarge = aiData.error.code === "context_length_exceeded";
            return new Response(JSON.stringify({
                error: isTooLarge
                    ? "O documento é muito grande para uma única leitura. Por favor, tente enviar menos páginas de cada vez."
                    : `Erro na OpenAI: ${aiData.error.message}`
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const result = JSON.parse(aiData.choices[0].message.content);
        console.log("Extraction successful.");

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Critical Function Error:", error.message);
        return new Response(JSON.stringify({ error: "Erro interno na função: " + error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
