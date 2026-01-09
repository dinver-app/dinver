import { useState, useEffect } from "react";
import { BlogTopic, BlogGenerationLog, getTopicLogs } from "../../../services/blogTopicService";

interface LogViewerProps {
  topic: BlogTopic;
  onClose: () => void;
}

const LogViewer = ({ topic, onClose }: LogViewerProps) => {
  const [logs, setLogs] = useState<BlogGenerationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [topic.id]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getTopicLogs(topic.id);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return "-";
    return tokens.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "started":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Generation Logs</h2>
            <p className="text-sm text-gray-500">{topic.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Učitavanje...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nema logova za prikaz</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                      <span className="font-medium">{log.agentName}</span>
                      <span className="text-sm text-gray-500">{log.stage}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Trajanje: {formatDuration(log.durationMs)}</span>
                      <span>Tokeni: {formatTokens(log.totalTokens)}</span>
                      <span>{log.modelUsed || "-"}</span>
                      <span className="text-lg">{expandedLog === log.id ? "−" : "+"}</span>
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="p-4 border-t bg-white">
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Started:</span>{" "}
                          {log.startedAt
                            ? new Date(log.startedAt).toLocaleString("hr")
                            : "-"}
                        </div>
                        <div>
                          <span className="text-gray-500">Completed:</span>{" "}
                          {log.completedAt
                            ? new Date(log.completedAt).toLocaleString("hr")
                            : "-"}
                        </div>
                        <div>
                          <span className="text-gray-500">Prompt tokens:</span>{" "}
                          {formatTokens(log.promptTokens)}
                        </div>
                        <div>
                          <span className="text-gray-500">Completion tokens:</span>{" "}
                          {formatTokens(log.completionTokens)}
                        </div>
                      </div>

                      {log.errorMessage && (
                        <div className="mb-4">
                          <h4 className="font-medium text-red-600 mb-1">Error:</h4>
                          <pre className="bg-red-50 p-2 rounded text-sm text-red-800 overflow-x-auto">
                            {log.errorMessage}
                          </pre>
                        </div>
                      )}

                      {log.inputData && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-700 mb-1">Input:</h4>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto max-h-40">
                            {JSON.stringify(log.inputData, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.outputData && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Output:</h4>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto max-h-60">
                            {JSON.stringify(log.outputData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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

export default LogViewer;
