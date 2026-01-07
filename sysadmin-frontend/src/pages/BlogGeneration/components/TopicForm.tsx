import { useState, useEffect } from "react";
import { BlogTopic, TOPIC_TYPES } from "../../../services/blogTopicService";

interface TopicFormProps {
  topic: BlogTopic | null;
  onSubmit: (data: Partial<BlogTopic>) => void;
  onCancel: () => void;
}

const TopicForm = ({ topic, onSubmit, onCancel }: TopicFormProps) => {
  const [formData, setFormData] = useState({
    title: "",
    topicType: "restaurant_guide",
    description: "",
    targetKeywords: [] as string[],
    targetAudience: "",
    primaryLanguage: "hr-HR" as "hr-HR" | "en-US",
    generateBothLanguages: true,
    scheduledFor: "",
    priority: 5,
  });
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (topic) {
      setFormData({
        title: topic.title || "",
        topicType: topic.topicType || "restaurant_guide",
        description: topic.description || "",
        targetKeywords: topic.targetKeywords || [],
        targetAudience: topic.targetAudience || "",
        primaryLanguage: topic.primaryLanguage || "hr-HR",
        generateBothLanguages: topic.generateBothLanguages ?? true,
        scheduledFor: topic.scheduledFor
          ? new Date(topic.scheduledFor).toISOString().slice(0, 16)
          : "",
        priority: topic.priority || 5,
      });
    }
  }, [topic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      scheduledFor: formData.scheduledFor || undefined,
    });
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !formData.targetKeywords.includes(keyword)) {
      setFormData({
        ...formData,
        targetKeywords: [...formData.targetKeywords, keyword],
      });
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      targetKeywords: formData.targetKeywords.filter((k) => k !== keyword),
    });
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {topic ? "Uredi temu" : "Nova tema za blog"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naslov teme *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="npr. Kako pronaći savršeni restoran za posebne prilike"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Topic Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vrsta teme
              </label>
              <select
                value={formData.topicType}
                onChange={(e) => setFormData({ ...formData, topicType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TOPIC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.labelHr}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis (opcionalno)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Dodatne upute za AI o čemu treba pisati..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Target Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciljane ključne riječi
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={handleKeywordKeyPress}
                  placeholder="Dodaj ključnu riječ..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Dodaj
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciljna publika
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="npr. Food lovers, turisti, lokalna publika"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Language Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primarni jezik
                </label>
                <select
                  value={formData.primaryLanguage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLanguage: e.target.value as "hr-HR" | "en-US",
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hr-HR">Hrvatski</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.generateBothLanguages}
                    onChange={(e) =>
                      setFormData({ ...formData, generateBothLanguages: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Generiraj oba jezika</span>
                </label>
              </div>
            </div>

            {/* Priority and Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioritet: {formData.priority}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Nizak</span>
                  <span>Visok</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zakazano za (opcionalno)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Odustani
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {topic ? "Spremi" : "Kreiraj temu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TopicForm;
