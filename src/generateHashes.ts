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
    username: "Nirvana123",
    password: "Residence2900011",
    role: "client",
    user_id: "ab55fe71-1f6d-47b0-b5e8-77d7293b9fcb",
    agency_id: "f22126bc-3b8a-4e91-9cfd-c7d07bd746b9",
  },
  {
    username: "NirvanaAgency",
    password: "Residence2900022",
    role: "agency",
    user_id: "f22126bc-3b8a-4e91-9cfd-c7d07bd746b9",
    agency_id: "f22126bc-3b8a-4e91-9cfd-c7d07bd746b9",
  },
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
