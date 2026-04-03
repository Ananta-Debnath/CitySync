DO
$$
DECLARE
    v_utility_id integer;
BEGIN
    INSERT INTO utility (utility_name, utility_type, billing_cycle, unit_of_measurement, status)
    VALUES ('Electricity_LV', 'Electricity', 'Monthly', 'kWh', 'Active')
    RETURNING utility_id INTO v_utility_id;

    INSERT INTO electricity_utility (utility_id, voltage_level, phase_type)
    VALUES (v_utility_id, '220V', 'Single Phase');

    INSERT INTO utility_region (utility_id, region_id)
    VALUES (v_utility_id, 1),
           (v_utility_id, 2),
           (v_utility_id, 3),
           (v_utility_id, 4),
           (v_utility_id, 5),
           (v_utility_id, 6),
           (v_utility_id, 7),
           (v_utility_id, 8),
           (v_utility_id, 9),
           (v_utility_id, 10),
           (v_utility_id, 11),
           (v_utility_id, 12),
           (v_utility_id, 13),
           (v_utility_id, 14),
           (v_utility_id, 15),
           (v_utility_id, 16),
           (v_utility_id, 17),
           (v_utility_id, 18),
           (v_utility_id, 19),
           (v_utility_id, 20);

    -- Tariff LT-A
    INSERT INTO tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, vat_rate, is_active)
    VALUES (101, v_utility_id, 'LT-A', 'Residential', 'Slab', '2024-02-29', 5.00, true);

    INSERT INTO tariff_slab (tariff_id, slab_num, unit_from, unit_to, rate_per_unit)
    VALUES (101, 1, 0, 75, 5.26),
           (101, 2, 76, 200, 7.2),
           (101, 3, 201, 300, 7.59),
           (101, 4, 301, 400, 8.02),
           (101, 5, 401, 600, 12.67),
           (101, 6, 601, NULL, 14.61);

    INSERT INTO fixed_charge (fixed_charge_id, tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory)
    VALUES (1011, 101, 'Meter Rent', 25.00, 'Monthly', true),
           (1012, 101, 'Demand Charge', 42.00, 'Monthly', true);


    -- Water Utility
    INSERT INTO utility (utility_name, utility_type, billing_cycle, unit_of_measurement, status)
    VALUES ('Water', 'Water', 'Monthly', 'm³', 'Active')
    RETURNING utility_id INTO v_utility_id;

    INSERT INTO water_utility (utility_id, pressure_level, water_source, quality_grade)
    VALUES (v_utility_id, 'High', 'Groundwater', 'Good');

    INSERT INTO utility_region (utility_id, region_id)
    VALUES (v_utility_id, 1),
           (v_utility_id, 2),
           (v_utility_id, 3),
           (v_utility_id, 4),
           (v_utility_id, 5),
           (v_utility_id, 6),
           (v_utility_id, 7),
           (v_utility_id, 8),
           (v_utility_id, 9),
           (v_utility_id, 10),
           (v_utility_id, 11),
           (v_utility_id, 12),
           (v_utility_id, 13),
           (v_utility_id, 14),
           (v_utility_id, 15),
           (v_utility_id, 16),
           (v_utility_id, 17),
           (v_utility_id, 18),
           (v_utility_id, 19),
           (v_utility_id, 20);

    -- Tariff W-1
    INSERT INTO tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, vat_rate, is_active)
    VALUES (201, v_utility_id, 'W-1', 'Residential', 'Slab', '2024-02-29', 5.00, true);

    INSERT INTO tariff_slab (tariff_id, slab_num, unit_from, rate_per_unit)
    VALUES (201, 1, 0, 15.00);
END
$$;