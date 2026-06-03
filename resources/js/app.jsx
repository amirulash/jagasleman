import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './Components/ThemeProvider';

const appName = import.meta.env.VITE_APP_NAME || 'JagaSleman';

const pages = import.meta.glob('./Pages/**/*.{jsx,tsx}');

createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: async (name) => {
        const jsxPath = `./Pages/${name}.jsx`;
        const tsxPath = `./Pages/${name}.tsx`;

        if (pages[jsxPath]) {
            return pages[jsxPath]();
        }

        if (pages[tsxPath]) {
            return pages[tsxPath]();
        }

        throw new Error(`Page not found: ${name}. Cek file di resources/js/Pages`);
    },

    setup({ el, App, props }) {
        createRoot(el).render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>,
        );
    },

    progress: {
        color: '#0FA3A0',
    },
});
