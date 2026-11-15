import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { ivory:"#F8F6EF", paper:"#FFFFFF", ink:"#202124", muted:"#6B6F76", line:"#E6E2D6", terra:"#D8754D", teal:"#299D8F", navy:"#233342" },
    fontFamily: { sans: ["Inter","system-ui","sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
