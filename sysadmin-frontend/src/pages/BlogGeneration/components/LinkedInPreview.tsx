import { BlogTopic } from "../../../services/blogTopicService";

interface LinkedInPreviewProps {
  topic: BlogTopic;
  onClose: () => void;
}

const LinkedInPreview = ({ topic, onClose }: LinkedInPreviewProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kopirano u međuspremnik!");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">LinkedIn Postovi</h2>
            <p className="text-sm text-gray-500">{topic.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Croatian Post */}
          {topic.linkedInPostHr && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">Hrvatski</h3>
                <button
                  onClick={() => copyToClipboard(topic.linkedInPostHr || "")}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Kopiraj
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="whitespace-pre-wrap text-sm">{topic.linkedInPostHr}</div>
              </div>
            </div>
          )}

          {/* English Post */}
          {topic.linkedInPostEn && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">English</h3>
                <button
                  onClick={() => copyToClipboard(topic.linkedInPostEn || "")}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="whitespace-pre-wrap text-sm">{topic.linkedInPostEn}</div>
              </div>
            </div>
          )}

          {!topic.linkedInPostHr && !topic.linkedInPostEn && (
            <div className="text-center py-8 text-gray-500">
              LinkedIn postovi još nisu generirani.
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInPreview;
