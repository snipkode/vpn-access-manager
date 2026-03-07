import { useUIStore } from '../store';

/**
 * Request Blocking Overlay
 * Shows a blocking overlay when critical requests are in progress
 * Prevents user from interacting with the UI during important operations
 */
export default function RequestBlockingOverlay() {
  const { pendingRequests, showNotification } = useUIStore();

  // Don't render if no pending requests
  if (pendingRequests.length === 0) {
    return null;
  }

  // Map request keys to user-friendly messages
  const requestMessages = {
    generate_vpn: 'Generating VPN configuration...',
    delete_vpn_device: 'Removing device...',
    disable_vpn_device: 'Disabling device...',
    reactivate_vpn_device: 'Reactivating device...',
    disable_admin_device: 'Disabling device...',
    reactivate_admin_device: 'Reactivating device...',
    get_vpn_device: 'Loading configuration...',
    submit_payment: 'Submitting payment...',
    approve_payment: 'Approving payment...',
    reject_payment: 'Rejecting payment...',
    transfer_credit: 'Transferring credit...',
  };

  // Get the most recent pending request message
  const currentRequest = pendingRequests[pendingRequests.length - 1];
  const message = requestMessages[currentRequest] || 'Processing...';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center">
        {/* Loading Spinner */}
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        
        {/* Message */}
        <div className="text-lg font-semibold text-dark mb-2">
          {message}
        </div>
        
        {/* Subtitle */}
        <div className="text-sm text-gray-500">
          Please wait, do not close this window
        </div>

        {/* Progress indicator for multiple requests */}
        {pendingRequests.length > 1 && (
          <div className="mt-4 text-xs text-gray-400">
            {pendingRequests.length} operation(s) in progress
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check if a specific request is pending
 */
export const useRequestPending = (requestKey) => {
  const { pendingRequests } = useUIStore();
  return pendingRequests.includes(requestKey);
};

/**
 * Hook to check if ANY request is pending (for general blocking)
 */
export const useAnyRequestPending = () => {
  const { pendingRequests } = useUIStore();
  return pendingRequests.length > 0;
};
