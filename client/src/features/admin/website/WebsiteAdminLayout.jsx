
import { Outlet } from "react-router-dom";

import CHeader from "../../../components/common/CHeader";
import CSidebar from "../../../components/common/CSidebar";

function WebsiteAdminLayout() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <CSidebar />

      <CHeader />

      <main className="ml-[220px] min-h-screen px-4 pb-4 pt-[84px]">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default WebsiteAdminLayout;
