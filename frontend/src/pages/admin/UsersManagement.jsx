import { useState, useEffect } from 'react';
import api from '../../config/api';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInfo, setShareInfo] = useState({ username: '', newPassword: '' });
  
  const [newUser, setNewUser] = useState({
    username: '',
    role: 'technicien',
    department_id: '',
  });
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ role: '', department_id: '' });

  useEffect(() => {
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filters.role) params.role = filters.role;
      if (filters.department_id) params.department_id = filters.department_id;
      const response = await api.get('/admin/users', { params });
      setUsers(response.data.users || response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = async () => {
    try {
      const response = await api.get('/admin/generate-password');
      setGeneratedPassword(response.data.password);
    } catch (error) {
      console.error('Error generating password:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Prepare user data matching backend structure
      const userData = {
        username: newUser.username,
        role: newUser.role,
        password: generatedPassword,
      };
      
      // Add department_id if required for supervisor or technicien
      if (newUser.role === 'supervisor' || newUser.role === 'technicien') {
        if (!newUser.department_id) {
          alert('يجب اختيار القسم للمشرف أو الفني');
          return;
        }
        userData.department_id = parseInt(newUser.department_id);
      }
      
      const response = await api.post('/admin/users', userData);
      
      if (response.data) {
        setShowAddModal(false);
        setNewUser({ username: '', role: 'technicien', department_id: '' });
        setGeneratedPassword('');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء المستخدم');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await api.delete(`/admin/users/${selectedUser.employee_id || selectedUser.id}`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء حذف المستخدم');
    }
  };

  const openResetConfirm = (user) => {
    setSelectedUser(user);
    setShowResetConfirmModal(true);
  };

  const handleResetPassword = async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/reset-password`);
      const pwd = response.data?.newPassword || response.data?.password || '';
      // Find user for display
      const user = users.find(u => (u.employee_id || u.id) === userId);
      setShareInfo({ username: user?.username || String(userId), newPassword: pwd });
      setShowShareModal(true);
      setShowResetConfirmModal(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة المستخدمين</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          + إضافة مستخدم جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">الكل</option>
              <option value="technicien">فني</option>
              <option value="supervisor">مشرف</option>
              <option value="planner">مخطط</option>
              <option value="admin">مدير</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">الكل</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={() => { setLoading(true); fetchUsers(); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              تطبيق
            </button>
            <button
              onClick={() => { setFilters({ role: '', department_id: '' }); setLoading(true); fetchUsers(); }}
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اسم المستخدم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الدور</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">القسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              // Normalize role for display
              const roleMapping = {
                'admin': 'مدير',
                'planner': 'مخطط',
                'supervisor': 'مشرف',
                'technicien': 'فني'
              };
              return (
                <tr key={user.employee_id || user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roleMapping[user.role] || user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department?.department_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                    <button
                      onClick={() => openResetConfirm(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      إعادة تعيين كلمة المرور
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">إضافة مستخدم جديد</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اسم المستخدم (Username)</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الدور</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value, department_id: '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="technicien">فني</option>
                    <option value="supervisor">مشرف</option>
                    <option value="planner">مخطط</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                {(newUser.role === 'supervisor' || newUser.role === 'technicien') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">القسم</label>
                    <select
                      value={newUser.department_id}
                      onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}
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
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                  <div className="flex space-x-2 space-x-reverse">
                    <input
                      type="text"
                      value={generatedPassword}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="انقر على زر إنشاء"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      إنشاء كلمة مرور
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 space-x-reverse mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUser({ username: '', role: 'technicien', department_id: '' });
                    setGeneratedPassword('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!generatedPassword}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  إنشاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">تأكيد الحذف</h2>
            <p className="mb-6">
              هل أنت متأكد من حذف المستخدم <strong>{selectedUser?.username}</strong>؟
            </p>
            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetConfirmModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">تأكيد إعادة التعيين</h2>
            <p className="mb-6">هل أنت متأكد من إعادة تعيين كلمة المرور للمستخدم <strong>{selectedUser.username}</strong>؟</p>
            <div className="flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => {
                  setShowResetConfirmModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleResetPassword(selectedUser.employee_id || selectedUser.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Credentials Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">بيانات تسجيل الدخول</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-gray-600">المستخدم:</span><span className="font-semibold">{shareInfo.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">كلمة المرور الجديدة:</span><span className="font-semibold">{shareInfo.newPassword}</span></div>
            </div>
            <div className="mb-4 text-gray-600">ارسال عبر:</div>
            <div className="flex items-center space-x-4 space-x-reverse mb-6">
              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`بيانات الدخول\nالمستخدم: ${shareInfo.username}\nكلمة المرور: ${shareInfo.newPassword}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white"
                title="إرسال عبر واتساب"
              >
                {/* WhatsApp icon (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.13 1.6 5.93L0 24l6.2-1.62A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22a9.93 9.93 0 01-5.07-1.4l-.36-.22-3.68.96.98-3.58-.24-.37A9.94 9.94 0 1122 12c0 5.52-4.48 10-10 10zm5.23-7.58c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15s-.74.94-.91 1.13-.34.22-.63.07a8.18 8.18 0 01-2.4-1.48 9 9 0 01-1.66-2.06c-.17-.3 0-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.64-1.54-.88-2.11-.23-.56-.47-.48-.64-.49l-.54-.01c-.17 0-.45.06-.69.34-.24.27-.9.88-.9 2.14s.92 2.48 1.05 2.66c.13.17 1.81 2.76 4.39 3.87.61.26 1.08.41 1.45.52.61.19 1.16.16 1.6.1.49-.07 1.7-.69 1.94-1.35.24-.66.24-1.23.17-1.35-.07-.12-.26-.2-.55-.35z"/></svg>
              </a>
              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent('بيانات الدخول')}&body=${encodeURIComponent(`المستخدم: ${shareInfo.username}\nكلمة المرور: ${shareInfo.newPassword}`)}`}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white"
                title="إرسال عبر البريد"
              >
                {/* Email icon (SVG) */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;

