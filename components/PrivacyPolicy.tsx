import React from 'react';

const PrivacyPolicy: React.FC = () => {

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-indigo max-w-none">
          <p>
            Welcome to the Travel & Expense Management System ("TEMS", "we", "us", or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>

          <h2 className="text-2xl font-semibold mt-6">1. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect via the Application includes:
          </p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Application.</li>
            <li><strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g. valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Application. We store only very limited, if any, financial information that we collect.</li>
            <li><strong>Data from Social Networks:</strong> User information from social networking sites, such as Apple’s Game Center, Facebook, Google+, Instagram, Pinterest, Twitter, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">2. Use of Your Information</h2>
          <p>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
          </p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Email you regarding your account or order.</li>
            <li>Process payments and refunds.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">3. Disclosure of Your Information</h2>
          <p>
            We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
          </p>
          <ul>
            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
            <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-6">4. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us at: [Your Contact Email/Address]
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

export default PrivacyPolicy;