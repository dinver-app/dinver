import { useState, useEffect } from "react";
import {
  BlogTopic,
  TOPIC_TYPES,
  generateTopicFromPrompt,
} from "../../../services/blogTopicService";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface TopicFormProps {
  topic: BlogTopic | null;
  onSubmit: (data: Partial<BlogTopic>) => void;
  onCancel: () => void;
}

type FormMode = "manual" | "ai";

const TopicForm = ({ topic, onSubmit, onCancel }: TopicFormProps) => {
  const [mode, setMode] = useState<FormMode>("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  // If editing, always use manual mode
  useEffect(() => {
    if (topic) {
      setMode("manual");
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

  const handleGenerateFromAI = async () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) {
      setGenerateError("Molimo unesite detaljniji opis (najmanje 10 znakova)");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const result = await generateTopicFromPrompt(aiPrompt.trim());
      if (result.success && result.topic) {
        // Fill the form with AI-generated data
        setFormData({
          title: result.topic.title || "",
          topicType: result.topic.topicType || "restaurant_guide",
          description: result.topic.description || "",
          targetKeywords: result.topic.targetKeywords || [],
          targetAudience: result.topic.targetAudience || "",
          primaryLanguage: result.topic.primaryLanguage || "hr-HR",
          generateBothLanguages: result.topic.generateBothLanguages ?? true,
          scheduledFor: "",
          priority: result.topic.priority || 5,
        });
        // Switch to manual mode so user can review/edit
        setMode("manual");
      }
    } catch (error) {
      console.error("Failed to generate topic:", error);
      setGenerateError("Greška pri generiranju teme. Pokušajte ponovno.");
    } finally {
      setIsGenerating(false);
    }
  };

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

          {/* Mode Toggle - only show for new topics */}
          {!topic && (
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "ai"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                AI generiranje
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === "manual"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Ručni unos
              </button>
            </div>
          )}

          {/* AI Mode */}
          {mode === "ai" && !topic && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opiši što želiš
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="npr. Želim blog o najboljim pizzerijama u Splitu, fokus na autentičnu talijansku pizzu i lokalne favorite..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  AI će automatski generirati naslov, ključne riječi, ciljnu publiku i sve ostale detalje
                </p>
              </div>

              {generateError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {generateError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isGenerating}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Odustani
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFromAI}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generiram...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      Generiraj detalje
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Manual Mode / Edit Mode */}
          {(mode === "manual" || topic) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Back to AI button if came from AI */}
              {!topic && formData.title && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">
                  AI je generirao detalje teme. Pregledaj i uredi po potrebi, zatim klikni "Kreiraj temu".
                </div>
              )}

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
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicForm;
