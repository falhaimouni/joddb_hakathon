import { useEffect, useMemo, useState } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const typeBadgeClasses = (label) => {
  if (label === 'عمل') return 'bg-blue-100 text-blue-800';
  if (label === 'استراحة') return 'bg-gray-100 text-gray-800';
  return 'bg-red-100 text-red-800';
};

function formatYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const statusBadgeClasses = (status) => {
  if (status === 'validated') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800'; // pending or others
};

const statusLabelAr = (status) => {
  if (status === 'validated') return 'موافق عليه';
  if (status === 'rejected') return 'مرفوض';
  if (status === 'pending') return 'معلق';
  return status; // fallback to original if unknown
};

const History = () => {
  const { employee } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

  const [startDate, setStartDate] = useState(formatYMD(sevenDaysAgo));
  const [endDate, setEndDate] = useState(formatYMD(today));

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const res = await api.get('/tasks/my-tasks');
        const tasks = Array.isArray(res.data) ? res.data : [];
        const mapped = tasks.map(task => ({
          id: task.task_id,
          tasktype: task.tasktype,
          type_label: task.tasktype === 'working' ? 'عمل' : task.tasktype === 'break' ? 'استراحة' : 'بانتظار موارد',
          start: new Date(task.startTime),
          end: new Date(task.endTime),
          start_str: new Date(task.startTime).toTimeString().slice(0, 5),
          end_str: new Date(task.endTime).toTimeString().slice(0, 5),
          date_str: new Date(task.startTime).toLocaleDateString('en-GB'),
          duration: task.duration,
          product: task.product?.serialnumber ? `${task.product.serialnumber} - ${task.product.productname}` : (task.product_id ?? '-'),
          operation: task.operation?.name || (task.operation_id ?? '-'),
          rate: task.operation?.minimum_per_min ? Number(task.operation.minimum_per_min) : null,
          actual: task.finished_operations ?? null,
          status: task.validationStatus // keep original for logic & color
        }));
        setAllTasks(mapped);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    // include end day fully
    e.setHours(23,59,59,999);
    return allTasks.filter(t => t.start >= s && t.start <= e);
  }, [allTasks, startDate, endDate]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">سجل الأعمال للفني</h1>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">البداية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">النهاية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المدة (دقيقة)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المخطط (عدد/دقيقة)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المتوقع (عدد)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفعلي (عدد)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((row) => {
                const rawRate = row.rate || 0;
                const rate = rawRate > 0 ? Math.ceil(rawRate) : 0;
                const expected = rate > 0 ? rate * (row.duration || 0) : null;
                return (
                  <tr key={row.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date_str}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded ${typeBadgeClasses(row.type_label)}`}>{row.type_label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.start_str}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.end_str}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.operation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expected !== null ? expected : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.actual ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusBadgeClasses(row.status)}`}>
                        {statusLabelAr(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default History;
