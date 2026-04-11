/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      colors: {
        'bg-color': '#E8E8E8'
      },
      fontFamily: {
        base: 'Inconsolata, monospace'
    },

    }
  },

  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui")
  ],
  daisyui: {
    themes: ["light", "dark", "cupcake"], // temi abilitati
    darkTheme: "dark",                    // tema usato con prefers-color-scheme: dark
    logs: false,                          // disabilita i log in console
  }
};
