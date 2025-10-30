import React from 'react';

const TermsOfUse: React.FC = () => {

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-indigo max-w-none">
          <h2 className="text-2xl font-semibold mt-6">1. Agreement to Terms</h2>
          <p>
            By using our Travel & Expense Management System ("TEMS", "the Service"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>

          <h2 className="text-2xl font-semibold mt-6">2. Description of Service</h2>
          <p>
            TEMS provides users with a platform to manage, track, and report business-related travel and expenses. The Service includes features for expense submission, approval workflows, and reporting.
          </p>

          <h2 className="text-2xl font-semibold mt-6">3. User Accounts</h2>
          <p>
            To use the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for all activities that occur under your account.
          </p>

          <h2 className="text-2xl font-semibold mt-6">4. Prohibited Conduct</h2>
          <p>
            You agree not to engage in any of the following prohibited activities:
          </p>
          <ul>
            <li>Using the Service for any illegal purpose or in violation of any local, state, national, or international law.</li>
            <li>Submitting fraudulent or inaccurate expense reports.</li>
            <li>Attempting to interfere with, compromise the system integrity or security of, or decipher any transmissions to or from the servers running the Service.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">5. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
          </p>

          <h2 className="text-2xl font-semibold mt-6">6. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
          </p>

          <h2 className="text-2xl font-semibold mt-6">7. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at: [Your Contact Email/Address]
          </p>
        </div>

        <div className="mt-8 text-center">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
          >
            Go Back
          </a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;