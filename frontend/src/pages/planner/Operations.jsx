import { useState, useEffect } from 'react';
import api from '../../config/api';

const Operations = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ department_id: '', search: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOperation, setEditOperation] = useState({
    id: null,
    name: '',
    department_id: '',
    minimum_per_min: '',
    opsCount: '',
    minutes: ''
  });
  const [newOperation, setNewOperation] = useState({
    name: '',
    department_id: '',
    minimum_per_min: '',
  });

  useEffect(() => {
    fetchOperations();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments || response.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await api.get('/operations');
      setOperations(response.data.operations || response.data || []);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/operations', {
        name: newOperation.name,
        department_id: parseInt(newOperation.department_id),
        minimum_per_min: parseFloat(newOperation.minimum_per_min),
      });
      setShowAddModal(false);
      setNewOperation({ name: '', department_id: '', minimum_per_min: '' });
      fetchOperations();
    } catch (error) {
      console.error('Error creating operation:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء العملية');
    }
  };

  const openEditModal = (op) => {
    setEditOperation({
      id: op.operation_id || op.id,
      name: op.name || '',
      department_id: op.department_id || op.department?.department_id || '',
      minimum_per_min: op.minimum_per_min || '',
      opsCount: '',
      minutes: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateOperation = async (e) => {
    e.preventDefault();
    try {
      const id = editOperation.id;
      if (!id) throw new Error('معرف العملية غير موجود');

      let minimum = parseFloat(editOperation.minimum_per_min);
      const opsCountNum = parseFloat(editOperation.opsCount);
      const minutesNum = parseFloat(editOperation.minutes);
      if (!isNaN(opsCountNum) && !isNaN(minutesNum) && minutesNum > 0) {
        minimum = opsCountNum / minutesNum;
      }

      await api.put(`/operations/${id}` , {
        name: editOperation.name,
        department_id: parseInt(editOperation.department_id),
        minimum_per_min: Number(minimum.toFixed(2))
      });
      setShowEditModal(false);
      setEditOperation({ id: null, name: '', department_id: '', minimum_per_min: '', opsCount: '', minutes: '' });
      fetchOperations();
    } catch (error) {
      console.error('Error updating operation:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء تعديل العملية');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة العمليات</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + إضافة عملية جديدة
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">الكل</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">بحث بالاسم</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="أدخل اسم العملية"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={() => setFilters({ department_id: '', search: '' })}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم العملية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحد الأدنى في الدقيقة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {operations
              .filter(op => !filters.department_id || String(op.department_id || op.department?.department_id) === String(filters.department_id))
              .filter(op => !filters.search || (op.name || '').toLowerCase().includes(filters.search.toLowerCase()))
              .map((operation) => (
              <tr key={operation.operation_id || operation.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operation.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{operation.department?.department_name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{operation.minimum_per_min}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => openEditModal(operation)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">إضافة عملية جديدة</h2>
            <form onSubmit={handleCreateOperation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم العملية</label>
                  <input
                    type="text"
                    value={newOperation.name}
                    onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="أدخل اسم العملية"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                  <select
                    value={newOperation.department_id}
                    onChange={(e) => setNewOperation({ ...newOperation, department_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأدنى في الدقيقة</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOperation.minimum_per_min}
                    onChange={(e) => setNewOperation({ ...newOperation, minimum_per_min: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="مثال: 10.5"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewOperation({ name: '', department_id: '', minimum_per_min: '' });
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

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">تعديل العملية</h2>
            <form onSubmit={handleUpdateOperation}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم العملية</label>
                  <input
                    type="text"
                    value={editOperation.name}
                    onChange={(e) => setEditOperation({ ...editOperation, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                  <select
                    value={editOperation.department_id}
                    onChange={(e) => setEditOperation({ ...editOperation, department_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map((dept) => (
                      <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحد الأدنى في الدقيقة (مباشر)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editOperation.minimum_per_min}
                    onChange={(e) => setEditOperation({ ...editOperation, minimum_per_min: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="مثال: 10.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حساب الحد الأدنى (عدد العمليات / عدد الدقائق)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="عدد العمليات"
                      value={editOperation.opsCount}
                      onChange={(e) => setEditOperation({ ...editOperation, opsCount: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="عدد الدقائق"
                      value={editOperation.minutes}
                      onChange={(e) => setEditOperation({ ...editOperation, minutes: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  {(editOperation.opsCount && editOperation.minutes && Number(editOperation.minutes) > 0) && (
                    <div className="mt-2 text-sm text-gray-600">
                      الناتج: {(Number(editOperation.opsCount) / Number(editOperation.minutes)).toFixed(2)} عملية/دقيقة
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Operations;

