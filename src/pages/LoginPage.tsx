import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";

const chartIcon =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22m3.5%204.8333v15c0%20.18.15.33.33.33h15.67m-12.33-5.16%203.26-3.42c.13-.14.34-.14.47-.01h.01l1.69%201.69c.13.13.34.13.47%200l6.93-6.93m.33%204.33v-4.66c0-.19-.15-.34-.33-.34h-4.67%22%20fill%3D%22none%22%20stroke%3D%22%23222%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.47%22%2F%3E%3C%2Fsvg%3E";
const revenueIcon =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22m14%2021.33h4.67c1.47%200%202.66-1.19%202.66-2.66v-13.34c0-1.47-1.19-2.66-2.66-2.66-1.56%200-3.11%200-4.67%200%22%20stroke%3D%22%23222%22%20stroke-dasharray%3D%220%204.33%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.87%22%2F%3E%3Cpath%20d%3D%22m10%2021.33c-1.56%200-3.11%200-4.67%200-1.47%200-2.66-1.19-2.66-2.66v-13.34c0-1.47%201.19-2.66%202.66-2.66h4.67%22%20stroke%3D%22%23222%22%20stroke-linecap%3D%22round%22%20stroke-width%3D%221.5%22%2F%3E%3Cpath%20d%3D%22m12.35%2018.37c.33%200%20.78-.29.78-.73v-.59c1.97-.21%203.04-1.37%203.04-3.05%200-1.45-.87-2.33-2.68-2.73l-1.48-.33c-.93-.21-1.39-.63-1.39-1.26%200-.74.65-1.29%201.66-1.29.82%200%201.39.28%202.03.99.32.34.57.46.91.46.41%200%20.72-.28.72-.71%200-.41-.24-.85-.65-1.26-.54-.51-1.17-.85-2.09-.96v-.61c0-.43-.47-.77-.81-.77-.33%200-.76.33-.76.77v.59c-1.89.17-2.97%201.31-2.97%202.93%200%201.42.87%202.37%202.54%202.74l1.49.35c1.08.25%201.53.63%201.53%201.28%200%20.83-.65%201.36-1.82%201.36-.87%200-1.59-.33-2.25-1.04-.38-.37-.58-.45-.86-.45-.45%200-.78.28-.78.77%200%20.43.25.88.69%201.27.59.53%201.46.86%202.47.95v.58c0%20.44.34.74.68.74z%22%20fill%3D%22%23222%22%20fill-rule%3D%22nonzero%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
const setupIcon =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23222%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22m3.1261%204.5h15.3739m-15.3739%205h10.7072m-10.7072%205h6.6186%22%20stroke-width%3D%221.53%22%2F%3E%3Cpath%20d%3D%22m21.23%2011.4%201.37%201.37c.59.59.59%201.54%200%202.13l-7.22%207.22c-.23.23-.54.37-.87.38l-2.18.06c-.48.01-.87-.36-.89-.84%200-.01%200-.03%200-.05l.06-2.18c.01-.33.15-.64.38-.87l7.22-7.22c.59-.59%201.54-.59%202.13%200zm-2.96%201.97%202.29%202.29%22%20stroke-width%3D%221.47%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";
const tonIcon =
  "data:image/svg+xml,%3Csvg%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20width%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20stroke%3D%22%23222%22%20stroke-width%3D%221.5%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210.67%22%2F%3E%3Cpath%20d%3D%22m7%208.33h9.99c.22%200%20.4.18.4.4%200%20.07-.02.14-.06.2l-4.72%208.46c-.21.39-.7.53-1.09.31-.13-.07-.24-.18-.31-.32l-4.56-8.46c-.1-.19-.03-.43.16-.54.06-.03.13-.05.19-.05zm5%209.19v-9.19%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

const features = [
  {
    icon: chartIcon,
    title: "Precise and Efficient",
    text: "You can define specific channels where you want to show your ads to ensure the context is relevant.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy-Conscious",
    text: "Ads on Telegram do not rely on users' personal information and are based on the channels where they are shown.",
  },
  {
    icon: revenueIcon,
    title: "Beneficial For Content Creators",
    text: "50% of the revenue from Telegram Ads goes to the owners of channels where they are displayed.",
  },
  {
    icon: setupIcon,
    title: "Easy to Set Up",
    text: "Create compact ads, add a Telegram link to promote, and specify the channels in which to place your ad.",
  },
  {
    icon: tonIcon,
    title: "Paid with Cryptocurrency",
    text: "You can pay for your ad with TON, a cryptocurrency Telegram uses for its high speed and low commissions.",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const resp = await fetch("/api/auth-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const isJson = resp.headers
        .get("content-type")
        ?.includes("application/json");
      const json = isJson ? await resp.json() : null;

      if (!resp.ok || (json && json.error)) {
        const message =
          (json && json.error) ||
          `Login failed (${resp.status} ${resp.statusText})`;
        alert(message);
        return;
      }

      const data = json?.user;

      localStorage.setItem("role", data?.role || "");
      localStorage.setItem("user_id", data?.user_id || "");
      localStorage.setItem(
        "agency_id",
        data?.role === "agency" ? data?.user_id : data?.agency_id ?? ""
      );
      localStorage.setItem("auth", "1");
      localStorage.setItem(
        "markup",
        data?.role === "client" ? data?.agency_markup?.toString() || "0" : "0"
      );

      if (data?.role === "admin") navigate("/admin");
      else navigate("/welcome");
    } catch (e) {
      console.error("auth-login failed:", e);
      alert("Login failed. See console for details.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#202124]">
      <main className="mx-auto flex min-h-screen w-full items-center justify-center px-5 py-10">
        <div className="pr-main-content-new grid w-full max-w-[890px] items-start gap-9 lg:grid-cols-[408px_1fr]">
          <section className="text-center">
            <img
              src="/assets/login-ad-illustration.jpg"
              alt=""
              className="block h-[229px] w-full rounded-[12px] object-cover shadow-sm"
            />

            <div className="mx-auto mt-8 max-w-[408px]">
              <h1 className="text-[26px] font-bold leading-8 tracking-normal">
                Telegram Ads
              </h1>
              <p className="mx-auto mt-4 max-w-[348px] text-[15px] leading-[21px] text-[#222]">
                Every month, <strong>1 billion</strong> Telegram users generate{" "}
                <strong>1 trillion views</strong> in public broadcast channels.
              </p>
              <p className="mx-auto mt-6 max-w-[348px] text-[15px] leading-[21px] text-[#222]">
                Anyone can display ads in specific Telegram{" "}
                <strong>broadcast channels</strong> using this platform.
              </p>

              <button
                type="button"
                onClick={() => setIsLoginOpen(true)}
                className="mt-7 h-[50px] w-full rounded-[6px] bg-[#58a2ee] text-[15px] font-bold text-white transition hover:bg-[#4895e4] focus:outline-none focus:ring-2 focus:ring-[#3390ec] focus:ring-offset-2"
              >
                Log in to Start Advertising
              </button>
            </div>
          </section>

          <aside className="relative rounded-[12px] border border-[#e1e4e8] bg-white px-7 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="absolute -left-[11px] top-[106px] h-5 w-5 rotate-45 border-b border-l border-[#e1e4e8] bg-white" />
            <div className="space-y-5">
              {features.map(({ icon, title, text }) => (
                <div key={title} className="grid grid-cols-[30px_1fr] gap-3">
                  <div className="flex h-6 w-6 items-center justify-center text-[#202124]">
                    {typeof icon === "string" ? (
                      <img
                        src={icon}
                        alt=""
                        className="block h-6 w-6 object-contain"
                      />
                    ) : (
                      <LockKeyhole
                        aria-hidden="true"
                        className="h-6 w-6"
                        strokeWidth={1.9}
                      />
                    )}
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold leading-[20px]">
                      {title}
                    </h2>
                    <p className="mt-1 text-[15px] leading-[21px] text-[#222]">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLoginOpen(false);
          }}
        >
          <form
            onSubmit={handleLogin}
            className="h-[367px] w-full max-w-[543px] rounded-[5px] bg-white px-[58px] pb-9 pt-[62px] shadow-[0_10px_28px_rgba(0,0,0,0.32)] max-sm:h-auto max-sm:px-7 max-sm:pb-8 max-sm:pt-10"
          >
            <h2 className="text-[28px] font-bold leading-[34px] text-[#222]">
              Log In
            </h2>
            <p className="mt-5 text-[16px] leading-[22px] text-[#222]">
              Log in here to manage your ads. Enter your{" "}
              <strong>login</strong> and <strong>password</strong>.
            </p>

            <div className="mt-5 grid max-w-[420px] gap-5">
              <input
                autoFocus
                type="text"
                placeholder="Login"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[43px] rounded-[5px] border border-[#d6d6d6] bg-white px-[14px] text-[16px] text-[#222] outline-none transition placeholder:text-[#9d9d9d] focus:border-[#5da1dc] focus:ring-2 focus:ring-[#5da1dc]/70"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[43px] rounded-[5px] border border-[#d6d6d6] bg-white px-[14px] text-[16px] text-[#222] outline-none transition placeholder:text-[#9d9d9d] focus:border-[#5da1dc] focus:ring-2 focus:ring-[#5da1dc]/25"
              />
            </div>

            <div className="mt-9 flex justify-end gap-8">
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="rounded px-1 py-1 text-[16px] font-bold text-[#5288b1] transition hover:text-[#3e769f] focus:outline-none focus:ring-2 focus:ring-[#5da1dc]/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded px-1 py-1 text-[16px] font-bold text-[#5288b1] transition hover:text-[#3e769f] focus:outline-none focus:ring-2 focus:ring-[#5da1dc]/40"
              >
                Log in
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
