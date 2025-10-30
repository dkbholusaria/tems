import React, { useState } from 'react';
import { auth } from '../services/firebase';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await auth.sendPasswordResetEmail(email);
      setSuccessMessage('Password reset email sent successfully. Please check your inbox (and spam folder).');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email address.');
      } else {
        setError('An error occurred. Please try again.');
      }
      console.error("Forgot Password Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Reset Your Password</h3>
            <button
                onClick={onClose}
                className="absolute top-1/2 right-4 -translate-y-1/2 bg-red-100 text-red-600 rounded-full h-8 w-8 flex items-center justify-center shadow-sm hover:bg-red-200 hover:text-red-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Close modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div>
          {!successMessage ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter your registered email address below, and we'll send you a link to reset your password.
              </p>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center transition"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-green-700 bg-green-50 p-4 rounded-md">{successMessage}</p>
              <button
                onClick={onClose}
                className="mt-4 w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;