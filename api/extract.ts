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

        // 3. Identificar Fornecedores por Card
        // Divide o texto por marcas de início de Card de Fornecedor
        const sections = text.split(/(?:Dados do Fornecedor|CARD DO FORNECEDOR|^FORNECEDOR:?|Razão Social:)/i);
        
        // A primeira seção é ignorada se houver mais de uma (capa/resumo), conforme solicitado
        const startIndex = sections.length > 1 ? 1 : 0;

        for (let i = startIndex; i < sections.length; i++) {
            const section = sections[i];
            const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) continue;

            let supplierName = "";
            const isCityOrHeader = (s: string) => !!s.match(/^(?:CIDADE|LOCAL DE ENTREGA|ENDERE[ÇC]O|BAIRRO|UF|ESTADO|COMPRADOR|SOLICITANTE|RESUMO|SVA|COTA[ÇC][AÃ]O|PAINEL)\b/i) || !!s.match(/(?:CIDADE[:\s]|LOCAL DE ENTREGA|ENDERE[ÇC]O|MUNIC[IÍ]PIO)/i);
            const cleanSupStr = (s: string) => {
                let c = s.split(/CNPJ|Cód\.|Prazo|Faturamento|I\.E\.|Telefone|Email|\/ CIDADE|\/ UF| - CIDADE/i)[0].trim();
                c = c.replace(/^(?:Fornecedor|Razão Social|Empresa)[: ]*/i, '').trim();
                if (isCityOrHeader(c)) return "";
                return c;
            };

            const explicitName = section.match(/(?:Fornecedor|Razão Social|Empresa)[: ]*([^\n\r@]+)/i);
            if (explicitName && !explicitName[1].match(/^CNPJ/i)) {
                supplierName = cleanSupStr(explicitName[1]);
            }
            if (!supplierName) {
                for (let line of lines) {
                    let c = line.replace(/^\d{1,2}\s*[-.]\s*/, '');
                    c = cleanSupStr(c);
                    if (c && c.length >= 3 && !c.match(/^\d+$/) && !c.match(/RELATÓRIO|CONFIRMADOS|APOIO DE COMPRAS|Dados do Fornecedor|CARD DO FORNECEDOR/i)) {
                        supplierName = c;
                        break;
                    }
                }
            }
            if (!supplierName) {
                supplierName = "Fornecedor Identificado";
            }
            
            const explicitCnpj = section.match(/(?:CNPJ|CPF)[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
            const cnpj = explicitCnpj ? explicitCnpj[1] : (section.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/) || [""])[0];

            const orderMatch = section.match(/(?:Cód\.?\s*Ordem de Compra|Cód\.?\s*OC|Ordem de Compra|Nº da Ordem|Nº OC|O\.C\.|OC|Pedido|Autorização de Compra)[: ]*(\d+)/i) || section.match(/Compra[: ]*(\d+)/i);
            const deadlineMatch = section.match(/(?:Prazo de Entrega|Prazo Entrega|Prazo de envio|Prazo)[: ]*([^\n]+)/i) || section.match(/(\d+)\s*dias/i) || section.match(/Entrega[: ]*([\d/]+)/i);

            const supplierData: any = {
                name: supplierName,
                cnpj: cnpj,
                orderNumber: orderMatch ? orderMatch[1] : "",
                deliveryDeadline: deadlineMatch ? deadlineMatch[1].trim().replace(/Faturamento.*$/i, '') : "---",
                items: []
            };

            // Extração de itens com regex ancorado à direita
            const itemRegex = /^(?:(\d{2,12})\s+)?(.+?)\s+(\d{1,6}(?:\.\d{3})*)\s+([A-Z0-9\/\-\.]{1,15})\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2,4}|\d+[\.,]\d{2})(?:\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2,4}|\d+[\.,]\d{2}))?$/gm;
            let match;
            while ((match = itemRegex.exec(section)) !== null) {
                let code = match[1] || "---";
                let desc = match[2].trim();
                const qtyStr = match[3].replace(/\./g, '').replace(',', '.');
                const qty = parseFloat(qtyStr);
                const unit = match[4].toUpperCase();
                const unitPriceStr = match[5].replace(/\./g, '').replace(',', '.');
                const unitPrice = parseFloat(unitPriceStr);
                const totalStr = match[6] ? match[6].replace(/\./g, '').replace(',', '.') : '';
                const totalValue = totalStr ? parseFloat(totalStr) : qty * unitPrice;

                // Separar código e descrição se concatenados
                if (code === "---" || code.length > 12) {
                    const leadCodeMatch = desc.match(/^(\d{2,12})\s*[-:]?\s*(.+)$/);
                    if (leadCodeMatch) {
                        code = leadCodeMatch[1];
                        desc = leadCodeMatch[2].trim();
                    }
                } else {
                    desc = desc.replace(new RegExp('^' + code + '[\\s\\-:]*', 'i'), '').trim();
                }
                desc = desc.replace(/^\d{2,12}\s*[-:]\s*/, '').trim();

                if (desc.length > 2 && !isNaN(qty) && qty > 0 && !isNaN(unitPrice)) {
                    supplierData.items.push({
                        code: code,
                        description: desc,
                        quantity: qty,
                        unitPrice: unitPrice,
                        totalValue: totalValue,
                        unit: unit
                    });
                }
            }

            if (supplierData.items.length > 0 || (supplierData.name !== "Fornecedor Identificado" && supplierData.cnpj)) {
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
