import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import TopicForm from "./components/TopicForm";
import PipelineProgress from "./components/PipelineProgress";
import LogViewer from "./components/LogViewer";
import LinkedInPreview from "./components/LinkedInPreview";
import {
  BlogTopic,
  getTopics,
  deleteTopic,
  createTopic,
  updateTopic,
  processTopic,
  retryTopic,
  approveTopic,
  rejectTopic,
  STATUS_COLORS,
  TOPIC_TYPES,
} from "../../services/blogTopicService";

const TopicsTab = () => {
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<BlogTopic | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<BlogTopic | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logsTopic, setLogsTopic] = useState<BlogTopic | null>(null);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [linkedInTopic, setLinkedInTopic] = useState<BlogTopic | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    fetchTopics();
  }, [statusFilter]);

  const fetchTopics = async () => {
    setIsLoading(true);
    try {
      const data = await getTopics({ status: statusFilter || undefined });
      setTopics(data.topics);
    } catch (error) {
      console.error("Failed to fetch topics:", error);
      toast.error("Greška pri dohvaćanju tema");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTopic(null);
    setShowForm(true);
  };

  const handleEdit = (topic: BlogTopic) => {
    setSelectedTopic(topic);
    setShowForm(true);
  };

  const handleDelete = (topic: BlogTopic) => {
    setTopicToDelete(topic);
    setShowDeleteModal(true);
  };

  const handleViewLogs = (topic: BlogTopic) => {
    setLogsTopic(topic);
    setShowLogs(true);
  };

  const handleViewLinkedIn = (topic: BlogTopic) => {
    setLinkedInTopic(topic);
    setShowLinkedIn(true);
  };

  const confirmDelete = async () => {
    if (!topicToDelete) return;
    try {
      await deleteTopic(topicToDelete.id);
      toast.success("Tema otkazana");
      fetchTopics();
    } catch (error) {
      console.error("Failed to delete topic:", error);
      toast.error("Greška pri brisanju teme");
    } finally {
      setShowDeleteModal(false);
      setTopicToDelete(null);
    }
  };

  const handleFormSubmit = async (formData: Partial<BlogTopic>) => {
    try {
      if (selectedTopic) {
        await updateTopic(selectedTopic.id, formData);
        toast.success("Tema ažurirana");
      } else {
        await createTopic(formData);
        toast.success("Tema kreirana");
      }
      setShowForm(false);
      fetchTopics();
    } catch (error) {
      console.error("Failed to save topic:", error);
      toast.error("Greška pri spremanju teme");
    }
  };

  const handleProcess = async (topic: BlogTopic) => {
    try {
      await processTopic(topic.id);
      toast.success("Procesiranje pokrenuto");
      fetchTopics();
    } catch (error: unknown) {
      console.error("Failed to process topic:", error);
      const errorMessage = error instanceof Error ? error.message : "Greška pri pokretanju procesiranja";
      toast.error(errorMessage);
    }
  };

  const handleRetry = async (topic: BlogTopic) => {
    try {
      await retryTopic(topic.id);
      toast.success("Ponovni pokušaj pokrenut");
      fetchTopics();
    } catch (error: unknown) {
      console.error("Failed to retry topic:", error);
      const errorMessage = error instanceof Error ? error.message : "Greška pri ponovnom pokušaju";
      toast.error(errorMessage);
    }
  };

  const handleApprove = async (topic: BlogTopic) => {
    try {
      await approveTopic(topic.id);
      toast.success("Tema odobrena i blogovi objavljeni");
      fetchTopics();
    } catch (error) {
      console.error("Failed to approve topic:", error);
      toast.error("Greška pri odobravanju");
    }
  };

  const handleReject = async (topic: BlogTopic) => {
    const feedback = prompt("Unesite razlog odbijanja (opcionalno):");
    try {
      await rejectTopic(topic.id, feedback || undefined);
      toast.success("Tema odbijena i vraćena u red");
      fetchTopics();
    } catch (error) {
      console.error("Failed to reject topic:", error);
      toast.error("Greška pri odbijanju");
    }
  };

  const getTopicTypeLabel = (type: string) => {
    return TOPIC_TYPES.find((t) => t.value === type)?.labelHr || type;
  };

  if (isLoading) {
    return <div className="text-center py-4">Učitavanje...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="section-title">Teme za generiranje</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="">Svi statusi</option>
            <option value="queued">U redu čekanja</option>
            <option value="processing">U obradi</option>
            <option value="review_ready">Čeka pregled</option>
            <option value="published">Objavljeno</option>
            <option value="failed">Neuspjelo</option>
          </select>
        </div>
        <button onClick={handleCreate} className="primary-button">
          Nova tema
        </button>
      </div>

      <div className="space-y-4">
        {topics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nema tema za prikaz. Kliknite "Nova tema" za kreiranje.
          </div>
        ) : (
          topics.map((topic) => (
            <div
              key={topic.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900">{topic.title}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[topic.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {topic.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getTopicTypeLabel(topic.topicType)}
                    </span>
                  </div>

                  {topic.description && (
                    <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Prioritet: {topic.priority}/10</span>
                    <span>Jezik: {topic.primaryLanguage}</span>
                    {topic.scheduledFor && (
                      <span>
                        Zakazano: {new Date(topic.scheduledFor).toLocaleDateString("hr")}
                      </span>
                    )}
                    {topic.targetKeywords?.length > 0 && (
                      <span>Ključne riječi: {topic.targetKeywords.join(", ")}</span>
                    )}
                  </div>

                  {/* Pipeline Progress */}
                  {["processing", "research", "outline", "writing", "editing", "seo", "image", "linkedin"].includes(
                    topic.status
                  ) && (
                    <div className="mt-3">
                      <PipelineProgress topic={topic} />
                    </div>
                  )}

                  {/* Error display */}
                  {topic.status === "failed" && topic.lastError && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      Greška: {topic.lastError}
                    </div>
                  )}

                  {/* Generated blogs info */}
                  {(topic.blogHr || topic.blogEn) && (
                    <div className="mt-2 flex gap-2">
                      {topic.blogHr && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          HR: {topic.blogHr.title} ({topic.blogHr.status})
                        </span>
                      )}
                      {topic.blogEn && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                          EN: {topic.blogEn.title} ({topic.blogEn.status})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {topic.status === "queued" && (
                    <>
                      <button
                        onClick={() => handleProcess(topic)}
                        className="text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs transition-colors"
                      >
                        Pokreni
                      </button>
                      <button
                        onClick={() => handleEdit(topic)}
                        className="text-gray-700 border border-gray-300 hover:bg-gray-100 rounded px-3 py-1 text-xs transition-colors"
                      >
                        Uredi
                      </button>
                    </>
                  )}

                  {topic.status === "failed" && (
                    <button
                      onClick={() => handleRetry(topic)}
                      className="text-white bg-orange-600 hover:bg-orange-700 rounded px-3 py-1 text-xs transition-colors"
                    >
                      Ponovi
                    </button>
                  )}

                  {topic.status === "review_ready" && (
                    <>
                      <button
                        onClick={() => handleApprove(topic)}
                        className="text-white bg-green-600 hover:bg-green-700 rounded px-3 py-1 text-xs transition-colors"
                      >
                        Odobri
                      </button>
                      <button
                        onClick={() => handleReject(topic)}
                        className="text-white bg-red-600 hover:bg-red-700 rounded px-3 py-1 text-xs transition-colors"
                      >
                        Odbij
                      </button>
                      {(topic.linkedInPostHr || topic.linkedInPostEn) && (
                        <button
                          onClick={() => handleViewLinkedIn(topic)}
                          className="text-gray-700 border border-gray-300 hover:bg-gray-100 rounded px-3 py-1 text-xs transition-colors"
                        >
                          LinkedIn
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => handleViewLogs(topic)}
                    className="text-gray-700 border border-gray-300 hover:bg-gray-100 rounded px-3 py-1 text-xs transition-colors"
                  >
                    Logovi
                  </button>

                  {["queued", "failed", "cancelled"].includes(topic.status) && (
                    <button
                      onClick={() => handleDelete(topic)}
                      className="text-red-600 border border-red-300 hover:bg-red-50 rounded px-3 py-1 text-xs transition-colors"
                    >
                      Obriši
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <TopicForm
          topic={selectedTopic}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showLogs && logsTopic && (
        <LogViewer topic={logsTopic} onClose={() => setShowLogs(false)} />
      )}

      {showLinkedIn && linkedInTopic && (
        <LinkedInPreview topic={linkedInTopic} onClose={() => setShowLinkedIn(false)} />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Potvrdi brisanje"
        message="Jeste li sigurni da želite obrisati ovu temu?"
      />
    </div>
  );
};

export default TopicsTab;
