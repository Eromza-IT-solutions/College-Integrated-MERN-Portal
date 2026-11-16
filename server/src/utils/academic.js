/** First semester of a year of study: year 1 starts at semester 1, year 2 at semester 3, year 3 at semester 5 ... */
const firstSemesterOf = (yearOfStudy) => (yearOfStudy - 1) * 2 + 1;
/** The year of study a semester belongs to: semesters 1-2 are year 1, 3-4 year 2 ... */
const yearOfSemester = (semester) => Math.ceil(semester / 2);

export { firstSemesterOf, yearOfSemester };
