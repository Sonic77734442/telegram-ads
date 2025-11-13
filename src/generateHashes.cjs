// generateHashes.ts — совместим с Node v20 и ts-node без ESM
// используем require вместо import
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

// ───────────────────────────────────────────────
// 1️⃣ Обновление паролей существующих пользователей
// ───────────────────────────────────────────────

const existingPasswords = [
  { username: "BRZ22", password: "BRZCampaign123!" },
  { username: "BRZ Admin", password: "123BRZADMIN123!" },
  { username: "admin", password: "AdminMaster" },
];

console.log("\n-- 🔹 SQL UPDATE для обновления паролей существующих пользователей:\n");

existingPasswords.forEach(({ username, password }) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log(
    `UPDATE users SET password_hash = '${hash}' WHERE username = '${username}';`
  );
});

// ───────────────────────────────────────────────
// 2️⃣ Добавление новых пользователей (INSERT)
// ───────────────────────────────────────────────

const users = [
  {
    username: "BRZ22",
    password: "BRZCampaign123!",
    role: "client",
    user_id: "cb9fd36f-e5dd-4d5e-9f4f-3c2e037ee899",
    agency_id: "8a21d7c8-df3b-48fb-9b1a-9f3853101037",
  },
  {
    username: "BRZ Admin",
    password: "123BRZADMIN123!",
    role: "agency",
    user_id: "8a21d7c8-df3b-48fb-9b1a-9f3853101037",
    agency_id: "8a21d7c8-df3b-48fb-9b1a-9f3853101037",
  },
  {
    username: "admin",
    password: "AdminMaster",
    role: "admin",
    user_id: "00000000-0000-0000-0000-000000000001",
    agency_id: null,
  },
{
  username: "HonorAgency",
  password: "123HonorAgency!2025",
  role: "agency",
  user_id: "d3f6a9c2-4b2e-4f8a-9e1b-2c7a5f6d8b11",
  agency_id: "d3f6a9c2-4b2e-4f8a-9e1b-2c7a5f6d8b11"
},
{
  username: "Honor",
  password: "123Honor123!2025",
  role: "client",
  user_id: "a7c1e2b3-9d4f-41f2-8c3d-6e7f8a9b0c22",
  agency_id: "d3f6a9c2-4b2e-4f8a-9e1b-2c7a5f6d8b11"
}

  {
    username: "JDE Agency",
    password: "JDEAgency123!",
    role: "agency",
    user_id: "7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99",
    agency_id: "7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99",
  },
  {
    username: "JDE",
    password: "JDEClient123!",
    role: "client",
    user_id: "fb4a6db1-ef01-4c16-9edb-f1c2f4b73a00",
    agency_id: "7c6f2d24-92e1-4c77-9b1a-8c0a7a2b3d99",
  },
];

console.log("\n-- 🔹 SQL INSERT для добавления новых пользователей:\n");

users.forEach(({ username, password, role, user_id, agency_id }) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log(
    `INSERT INTO users (username, password_hash, role, user_id, agency_id) VALUES ('${username}', '${hash}', '${role}', '${user_id}', ${agency_id ? `'${agency_id}'` : "null"});`
  );
});

console.log("\n✅ Всё готово. Скопируй SQL из консоли и выполни в Supabase SQL Editor.\n");
