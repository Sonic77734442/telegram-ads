/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // ✅ Фирменные шрифты
      fontFamily: {
        sans: ['TelegramSans', 'system-ui', 'sans-serif'], // основной
        roboto: ['Roboto', 'system-ui', 'sans-serif'],     // запасной
      },

      // ✅ Кастомная максимальная ширина контейнера
      maxWidth: {
        container: '842px', // теперь доступен класс max-w-container
      },

      // ✅ Для адаптива и выравнивания, как в Telegram Ads
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },

      // ✅ Небольшое расширение цветовой палитры (если нужно в будущем)
      colors: {
        telegram: {
          blue: '#2AABEE',
          dark: '#1D8ED5',
        },
      },
    },
  },
  plugins: [],
};
