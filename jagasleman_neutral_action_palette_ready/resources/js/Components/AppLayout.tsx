import { TopNavbar } from '@/Components/TopNavbar';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
    return (
        <div className="theme-shell flex h-screen min-h-screen flex-col overflow-hidden text-foreground">
            <div className="shrink-0">
                <TopNavbar />
            </div>
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}
