
import { Outlet } from "react-router-dom";

import AHeader from "../../../components/common/AHeader";
import ASidebar from "../../../components/common/ASidebar";
 
function AdmissionAdminLayout() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">

      <ASidebar />

      <AHeader />

      <main className="ml-[220px] min-h-screen px-5 pb-6 pt-[88px]">
        <div className="w-full">
          <Outlet />
        </div>
      </main>

    </div>
  );
}

export default AdmissionAdminLayout;
