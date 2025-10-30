import { useState, useEffect } from 'react';
import api from '../../config/api';

const Breaks = () => {
  const [breaks, setBreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBreak, setNewBreak] = useState({
    break_type: 'lunch',
    start_time: '',
    end_time: '',
    break_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchBreaks();
  }, []);

  const fetchBreaks = async () => {
    try {
      const response = await api.get('/technician/breaks');
      setBreaks(response.data.breaks || []);
    } catch (error) {
      console.error('Error fetching breaks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBreak = async (e) => {
    e.preventDefault();
    try {
      await api.post('/technician/breaks', newBreak);
      setShowAddModal(false);
      setNewBreak({
        break_type: 'lunch',
        start_time: '',
        end_time: '',
        break_date: new Date().toISOString().split('T')[0],
      });
      fetchBreaks();
    } catch (error) {
      console.error('Error creating break:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء تسجيل الاستراحة');
    }
  };

  const getBreakTypeLabel = (type) => {
    const labels = {
      lunch: 'غداء',
      regular: 'عادية',
      emergency: 'طوارئ',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">الاستراحات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + تسجيل استراحة جديدة
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الاستراحة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وقت البداية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وقت النهاية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة (دقيقة)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {breaks.map((breakEntry) => {
              const start = new Date(`${breakEntry.break_date}T${breakEntry.start_time}`);
              const end = new Date(`${breakEntry.break_date}T${breakEntry.end_time}`);
              const duration = (end - start) / (1000 * 60); // in minutes

              return (
                <tr key={breakEntry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getBreakTypeLabel(breakEntry.break_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{breakEntry.start_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{breakEntry.end_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{duration.toFixed(0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(breakEntry.break_date).toLocaleDateString('ar-SA')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">تسجيل استراحة جديدة</h2>
            <form onSubmit={handleCreateBreak}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الاستراحة</label>
                  <select
                    value={newBreak.break_type}
                    onChange={(e) => setNewBreak({ ...newBreak, break_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="lunch">غداء</option>
                    <option value="regular">عادية</option>
                    <option value="emergency">طوارئ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الاستراحة</label>
                  <input
                    type="date"
                    value={newBreak.break_date}
                    onChange={(e) => setNewBreak({ ...newBreak, break_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وقت البداية</label>
                  <input
                    type="time"
                    value={newBreak.start_time}
                    onChange={(e) => setNewBreak({ ...newBreak, start_time: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وقت النهاية</label>
                  <input
                    type="time"
                    value={newBreak.end_time}
                    onChange={(e) => setNewBreak({ ...newBreak, end_time: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBreak({
                      break_type: 'lunch',
                      start_time: '',
                      end_time: '',
                      break_date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  تسجيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Breaks;

