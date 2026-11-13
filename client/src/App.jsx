
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./features/public-website/HomePage";
import Login from "./features/auth/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
