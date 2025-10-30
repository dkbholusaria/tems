

import React, { useState, useEffect } from 'react';
// FIX: Removed v9 imports for signOut, collection, onSnapshot, and query.
import { auth, db } from '../services/firebase';
import { UserMaster, Expense, ExpenseStatus } from '../types';
import ApprovalConsole from './ApprovalConsole';
import CompanyManagementModal from './CompanyManagementModal'; // NEW: Import the unified management modal
import ReportsModal from './ReportsModal'; // NEW: Import the reports modal
import { AppIcon } from './LoginScreen'; // NEW: Import AppIcon
import HelpSupportButton from './HelpSupportButton'; // NEW: Import Help & Support button

interface EmployerDashboardProps {
  user: UserMaster;
}

// NEW: Icon component for statuses
const StatusIcon: React.FC<{ status: string, className: string }> = ({ status, className }) => {
  const icons: { [key: string]: React.ReactNode } = {
    total: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v1m-2 10a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14zm-9-4a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
    pending: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    approved: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    returned: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h12a2 2 0 002-2V6" /></svg>,
    rejected: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };
  return icons[status] || null;
};

// NEW: Helper to format large Indian currency values for summary cards
const formatLargeIndianCurrency = (num: number): string => {
    const absNum = Math.abs(num);
    if (absNum >= 10000000) { // Crores
        return `₹ ${(num / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
    }
    if (absNum >= 100000) { // Lakhs
        return `₹ ${(num / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
    }
    // Below 1 Lakh, use standard currency format with Rupee symbol
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(num);
};


const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ user }) => {
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false); // NEW: State for the unified modal
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false); // NEW: State for the reports modal
  const [summary, setSummary] = useState({
    totalInr: 0, totalCount: 0,
    pendingInr: 0, pendingCount: 0,
    approvedInr: 0, approvedCount: 0,
    returnedInr: 0, returnedCount: 0,
    rejectedInr: 0, rejectedCount: 0, // NEW
  });

  useEffect(() => {
    // Listen for all expenses to calculate company-wide summary stats
    // FIX: Refactored Firestore query to use v8's direct collection access.
    const expensesQuery = db.collection('Expenses');
    const unsubscribe = expensesQuery.onSnapshot((snapshot) => {
      const allExpenses: Expense[] = [];
      snapshot.forEach(doc => allExpenses.push(doc.data() as Expense));
      
      // Calculate summary values in INR and counts
      let totalInr = 0, totalCount = 0;
      let pendingInr = 0, pendingCount = 0;
      let approvedInr = 0, approvedCount = 0;
      let returnedInr = 0, returnedCount = 0;
      let rejectedInr = 0, rejectedCount = 0; // NEW

      for (const expense of allExpenses) {
        // Exclude drafts from employer's total value
        if (expense.status === ExpenseStatus.DRAFT) continue;

        const amountInInr = expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount;
        totalInr += amountInInr;
        totalCount++;
        switch (expense.status) {
            case ExpenseStatus.PENDING:
                pendingInr += amountInInr;
                pendingCount++;
                break;
            case ExpenseStatus.APPROVED:
                approvedInr += amountInInr;
                approvedCount++;
                break;
            case ExpenseStatus.RETURNED:
                returnedInr += amountInInr;
                returnedCount++;
                break;
            case ExpenseStatus.REJECTED: // NEW
                rejectedInr += amountInInr;
                rejectedCount++;
                break;
        }
      }

      setSummary({ totalInr, totalCount, pendingInr, pendingCount, approvedInr, approvedCount, returnedInr, returnedCount, rejectedInr, rejectedCount });
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    // FIX: Clear the URL hash on logout to ensure the user is always returned
    // to the main login screen, not a sub-page like the privacy policy.
    window.location.hash = '';
    auth.signOut();
  };

  return (
    <>
      <div className="h-screen bg-gray-50 flex flex-col">
          {/* Section 1: Top Branding Header */}
          <header 
              className="relative bg-cover bg-center h-[20vh] flex-shrink-0"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop')" }}
          >
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              <div className="relative h-full flex flex-col justify-between p-4 sm:p-6 lg:p-8">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                          <AppIcon className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                          <div>
                            <h1 className="text-white text-lg sm:text-xl font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>TEMS - Employer</h1>
                            <p className="text-white text-xs sm:text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Travel & Expense Management System</p>
                          </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-white mr-4 text-center sm:text-left text-sm hidden sm:block">Welcome, {user.name}</span>
                        <button
                          onClick={handleLogout}
                          className="bg-red-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-red-600 text-xs sm:text-sm font-medium flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5h10a1 1 0 100-2H3zm12.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 13H9a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Logout
                        </button>
                      </div>
                  </div>
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Company Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsReportsModalOpen(true)}
                            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm"
                        >
                            View Reports
                        </button>
                        <button
                            onClick={() => setIsCompanyModalOpen(true)}
                            className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm"
                        >
                            + Manage Company
                        </button>
                    </div>
                  </div>
              </div>
          </header>

        <main className="flex-grow overflow-y-auto">
            {/* Section 2: Summary Cards */}
            <div className="bg-white py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="relative bg-gradient-to-br from-gray-200 to-gray-50 overflow-hidden shadow rounded-lg p-5 border border-gray-200 transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-gray-400 opacity-50"><StatusIcon status="total" className="h-8 w-8" /></div><dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt><dd className="mt-1 text-3xl font-semibold text-gray-900">{formatLargeIndianCurrency(summary.totalInr)}</dd><dd className="text-sm font-medium text-gray-500">{summary.totalCount} {summary.totalCount === 1 ? 'expense' : 'expenses'}</dd></div>
                        <div className="relative bg-gradient-to-br from-yellow-300 to-yellow-100 overflow-hidden shadow rounded-lg p-5 transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-yellow-500 opacity-50"><StatusIcon status="pending" className="h-8 w-8" /></div><dt className="text-sm font-medium text-yellow-800 truncate">Pending</dt><dd className="mt-1 text-3xl font-semibold text-yellow-900">{formatLargeIndianCurrency(summary.pendingInr)}</dd><dd className="text-sm font-medium text-yellow-700">{summary.pendingCount} {summary.pendingCount === 1 ? 'expense' : 'expenses'}</dd></div>
                        <div className="relative bg-gradient-to-br from-green-300 to-green-100 overflow-hidden shadow rounded-lg p-5 transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-green-500 opacity-50"><StatusIcon status="approved" className="h-8 w-8" /></div><dt className="text-sm font-medium text-green-800 truncate">Approved</dt><dd className="mt-1 text-3xl font-semibold text-green-900">{formatLargeIndianCurrency(summary.approvedInr)}</dd><dd className="text-sm font-medium text-green-700">{summary.approvedCount} {summary.approvedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                        <div className="relative bg-gradient-to-br from-blue-300 to-blue-100 overflow-hidden shadow rounded-lg p-5 transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-blue-500 opacity-50"><StatusIcon status="returned" className="h-8 w-8" /></div><dt className="text-sm font-medium text-blue-800 truncate">Returned</dt><dd className="mt-1 text-3xl font-semibold text-blue-900">{formatLargeIndianCurrency(summary.returnedInr)}</dd><dd className="text-sm font-medium text-blue-700">{summary.returnedCount} {summary.returnedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                        <div className="relative bg-gradient-to-br from-red-300 to-red-100 overflow-hidden shadow rounded-lg p-5 transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-red-500 opacity-50"><StatusIcon status="rejected" className="h-8 w-8" /></div><dt className="text-sm font-medium text-red-800 truncate">Rejected</dt><dd className="mt-1 text-3xl font-semibold text-red-900">{formatLargeIndianCurrency(summary.rejectedInr)}</dd><dd className="text-sm font-medium text-red-700">{summary.rejectedCount} {summary.rejectedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    </div>
                </div>
            </div>

            {/* Section 3: Main Content (Approval Console) */}
            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ApprovalConsole approver={user} />
                </div>
            </div>
        </main>
        <footer className="py-2 text-center text-gray-500 text-xs flex-shrink-0">
          &copy; {new Date().getFullYear()} CA. Deepak Bholusaria. All Rights Reserved.
        </footer>
      </div>
      
      <HelpSupportButton />

      {isCompanyModalOpen && (
        <CompanyManagementModal onClose={() => setIsCompanyModalOpen(false)} />
      )}
      {isReportsModalOpen && (
        <ReportsModal onClose={() => setIsReportsModalOpen(false)} />
      )}
    </>
  );
};

export default EmployerDashboard;
