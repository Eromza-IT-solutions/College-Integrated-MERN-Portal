import DepartmentsPage from "./DepartmentsShared";

/*
  Department details, keyed by department id. Not filled in yet: those
  departments show a "will be displayed here soon" message. Add entries like:
  201: { title, profileImg, profile, hod:{photo,name,education,experience,phone,email},
         teachers:[{photo,name,education,experience}],
         events:[{img,name,incharge,date,venue,details}],
         achievements:[{img,name,cls,text}] }
*/
const DETAILS = {};

const FACULTY = {
  title: "Faculty of Commerce",
  departments: [
      { id: 201, name: "B.COM." },
      { id: 202, name: "BBA" },
      { id: 203, name: "BBA (CA)" },
      { id: 204, name: "M.COM." },
  ],
  details: DETAILS,
};

export default function CommerceDepartments({ onBack, initialDept }) {
  return <DepartmentsPage faculty={FACULTY} onBack={onBack} initialDept={initialDept} />;
}