import React from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { FindYourMatch } from "./pages/FindYourMatch";
import { FinancialPlanner } from "./pages/FinancialPlanner";
import { CompareColleges } from "./pages/CompareColleges";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<FindYourMatch />} />
        <Route path="financial" element={<FinancialPlanner />} />
        <Route path="compare" element={<CompareColleges />} />
      </Route>
    </Routes>
  );
}
