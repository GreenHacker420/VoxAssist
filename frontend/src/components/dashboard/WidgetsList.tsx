import { CogIcon, PlusIcon } from '@heroicons/react/24/outline';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import EmptyState from '@/components/UI/EmptyState';

interface Widget {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
}

interface WidgetsListProps {
  widgets: Widget[];
  onCreateWidget: () => void;
}

export default function WidgetsList({ widgets, onCreateWidget }: WidgetsListProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">My Widgets</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your voice assistant widgets</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {widgets.length} Active
        </span>
      </div>

      {widgets.length === 0 ? (
        <EmptyState
          icon={CogIcon}
          title="No widgets yet"
          description="Get started by creating your first voice assistant widget."
          action={{
            label: "Create Your First Widget",
            onClick: onCreateWidget,
            icon: <PlusIcon className="h-5 w-5" />
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => (
            <div key={widget.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">{widget.name}</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  widget.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {widget.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{widget.url}</p>
              <div className="mt-3 flex space-x-2">
                <Button variant="ghost" size="xs">Edit</Button>
                <Button variant="ghost" size="xs">View Code</Button>
                <Button variant="ghost" size="xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
