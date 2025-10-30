import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          غير مصرح لك بالوصول
        </h1>
        <p className="text-gray-600 mb-6">
          ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة
        </p>
        <Link
          to="/login"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;

