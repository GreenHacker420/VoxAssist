import Card from '@/components/ui/Card';

interface ActivityItem {
  id: string;
  type: 'call' | 'error' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'failed' | 'pending';
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest calls and system events.</p>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No recent activity to display</p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        activity.status === 'completed' ? 'bg-green-500' :
                        activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}>
                        <span className="h-2 w-2 bg-white rounded-full" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {activity.title} <span className="font-medium text-gray-900">{activity.description}</span>
                        </p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time>{activity.timestamp}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
