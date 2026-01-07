import { BlogTopic } from "../../../services/blogTopicService";

interface PipelineProgressProps {
  topic: BlogTopic;
}

const STAGES = [
  { key: "research", label: "Istraživanje" },
  { key: "outline", label: "Struktura" },
  { key: "writing", label: "Pisanje" },
  { key: "editing", label: "Uređivanje" },
  { key: "seo", label: "SEO" },
  { key: "image", label: "Slika" },
  { key: "linkedin", label: "LinkedIn" },
];

const PipelineProgress = ({ topic }: PipelineProgressProps) => {
  const getStageStatus = (stageKey: string): "completed" | "active" | "pending" => {
    const stageOrder = STAGES.map((s) => s.key);
    const currentIndex = stageOrder.indexOf(topic.currentStage || "");
    const stageIndex = stageOrder.indexOf(stageKey);

    // Map status to stage index
    const statusToIndex: Record<string, number> = {
      research: 0,
      outline: 1,
      writing: 2,
      editing: 3,
      seo: 4,
      image: 5,
      linkedin: 6,
    };

    const activeIndex = statusToIndex[topic.status] ?? -1;

    if (stageIndex < activeIndex) return "completed";
    if (stageIndex === activeIndex) return "active";
    if (topic.currentStage === stageKey) return "active";
    if (currentIndex >= 0 && stageIndex < currentIndex) return "completed";
    return "pending";
  };

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, index) => {
        const status = getStageStatus(stage.key);
        return (
          <div key={stage.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${status === "completed" ? "bg-green-500 text-white" : ""}
                  ${status === "active" ? "bg-blue-500 text-white animate-pulse" : ""}
                  ${status === "pending" ? "bg-gray-200 text-gray-500" : ""}
                `}
              >
                {status === "completed" ? "✓" : index + 1}
              </div>
              <span
                className={`text-[10px] mt-1 ${
                  status === "active" ? "text-blue-600 font-medium" : "text-gray-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < STAGES.length - 1 && (
              <div
                className={`w-4 h-0.5 mx-0.5 ${
                  getStageStatus(STAGES[index + 1].key) !== "pending"
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PipelineProgress;
