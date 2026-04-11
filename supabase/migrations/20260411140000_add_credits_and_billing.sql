-- Credits, Paddle billing fields, transaction log, RPC helpers

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_balance int DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paddle_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_cycle_end timestamptz;

UPDATE profiles SET credits_balance = 20 WHERE credits_balance IS NULL;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount int NOT NULL,
  action text NOT NULL,
  balance_after int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own transactions" ON credit_transactions;
CREATE POLICY "Users see own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS paddle_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

ALTER TABLE paddle_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount int, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance int;
  new_balance int;
BEGIN
  SELECT credits_balance INTO current_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN false;
  END IF;

  new_balance := current_balance - p_amount;
  UPDATE profiles SET credits_balance = new_balance WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, action, balance_after)
  VALUES (p_user_id, -p_amount, p_action, new_balance);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount int, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance int;
BEGIN
  UPDATE profiles
  SET credits_balance = credits_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO new_balance;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, action, balance_after)
  VALUES (p_user_id, p_amount, p_action, new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits(uuid, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_credits(uuid, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, int, text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_profile_billing_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.credits_balance IS NULL THEN
    NEW.credits_balance := 20;
  END IF;
  IF NEW.plan IS NULL OR NEW.plan = '' THEN
    NEW.plan := 'free';
  END IF;
  IF NEW.subscription_status IS NULL OR NEW.subscription_status = '' THEN
    NEW.subscription_status := 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_billing_defaults ON profiles;
CREATE TRIGGER tr_profiles_billing_defaults
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_billing_defaults();
