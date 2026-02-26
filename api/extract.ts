import { VercelRequest, VercelResponse } from '@vercel/node';
import pdf from 'pdf-parse';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { fileBase64, fileName } = req.body;

        if (!fileBase64) {
            return res.status(400).json({ error: 'Missing fileBase64' });
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const data = await pdf(buffer);
        const text = data.text;

        // --- ALGORITMO DE EXTRAÇÃO VIA REGEX (APOIO COTAÇÕES) ---
        const result: any = {
            quotationNumber: "",
            quotationTitle: "",
            suppliers: []
        };

        // 1. Número da Cotação
        const quotMatch = text.match(/Cotação[: ]*(\d+)/i) || text.match(/#(\d+)/);
        result.quotationNumber = quotMatch ? quotMatch[1] : (fileName.match(/\d+/) || ["0000"])[0];

        // 2. Título da Cotação
        const titleMatch = text.match(/Título[: ]*([^\n]+)/i);
        result.quotationTitle = titleMatch ? titleMatch[1].trim() : "Relatório de Cotação";

        // 3. Identificar Fornecedores e Itens
        // Este é um parser simplificado baseado em quebras de bloco comuns
        const sections = text.split(/Fornecedor[: ]*/i);
        
        // A primeira seção geralmente é o cabeçalho, as demais são os fornecedores
        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const lines = section.split('\n');
            const supplierName = lines[0].trim();
            
            const supplierData: any = {
                name: supplierName,
                cnpj: (section.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || [""])[0],
                orderNumber: (section.match(/OC[: ]*(\d+)/i) || [""])[1] || "",
                deliveryDeadline: (section.match(/(\d+)\s*dias/i) || [""])[1] || "5",
                items: []
            };

            // Extração de itens (busca por linhas que pareçam conter valores monetários e quantidades)
            // Regex para capturar: [Código] [Descrição...] [Qtd] [Unidade] [Preço] [Total]
            // Exemplo: 1234 Material Hospitalar 100 UN 10,50 1050,00
            const itemRegex = /(?:(\d+)\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s+(UN|CX|PC|FR|KG|ML)\s+([\d,.]+)\s+([\d,.]+)/gi;
            let match;
            while ((match = itemRegex.exec(section)) !== null) {
                supplierData.items.push({
                    code: match[1] || "---",
                    description: match[2].trim(),
                    quantity: parseFloat(match[3].replace(',', '.')),
                    unitPrice: parseFloat(match[5].replace('.', '').replace(',', '.')),
                    totalValue: parseFloat(match[6].replace('.', '').replace(',', '.')),
                    unit: match[4]
                });
            }

            if (supplierData.items.length > 0 || supplierData.name) {
                result.suppliers.push(supplierData);
            }
        }

        // Se não encontrou fornecedores via split, tenta uma busca bruta
        if (result.suppliers.length === 0) {
            const rawCNPJ = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
            if (rawCNPJ) {
                rawCNPJ.forEach(cnpj => {
                    result.suppliers.push({
                        name: "Fornecedor Identificado",
                        cnpj: cnpj,
                        items: []
                    });
                });
            }
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
