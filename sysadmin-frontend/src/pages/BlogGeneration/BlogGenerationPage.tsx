import { useState } from "react";
import TopicsTab from "./TopicsTab";
import StatsTab from "./StatsTab";

const BlogGenerationPage = () => {
  const [activeTab, setActiveTab] = useState<"topics" | "blogs">("blogs");

  return (
    <div className="p-6">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="page-title">Blog Generation</h1>
        <h2 className="page-subtitle">
          Automatizirano generiranje blog sadržaja pomoću AI
        </h2>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("blogs")}
              className={`${
                activeTab === "blogs"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
            >
              Blogovi
            </button>
            <button
              onClick={() => setActiveTab("topics")}
              className={`${
                activeTab === "topics"
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
            >
              Teme
            </button>
          </nav>
        </div>
      </div>

      {activeTab === "blogs" && <StatsTab />}
      {activeTab === "topics" && <TopicsTab />}
    </div>
  );
};

export default BlogGenerationPage;
