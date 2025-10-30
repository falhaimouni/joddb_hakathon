import { useState, useEffect } from 'react';
import api from '../../config/api';

const PlannerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/planner/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">لوحة تحكم المخطط</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold mb-2">
            {dashboard?.productivity?.toFixed(2) || 0}%
          </div>
          <div className="text-blue-100">الإنتاجية</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold mb-2">
            {dashboard?.efficiency?.toFixed(2) || 0}%
          </div>
          <div className="text-green-100">الكفاءة</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold mb-2">
            {dashboard?.utilization?.toFixed(2) || 0}%
          </div>
          <div className="text-purple-100">الاستخدام</div>
        </div>
      </div>

      {dashboard && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">التفاصيل</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">معلومات الإنتاج</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>الإنتاج الفعلي:</span>
                  <span className="font-semibold">{dashboard.actual_output || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>الإنتاج المستهدف:</span>
                  <span className="font-semibold">{dashboard.target_output || 0}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">معلومات الوقت</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>الوقت الفعلي:</span>
                  <span className="font-semibold">{dashboard.actual_time || 0} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span>الوقت القياسي:</span>
                  <span className="font-semibold">{dashboard.standard_time || 0} دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerDashboard;

