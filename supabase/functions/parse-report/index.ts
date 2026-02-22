import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import pdf from "https://esm.sh/pdf-parse@1.1.1?no-check";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { fileBase64, fileName } = await req.json();
        if (!fileBase64) throw new Error("Missing file data");

        const binaryString = atob(fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const isPdf = fileName.toLowerCase().endsWith(".pdf");
        let extractedText = "";

        if (isPdf) {
            try {
                const data = await pdf(bytes);
                extractedText = data.text;
                if (!extractedText || extractedText.trim().length === 0) {
                    console.log("PDF parsed but no text found. Might be an image-based PDF.");
                }
            } catch (err) {
                console.error("PDF Parse Error:", err);
                throw new Error("Erro ao ler o PDF. Verifique se o arquivo não está protegido.");
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
