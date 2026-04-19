import { TopNavbar } from "@/components/TopNavbar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="h-[8vh] min-h-16">
        <TopNavbar />
      </div>
      <main className="h-[92vh] overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
