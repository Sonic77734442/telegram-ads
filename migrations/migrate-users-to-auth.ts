// migrations/migrate-users-to-auth.ts
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// админский клиент
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type LegacyUser = {
  id: number;               // если есть
  username: string | null;
  password_hash: string | null;
  role: string | null;
  user_id: string | null;   // uuid
  agency_id: string | null; // uuid
  display_name: string | null;
  agency_markup: string | null;
  email: string | null;
};

async function run() {
  console.log("Loading legacy users...");

  const { data: legacy, error } = await supabase
    .from<LegacyUser>("users")
    .select("*");

  if (error) {
    console.error("Error reading public.users:", error);
    process.exit(1);
  }

  console.log(`Found ${legacy.length} users`);

  for (const u of legacy) {
    try {
      if (!u.email) {
        console.warn(`Skip user ${u.username} – no email`);
        continue;
      }

      const role = (u.role || "client").toLowerCase() as
        | "client"
        | "agency"
        | "admin";

      // временный пароль для всех (потом можно дать reset password)
      const tempPassword = "Temp1234!";

      // 1) создаём пользователя в Auth
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email: u.email,
          password: tempPassword,
          email_confirm: true,
        });

      if (createErr || !created?.user) {
        console.error("createUser error for", u.email, createErr);
        continue;
      }

      const authId = created.user.id;
      console.log(`Created auth user ${u.email} -> ${authId}`);

      // 2) создаём/обновляем профиль
      const isAdmin = role === "admin";

      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authId,
            role,
            agency_id: u.agency_id,
            client_id: role === "client" ? u.user_id : null, // или другая логика
            is_admin: isAdmin,
            legacy_user_id: u.user_id,
          },
          { onConflict: "id" }
        );

      if (upsertErr) {
        console.error("profiles upsert error for", u.email, upsertErr);
      }
    } catch (e) {
      console.error("Unexpected error for user", u.email, e);
    }
  }

  console.log("Migration finished");
}

run().then(() => process.exit(0));
