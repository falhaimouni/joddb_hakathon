import { useState, useEffect } from 'react';
import api from '../../config/api';

const Pending = () => {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const fetchPendingEntries = async () => {
    try {
      const response = await api.get('/tasks/pending');
      setPendingEntries(response.data.tasks || response.data || []);
    } catch (error) {
      console.error('Error fetching pending entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (entryId) => {
    try {
      await api.post(`/tasks/${entryId}/validate`);
      fetchPendingEntries();
    } catch (error) {
      console.error('Error approving entry:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء الموافقة');
    }
  };

  const handleReject = async (entryId) => {
    try {
      await api.post(`/tasks/${entryId}/reject`);
      fetchPendingEntries();
    } catch (error) {
      console.error('Error rejecting entry:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء الرفض');
    }
  };

  const handleCancelApproval = async (entryId) => {
    if (!confirm('هل أنت متأكد من إلغاء الموافقة؟')) return;

    try {
      await api.put(`/tasks/${entryId}`, { validationStatus: 'pending' });
      fetchPendingEntries();
    } catch (error) {
      console.error('Error cancelling approval:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إلغاء الموافقة');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  const productDisplay = (entry) => {
    const p = entry.product;
    if (p?.productname && p?.serialnumber) return `${p.productname} (${p.serialnumber})`;
    if (p?.productname) return p.productname;
    if (p?.serialnumber) return p.serialnumber;
    return entry.product_id || '-';
  };

  const operationDisplay = (entry) => {
    const o = entry.operation;
    return o?.name || entry.operation_id || '-';
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">الأعمال المعلقة للمراجعة</h1>

      {pendingEntries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">لا توجد أعمال معلقة للمراجعة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingEntries.map((entry) => (
            <div key={entry.task_id} className="bg-white rounded-lg shadow-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-gray-600">الفني:</span>
                  <span className="font-semibold mr-2">{entry.employee?.username || 'غير معروف'}</span>
                </div>
                <div>
                  <span className="text-gray-600">المنتج:</span>
                  <span className="font-semibold mr-2">{productDisplay(entry)}</span>
                </div>
                <div>
                  <span className="text-gray-600">العملية:</span>
                  <span className="font-semibold mr-2">{operationDisplay(entry)}</span>
                </div>
                <div>
                  <span className="text-gray-600">عدد العمليات:</span>
                  <span className="font-semibold mr-2">{entry.finished_operations || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">المدة (دقيقة):</span>
                  <span className="font-semibold mr-2">{entry.duration || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">التاريخ ووقت البداية:</span>
                  <span className="font-semibold mr-2">
                    {entry.startTime ? new Date(entry.startTime).toLocaleString('en-GB') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">الحالة:</span>
                  <span className={`font-semibold mr-2 px-2 py-1 rounded ${
                    entry.validationStatus === 'validated' 
                      ? 'bg-green-100 text-green-800'
                      : entry.validationStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {entry.validationStatus === 'validated' ? 'موافق عليه' : entry.validationStatus === 'rejected' ? 'مرفوض' : 'معلق'}
                  </span>
                </div>
              </div>

              {entry.validationStatus === 'validated' && (
                <div className="mb-4">
                  <button
                    onClick={() => handleCancelApproval(entry.task_id)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition"
                  >
                    إلغاء الموافقة
                  </button>
                </div>
              )}

              {entry.validationStatus === 'pending' && (
                <div className="flex space-x-2 space-x-reverse items-end">
                  <div className="flex space-x-2 space-x-reverse">
                    <button
                      onClick={() => handleApprove(entry.task_id)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      موافقة
                    </button>
                    <button
                      onClick={() => handleReject(entry.task_id)}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Pending;

