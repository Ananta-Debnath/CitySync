INSERT INTO address (address_id, region_id, house_num, street_name)
VALUES (1, 14, 123, 'Main Street');

INSERT INTO person (person_id, first_name, last_name, date_of_birth, gender, phone_number, national_id, address_id)
VALUES (1, 'John', 'Doe', '1990-01-01', 'Male', '01234567890', '0123456789', 1);

INSERT INTO consumer (person_id, consumer_type, registration_date)
VALUES (1, 'Residential', '2025-06-29');

INSERT INTO meter (meter_id, meter_type)
VALUES (1, 'Electricity');

INSERT INTO utility_connection (connection_id, consumer_id, meter_id, utility_id, tariff_id, address_id, connection_date, connection_status)
VALUES (1, 1, 1, 1, 101, 1, '2025-06-29', 'Active');

INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
VALUES (1, 'Apartment', false);