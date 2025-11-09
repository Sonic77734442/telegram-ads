
-- 🔹 SQL UPDATE для обновления паролей существующих пользователей:

UPDATE users SET password_hash = '$2b$10$X.K2sP4R3bmt35KWHb5sfO/u2l1OCWbhJiT68A3PaUikL5jUDthYS' WHERE username = 'BRZ22';
UPDATE users SET password_hash = '$2b$10$mNQBLe7HKzqBHCm/4PaRCet26hPTzfD4VmhHJXVIGySvoweZNr8Li' WHERE username = 'BRZ Admin';
UPDATE users SET password_hash = '$2b$10$mWYIK9L0wo3Nf9iEPzIyrOUX6U2ar.3pWhq5DtvlG683sfvnbcGTG' WHERE username = 'admin';

-- 🔹 SQL INSERT для добавления новых пользователей:

INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('BRZ22', '$2b$10$ANEvNlR2pZH/O5Ey6xVtSu4TS55DVDGgGaO//rjvilFB7W1NWnMOe', 'client', 'cb9fd36f-e5dd-4d5e-9f4f-3c2e037ee899', '8a21d7c8-df3b-48fb-9b1a-9f3853101037');
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('BRZ Admin', '$2b$10$N4rGzQkPqr8PYeb9hWh9N.M0o7eCyjzu3X0MQBpwDNvs2WayDvgH.', 'agency', '8a21d7c8-df3b-48fb-9b1a-9f3853101037', '8a21d7c8-df3b-48fb-9b1a-9f3853101037');
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('admin', '$2b$10$236kJOXRn1BAa../RT1qUu8LSCfps.VsOlIYpGOKMjP3eURY5wAMK', 'admin', '00000000-0000-0000-0000-000000000001', null);
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('Nirvana123', '$2b$10$PM0pLBWVk3KfpujerMW88uo.nz2TQVjHeCOz8rFwBxB0sEjrI5Pp.', 'client', 'ab55fe71-1f6d-47b0-b5e8-77d7293b9fcb', 'f22126bc-3b8a-4e91-9cfd-c7d07bd746b9');
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('NirvanaAgency', '$2b$10$hMQbK2Zp318EpAYmlEdp6u/m/Yl2SrGYpAdz8BO0c3ZJA3p4T5h1G', 'agency', 'f22126bc-3b8a-4e91-9cfd-c7d07bd746b9', 'f22126bc-3b8a-4e91-9cfd-c7d07bd746b9');
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('JDE Agency', '$2b$10$kf.srsN.SATxa.uqdwY1O.6XqnVlvNSKxNXrP3LMKrafORsXCd7FC', 'agency', '7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99', '7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99');
INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('JDE', '$2b$10$EW3V8.PZrIP2anFEbJAtse4mjDLFkmssWwlgA7l0p3bLhUk3ZFOUG', 'client', 'fb4a6db1-ef01-4c16-9edb-f1c2f4b73a00', '7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99');

✅ Всё готово. Скопируй SQL из консоли и выполни в Supabase SQL Editor.

