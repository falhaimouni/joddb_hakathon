import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const WorkEntries = () => {
  const { employee } = useAuth();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingEntries, setExistingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Allowed date window: yesterday .. today
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const maxDate = formatYMD(today);
  const minDate = formatYMD(yesterday);

  // Builder for a single entry (added to a local list before bulk save)
  const [activityType, setActivityType] = useState('working');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [productId, setProductId] = useState('');
  const [operationId, setOperationId] = useState('');
  const [operationCount, setOperationCount] = useState('');

  const [pendingEntries, setPendingEntries] = useState([]);

  // Lists for dropdowns
  const [products, setProducts] = useState([]);
  const [operations, setOperations] = useState([]);

  useEffect(() => {
    fetchEntries(entryDate);
  }, [entryDate]);

  // initial data for dropdowns
  useEffect(() => {
    const init = async () => {
      try {
        const [prodRes, opRes] = await Promise.all([
          api.get('/products'),
          api.get('/operations')
        ]);
        setProducts(prodRes.data?.products || prodRes.data || []);
        setOperations(opRes.data?.operations || opRes.data || []);
      } catch (e) {
        // ignore
      }
    };
    init();
  }, []);

  const fetchEntries = async (date) => {
    setLoading(true);
    try {
      const response = await api.get('/tasks/my-tasks');
      const tasksForDate = (Array.isArray(response.data) ? response.data : [])
        .filter(task => {
          const taskDate = new Date(task.startTime).toISOString().split('T')[0];
          return taskDate === date;
        })
        .map(task => ({
          entry_id: task.task_id,
          tasktype: task.tasktype,
          activity_type: task.tasktype === 'working' ? 'عمل' : task.tasktype === 'break' ? 'استراحة' : 'بانتظار موارد',
          start_time: new Date(task.startTime).toTimeString().slice(0, 5),
          end_time: new Date(task.endTime).toTimeString().slice(0, 5),
          duration_minutes: task.duration,
          product_id: task.product_id,
          product_display: task.product?.serialnumber ? `${task.product.serialnumber} - ${task.product.productname}` : (task.product_id ?? '-'),
          operation_id: task.operation_id,
          operation_display: task.operation?.name || (task.operation_id ?? '-'),
          operation_rate: task.operation?.minimum_per_min ? Number(task.operation.minimum_per_min) : null,
          finished_operations: task.finished_operations ?? null,
          status: task.validationStatus === 'validated' ? 'approved' : task.validationStatus === 'rejected' ? 'rejected' : 'pending'
        }));
      setExistingEntries(tasksForDate);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetBuilder = () => {
    setActivityType('working');
    setStartTime('');
    setEndTime('');
    setProductId('');
    setOperationId('');
    setOperationCount('');
  };

  const addToPending = (e) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      alert('يرجى إدخال وقت البداية ووقت النهاية');
      return;
    }
    // Validate that end is after start
    const start = new Date(`${entryDate}T${startTime}`);
    const end = new Date(`${entryDate}T${endTime}`);
    if (end <= start) {
      alert('وقت النهاية يجب أن يكون بعد وقت البداية');
      return;
    }

    // For working entries, enforce 06:00 to 21:00
    if (activityType === 'working') {
      const minStart = new Date(`${entryDate}T06:00`);
      const maxEnd = new Date(`${entryDate}T21:00`);
      if (start < minStart || end > maxEnd) {
        alert('بالنسبة للعمل: يجب أن يكون الوقت بين 06:00 و 21:00');
        return;
      }
      if (!productId || !operationId || operationCount === '') {
        alert('بالنسبة لقيود العمل، يجب اختيار المنتج، العملية، وعدد العمليات');
        return;
      }
    }

    // Compute duration in minutes
    const duration = Math.max(0, Math.round((end - start) / 60000));

    const newItem = {
      tasktype: activityType, // 'working','break','blocked'
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration, // send to backend
      product_id: activityType === 'working' ? Number(productId) : null,
      operation_id: activityType === 'working' ? Number(operationId) : null,
      finished_operations: activityType === 'working' ? Number(operationCount) : 0,
    };

    setPendingEntries((prev) => [...prev, newItem]);
    resetBuilder();
  };

  const removePending = (index) => {
    setPendingEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const submitBulk = async () => {
    if (pendingEntries.length === 0) {
      alert('لا توجد قيود لإرسالها');
      return;
    }
    setSubmitting(true);
    try {
      for (const entry of pendingEntries) {
        await api.post('/tasks', entry);
      }
      setPendingEntries([]);
      fetchEntries(entryDate);
      alert('تم حفظ القيود بنجاح');
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      const serverErrors = error.response?.data?.errors;
      const details = serverErrors ? `\nالتفاصيل:\n${JSON.stringify(serverErrors, null, 2)}` : '';
      alert(serverMsg ? `فشل الحفظ: ${serverMsg}${details}` : 'حدث خطأ أثناء الحفظ');
      console.error('Failed to save task entry:', error.response?.data || error);
    } finally {
      setSubmitting(false);
    }
  };

  const productNameById = (id) => {
    const p = products.find(x => (x.product_id || x.id) === id);
    return p ? `${p.serialnumber} - ${p.productname}` : id ?? '-';
  };
  const operationNameById = (id) => {
    const o = operations.find(x => (x.operation_id || x.id) === id);
    return o ? `${o.name}${o.department?.department_name ? ' - ' + o.department.department_name : ''}` : id ?? '-';
  };

  const minutesBetween = (isoStart, isoEnd) => {
    const ms = new Date(isoEnd) - new Date(isoStart);
    return Math.max(0, Math.round(ms / 60000));
  };

  const clampDateToWindow = (value) => {
    if (value < minDate) return minDate;
    if (value > maxDate) return maxDate;
    return value;
  };

  const typeBadgeClasses = (label) => {
    if (label === 'عمل') return 'bg-blue-100 text-blue-800';
    if (label === 'استراحة') return 'bg-gray-100 text-gray-800';
    return 'bg-red-100 text-red-800'; // بانتظار موارد
  };

  // Filter operations by employee department for the dropdown
  const employeeDeptId = employee?.department?.department_id || employee?.department_id;
  const operationsForDept = Array.isArray(operations)
    ? operations.filter(op => (op.department?.department_id || op.department_id) === employeeDeptId)
    : [];

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">قائمة اليوم للفني</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الإدخال</label>
          <input
            type="date"
            value={entryDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              const clamped = clampDateToWindow(v);
              if (clamped !== v) {
                alert('يمكن اختيار اليوم أو الأمس فقط');
              }
              setEntryDate(clamped);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Builder */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">إضافة بند</h2>
        <form onSubmit={addToPending} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع النشاط</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="working">عمل</option>
              <option value="break">استراحة</option>
              <option value="blocked">بانتظار موارد</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">وقت البداية</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">وقت النهاية</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {activityType === 'working' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المنتج</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">اختر المنتج</option>
                  {products.map((p) => (
                    <option key={p.product_id || p.id} value={p.product_id || p.id}>
                      {p.serialnumber} - {p.productname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العملية</label>
                <select
                  value={operationId}
                  onChange={(e) => setOperationId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">اختر العملية</option>
                  {operationsForDept.map((op) => (
                    <option key={op.operation_id || op.id} value={op.operation_id || op.id}>
                      {op.name} {op.department?.department_name ? `- ${op.department.department_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">عدد العمليات</label>
                <input
                  type="number"
                  value={operationCount}
                  onChange={(e) => setOperationCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}

          <div className="md:col-span-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={resetBuilder}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              مسح الحقول
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              إضافة إلى القائمة
            </button>
          </div>
        </form>
      </div>

      {/* Pending entries to submit */}
      {pendingEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">أعمال غير محفوظة ({pendingEntries.length})</h2>
            <button
              onClick={submitBulk}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'جاري الحفظ...' : 'حفظ اليوم'}
            </button>
          </div>
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">النوع</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">البداية</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">النهاية</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">العملية</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المدة (دقيقة)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">العدد</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingEntries.map((e, idx) => {
                  const typeLabel = e.tasktype === 'working' ? 'عمل' : e.tasktype === 'break' ? 'استراحة' : 'بانتظار موارد';
                  const startTimeStr = new Date(e.startTime).toTimeString().slice(0, 5);
                  const endTimeStr = new Date(e.endTime).toTimeString().slice(0, 5);
                  const duration = minutesBetween(e.startTime, e.endTime);
                  return (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded ${typeBadgeClasses(typeLabel)}`}>{typeLabel}</span>
                      </td>
                      <td className="px-4 py-2 text-sm">{startTimeStr}</td>
                      <td className="px-4 py-2 text-sm">{endTimeStr}</td>
                      <td className="px-4 py-2 text-sm">{e.product_id ? productNameById(e.product_id) : '-'}</td>
                      <td className="px-4 py-2 text-sm">{e.operation_id ? operationNameById(e.operation_id) : '-'}</td>
                      <td className="px-4 py-2 text-sm">{duration}</td>
                      <td className="px-4 py-2 text-sm">{e.finished_operations ?? '-'}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        <button
                          onClick={() => removePending(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          إزالة
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing entries for selected date */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold">الأعمال المسجلة بتاريخ {new Date(entryDate).toLocaleDateString('en-GB')}</h2>
        </div>
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
              {existingEntries.map((entry) => {
                const rawRate = entry.operation_rate || 0;
                const rate = rawRate > 0 ? Math.ceil(rawRate) : 0; // المخطط لأكبر عدد صحيح
                const duration = Number(entry.duration_minutes) || 0;
                const actualCount = Number(entry.finished_operations) || 0;
                const expectedCount = rate > 0 ? duration * rate : null;
                return (
                <tr key={entry.entry_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded ${typeBadgeClasses(entry.activity_type)}`}>{entry.activity_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.start_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.end_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{duration}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.product_display}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.operation_display}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expectedCount !== null ? expectedCount : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{actualCount || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      entry.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {entry.status === 'approved' ? 'موافق عليه' : entry.status === 'rejected' ? 'مرفوض' : 'معلق'}
                    </span>
                  </td>
                </tr>)
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkEntries;

