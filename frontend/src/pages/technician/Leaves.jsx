import { useState, useEffect } from 'react';
import api from '../../config/api';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_date: '',
    leave_type: 'day_off',
    reason: '',
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/technician/leaves');
      setLeaves(response.data.leaves || []);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/technician/leaves', newLeave);
      setShowAddModal(false);
      setNewLeave({ leave_date: '', leave_type: 'day_off', reason: '' });
      fetchLeaves();
    } catch (error) {
      console.error('Error creating leave:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء طلب الإجازة');
    }
  };

  const getLeaveTypeLabel = (type) => {
    const labels = {
      day_off: 'يوم إجازة',
      sick: 'إجازة مرضية',
      vacation: 'إجازة سنوية',
      emergency: 'طوارئ',
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'قيد الانتظار',
      approved: 'موافق عليها',
      rejected: 'مرفوضة',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">الإجازات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + طلب إجازة جديدة
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإجازة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الإجازة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السبب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaves.map((leave) => (
              <tr key={leave.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(leave.leave_date).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getLeaveTypeLabel(leave.leave_type)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{leave.reason || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    leave.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : leave.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusLabel(leave.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">طلب إجازة جديدة</h2>
            <form onSubmit={handleCreateLeave}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الإجازة</label>
                  <input
                    type="date"
                    value={newLeave.leave_date}
                    onChange={(e) => setNewLeave({ ...newLeave, leave_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع الإجازة</label>
                  <select
                    value={newLeave.leave_type}
                    onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="day_off">يوم إجازة</option>
                    <option value="sick">إجازة مرضية</option>
                    <option value="vacation">إجازة سنوية</option>
                    <option value="emergency">طوارئ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">السبب (اختياري)</label>
                  <textarea
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="أدخل سبب الإجازة..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewLeave({ leave_date: '', leave_type: 'day_off', reason: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  إرسال الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;

