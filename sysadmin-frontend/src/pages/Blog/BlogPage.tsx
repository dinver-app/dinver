import { useState } from "react";
import { useTranslation } from "react-i18next";
import BlogsTab from "./BlogsTab";
import BlogUsersTab from "./BlogUsersTab";

const BlogPage = () => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs = [
    { name: t("blogs"), component: <BlogsTab /> },
    { name: t("blog_users"), component: <BlogUsersTab /> },
  ];

  return (
    <div className="mx-auto p-4">
      <div className="flex flex-col justify-between items-start mb-4">
        <h1 className="page-title">{t("blog_management")}</h1>
        <h3 className="page-subtitle">{t("manage_your_blog_content")}</h3>
      </div>
      <div className="h-line mb-4"></div>

      <div className="flex mb-6">
        {tabs.map((tab, index) => (
          <button
            key={tab.name}
            onClick={() => setSelectedIndex(index)}
            className={`py-2 px-4 border-b-2 text-sm ${
              selectedIndex === index
                ? "border-b-2 border-black"
                : "text-gray-500"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="mt-4">{tabs[selectedIndex].component}</div>
    </div>
  );
};

export default BlogPage;
