import { useEffect, useMemo, useState } from 'react';
import api from '../../config/api';

const statusBadgeClasses = (status) => {
  if (status === 'validated') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const SupervisorDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/department');
      setTasks(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const s = startDate ? new Date(startDate + 'T00:00:00') : null;
    const e = endDate ? new Date(endDate + 'T23:59:59') : null;
    return tasks.filter((t) => {
      const tdate = new Date(t.startTime);
      if (s && tdate < s) return false;
      if (e && tdate > e) return false;
      if (username && t.employee?.username !== username) return false;
      if (status && t.validationStatus !== status) return false;
      return true;
    });
  }, [tasks, startDate, endDate, username, status]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter(t => t.validationStatus === 'validated').length;
    const pending = filtered.filter(t => t.validationStatus === 'pending').length;
    const rejected = filtered.filter(t => t.validationStatus === 'rejected').length;
    return { total, approved, pending, rejected };
  }, [filtered]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">لوحة تحكم المشرف</h1>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-primary-600">{totals.total}</div>
          <div className="text-gray-600 mt-2">إجمالي الأعمال</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-green-600">{totals.approved}</div>
          <div className="text-gray-600 mt-2">أعمال موافق عليها</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-yellow-600">{totals.pending}</div>
          <div className="text-gray-600 mt-2">أعمال معلقة</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-red-600">{totals.rejected}</div>
          <div className="text-gray-600 mt-2">أعمال مرفوضة</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">من تاريخ</label>
          <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">إلى تاريخ</label>
          <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">اسم المستخدم (الفني)</label>
          <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="اكتب اسم المستخدم" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">حالة العمل</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full px-3 py-2 border rounded">
            <option value="">الكل</option>
            <option value="validated">موافق عليه</option>
            <option value="pending">معلق</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفني</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النهاية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة (دقيقة)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العدد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((t)=> (
                <tr key={t.task_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.employee?.username || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.product?.productname || t.product?.serialnumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.operation?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.startTime).toLocaleString('en-GB')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.endTime).toLocaleString('en-GB')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.finished_operations ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusBadgeClasses(t.validationStatus)}`}>
                      {t.validationStatus === 'validated' ? 'موافق عليه' : t.validationStatus === 'rejected' ? 'مرفوض' : 'معلق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;

