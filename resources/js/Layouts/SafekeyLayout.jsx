import TopNavbar from '@/Components/Safekey/TopNavbar';

export default function SafekeyLayout({ children }) {
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <div className="h-[8vh] min-h-16">
                <TopNavbar />
            </div>
            <main className="h-[92vh] overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
    );
}
