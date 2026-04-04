-- =============================================================
-- FILE: 09_applications.sql
-- PURPOSE: Seed connection applications — both pending (awaiting
--          review) and approved (already actioned).
--
-- Applications cover:
--   • Showcase consumer Rahim applying for a new commercial connection
--   • Several new applicants (not yet in the consumer table) — these
--     are stored as text address since they don't have connections yet
--   • Some approved applications from existing consumers
-- =============================================================

INSERT INTO connection_application (
  consumer_id, reviewed_by, utility_id, region_id,
  application_date, status, requested_connection_type,
  payment_type, address, review_date, approval_date, priority
) VALUES

-- ── Approved applications (historical) ───────────────────────

-- Rahim's original electricity application (approved, now has connection)
(1, 9, 1, 1,
 '2019-12-20', 'Approved', 'Residential',
 'Postpaid',
 'House 12, Mirpur Road, Near Mirpur-10 Metro, Mirpur-1210',
 '2019-12-28', '2020-01-10', 'Normal'),

-- Farida's electricity application
(2, 9, 1, 2,
 '2020-03-01', 'Approved', 'Residential',
 'Postpaid',
 'House 45, Satmasjid Road, Mohammadpur Bus Stand, Mohammadpur-1207',
 '2020-03-10', '2020-03-20', 'Normal'),

-- Kamal's commercial electricity application
(3, 10, 1, 3,
 '2019-05-15', 'Approved', 'Commercial',
 'Prepaid',
 'Shop 8A, Dhanmondi Lake Road, Rabindra Sarobar, Dhanmondi-1205',
 '2019-05-25', '2019-06-01', 'Normal'),

-- Shahidul's gas application
(5, 9, 3, 5,
 '2018-11-01', 'Approved', 'Residential',
 'Postpaid',
 'House 3, Gulshan Avenue, Gulshan-1 Circle, Gulshan-1212',
 '2018-11-10', '2018-11-20', 'Normal'),

-- ── Pending applications (awaiting review) ───────────────────

-- Rahim applying for a new commercial gas connection (2nd connection in same area)
(1, NULL, 3, 1,
 '2025-03-15', 'Pending', 'Commercial',
 'Postpaid',
 'Shop 14, Mirpur Shopping Complex, Mirpur-10, Dhaka-1216',
 NULL, NULL, 'Normal'),

-- Consumer 4 (Nasreen) applying for electricity
(4, NULL, 1, 4,
 '2025-03-20', 'Pending', 'Residential',
 'Postpaid',
 'House 77, Sector 7 Main Road, Uttara Model Town, Uttara-1230',
 NULL, NULL, 'Normal'),

-- Consumer 6 (Momena) applying for gas connection
(6, NULL, 3, 2,
 '2025-03-25', 'Pending', 'Residential',
 'Postpaid',
 'House 102, Nurjahan Road, Mohammadpur Town Hall, Mohammadpur-1207',
 NULL, NULL, 'High'),

-- Consumer 8 (Tania) applying for electricity connection
(8, NULL, 1, 4,
 '2025-04-01', 'Pending', 'Residential',
 'Prepaid',
 'House 55, Sector 3 Road, Azampur Market, Uttara-1230',
 NULL, NULL, 'Normal'),

-- ── Under review ─────────────────────────────────────────────

-- Consumer 7 (Rafiqul) applying for water (commercial)
(7, 10, 2, 3,
 '2025-02-20', 'Under Review', 'Commercial',
 'Postpaid',
 'Office 21B, Jigatola Road, Jigatola Bus Stop, Dhanmondi-1209',
 '2025-03-01', NULL, 'High'),

-- Consumer 2 (Farida) applying for water connection
(2, 9, 2, 2,
 '2025-03-01', 'Under Review', 'Residential',
 'Postpaid',
 'House 45, Satmasjid Road, Mohammadpur, Dhaka-1207',
 '2025-03-10', NULL, 'Normal');
