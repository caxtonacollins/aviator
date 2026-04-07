import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ['var(--font-orbitron)', 'sans-serif'],
                courier: ['var(--font-courier-prime)', 'monospace'],
                inter: ['var(--font-inter)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
