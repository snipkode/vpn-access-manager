import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
          >
            <i className="fas fa-home mr-2" />
            Go to Dashboard
          </Link>
          
          <a
            href="mailto:support@example.com"
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-envelope mr-2" />
            Contact Support
          </a>
        </div>

        {/* Admin badge info */}
        <div className="mt-6 p-4 bg-purple-50 rounded-xl">
          <p className="text-sm text-purple-700">
            <i className="fas fa-shield-alt mr-1" />
            <strong>Admin Only Area</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
