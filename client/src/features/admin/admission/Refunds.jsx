import RefundsPanel from "../../refunds/RefundsPanel";

// Admission Admin: raise refunds for paid admission fees and follow their status.
export default function AdmissionRefunds() {
  return <RefundsPanel purpose="admission" canRequest />;
}
