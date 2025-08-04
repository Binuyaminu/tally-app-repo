/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}", // This line tells Tailwind to scan your React components
        "./public/index.html",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}