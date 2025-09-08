'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { SettingsService, EscalationRule } from '@/services/settings';
import toast from 'react-hot-toast';

export default function EscalationRulesPage() {
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<EscalationRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setIsLoading(true);
      const data = await SettingsService.getEscalationRules();
      setRules(data);
    } catch (error) {
      toast.error('Failed to load escalation rules.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (rule: Omit<EscalationRule, 'id'>) => {
    try {
      if (currentRule) {
        await SettingsService.updateEscalationRule(currentRule.id, rule);
        toast.success('Escalation rule updated!');
      } else {
        await SettingsService.createEscalationRule(rule);
        toast.success('Escalation rule created!');
      }
      setIsModalOpen(false);
      loadRules();
    } catch (error) {
      toast.error('Failed to save escalation rule.');
    }
  };

  const handleEdit = (rule: EscalationRule) => {
    setCurrentRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await SettingsService.deleteEscalationRule(id);
        toast.success('Escalation rule deleted.');
        loadRules();
      } catch (error) {
        toast.error('Failed to delete escalation rule.');
      }
    }
  };

  const handleAddNew = () => {
    setCurrentRule(null);
    setIsModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escalation Rules</h1>
            <p className="mt-1 text-sm text-gray-500">Define rules for escalating calls to human agents.</p>
          </div>
          <button onClick={handleAddNew} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>Add Rule</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <ul role="list" className="divide-y divide-gray-200">
              {rules.map(rule => (
                <li key={rule.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{rule.name}</h3>
                      <p className="text-sm text-gray-500">Condition: {rule.condition.type} - {rule.condition.value}</p>
                      <p className="text-sm text-gray-500 mt-1">Action: {rule.action}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(rule)} className="p-2 text-gray-400 hover:text-gray-600">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="p-2 text-red-400 hover:text-red-600">
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
          <RuleModal 
            rule={currentRule}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function RuleModal({ rule, onClose, onSave }: { rule: EscalationRule | null, onClose: () => void, onSave: (rule: Omit<EscalationRule, 'id'>) => void }) {
  const [name, setName] = useState(rule?.name || '');
  const [conditionType, setConditionType] = useState(rule?.condition.type || 'keyword');
  const [conditionValue, setConditionValue] = useState(rule?.condition.value || '');
  const [action, setAction] = useState(rule?.action || 'handoff');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      condition: {
        type: conditionType as 'keyword' | 'sentiment',
        value: conditionValue
      },
      action: action as 'handoff' | 'alert'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{rule ? 'Edit' : 'Add'} Escalation Rule</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rule Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Type</label>
            <select value={conditionType} onChange={e => setConditionType(e.target.value as 'keyword' | 'sentiment')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="keyword">Keyword</option>
              <option value="sentiment">Sentiment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Condition Value</label>
            <input type="text" value={conditionValue} onChange={e => setConditionValue(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Action</label>
            <select value={action} onChange={e => setAction(e.target.value as 'handoff' | 'alert')} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="handoff">Handoff to Human</option>
              <option value="alert">Send Alert</option>
            </select>
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
