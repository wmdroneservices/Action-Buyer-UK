-- Action Buyer UK
-- Supabase Row Level Security Policy Layer

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins manage profiles"
ON profiles FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Quotes
CREATE POLICY "Customers view own quotes"
ON quotes FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Customers create quotes"
ON quotes FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins manage quotes"
ON quotes FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Quote items
CREATE POLICY "Customers view own quote items"
ON quote_items FOR SELECT
USING (quote_id IN (SELECT id FROM quotes WHERE customer_id = auth.uid()));

CREATE POLICY "Admins manage quote items"
ON quote_items FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Valuations (admin only)
CREATE POLICY "Admins manage valuations"
ON valuations FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Offers
CREATE POLICY "Customers view own offers"
ON offers FOR SELECT
USING (quote_id IN (SELECT id FROM quotes WHERE customer_id = auth.uid()));

CREATE POLICY "Admins manage offers"
ON offers FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Audit history
CREATE POLICY "Admins view audit history"
ON audit_history FOR SELECT
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
