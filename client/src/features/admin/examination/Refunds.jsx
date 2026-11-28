import RefundsPanel from "../../refunds/RefundsPanel";

// Exam Admin: raise refunds for paid exam fees and follow their status.
export default function ExamRefunds() {
  return <RefundsPanel purpose="exam" canRequest />;
}
