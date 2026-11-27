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
  title: "Faculty of Science",
  departments: [
      { id: 301, name: "BCA (SCIENCE)" },
      { id: 302, name: "COMPUTER SCIENCE" },
      { id: 303, name: "CHEMISTRY" },
      { id: 304, name: "MICROBIOLOGY" },
      { id: 305, name: "STATISTICS" },
      { id: 306, name: "ELECTRONICS" },
      { id: 307, name: "PHYSICS" },
      { id: 308, name: "ZOOLOGY" },
      { id: 309, name: "BIOTECHNOLOGY" },
      { id: 310, name: "MATHEMATICS" },
      { id: 311, name: "BOTANY" },
      { id: 312, name: "ENVIRONMENTAL SCIENCE" },
  ],
  details: DETAILS,
};

export default function ScienceDepartments({ onBack, initialDept }) {
  return <DepartmentsPage faculty={FACULTY} onBack={onBack} initialDept={initialDept} />;
}