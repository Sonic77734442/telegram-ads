import { Link } from "react-router-dom";
import Header from "../components/Header";

const heroLogo =
  "data:image/svg+xml,%3Csvg%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20width%3D%22100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20fill%3D%22%23119af5%22%20r%3D%2250%22%2F%3E%3Cg%20fill%3D%22%23fff%22%3E%3Cpath%20d%3D%22m%2048.11%2060.88%20l%200.66%205.47%20c%200.26%202.25%20-1.2%204.3%20-3.27%204.58%20c%20-0.07%200.01%20-0.14%200.02%20-0.22%200.02%20l%20-0.4%200.03%20c%20-2.14%200.16%20-4.15%20-1.17%20-5.01%20-3.32%20l%20-3.14%20-6.22%20c%20-0.25%20-0.49%20-0.05%20-1.09%200.44%20-1.34%20c%200.14%20-0.07%200.29%20-0.11%200.45%20-0.11%20h%209.49%20c%200.51%200%200.93%200.38%200.99%200.88%20z%22%2F%3E%3Cpath%20d%3D%22m%2036.5%2040%20h%2014.5%20c%200.55%200%201%200.45%201%201%20v%2015%20c%200%200.55%20-0.45%201%20-1%201%20h%20-14.5%20c%20-4.69%200%20-8.5%20-3.81%20-8.5%20-8.5%20s%203.81%20-8.5%208.5%20-8.5%20z%22%2F%3E%3Cpath%20d%3D%22m%2057.53%2038.31%20l%207.8%20-5.2%20c%201.38%20-0.92%203.24%20-0.55%204.16%200.83%20c%200.33%200.49%200.5%201.07%200.5%201.66%20v%2025.79%20c%200%201.66%20-1.34%203%20-3%203%20c%20-0.59%200%20-1.17%20-0.18%20-1.66%20-0.5%20l%20-7.8%20-5.2%20c%20-1.58%20-1.05%20-2.53%20-2.83%20-2.53%20-4.73%20v%20-10.91%20c%200%20-1.9%200.95%20-3.68%202.53%20-4.73%20z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";

export default function WelcomePage() {
  return (
    <main
      className="min-h-screen bg-white text-[#222]"
      style={{ fontFamily: "Roboto, sans-serif" }}
    >
      <Header />

      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center px-5 pt-[64px] text-center">
        <img src={heroLogo} alt="" className="h-[64px] w-[64px]" />

        <h1 className="mt-[18px] text-[16px] font-bold leading-[22px]">
          Добро пожаловать
        </h1>
        <p className="mt-[4px] text-[13px] leading-[18px] text-[#222]">
          Создайте свое первое объявление, нажав кнопку ниже.
        </p>

        <Link
          to="/ad/new"
          className="mt-[24px] flex h-[34px] w-[156px] items-center justify-center rounded-[4px] bg-[#58a2ee] text-[12px] font-bold text-white shadow-[0_1px_1px_rgba(0,0,0,0.12)] transition hover:bg-[#4895e4] focus:outline-none focus:ring-2 focus:ring-[#3390ec] focus:ring-offset-2"
        >
          Создать объявление
        </Link>

        <Link
          to="/dashboard"
          className="mt-[20px] text-[12px] leading-[18px] text-[#5d83a5] transition hover:text-[#3e769f]"
        >
          Список объявлений
        </Link>
      </div>
    </main>
  );
}
