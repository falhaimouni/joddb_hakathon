import { useEffect, useMemo, useState } from 'react';
import api from '../../config/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#dc2626', '#f59e0b', '#2563eb', '#7c3aed'];

const Analytics = () => {
  const [empStats, setEmpStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          api.get('/admin/stats/employees'),
          api.get('/departments')
        ]);
        setEmpStats(empRes.data || []);
        setDepartments(deptRes.data.departments || deptRes.data || []);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusByEmployee = useMemo(() => empStats.map(e => ({
    name: e.username,
    validated: e.totals?.validated || 0,
    rejected: e.totals?.rejected || 0,
    pending: e.totals?.pending || 0,
  })), [empStats]);

  const productivityByEmployee = useMemo(() => empStats.map(e => ({
    name: e.username,
    productivity: e.output?.productivityPerHour || 0,
    finished: e.output?.totalFinishedOperations || 0,
  })), [empStats]);

  const overall = useMemo(() => {
    const totals = empStats.reduce((acc, e) => {
      acc.validated += e.totals?.validated || 0;
      acc.rejected += e.totals?.rejected || 0;
      acc.pending += e.totals?.pending || 0;
      acc.total += e.totals?.totalTasks || 0;
      return acc;
    }, { validated: 0, rejected: 0, pending: 0, total: 0 });
    const acceptanceRate = totals.total ? (totals.validated / totals.total) * 100 : 0;
    const rejectionRate = totals.total ? (totals.rejected / totals.total) * 100 : 0;
    return { totals, acceptanceRate: Number(acceptanceRate.toFixed(2)), rejectionRate: Number(rejectionRate.toFixed(2)) };
  }, [empStats]);

  const overallPieData = useMemo(() => ([
    { name: 'Validated', value: overall.totals.validated },
    { name: 'Rejected', value: overall.totals.rejected },
    { name: 'Pending', value: overall.totals.pending },
  ]), [overall]);

  const topPerformers = useMemo(() => {
    return [...empStats]
      .map(e => ({ name: e.username, productivity: e.output?.productivityPerHour || 0 }))
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 5);
  }, [empStats]);

  const topRejected = useMemo(() => {
    return [...empStats]
      .map(e => ({ name: e.username, rejected: e.totals?.rejected || 0 }))
      .sort((a, b) => b.rejected - a.rejected)
      .slice(0, 5);
  }, [empStats]);

  const perDepartment = useMemo(() => {
    const map = new Map();
    for (const e of empStats) {
      const deptId = e.department_id;
      const name = departments.find(d => String(d.department_id) === String(deptId))?.department_name || 'غير محدد';
      if (!map.has(name)) map.set(name, { name, validated: 0, rejected: 0, pending: 0, total: 0 });
      const rec = map.get(name);
      rec.validated += e.totals?.validated || 0;
      rec.rejected += e.totals?.rejected || 0;
      rec.pending += e.totals?.pending || 0;
      rec.total += e.totals?.totalTasks || 0;
    }
    return Array.from(map.values());
  }, [empStats, departments]);

  if (loading) {
    return <div className="text-center py-8">جاري تحميل الرسومات البيانية...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">الرسومات البيانية</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500">إجمالي المهام</div>
          <div className="text-2xl font-bold">{overall.totals.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500">نسبة القبول</div>
          <div className="text-2xl font-bold text-green-700">{overall.acceptanceRate}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-500">نسبة الرفض</div>
          <div className="text-2xl font-bold text-red-700">{overall.rejectionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked status per employee */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">المهام حسب الحالة لكل موظف</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={statusByEmployee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="validated" stackId="a" fill="#16a34a" name="مقبولة" />
              <Bar dataKey="rejected" stackId="a" fill="#dc2626" name="مرفوضة" />
              <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="معلقة" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overall distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">توزيع الحالات الإجمالي</div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={overallPieData} dataKey="value" nameKey="name" outerRadius={100} label>
                {overallPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Productivity per hour */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">الإنتاجية بالساعة لكل موظف</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={productivityByEmployee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="productivity" fill="#7c3aed" name="إنتاجية/ساعة" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top performers */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">أفضل 5 موظفين (إنتاجية/ساعة)</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topPerformers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="productivity" fill="#10b981" name="إنتاجية/ساعة" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top rejected employees */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">أعلى 5 موظفين من حيث الرفض</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topRejected}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rejected" fill="#ef4444" name="مرفوض" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department stacked status */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="font-bold mb-2">الحالات لكل قسم</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={perDepartment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="validated" stackId="d" fill="#16a34a" name="مقبولة" />
              <Bar dataKey="rejected" stackId="d" fill="#dc2626" name="مرفوضة" />
              <Bar dataKey="pending" stackId="d" fill="#f59e0b" name="معلقة" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;


