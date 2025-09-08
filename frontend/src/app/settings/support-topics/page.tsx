'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { SettingsService, SupportTopic } from '@/services/settings';
import toast from 'react-hot-toast';

export default function SupportTopicsPage() {
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<SupportTopic | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setIsLoading(true);
      const data = await SettingsService.getSupportTopics();
      setTopics(data);
    } catch (error) {
      toast.error('Failed to load support topics.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (topic: Omit<SupportTopic, 'id'>) => {
    try {
      if (currentTopic) {
        await SettingsService.updateSupportTopic(currentTopic.id, topic);
        toast.success('Support topic updated!');
      } else {
        await SettingsService.createSupportTopic(topic);
        toast.success('Support topic created!');
      }
      setIsModalOpen(false);
      loadTopics();
    } catch (error) {
      toast.error('Failed to save support topic.');
    }
  };

  const handleEdit = (topic: SupportTopic) => {
    setCurrentTopic(topic);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        await SettingsService.deleteSupportTopic(id);
        toast.success('Support topic deleted.');
        loadTopics();
      } catch (error) {
        toast.error('Failed to delete support topic.');
      }
    }
  };

  const handleAddNew = () => {
    setCurrentTopic(null);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Topics</h1>
            <p className="mt-1 text-sm text-gray-500">Define topics for the AI to recognize and respond to.</p>
          </div>
          <button onClick={handleAddNew} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>Add Topic</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <ul role="list" className="divide-y divide-gray-200">
              {topics.map(topic => (
                <li key={topic.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{topic.name}</h3>
                      <p className="text-sm text-gray-500">Keywords: {topic.keywords.join(', ')}</p>
                      <p className="text-sm text-gray-500 mt-1">Description: "{topic.description}"</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(topic)} className="p-2 text-gray-400 hover:text-gray-600">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(topic.id)} className="p-2 text-red-400 hover:text-red-600">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isModalOpen && (
          <TopicModal 
            topic={currentTopic}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function TopicModal({ topic, onClose, onSave }: { topic: SupportTopic | null, onClose: () => void, onSave: (topic: Omit<SupportTopic, 'id'>) => void }) {
  const [name, setName] = useState(topic?.name || '');
  const [keywords, setKeywords] = useState(topic?.keywords.join(', ') || '');
  const [responseScript, setResponseScript] = useState(topic?.responseScript || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      keywords: keywords.split(',').map(k => k.trim()),
      responseScript
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{topic ? 'Edit' : 'Add'} Support Topic</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Topic Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Response Script</label>
            <textarea value={responseScript} onChange={e => setResponseScript(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" rows={3} required />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
