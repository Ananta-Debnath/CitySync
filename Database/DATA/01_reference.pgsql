-- =============================================================
-- FILE: 01_reference.sql
-- PURPOSE: Seed reference/lookup tables that other tables depend on.
--   - BANK_NAME: list of Bangladeshi banks
--   - MOBILE_BANKING_PROVIDER: bKash, Nagad, Rocket, Upay
-- Run this FIRST before any other seed file.
-- =============================================================

INSERT INTO bank_name (bank_name) VALUES
  ('Dutch-Bangla Bank'),
  ('BRAC Bank'),
  ('Islami Bank Bangladesh'),
  ('Eastern Bank'),
  ('City Bank'),
  ('Mutual Trust Bank'),
  ('Southeast Bank'),
  ('Prime Bank');

INSERT INTO mobile_banking_provider (provider_name) VALUES
  ('bKash'),
  ('Nagad'),
  ('Rocket'),
  ('Upay');
