BEGIN;

-- Criar o bucket para anexos de pedidos de compra se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase_order_attachments', 'purchase_order_attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Garantir acesso público de leitura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'purchase_order_attachments');
    END IF;
    
    -- Garantir acesso público ou autenticado de escrita
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'purchase_order_attachments');
    END IF;
END $$;

-- Adicionar a coluna à tabela purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS attachment_url TEXT;

COMMIT;
