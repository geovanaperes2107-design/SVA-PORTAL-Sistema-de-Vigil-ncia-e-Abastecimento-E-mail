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

        let images: string[] = [];
        let fileName: string = "documento.pdf";

        try {
            const parsed = JSON.parse(bodyText);
            if (Array.isArray(parsed.images)) {
                images = parsed.images;
                console.log(`[INFO] Received ${images.length} images from frontend.`);
            } else if (parsed.fileBase64) {
                images = [parsed.fileBase64];
            }
            fileName = parsed.fileName || fileName;
        } catch (e) {
            throw new Error("Invalid JSON body received.");
        }

        if (images.length === 0) throw new Error("Missing images or fileBase64 in request body.");

        const isPdf = fileName.toLowerCase().endsWith(".pdf");
        let extractedText = "";

        // Only try server-side PDF parsing if we didn't get images from frontend
        if (isPdf && images.length === 1 && !bodyText.includes('"images"')) {
            try {
                const binaryString = atob(images[0]);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const { default: pdf } = await import("https://esm.sh/pdf-parse@1.1.1?no-check");
                const data = await pdf(bytes);
                extractedText = data.text;
                console.log(`[INFO] Server-side PDF extraction successful. Length: ${extractedText?.length || 0}`);
            } catch (err) {
                console.error("PDF Parse Error:", err.message);
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

        const userContent: any[] = [{ type: "text", text: prompt }];
        
        // Add extracted text if available
        if (extractedText && extractedText.trim().length > 0) {
            userContent.push({ type: "text", text: `DADOS EXTRAÍDOS VIA OCR/TEXTO:\n---\n${extractedText}\n---` });
        }

        // Add images to vision prompt
        images.forEach((imgBase64, idx) => {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: `data:image/jpeg;base64,${imgBase64}`,
                    detail: "high"
                }
            });
            console.log(`[INFO] Added image ${idx + 1}/${images.length} to prompt.`);
        });

        const messages = [
            {
                role: "system",
                content: "Você é um extrator de dados JSON altamente preciso. Sua prioridade é a integridade dos dados e a correta separação de fornecedores."
            },
            {
                role: "user",
                content: userContent
            }
        ];

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + OPENAI_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages,
                response_format: { type: "json_object" },
                temperature: 0,
                max_tokens: 4096 
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
