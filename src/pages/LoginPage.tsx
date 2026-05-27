import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  LockKeyhole,
  MoreVertical,
  Send,
  WalletCards,
  X,
} from "lucide-react";

const features = [
  {
    icon: ChartNoAxesCombined,
    title: "Precise and Efficient",
    text: "You can define specific channels where you want to show your ads to ensure the context is relevant.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy-Conscious",
    text: "Ads on Telegram do not rely on users' personal information and are based on the channels where they are shown.",
  },
  {
    icon: CircleDollarSign,
    title: "Beneficial For Content Creators",
    text: "50% of the revenue from Telegram Ads goes to the owners of channels where they are displayed.",
  },
  {
    icon: ClipboardList,
    title: "Easy to Set Up",
    text: "Create compact ads, add a Telegram link to promote, and specify the channels in which to place your ad.",
  },
  {
    icon: WalletCards,
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
      else navigate("/");
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
            <div className="relative h-[226px] overflow-hidden rounded-[12px] bg-[#9abf83] shadow-sm">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute left-7 top-7 h-20 w-20 rounded-full border border-[#46765a]" />
                <div className="absolute bottom-8 left-24 h-12 w-12 rounded-full border border-[#46765a]" />
                <div className="absolute right-20 top-8 h-14 w-14 rounded-full border border-[#46765a]" />
                <div className="absolute bottom-5 right-8 h-24 w-24 rounded-full border border-[#46765a]" />
              </div>
              <div className="absolute left-0 top-0 h-10 w-10 rounded-br-[22px] bg-[#6ea77d]" />
              <div className="absolute left-8 right-[96px] top-0 h-40 rounded-b-[10px] bg-[#edf7df]" />
              <div className="absolute right-10 top-72 hidden" />

              <div className="absolute left-8 right-[96px] top-[56px] rounded-[18px] bg-white p-3 shadow-[0_6px_14px_rgba(79,112,74,0.16)]">
                <div className="rounded-[12px] bg-[#f6eadf] p-5 text-left">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <p className="mb-3 text-[25px] font-bold leading-none text-[#d08635]">
                        AD
                      </p>
                      <div className="space-y-3">
                        <span className="block h-2.5 w-[158px] rounded-full bg-[#e4bf98]" />
                        <span className="block h-2.5 w-[114px] rounded-full bg-[#e4bf98]" />
                        <span className="block h-2.5 w-[158px] rounded-full bg-[#e4bf98]" />
                        <span className="block h-2.5 w-[114px] rounded-full bg-[#e4bf98]" />
                      </div>
                    </div>
                    <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[8px] bg-[#c84f49] text-white">
                      <Send size={24} fill="currentColor" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute right-[45px] top-[61px] flex h-[101px] w-[39px] flex-col items-center justify-center gap-4 rounded-full bg-[#7fa96f] text-white">
                <X size={25} strokeWidth={3} />
                <MoreVertical size={26} strokeWidth={3} />
              </div>
            </div>

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
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="grid grid-cols-[30px_1fr] gap-3">
                  <div className="pt-1 text-[#202124]">
                    <Icon size={24} strokeWidth={1.9} />
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-5 pt-[50px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsLoginOpen(false);
          }}
        >
          <form
            onSubmit={handleLogin}
            className="min-h-[550px] w-full max-w-[814px] rounded-[5px] bg-white px-[90px] pb-16 pt-[96px] shadow-[0_10px_28px_rgba(0,0,0,0.32)] max-md:min-h-0 max-md:px-7 max-md:pb-8 max-md:pt-10"
          >
            <h2 className="text-[36px] font-bold leading-[43px] text-[#222] max-md:text-[30px]">
              Log In
            </h2>
            <p className="mt-6 text-[22px] leading-[30px] text-[#222] max-md:text-[18px] max-md:leading-7">
              Log in here to manage your ads. Enter your{" "}
              <strong>login</strong> and <strong>password</strong>.
            </p>

            <div className="mt-8 grid max-w-[420px] gap-6">
              <input
                autoFocus
                type="text"
                placeholder="Login"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[59px] rounded-[7px] border border-[#d6d6d6] bg-white px-[18px] text-[22px] text-[#222] outline-none transition placeholder:text-[#9d9d9d] focus:border-[#5da1dc] focus:ring-2 focus:ring-[#5da1dc]/70"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[59px] rounded-[7px] border border-[#d6d6d6] bg-white px-[18px] text-[22px] text-[#222] outline-none transition placeholder:text-[#9d9d9d] focus:border-[#5da1dc] focus:ring-2 focus:ring-[#5da1dc]/25"
              />
            </div>

            <div className="mt-[84px] flex justify-end gap-10 max-md:mt-10 max-md:gap-6">
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="rounded px-1 py-2 text-[20px] font-bold text-[#5288b1] transition hover:text-[#3e769f] focus:outline-none focus:ring-2 focus:ring-[#5da1dc]/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded px-1 py-2 text-[20px] font-bold text-[#5288b1] transition hover:text-[#3e769f] focus:outline-none focus:ring-2 focus:ring-[#5da1dc]/40"
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
