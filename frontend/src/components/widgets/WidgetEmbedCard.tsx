"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  EyeIcon, 
  Cog6ToothIcon, 
  TrashIcon, 
  CodeBracketIcon, 
  ShareIcon,
  ClipboardDocumentIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";
import { WidgetsService, type WidgetDTO } from "@/services/widgets";
import toast from "react-hot-toast";

interface WidgetEmbedCardProps {
  widget: WidgetDTO;
  onEdit: (widget: WidgetDTO) => void;
  onDelete: (widgetId: string) => void;
}

export default function WidgetEmbedCard({ widget, onEdit, onDelete }: WidgetEmbedCardProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      await WidgetsService.toggleActive(widget.id!, !isActive);
      setIsActive(!isActive);
      toast.success(`Widget ${!isActive ? "activated" : "deactivated"} successfully`);
    } catch (error) {
      console.error("Toggle widget error:", error);
      toast.error("Failed to toggle widget status");
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this widget?")) {
      onDelete(widget.id!);
    }
  };

  const handleGetEmbedCode = () => {
    router.push(`/widgets/embed/${widget.id}`);
  };

  const handleCopyEmbedCode = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widget.id}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

    try {
      await navigator.clipboard.writeText(embedCode);
      toast.success("Embed code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy embed code:", error);
      toast.error("Failed to copy embed code");
    }
  };

  const handlePreviewWidget = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const previewUrl = `${baseUrl}/embed/widget/${widget.id}/iframe?test=true`;
    window.open(previewUrl, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
  };

  const getEmbedCode = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed/widget.js?id=${widget.id}&v=1.0';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{widget.name}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {widget.contextUrl ? (
                <span className="flex items-center gap-1">
                  <GlobeAltIcon className="w-4 h-4 text-green-500" />
                  {widget.contextUrl}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                  No context URL set
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {widget.appearance.size}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                ID: {widget.id?.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Preview */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Widget Preview</div>
          <button
            onClick={handlePreviewWidget}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition"
          >
            <EyeIcon className="w-3 h-3" />
            Preview
          </button>
        </div>
        <div
          className="relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${widget.appearance.primaryColor}20, ${widget.appearance.secondaryColor}20)`,
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: widget.appearance.primaryColor }}
          >
            💬
          </div>
          <div className="absolute bottom-2 left-2 text-xs text-gray-500">
            Position: {widget.appearance.position}
          </div>
        </div>
      </div>

      {/* Embed Code Section */}
      {showEmbedCode && (
        <div className="p-6 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Embed Code</h4>
            <button
              onClick={() => setShowEmbedCode(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
              <code>{getEmbedCode()}</code>
            </pre>
            <button
              onClick={handleCopyEmbedCode}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Paste this code into your website&apos;s HTML, preferably before the closing &lt;/body&gt; tag.
          </p>
        </div>
      )}

      {/* Features */}
      <div className="p-6 border-t border-gray-200">
        <div className="text-sm text-gray-600 mb-3">Features</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                widget.behavior.enableText ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm text-gray-700">Text Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                widget.behavior.enableVoice ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm text-gray-700">Voice Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                widget.behavior.autoOpen ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm text-gray-700">Auto Open</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                widget.permissions.recordAudio ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm text-gray-700">Audio Recording</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(widget)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleGetEmbedCode}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition"
            >
              <CodeBracketIcon className="w-4 h-4" />
              Embed
            </button>
            <button
              onClick={() => setShowEmbedCode(!showEmbedCode)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition"
            >
              <ShareIcon className="w-4 h-4" />
              {showEmbedCode ? 'Hide' : 'Show'} Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isToggling}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                isActive
                  ? "text-red-700 bg-red-100 hover:bg-red-200"
                  : "text-green-700 bg-green-100 hover:bg-green-200"
              } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isToggling ? "..." : isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
