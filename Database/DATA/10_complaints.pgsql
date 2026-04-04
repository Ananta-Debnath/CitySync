-- =============================================================
-- FILE: 10_complaints.sql
-- PURPOSE: Seed complaints across all 25 field workers with
--          realistic resolution times designed to produce
--          meaningful analytics in the field_worker_stats view.
--
-- PERFORMANCE PROFILES (reflected in assignment_date → resolution_date gaps):
--   HIGH performers    (FW 11,12,13,14,19,23,27,32,34):  1–3 days avg
--   AVERAGE performers (FW 15,17,18,21,22,25,26,28,31,35): 4–7 days avg
--   POOR performers    (FW 16,20,24,29,30,33):  8–20 days avg (or unresolved)
--
-- Each field worker gets 3 complaints:
--   • 2 Resolved  (with resolution_date)
--   • 1 Pending or In Progress
-- Total: 75 complaints
--
-- Complaints are distributed across consumers and connections.
-- =============================================================

INSERT INTO complaint (
  consumer_id, connection_id, assigned_by, assigned_to,
  complaint_date, description, status,
  assignment_date, resolution_date, remarks, priority
) VALUES

-- ══════════════════════════════════════════════════════════════
-- HIGH PERFORMERS — resolve in 1–3 days
-- ══════════════════════════════════════════════════════════════

-- FW 11: Delwar Mia (Mirpur, Electrical) — HIGH
(1, 1, 9, 11, '2024-10-01 09:00:00', 'Electricity meter not recording correctly', 'Resolved',
 '2024-10-01 10:00:00', '2024-10-02 14:00:00', 'Meter recalibrated', 'Normal'),
(1, 1, 9, 11, '2024-11-15 08:30:00', 'Voltage fluctuation causing appliance damage', 'Resolved',
 '2024-11-15 09:30:00', '2024-11-17 11:00:00', 'Line stabilised', 'High'),
(2, 4, 9, 11, '2025-01-10 10:00:00', 'No electricity since morning', 'In Progress',
 '2025-01-10 11:00:00', NULL, NULL, 'High'),

-- FW 12: Nasima Akhter (Mirpur, Electrical) — HIGH
(1, 2, 9, 12, '2024-09-05 09:00:00', 'Prepaid water meter balance depleted faster than expected', 'Resolved',
 '2024-09-05 10:00:00', '2024-09-07 12:00:00', 'Meter leak fixed', 'Normal'),
(4, 6, 9, 12, '2024-12-10 08:00:00', 'Water supply intermittent', 'Resolved',
 '2024-12-10 09:00:00', '2024-12-11 15:00:00', 'Pressure valve repaired', 'Normal'),
(6, 8, 9, 12, '2025-02-05 11:00:00', 'Electricity prepaid meter showing error code', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 13: Rubel Hasan (Mirpur, Plumbing) — HIGH
(1, 3, 9, 13, '2024-08-12 09:00:00', 'Gas smell near meter connection', 'Resolved',
 '2024-08-12 09:30:00', '2024-08-13 16:00:00', 'Pipe joint sealed', 'High'),
(5, 5, 9, 13, '2024-10-20 10:00:00', 'Gas pressure very low', 'Resolved',
 '2024-10-20 11:00:00', '2024-10-22 13:00:00', 'Regulator replaced', 'Normal'),
(7, 7, 9, 13, '2025-01-20 08:00:00', 'Gas meter reading seems incorrect', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 14: Jahanara Sultana (Mohammadpur) — HIGH
(2, 4, 10, 14, '2024-09-18 09:00:00', 'Electricity bill too high for usage', 'Resolved',
 '2024-09-18 10:00:00', '2024-09-20 14:00:00', 'Faulty meter replaced', 'Normal'),
(1, 1, 10, 14, '2024-11-22 08:30:00', 'Power outage — partial feeder', 'Resolved',
 '2024-11-22 09:00:00', '2024-11-23 10:00:00', 'Feeder restored', 'High'),
(3, 9, 10, 14, '2025-02-14 10:00:00', 'Commercial meter seal broken', 'In Progress',
 '2025-02-14 11:00:00', NULL, NULL, 'Normal'),

-- FW 19: Faisal Ahmed (Uttara) — HIGH
(4, 6, 9, 19, '2024-10-05 09:00:00', 'Water meter reading not updating', 'Resolved',
 '2024-10-05 10:00:00', '2024-10-07 15:00:00', 'Meter firmware updated', 'Normal'),
(8, 10, 9, 19, '2024-12-01 08:00:00', 'Low water pressure in prepaid connection', 'Resolved',
 '2024-12-01 09:00:00', '2024-12-02 13:00:00', 'Inlet filter cleared', 'Normal'),
(4, 6, 9, 19, '2025-03-10 10:00:00', 'Water discolouration reported', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 23: Alamgir Hossain (Motijheel) — HIGH
(7, 7, 10, 23, '2024-09-22 09:00:00', 'Gas burner not igniting — supply issue', 'Resolved',
 '2024-09-22 10:00:00', '2024-09-24 16:00:00', 'Pipeline blockage removed', 'Normal'),
(3, 9, 10, 23, '2024-11-10 08:00:00', 'Commercial electricity tripping frequently', 'Resolved',
 '2024-11-10 09:00:00', '2024-11-11 12:00:00', 'MCB upgraded', 'High'),
(5, 5, 10, 23, '2025-01-15 09:30:00', 'Meter display blank', 'In Progress',
 '2025-01-15 10:30:00', NULL, NULL, 'Normal'),

-- FW 27: Enamul Haq (Khilgaon) — HIGH
(2, 4, 9, 27, '2024-10-14 09:00:00', 'Power supply unstable evening hours', 'Resolved',
 '2024-10-14 10:00:00', '2024-10-16 14:00:00', 'Line tightened', 'Normal'),
(6, 8, 9, 27, '2024-12-20 08:30:00', 'Prepaid balance deducted but meter inactive', 'Resolved',
 '2024-12-20 09:30:00', '2024-12-21 11:00:00', 'Meter reset', 'High'),
(8, 10, 9, 27, '2025-02-20 10:00:00', 'Water meter not communicating', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 32: Tamanna Akter (Paltan) — HIGH
(3, 9, 10, 32, '2024-11-05 09:00:00', 'Office electricity fluctuating during peak hours', 'Resolved',
 '2024-11-05 10:00:00', '2024-11-07 15:00:00', 'Load balanced', 'High'),
(7, 7, 10, 32, '2025-01-08 08:00:00', 'Gas smell in corridor', 'Resolved',
 '2025-01-08 08:30:00', '2025-01-09 11:00:00', 'Valve tightened — no leak', 'High'),
(1, 1, 10, 32, '2025-03-12 09:00:00', 'Smart meter not syncing to app', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 34: Nazia Islam (Gulshan) — HIGH
(5, 5, 9, 34, '2024-10-25 09:00:00', 'Commercial meter tamper alert', 'Resolved',
 '2024-10-25 10:00:00', '2024-10-27 16:00:00', 'Meter sealed and logged', 'High'),
(3, 9, 9, 34, '2024-12-15 08:00:00', 'Demand charge seems too high', 'Resolved',
 '2024-12-15 09:00:00', '2024-12-16 14:00:00', 'Load audit done, charge correct', 'Normal'),
(7, 7, 9, 34, '2025-02-28 10:00:00', 'Gas meter stuck at same reading for 2 months', 'In Progress',
 '2025-02-28 11:00:00', NULL, NULL, 'High'),

-- ══════════════════════════════════════════════════════════════
-- AVERAGE PERFORMERS — resolve in 4–7 days
-- ══════════════════════════════════════════════════════════════

-- FW 15: Minhaj Uddin (Mohammadpur, Gas) — AVERAGE
(1, 3, 9, 15, '2024-10-08 09:00:00', 'Gas supply cut without notice', 'Resolved',
 '2024-10-08 10:00:00', '2024-10-13 14:00:00', 'Mainline repair completed', 'Normal'),
(5, 5, 9, 15, '2024-12-18 08:30:00', 'Gas meter making noise', 'Resolved',
 '2024-12-18 09:30:00', '2024-12-23 11:00:00', 'Meter replaced', 'Normal'),
(7, 7, 9, 15, '2025-02-10 10:00:00', 'Low gas pressure for 3 days', 'In Progress',
 '2025-02-10 11:00:00', NULL, NULL, 'Normal'),

-- FW 17: Sohel Rana (Dhanmondi) — AVERAGE
(2, 4, 10, 17, '2024-09-28 09:00:00', 'Electricity meter spinning fast at night', 'Resolved',
 '2024-09-28 10:00:00', '2024-10-04 13:00:00', 'Meter calibrated', 'Normal'),
(4, 6, 10, 17, '2024-11-30 08:00:00', 'Water pipe burst near meter', 'Resolved',
 '2024-11-30 09:00:00', '2024-12-05 16:00:00', 'Pipe replaced', 'High'),
(6, 8, 10, 17, '2025-01-25 10:00:00', 'Smart meter battery low alert', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 18: Roksana Begum (Dhanmondi, Plumbing) — AVERAGE
(8, 10, 9, 18, '2024-10-18 09:00:00', 'Water pressure dropped significantly', 'Resolved',
 '2024-10-18 10:00:00', '2024-10-24 15:00:00', 'Main valve partially closed — fixed', 'Normal'),
(1, 2, 9, 18, '2024-12-28 08:30:00', 'Prepaid water credit not added after payment', 'Resolved',
 '2024-12-28 09:30:00', '2025-01-03 12:00:00', 'System sync issue resolved', 'High'),
(2, 4, 9, 18, '2025-03-01 10:00:00', 'Water leak at meter joint', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 21: Rakib Hossain (Tejgaon) — AVERAGE
(3, 9, 10, 21, '2024-11-18 09:00:00', 'Industrial meter seal missing', 'Resolved',
 '2024-11-18 10:00:00', '2024-11-24 14:00:00', 'Meter resealed', 'Normal'),
(5, 5, 10, 21, '2025-01-12 08:00:00', 'Frequent tripping of commercial connection', 'Resolved',
 '2025-01-12 09:00:00', '2025-01-17 11:00:00', 'Phase imbalance corrected', 'High'),
(7, 7, 10, 21, '2025-03-08 10:00:00', 'Commercial meter reading seems low', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 22: Sumaiya Islam (Tejgaon, Plumbing) — AVERAGE
(4, 6, 9, 22, '2024-10-30 09:00:00', 'Water tank overflow — check meter', 'Resolved',
 '2024-10-30 10:00:00', '2024-11-05 14:00:00', 'Float valve replaced', 'Normal'),
(8, 10, 9, 22, '2025-01-22 08:30:00', 'Water meter seal damaged', 'Resolved',
 '2025-01-22 09:30:00', '2025-01-28 13:00:00', 'Seal replaced', 'Normal'),
(6, 8, 9, 22, '2025-03-15 10:00:00', 'No water supply for 24 hours', 'In Progress',
 '2025-03-15 11:00:00', NULL, NULL, 'High'),

-- FW 25: Monir Ahmed (Lalbagh) — AVERAGE
(2, 4, 9, 25, '2024-11-25 09:00:00', 'Electricity bill dispute — wrong meter read', 'Resolved',
 '2024-11-25 10:00:00', '2024-12-01 14:00:00', 'Reading verified and corrected', 'Normal'),
(1, 1, 9, 25, '2025-02-18 08:00:00', 'Street-level fault affecting home supply', 'Resolved',
 '2025-02-18 09:00:00', '2025-02-23 15:00:00', 'Street cable repaired', 'High'),
(3, 9, 9, 25, '2025-03-20 10:00:00', 'New connection meter not activated', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 26: Shirina Begum (Lalbagh, Gas) — AVERAGE
(5, 5, 10, 26, '2024-09-10 09:00:00', 'Gas bill higher than last year', 'Resolved',
 '2024-09-10 10:00:00', '2024-09-15 13:00:00', 'Usage audit completed', 'Normal'),
(7, 7, 10, 26, '2024-12-05 08:30:00', 'Gas meter not accessible — overgrown', 'Resolved',
 '2024-12-05 09:30:00', '2024-12-11 11:00:00', 'Area cleared, meter read', 'Normal'),
(1, 3, 10, 26, '2025-02-22 10:00:00', 'Rahim complaint: gas bill spike Jan 2025', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 28: Dilruba Khatun (Khilgaon) — AVERAGE
(4, 6, 9, 28, '2024-10-22 09:00:00', 'Water meter leaking from housing', 'Resolved',
 '2024-10-22 10:00:00', '2024-10-28 16:00:00', 'Housing gasket replaced', 'Normal'),
(2, 4, 9, 28, '2025-01-18 08:00:00', 'Faulty reading — meter digital display corrupt', 'Resolved',
 '2025-01-18 09:00:00', '2025-01-23 14:00:00', 'Display board replaced', 'Normal'),
(8, 10, 9, 28, '2025-03-05 10:00:00', 'Water meter access obstructed', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 31: Raihan Kabir (Rampura) — AVERAGE
(3, 9, 10, 31, '2024-11-08 09:00:00', 'Power factor charge too high on commercial bill', 'Resolved',
 '2024-11-08 10:00:00', '2024-11-14 15:00:00', 'Capacitor bank added', 'Normal'),
(5, 5, 10, 31, '2025-01-28 08:30:00', 'Meter door seal broken', 'Resolved',
 '2025-01-28 09:30:00', '2025-02-03 12:00:00', 'Seal replaced', 'Normal'),
(7, 7, 10, 31, '2025-03-18 10:00:00', 'Old meter requested to be replaced', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 35: Touhid Hossain (Banani, Gas) — AVERAGE
(1, 3, 9, 35, '2024-09-30 09:00:00', 'Gas connection making hissing sound', 'Resolved',
 '2024-09-30 09:30:00', '2024-10-05 14:00:00', 'Connection tightened', 'High'),
(5, 5, 9, 35, '2024-12-22 08:00:00', 'Gas supply pressure low in building', 'Resolved',
 '2024-12-22 09:00:00', '2024-12-28 11:00:00', 'Line upgraded', 'Normal'),
(3, 9, 9, 35, '2025-02-25 10:00:00', 'Commercial gas bill discrepancy', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- ══════════════════════════════════════════════════════════════
-- POOR PERFORMERS — resolve in 8–20 days or leave unresolved
-- ══════════════════════════════════════════════════════════════

-- FW 16: Parveen Akter (Mohammadpur) — POOR
(6, 8, 10, 16, '2024-09-15 09:00:00', 'Electricity prepaid meter not accepting recharge', 'Resolved',
 '2024-09-15 10:00:00', '2024-09-28 16:00:00', 'Meter replaced after multiple attempts', 'High'),
(2, 4, 10, 16, '2024-11-20 08:30:00', 'Power cut complaint — no response from office', 'Resolved',
 '2024-11-20 09:30:00', '2024-12-08 12:00:00', 'Resolved after escalation', 'High'),
(4, 6, 10, 16, '2025-01-05 10:00:00', 'Water meter not installed after 2 weeks', 'In Progress',
 '2025-01-05 11:00:00', NULL, NULL, 'High'),

-- FW 20: Sharmin Sultana (Uttara, Gas) — POOR
(1, 3, 9, 20, '2024-10-12 09:00:00', 'Gas connection disconnected without reason', 'Resolved',
 '2024-10-12 10:00:00', '2024-10-25 14:00:00', 'Administrative error corrected', 'High'),
(7, 7, 9, 20, '2024-12-08 08:30:00', 'Gas supply missing for 5 days', 'Resolved',
 '2024-12-08 09:30:00', '2024-12-26 11:00:00', 'Pipeline work delayed, eventually restored', 'High'),
(5, 5, 9, 20, '2025-02-08 10:00:00', 'Gas meter broken — no replacement scheduled', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 24: Khaleda Parvin (Motijheel, Gas) — POOR
(3, 9, 10, 24, '2024-09-25 09:00:00', 'Commercial meter access issue — locked cabinet', 'Resolved',
 '2024-09-25 10:00:00', '2024-10-09 15:00:00', 'Lock drilled after extended delay', 'Normal'),
(1, 2, 10, 24, '2024-11-28 08:00:00', 'Prepaid water balance issue after system update', 'Resolved',
 '2024-11-28 09:00:00', '2024-12-16 13:00:00', 'Resolved after repeated escalation', 'High'),
(8, 10, 10, 24, '2025-01-30 10:00:00', 'Water meter stuck — no action taken for 3 weeks', 'In Progress',
 '2025-01-30 11:00:00', NULL, NULL, 'High'),

-- FW 29: Saiful Islam (Badda) — POOR
(2, 4, 9, 29, '2024-10-16 09:00:00', 'Electricity tripping at night — safety concern', 'Resolved',
 '2024-10-16 10:00:00', '2024-10-30 14:00:00', 'Earthing wire repaired after delays', 'High'),
(4, 6, 9, 29, '2024-12-14 08:30:00', 'Water supply completely cut off', 'Resolved',
 '2024-12-14 09:30:00', '2025-01-03 12:00:00', 'Valve issue resolved after holiday delay', 'High'),
(6, 8, 9, 29, '2025-02-12 10:00:00', 'Meter reading not submitted for 6 weeks', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 30: Morsheda Begum (Badda, Gas) — POOR
(5, 5, 10, 30, '2024-11-02 09:00:00', 'Gas meter malfunction — inaccurate reading', 'Resolved',
 '2024-11-02 10:00:00', '2024-11-18 16:00:00', 'Meter replaced after prolonged testing', 'Normal'),
(7, 7, 10, 30, '2025-01-14 08:00:00', 'Entire floor without gas supply', 'Resolved',
 '2025-01-14 09:00:00', '2025-01-31 13:00:00', 'Main regulator replaced after 17 days', 'High'),
(3, 9, 10, 30, '2025-03-02 10:00:00', 'Gas meter installation incomplete', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 33: Mizanur Rahman (Shahbagh, Plumbing) — POOR
(8, 10, 9, 33, '2024-10-28 09:00:00', 'Water meter pipes corroded', 'Resolved',
 '2024-10-28 10:00:00', '2024-11-16 15:00:00', 'Pipes replaced after material procurement delay', 'Normal'),
(2, 4, 9, 33, '2025-01-06 08:30:00', 'No response to reported water leak for 2 weeks', 'Resolved',
 '2025-01-06 09:30:00', '2025-01-24 12:00:00', 'Resolved after consumer escalation', 'High'),
(1, 2, 9, 33, '2025-03-25 10:00:00', 'Prepaid water credit not reflecting', 'Pending',
 NULL, NULL, NULL, 'Normal');



-- =============================================================
-- FILE: 10_complaints.sql
-- PURPOSE: 75 complaints across 25 field workers (3 each).
--          Timeline: Oct 2025 → Mar 2026, matching usage/billing history.
--
-- PERFORMANCE PROFILES (resolution gap):
--   HIGH    (FW 11,12,13,14,19,23,27,32,34): resolve in 1–3 days
--   AVERAGE (FW 15,17,18,21,22,25,26,28,31,35): resolve in 4–7 days
--   POOR    (FW 16,20,24,29,30,33): resolve in 8–20 days or unresolved
--
-- Each worker: 2 Resolved + 1 Pending/In Progress
-- =============================================================

INSERT INTO complaint (
  consumer_id, connection_id, assigned_by, assigned_to,
  complaint_date, description, status,
  assignment_date, resolution_date, remarks, priority
) VALUES

-- ══════════════════════════════════════════════════════════════
-- HIGH PERFORMERS — resolve in 1–3 days
-- ══════════════════════════════════════════════════════════════

-- FW 11: Delwar Mia (Mirpur) — HIGH
(1, 1, 9, 11, '2025-10-03 09:00:00', 'Electricity meter not recording correctly', 'Resolved',
 '2025-10-03 10:00:00', '2025-10-04 14:00:00', 'Meter recalibrated', 'Normal'),
(1, 1, 9, 11, '2025-12-10 08:30:00', 'Voltage fluctuation causing appliance damage', 'Resolved',
 '2025-12-10 09:30:00', '2025-12-12 11:00:00', 'Line stabilised', 'High'),
(2, 4, 9, 11, '2026-02-05 10:00:00', 'No electricity since morning', 'In Progress',
 '2026-02-05 11:00:00', NULL, NULL, 'High'),

-- FW 12: Nasima Akhter (Mirpur) — HIGH
(1, 2, 9, 12, '2025-10-08 09:00:00', 'Prepaid water meter balance depleting faster than expected', 'Resolved',
 '2025-10-08 10:00:00', '2025-10-10 12:00:00', 'Meter leak fixed', 'Normal'),
(4, 6, 9, 12, '2025-12-18 08:00:00', 'Water supply intermittent for 3 days', 'Resolved',
 '2025-12-18 09:00:00', '2025-12-19 15:00:00', 'Pressure valve repaired', 'Normal'),
(6, 8, 9, 12, '2026-02-20 11:00:00', 'Electricity prepaid meter showing error code', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 13: Rubel Hasan (Mirpur) — HIGH
(1, 3, 9, 13, '2025-10-15 09:00:00', 'Gas smell near meter connection', 'Resolved',
 '2025-10-15 09:30:00', '2025-10-16 16:00:00', 'Pipe joint sealed', 'High'),
(5, 5, 9, 13, '2025-12-22 10:00:00', 'Gas pressure very low', 'Resolved',
 '2025-12-22 11:00:00', '2025-12-24 13:00:00', 'Regulator replaced', 'Normal'),
(7, 7, 9, 13, '2026-02-10 08:00:00', 'Gas meter reading seems incorrect', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 14: Jahanara Sultana (Mohammadpur) — HIGH
(2, 4, 10, 14, '2025-10-20 09:00:00', 'Electricity bill too high relative to usage', 'Resolved',
 '2025-10-20 10:00:00', '2025-10-22 14:00:00', 'Faulty meter replaced', 'Normal'),
(1, 1, 10, 14, '2026-01-08 08:30:00', 'Power outage — partial feeder fault', 'Resolved',
 '2026-01-08 09:00:00', '2026-01-09 10:00:00', 'Feeder restored', 'High'),
(3, 9, 10, 14, '2026-03-01 10:00:00', 'Commercial meter seal broken', 'In Progress',
 '2026-03-01 11:00:00', NULL, NULL, 'Normal'),

-- FW 19: Faisal Ahmed (Uttara) — HIGH
(4, 6, 9, 19, '2025-10-25 09:00:00', 'Water meter reading not updating', 'Resolved',
 '2025-10-25 10:00:00', '2025-10-27 15:00:00', 'Meter firmware updated', 'Normal'),
(8, 10, 9, 19, '2026-01-12 08:00:00', 'Low water pressure in prepaid connection', 'Resolved',
 '2026-01-12 09:00:00', '2026-01-13 13:00:00', 'Inlet filter cleared', 'Normal'),
(4, 6, 9, 19, '2026-03-05 10:00:00', 'Water discolouration reported', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 23: Alamgir Hossain (Motijheel) — HIGH
(7, 7, 10, 23, '2025-11-03 09:00:00', 'Gas burner not igniting — supply issue', 'Resolved',
 '2025-11-03 10:00:00', '2025-11-05 16:00:00', 'Pipeline blockage removed', 'Normal'),
(3, 9, 10, 23, '2026-01-18 08:00:00', 'Commercial electricity tripping frequently', 'Resolved',
 '2026-01-18 09:00:00', '2026-01-19 12:00:00', 'MCB upgraded', 'High'),
(5, 5, 10, 23, '2026-03-10 09:30:00', 'Meter display blank', 'In Progress',
 '2026-03-10 10:30:00', NULL, NULL, 'Normal'),

-- FW 27: Enamul Haq (Khilgaon) — HIGH
(2, 4, 9, 27, '2025-11-10 09:00:00', 'Power supply unstable during evening hours', 'Resolved',
 '2025-11-10 10:00:00', '2025-11-12 14:00:00', 'Line tightened', 'Normal'),
(6, 8, 9, 27, '2026-01-22 08:30:00', 'Prepaid balance deducted but meter inactive', 'Resolved',
 '2026-01-22 09:30:00', '2026-01-23 11:00:00', 'Meter reset', 'High'),
(8, 10, 9, 27, '2026-03-12 10:00:00', 'Water meter not communicating', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 32: Tamanna Akter (Paltan) — HIGH
(3, 9, 10, 32, '2025-11-18 09:00:00', 'Office electricity fluctuating during peak hours', 'Resolved',
 '2025-11-18 10:00:00', '2025-11-20 15:00:00', 'Load balanced', 'High'),
(7, 7, 10, 32, '2026-02-02 08:00:00', 'Gas smell in corridor near connection', 'Resolved',
 '2026-02-02 08:30:00', '2026-02-03 11:00:00', 'Valve tightened — no leak found', 'High'),
(1, 1, 10, 32, '2026-03-18 09:00:00', 'Smart meter not syncing to app', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 34: Nazia Islam (Gulshan) — HIGH
(5, 5, 9, 34, '2025-11-25 09:00:00', 'Commercial meter tamper alert triggered', 'Resolved',
 '2025-11-25 10:00:00', '2025-11-27 16:00:00', 'Meter sealed and logged', 'High'),
(3, 9, 9, 34, '2026-02-08 08:00:00', 'Demand charge seems unusually high', 'Resolved',
 '2026-02-08 09:00:00', '2026-02-09 14:00:00', 'Load audit done, charge correct', 'Normal'),
(7, 7, 9, 34, '2026-03-22 10:00:00', 'Gas meter stuck at same reading for 2 months', 'In Progress',
 '2026-03-22 11:00:00', NULL, NULL, 'High'),

-- ══════════════════════════════════════════════════════════════
-- AVERAGE PERFORMERS — resolve in 4–7 days
-- ══════════════════════════════════════════════════════════════

-- FW 15: Minhaj Uddin (Mohammadpur) — AVERAGE
(1, 3, 9, 15, '2025-10-06 09:00:00', 'Gas supply cut without prior notice', 'Resolved',
 '2025-10-06 10:00:00', '2025-10-11 14:00:00', 'Mainline repair completed', 'Normal'),
(5, 5, 9, 15, '2025-12-15 08:30:00', 'Gas meter making unusual noise', 'Resolved',
 '2025-12-15 09:30:00', '2025-12-20 11:00:00', 'Meter replaced', 'Normal'),
(7, 7, 9, 15, '2026-02-14 10:00:00', 'Low gas pressure reported for 3 days', 'In Progress',
 '2026-02-14 11:00:00', NULL, NULL, 'Normal'),

-- FW 17: Sohel Rana (Dhanmondi) — AVERAGE
(2, 4, 10, 17, '2025-10-12 09:00:00', 'Electricity meter spinning fast at night', 'Resolved',
 '2025-10-12 10:00:00', '2025-10-18 13:00:00', 'Meter calibrated', 'Normal'),
(4, 6, 10, 17, '2025-12-28 08:00:00', 'Water pipe burst near meter box', 'Resolved',
 '2025-12-28 09:00:00', '2026-01-03 16:00:00', 'Pipe replaced', 'High'),
(6, 8, 10, 17, '2026-02-22 10:00:00', 'Smart meter battery low alert', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 18: Roksana Begum (Dhanmondi) — AVERAGE
(8, 10, 9, 18, '2025-10-18 09:00:00', 'Water pressure dropped significantly', 'Resolved',
 '2025-10-18 10:00:00', '2025-10-24 15:00:00', 'Main valve partially closed — fixed', 'Normal'),
(1, 2, 9, 18, '2026-01-05 08:30:00', 'Prepaid water credit not added after payment', 'Resolved',
 '2026-01-05 09:30:00', '2026-01-11 12:00:00', 'System sync issue resolved', 'High'),
(2, 4, 9, 18, '2026-03-08 10:00:00', 'Water leak at meter joint', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 21: Rakib Hossain (Tejgaon) — AVERAGE
(3, 9, 10, 21, '2025-11-05 09:00:00', 'Industrial meter seal found missing', 'Resolved',
 '2025-11-05 10:00:00', '2025-11-11 14:00:00', 'Meter resealed', 'Normal'),
(5, 5, 10, 21, '2026-01-14 08:00:00', 'Frequent tripping of commercial connection', 'Resolved',
 '2026-01-14 09:00:00', '2026-01-19 11:00:00', 'Phase imbalance corrected', 'High'),
(7, 7, 10, 21, '2026-03-14 10:00:00', 'Commercial meter reading seems low', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 22: Sumaiya Islam (Tejgaon) — AVERAGE
(4, 6, 9, 22, '2025-11-12 09:00:00', 'Water tank overflow — check meter valve', 'Resolved',
 '2025-11-12 10:00:00', '2025-11-18 14:00:00', 'Float valve replaced', 'Normal'),
(8, 10, 9, 22, '2026-01-28 08:30:00', 'Water meter seal damaged', 'Resolved',
 '2026-01-28 09:30:00', '2026-02-03 13:00:00', 'Seal replaced', 'Normal'),
(6, 8, 9, 22, '2026-03-20 10:00:00', 'No water supply for 24 hours', 'In Progress',
 '2026-03-20 11:00:00', NULL, NULL, 'High'),

-- FW 25: Monir Ahmed (Lalbagh) — AVERAGE
(2, 4, 9, 25, '2025-11-20 09:00:00', 'Electricity bill dispute — incorrect meter read', 'Resolved',
 '2025-11-20 10:00:00', '2025-11-26 14:00:00', 'Reading verified and corrected', 'Normal'),
(1, 1, 9, 25, '2026-02-16 08:00:00', 'Street-level fault affecting home supply', 'Resolved',
 '2026-02-16 09:00:00', '2026-02-21 15:00:00', 'Street cable repaired', 'High'),
(3, 9, 9, 25, '2026-03-25 10:00:00', 'New connection meter not activated', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 26: Shirina Begum (Lalbagh) — AVERAGE
(5, 5, 10, 26, '2025-11-28 09:00:00', 'Gas bill higher than same period last year', 'Resolved',
 '2025-11-28 10:00:00', '2025-12-03 13:00:00', 'Usage audit completed', 'Normal'),
(7, 7, 10, 26, '2026-02-12 08:30:00', 'Gas meter not accessible — area overgrown', 'Resolved',
 '2026-02-12 09:30:00', '2026-02-18 11:00:00', 'Area cleared, meter read', 'Normal'),
(1, 3, 10, 26, '2026-03-28 10:00:00', 'Gas bill spike reported by consumer', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 28: Dilruba Khatun (Khilgaon) — AVERAGE
(4, 6, 9, 28, '2025-12-05 09:00:00', 'Water meter leaking from housing', 'Resolved',
 '2025-12-05 10:00:00', '2025-12-11 16:00:00', 'Housing gasket replaced', 'Normal'),
(2, 4, 9, 28, '2026-02-18 08:00:00', 'Faulty reading — meter digital display corrupt', 'Resolved',
 '2026-02-18 09:00:00', '2026-02-23 14:00:00', 'Display board replaced', 'Normal'),
(8, 10, 9, 28, '2026-03-30 10:00:00', 'Water meter access obstructed by construction', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 31: Raihan Kabir (Rampura) — AVERAGE
(3, 9, 10, 31, '2025-12-10 09:00:00', 'Power factor charge too high on commercial bill', 'Resolved',
 '2025-12-10 10:00:00', '2025-12-16 15:00:00', 'Capacitor bank added', 'Normal'),
(5, 5, 10, 31, '2026-02-24 08:30:00', 'Meter door seal broken', 'Resolved',
 '2026-02-24 09:30:00', '2026-03-02 12:00:00', 'Seal replaced', 'Normal'),
(7, 7, 10, 31, '2026-03-28 10:00:00', 'Old meter requested to be replaced', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 35: Touhid Hossain (Banani) — AVERAGE
(1, 3, 9, 35, '2025-12-18 09:00:00', 'Gas connection making hissing sound', 'Resolved',
 '2025-12-18 09:30:00', '2025-12-23 14:00:00', 'Connection tightened', 'High'),
(5, 5, 9, 35, '2026-02-26 08:00:00', 'Gas supply pressure low in building', 'Resolved',
 '2026-02-26 09:00:00', '2026-03-04 11:00:00', 'Line upgraded', 'Normal'),
(3, 9, 9, 35, '2026-03-30 10:00:00', 'Commercial gas bill discrepancy reported', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- ══════════════════════════════════════════════════════════════
-- POOR PERFORMERS — resolve in 8–20 days or leave unresolved
-- ══════════════════════════════════════════════════════════════

-- FW 16: Parveen Akter (Mohammadpur) — POOR
(6, 8, 10, 16, '2025-10-05 09:00:00', 'Electricity prepaid meter not accepting recharge', 'Resolved',
 '2025-10-05 10:00:00', '2025-10-18 16:00:00', 'Meter replaced after multiple failed attempts', 'High'),
(2, 4, 10, 16, '2025-12-08 08:30:00', 'Power cut complaint — no response from field team', 'Resolved',
 '2025-12-08 09:30:00', '2025-12-26 12:00:00', 'Resolved after consumer escalation', 'High'),
(4, 6, 10, 16, '2026-02-08 10:00:00', 'Water meter not installed after 3 weeks', 'In Progress',
 '2026-02-08 11:00:00', NULL, NULL, 'High'),

-- FW 20: Sharmin Sultana (Uttara) — POOR
(1, 3, 9, 20, '2025-10-10 09:00:00', 'Gas connection disconnected without notice', 'Resolved',
 '2025-10-10 10:00:00', '2025-10-23 14:00:00', 'Administrative error corrected after delay', 'High'),
(7, 7, 9, 20, '2025-12-12 08:30:00', 'Gas supply missing for 5 days', 'Resolved',
 '2025-12-12 09:30:00', '2025-12-30 11:00:00', 'Pipeline work delayed, eventually restored', 'High'),
(5, 5, 9, 20, '2026-02-15 10:00:00', 'Gas meter broken — no replacement scheduled', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 24: Khaleda Parvin (Motijheel) — POOR
(3, 9, 10, 24, '2025-10-22 09:00:00', 'Commercial meter access issue — locked cabinet', 'Resolved',
 '2025-10-22 10:00:00', '2025-11-05 15:00:00', 'Lock drilled after extended delay', 'Normal'),
(1, 2, 10, 24, '2025-12-20 08:00:00', 'Prepaid water balance issue after system update', 'Resolved',
 '2025-12-20 09:00:00', '2026-01-07 13:00:00', 'Resolved after repeated escalation', 'High'),
(8, 10, 10, 24, '2026-02-18 10:00:00', 'Water meter stuck — no action taken for 3 weeks', 'In Progress',
 '2026-02-18 11:00:00', NULL, NULL, 'High'),

-- FW 29: Saiful Islam (Badda) — POOR
(2, 4, 9, 29, '2025-10-28 09:00:00', 'Electricity tripping at night — safety concern', 'Resolved',
 '2025-10-28 10:00:00', '2025-11-11 14:00:00', 'Earthing wire repaired after long delay', 'High'),
(4, 6, 9, 29, '2025-12-24 08:30:00', 'Water supply completely cut off', 'Resolved',
 '2025-12-24 09:30:00', '2026-01-12 12:00:00', 'Valve issue resolved after holiday delay', 'High'),
(6, 8, 9, 29, '2026-02-20 10:00:00', 'Meter reading not submitted for 6 weeks', 'Pending',
 NULL, NULL, NULL, 'High'),

-- FW 30: Morsheda Begum (Badda) — POOR
(5, 5, 10, 30, '2025-11-08 09:00:00', 'Gas meter malfunction — inaccurate reading', 'Resolved',
 '2025-11-08 10:00:00', '2025-11-24 16:00:00', 'Meter replaced after prolonged testing', 'Normal'),
(7, 7, 10, 30, '2026-01-10 08:00:00', 'Entire floor without gas supply', 'Resolved',
 '2026-01-10 09:00:00', '2026-01-27 13:00:00', 'Main regulator replaced after 17 days', 'High'),
(3, 9, 10, 30, '2026-03-05 10:00:00', 'Gas meter installation incomplete', 'Pending',
 NULL, NULL, NULL, 'Normal'),

-- FW 33: Mizanur Rahman (Shahbagh) — POOR
(8, 10, 9, 33, '2025-11-15 09:00:00', 'Water meter pipes severely corroded', 'Resolved',
 '2025-11-15 10:00:00', '2025-12-03 15:00:00', 'Pipes replaced after material procurement delay', 'Normal'),
(2, 4, 9, 33, '2026-01-16 08:30:00', 'No response to reported water leak for 2 weeks', 'Resolved',
 '2026-01-16 09:30:00', '2026-02-03 12:00:00', 'Resolved after consumer escalation', 'High'),
(1, 2, 9, 33, '2026-03-25 10:00:00', 'Prepaid water credit not reflecting in balance', 'Pending',
 NULL, NULL, NULL, 'Normal');