"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { WidgetsService, type WidgetDTO } from "@/services/widgets";

export interface WidgetConfig {
  id?: string;
  name: string;
  contextUrl?: string;
  appearance: {
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
    borderRadius: string;
    size: "small" | "medium" | "large";
  };
  behavior: {
    autoOpen: boolean;
    greeting: string;
    language: string;
    enableVoice: boolean;
    enableText: boolean;
  };
  permissions: {
    collectPersonalData: boolean;
    storeCookies: boolean;
    recordAudio: boolean;
    shareWithThirdParty: boolean;
  };
}

export default function WidgetCreateDialog({
  open,
  widget,
  onClose,
  onSaved,
  organizationId,
}: {
  open: boolean;
  widget?: WidgetConfig | null;
  onClose: () => void;
  onSaved: () => void;
  organizationId?: number;
}) {
  const [formData, setFormData] = useState<WidgetConfig>({
    name: widget?.name || "",
    contextUrl: widget?.contextUrl || "",
    appearance: {
      position: (widget?.appearance.position as WidgetConfig["appearance"]["position"]) || "bottom-right",
      primaryColor: widget?.appearance.primaryColor || "#3B82F6",
      secondaryColor: widget?.appearance.secondaryColor || "#1E40AF",
      textColor: widget?.appearance.textColor || "#FFFFFF",
      backgroundColor: widget?.appearance.backgroundColor || "#FFFFFF",
      borderRadius: widget?.appearance.borderRadius || "12px",
      size: (widget?.appearance.size as WidgetConfig["appearance"]["size"]) || "medium",
    },
    behavior: {
      autoOpen: widget?.behavior.autoOpen || false,
      greeting: widget?.behavior.greeting || "Hi! How can I help you today?",
      language: widget?.behavior.language || "en",
      enableVoice: widget?.behavior.enableVoice ?? true,
      enableText: widget?.behavior.enableText ?? true,
    },
    permissions: {
      collectPersonalData: widget?.permissions?.collectPersonalData ?? false,
      storeCookies: widget?.permissions?.storeCookies ?? true,
      recordAudio: widget?.permissions?.recordAudio ?? true,
      shareWithThirdParty: widget?.permissions?.shareWithThirdParty ?? false,
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Widget name is required");
      return;
    }

    setSaving(true);
    try {
      if (widget?.id) {
        await WidgetsService.update(widget.id, formData as Partial<WidgetDTO>);
      } else {
        if (!organizationId) throw new Error("Organization ID is required to create a widget");
        await WidgetsService.create(organizationId, formData as WidgetDTO);
      }
      toast.success(`Widget ${widget?.id ? "updated" : "created"} successfully`);
      onSaved();
    } catch (err) {
      console.error("Save widget error:", err);
      toast.error(`Failed to ${widget?.id ? "update" : "create"} widget`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-gray-100/50 via-white/30 to-gray-100/50 backdrop-blur-md">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-300">
          <h2 className="text-2xl font-semibold text-gray-900">
            {widget?.id ? "Edit Widget" : "Create New Widget"}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Widget Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="My Website Widget"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Context URL (Optional)</label>
                <input
                  type="url"
                  value={formData.contextUrl || ""}
                  onChange={(e) => setFormData({ ...formData, contextUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={formData.appearance.position}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appearance: { ...formData.appearance, position: e.target.value as WidgetConfig["appearance"]["position"] },
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input
                  type="color"
                  value={formData.appearance.primaryColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appearance: { ...formData.appearance, primaryColor: e.target.value },
                    })
                  }
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
                <textarea
                  value={formData.behavior.greeting}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      behavior: { ...formData.behavior, greeting: e.target.value },
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  rows={2}
                  placeholder="Hi! How can I help you today?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={formData.behavior.language}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        behavior: { ...formData.behavior, language: e.target.value },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="hi">Hindi</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Widget Size</label>
                  <select
                    value={formData.appearance.size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appearance: { ...formData.appearance, size: e.target.value as WidgetConfig["appearance"]["size"] },
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Features</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.behavior.autoOpen}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          behavior: { ...formData.behavior, autoOpen: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-open widget</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.behavior.enableVoice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          behavior: { ...formData.behavior, enableVoice: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable voice chat</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.behavior.enableText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          behavior: { ...formData.behavior, enableText: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable text chat</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.recordAudio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permissions: { ...formData.permissions, recordAudio: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Record audio</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Permissions */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Permissions</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.collectPersonalData}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, collectPersonalData: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Collect personal data (name, email, etc.)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.storeCookies}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, storeCookies: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Store cookies for session management</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.shareWithThirdParty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, shareWithThirdParty: e.target.checked },
                      })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Share data with third-party services</span>
                </label>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  <strong>Privacy Notice:</strong> These settings affect GDPR compliance. Ensure you have proper consent mechanisms in place before enabling data collection features.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-300 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : widget?.id ? "Update Widget" : "Create Widget"}
          </button>
        </div>
      </div>
    </div>
  );
}
