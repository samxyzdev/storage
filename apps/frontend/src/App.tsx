import { useState } from "react";
import "./App.css";
import { Header } from "./components/Header";
import { SideBar } from "./components/Sidebar";

function App() {
  return (
    <div className="bg-[#1B1B1B] h-screen flex">
      <SideBar />
      <Header />
    </div>
  );
}

export default App;
