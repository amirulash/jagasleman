import React from 'react';
import { Link as InertiaLink, router } from '@inertiajs/react';

function normalizeHref(to) {
    if (typeof to === 'string') {
        return to;
    }

    if (to && typeof to === 'object' && typeof to.pathname === 'string') {
        const search = to.search ?? '';
        const hash = to.hash ?? '';
        return `${to.pathname}${search}${hash}`;
    }

    return '/';
}

export function Link({ to, children, ...props }) {
    return React.createElement(InertiaLink, { href: normalizeHref(to), ...props }, children);
}

export function NavLink({ to, className, children, ...props }) {
    const href = normalizeHref(to);
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
    const resolvedClassName = typeof className === 'function' ? className({ isActive, isPending: false }) : className;

    return React.createElement(InertiaLink, { href, className: resolvedClassName, ...props }, children);
}

export function useLocation() {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    return {
        pathname,
        search,
        hash,
    };
}

export function useNavigate() {
    return (to, options = {}) => {
        const href = normalizeHref(to);
        router.visit(href, {
            replace: options.replace ?? false,
            preserveScroll: options.preserveScroll ?? false,
            preserveState: options.preserveState ?? false,
        });
    };
}

export function BrowserRouter({ children }) {
    return React.createElement(React.Fragment, null, children);
}

export function Routes({ children }) {
    return React.createElement(React.Fragment, null, children);
}

export function Route() {
    return null;
}

export function Outlet() {
    return null;
}
