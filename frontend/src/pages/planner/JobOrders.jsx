import { useState, useEffect } from 'react';
import api from '../../config/api';

const JobOrders = () => {
  const [jobOrders, setJobOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJobOrder, setNewJobOrder] = useState({
    product_id: '',
    operation_id: '',
    target_quantity: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const fetchJobOrders = async () => {
    try {
      const response = await api.get('/planner/job-orders');
      setJobOrders(response.data.job_orders || []);
    } catch (error) {
      console.error('Error fetching job orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/planner/job-orders', {
        ...newJobOrder,
        target_quantity: parseInt(newJobOrder.target_quantity),
      });
      setShowAddModal(false);
      setNewJobOrder({ product_id: '', operation_id: '', target_quantity: '', start_date: '', end_date: '' });
      fetchJobOrders();
    } catch (error) {
      console.error('Error creating job order:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء أمر العمل');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">أوامر العمل</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + إضافة أمر عمل جديد
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم المنتج</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم العملية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية المستهدفة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الكمية المكتملة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التقدم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ البدء</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الانتهاء</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobOrders.map((order) => {
              const progress = order.target_quantity > 0 
                ? ((order.completed_quantity || 0) / order.target_quantity * 100).toFixed(1)
                : 0;
              
              return (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.product_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.operation_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.target_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.completed_quantity || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <span className="mr-2 text-sm text-gray-700">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.start_date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.end_date).toLocaleDateString('ar-SA')}
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
            <h2 className="text-2xl font-bold mb-4">إضافة أمر عمل جديد</h2>
            <form onSubmit={handleCreateJobOrder}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم المنتج</label>
                  <input
                    type="number"
                    value={newJobOrder.product_id}
                    onChange={(e) => setNewJobOrder({ ...newJobOrder, product_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم العملية</label>
                  <input
                    type="number"
                    value={newJobOrder.operation_id}
                    onChange={(e) => setNewJobOrder({ ...newJobOrder, operation_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الكمية المستهدفة</label>
                  <input
                    type="number"
                    value={newJobOrder.target_quantity}
                    onChange={(e) => setNewJobOrder({ ...newJobOrder, target_quantity: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البدء</label>
                  <input
                    type="date"
                    value={newJobOrder.start_date}
                    onChange={(e) => setNewJobOrder({ ...newJobOrder, start_date: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={newJobOrder.end_date}
                    onChange={(e) => setNewJobOrder({ ...newJobOrder, end_date: e.target.value })}
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
                    setNewJobOrder({ product_id: '', operation_id: '', target_quantity: '', start_date: '', end_date: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  إنشاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrders;

