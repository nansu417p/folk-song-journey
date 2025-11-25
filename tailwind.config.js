/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'folk-bg': '#FDFBF7', // 米黃色紙質感背景
        'folk-red': '#D64F3E', // 復古紅
        'folk-green': '#2A9D8F', // 湖水綠 (參考木棉道卡帶)
        'folk-dark': '#264653', // 深色文字
        'folk-gold': '#E9C46A', // 點綴金黃
      },
      fontFamily: {
        // 建議之後引入 Google Fonts 的 Noto Serif TC 更有民歌感
        serif: ['"Noto Serif TC"', 'serif'], 
      },
      backgroundImage: {
        'paper-texture': "url('/assets/paper-texture.png')", // 預留紙質紋理位置
      }
    },
  },
  plugins: [],
}