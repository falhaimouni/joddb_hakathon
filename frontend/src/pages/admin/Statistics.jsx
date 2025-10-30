import { useState, useEffect } from 'react';
import api from '../../config/api';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empStats, setEmpStats] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  // filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department_id: ''
  });

  useEffect(() => {
    fetchStatistics();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployeesStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.department_id]);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/admin/stats');
      const s = response.data || {};
      const total = s.totalTasks || 0;
      const validated = s.validatedTasks || 0;
      const rejected = s.rejectedTasks || 0;
      const pending = s.pendingTasks || 0;
      const acceptanceRate = total ? (validated / total) * 100 : 0;
      const rejectionRate = total ? (rejected / total) * 100 : 0;
      const pendingRate = total ? (pending / total) * 100 : 0;
      setStats({
        ...s,
        acceptanceRate: Number(acceptanceRate.toFixed(2)),
        rejectionRate: Number(rejectionRate.toFixed(2)),
        pendingRate: Number(pendingRate.toFixed(2))
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments || response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployeesStats = async () => {
    setEmpLoading(true);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.department_id) params.department_id = filters.department_id;
      const response = await api.get('/admin/stats/employees', { params });
      setEmpStats(response.data || []);
    } catch (error) {
      console.error('Error fetching employee statistics:', error);
      setEmpStats([]);
    } finally {
      setEmpLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">الإحصائيات العامة</h1>

      {/* بطاقات الإحصائيات العامة الفعلية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-primary-600">{stats?.totalEmployees || 0}</div>
          <div className="text-gray-600 mt-2">إجمالي الموظفين</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-green-600">{stats?.totalProducts || 0}</div>
          <div className="text-gray-600 mt-2">إجمالي المنتجات</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-blue-600">{stats?.totalOperations || 0}</div>
          <div className="text-gray-600 mt-2">إجمالي العمليات</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl font-bold text-purple-600">{stats?.totalTasks || 0}</div>
          <div className="text-gray-600 mt-2">إجمالي المهام</div>
        </div>
      </div>

      {stats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">تفاصيل الإحصائيات</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">إحصائيات الإنتاجية</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>نسبة القبول:</span>
                  <span className="font-semibold text-green-700">{stats.acceptanceRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>نسبة الرفض:</span>
                  <span className="font-semibold text-red-700">{stats.rejectionRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>نسبة المعلّق:</span>
                  <span className="font-semibold text-amber-600">{stats.pendingRate || 0}%</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">تفاصيل إضافية</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المهام المقبولة:</span>
                  <span className="font-semibold text-green-700">{stats.validatedTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>المهام المرفوضة:</span>
                  <span className="font-semibold text-red-700">{stats.rejectedTasks || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>المهام المعلقة:</span>
                  <span className="font-semibold text-amber-600">{stats.pendingTasks || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee stats section */}
      <div className="mt-8">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 md:space-x-reverse gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">الكل</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold">إحصائيات الموظفين</h2>
            <button
              onClick={fetchEmployeesStats}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
            >
              تحديث
            </button>
          </div>
          {empLoading ? (
            <div className="py-8 text-center">جاري التحميل...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الموظف</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المهام</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مقبولة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">مرفوضة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">معلقة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عمليات منجزة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إنتاجية/ساعة</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empStats.map((e) => (
                    <tr key={e.employee_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {({ admin: 'مدير', planner: 'مخطط', supervisor: 'مشرف', technicien: 'فني' }[e.role]) || e.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(departments.find(d => String(d.department_id) === String(e.department_id))?.department_name) || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.totals?.totalTasks ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">{e.totals?.validated ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700">{e.totals?.rejected ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{e.totals?.pending ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{e.output?.totalFinishedOperations ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700">{e.output?.productivityPerHour ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistics;

