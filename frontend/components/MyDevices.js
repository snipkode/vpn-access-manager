export default function MyDevices() {
  return (
    <div className="max-w-[600px] mx-auto">
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">📱</span>
        </div>
        <h2 className="text-2xl font-bold text-dark mb-3">My Devices</h2>
        <p className="text-gray-500 mb-6 leading-relaxed max-w-sm mx-auto">
          Manage your VPN devices from the Dashboard. You can add up to 3 devices maximum.
        </p>
        <div className="flex justify-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full" />
            Active
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-300 rounded-full" />
            Revoked
          </span>
        </div>
      </div>
    </div>
  );
}
