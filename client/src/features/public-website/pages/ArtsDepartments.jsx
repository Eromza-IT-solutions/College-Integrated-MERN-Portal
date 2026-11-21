import DepartmentsPage, { IMG } from "./DepartmentsShared";

/*
  Department details, keyed by department id. English (101) is filled in.
  Add the others in the same shape.
*/
const DETAILS = {
  101: {
    title: "DEPARTMENT OF ENGLISH",
    profileImg: `${IMG}/event/Webp_net-compress-image1.jpg`,
    profile:
      "The Department of English has come into its own in the last fifteen years. It has grown from an Undergraduate centre to a thriving Postgraduate Department from 2003-04. The addition of the Research Centre in English from 2011-2012 has added to its profile. The Research Centre is affiliated to Savitribai Phule Pune University. The Research Centre has grown exponentially with 2 in-house guides, 6 associated guides and 27 registered students. 2 research scholars have been awarded Ph.D by SPPU. The Department has well-qualified faculty comprising 5 members. It is focused towards the promotion and teaching of English in a very big way. It aims at making the student acquire the language using conventional as well as modern methods. The student is enabled to acquire linguistic skills and become an effective and fluent user of the language. The Department of English has made significant contributions towards the teaching and promotion of English not just in the college but also on the campus. The staff conducts a host of creative and cultural activities throughout the year such as Wordsmith’s Nook, the Talk Club, the Book Club and the Litt Fest, creating an eclectic mix of academics and co-curricular. Seminars on various themes are also conducted regularly for the Post graduate students. The department has its own specialised library for the benefit of the students and the members of the faculty. The department is proud of its university rankers - a total of 10 of which 04 are first ranks, 04 second ranks and 01 third rank at the postgraduate level and 01 sixth rank for B.A. English.",
    hod: {
      photo: `${IMG}/photos/mukul.jpg`, name: "Dr. Mukul Joshi", education: "M.A. M.Phil. PhD. SET (English)",
      experience: "28 years", phone: "9822966161", email: "jomukul@rediffmail.com",
    },
    teachers: [
      { photo: `${IMG}/photos/Munira_Lokhandwala2.jpeg`, name: "Dr. Munira Lokhandwala", education: "MA, PhD, SET", experience: "27 years" },
    ],
    events: [
      {
        img: `${IMG}/event/IMG-20190901-WA0006.jpg`, name: "Wordsmiths Nook", incharge: "Dr. Shaheen Patel", date: "2020-09-01", venue: "",
        details: "The second issue of the wall magazine was displayed on 1 September 2019. Titled “In Memoriam”, it commemorated the life and works of Girish Karnad, noted Indian playwright, writer, actor and film director.",
      },
      {
        img: `${IMG}/event/IMG-20200307-WA0077_(1).jpg`, name: "Women's Day Celebrations", incharge: "Dr. Munira Lokhandwala", date: "2020-03-07", venue: "",
        details: "The Department of English celebrated International Women’s Day on Saturday, 7th March 2020. A number of exciting activities were planned and organized for the students centered on this year’s theme #EachforEqual.",
      },
      {
        img: `${IMG}/event/IMG-20200113-WA0021.jpg`, name: "Litt Fest", incharge: "Department of English", date: "2020-01-13", venue: "",
        details: "The Department of English, Abeda Inamdar Senior College of Arts, Science and Commerce organised its annual literary fest “Litt Fest” on Monday, 13th January 2020 in the Green Auditorium. The day-long intra-college fest featured a mix of literary contests and fun vocabulary games.",
      },
      {
        img: `${IMG}/event/IMG-20200113-WA0017.jpg`, name: "Felicitation Gold Medalist", incharge: "Department of English", date: "2020-01-13", venue: "Green Auditorium",
        details: "The Department of English felicitated Ms. Valerie Fernandes, M.A. English II (2017-18) for securing the Alegaonkar Bandu Smruti Suvarna Padak (Gold Medal) SPPU awarded to a student obtaining the highest marks at the M.A. English Examination, May 2018.",
      },
      {
        img: `${IMG}/event/WhatsApp_Image_2019-11-21_at_20_54_12_(1).jpeg`, name: "Guest Lecture", incharge: "Ms. Jovia D'Souza", date: "2019-11-08", venue: "Room No 1",
        details: "The Department of English organised a guest lecture for the students of M.A. English Part I. Dr. Misbah Ansari was invited as the guest faculty.",
      },
    ],
    achievements: [
      { img: `${IMG}/photos/mifrah_.jpeg`, name: "Ms. Mifrah Abid", cls: "M.A. English", text: "Gold Medalist. Awarded the Alegaonkar Bandhu Smruti Suvarna Padak for standing first at the M.A. English examination 2004-2005." },
      { img: `${IMG}/photos/misbah-page0001.jpg`, name: "Ms. Misbah Ansari", cls: "B.A. English", text: "2nd Rank in B.A (English) - Savitribai Phule Pune University 2008 - 2009" },
      { img: `${IMG}/photos/misbah-page00011.jpg`, name: "Ms. Misbah Ansari", cls: "M.A. English", text: "6th Rank in M.A (English)-SPPU. Awarded the Diwanbhadur Ramchandra Keshav Bhagat Paritoshik. 2010 - 11" },
      { img: `${IMG}/photos/beena_paul_.jpg`, name: "Ms. C.P.Beena Paul", cls: "M.A. English", text: "2nd Rank in English – SPPU. Awarded the Diwanbhadur Ramchandra Keshav Bhagat Paritoshik. 2nd Rank in English – SPPU. 2011-2012" },
      { img: `${IMG}/photos/WhatsApp_Image_2020-12-10_at_10_59_50_(1).jpeg`, name: "Ms. Sana Memon", cls: "M.A. English", text: "2nd Rank in English – SPPU. Awarded Diwanbhadur Ramchandra Keshav Bhagat Paritoshik. 2012-2013" },
      { img: `${IMG}/photos/WhatsApp_Image_2020-12-09_at_19_08_18-min1.jpeg`, name: "Ms. Jovia D'Souza", cls: "M.A. English", text: "Secured First rank at the M.A. English examination conducted by SPPU. 2014-2015" },
      { img: `${IMG}/photos/Valerie_.jpg`, name: "Ms. Valerie Fernandes", cls: "M.A. English", text: "Gold Medalist. Awarded the Alegaonkar Bandhu Smruti Suvarna Padak for standing first at the M.A. English examination held in May 2018." },
    ],
  },
};

const FACULTY = {
  title: "Faculty of Arts",
  departments: [
      { id: 101, name: "ENGLISH" },
      { id: 102, name: "POLITICAL SCIENCE" },
      { id: 103, name: "SOCIOLOGY" },
      { id: 104, name: "PSYCHOLOGY" },
      { id: 105, name: "ECONOMICS" },
      { id: 106, name: "MARATHI" },
      { id: 107, name: "HINDI" },
      { id: 108, name: "URDU" },
      { id: 109, name: "ARABIC" },
      { id: 110, name: "HISTORY" },
  ],
  details: DETAILS,
};

export default function ArtsDepartments({ onBack, initialDept }) {
  return <DepartmentsPage faculty={FACULTY} onBack={onBack} initialDept={initialDept} />;
}