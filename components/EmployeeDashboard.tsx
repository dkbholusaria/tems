





import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../services/firebase';
// FIX: Imported the shared EnrichedProject interface.
import { UserMaster, Expense, ExpenseStatus, Project, Client, EnrichedProject } from '../types';
import AddExpenseModal from './AddExpenseModal';
import EditExpenseModal from './EditExpenseModal'; // Import the new edit modal
import ExportReportModal from './ExportReportModal'; // NEW: Import the export modal
import ViewExpenseModal from './ViewExpenseModal'; // NEW: Import the view modal
import EmployeeReportsModal from './EmployeeReportsModal'; // NEW: Import employee reports modal
import FilterModal, { ActiveFilters as IActiveFilters } from './FilterModal'; // NEW: Import the new unified filter modal
import LoadingSpinner from './LoadingSpinner';
import { AppIcon } from './LoginScreen'; // NEW: Import AppIcon
import HelpSupportButton from './HelpSupportButton'; // NEW: Import Help & Support button

// Grouped expenses structure
interface GroupedExpenses {
  [projectId: string]: {
    projectName: string;
    expenses: Expense[];
    totalInr: number;
  };
}

// NEW: Define categories for filtering
export const expenseCategories = ['Hotel', 'Air/Bus/Train', 'Local Commute', 'Food', 'Gifts', 'Software', 'Other'];

// NEW: Define status filter options
export const statusFilterOptions: { value: ExpenseStatus, label: string }[] = [
    { value: ExpenseStatus.DRAFT, label: "Draft" },
    { value: ExpenseStatus.PENDING, label: "Pending" },
    { value: ExpenseStatus.APPROVED, label: "Approved" },
    { value: ExpenseStatus.RETURNED, label: "Returned" },
    { value: ExpenseStatus.REJECTED, label: "Rejected" },
];

// NEW: Icon component for statuses
const StatusIcon: React.FC<{ status: string, className: string }> = ({ status, className }) => {
  const icons: { [key: string]: React.ReactNode } = {
    total: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v1m-2 10a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14zm-9-4a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
    draft: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>,
    pending: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    approved: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    returned: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h12a2 2 0 002-2V6" /></svg>,
    rejected: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    all: <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
  };
  return icons[status] || null;
};


// Helper to get status badge styling
const getStatusBadge = (status: ExpenseStatus) => {
  const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
  switch (status) {
    case ExpenseStatus.DRAFT:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    case ExpenseStatus.PENDING:
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{status}</span>;
    case ExpenseStatus.APPROVED:
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>{status}</span>;
    case ExpenseStatus.REJECTED:
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>{status}</span>;
    case ExpenseStatus.RETURNED:
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>{status}</span>;
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
  }
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


// FIX: Define the props interface for the component
interface EmployeeDashboardProps {
  user: UserMaster;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null); // State for the expense being edited
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null); // NEW: State for viewing an expense
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); // NEW: State for export modal
  const [isEmployeeReportsModalOpen, setIsEmployeeReportsModalOpen] = useState(false); // NEW: State for employee reports modal
  const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
  // CHANGE: State now holds enriched project objects, not just strings.
  const [projectsMap, setProjectsMap] = useState<Map<string, EnrichedProject>>(new Map());
  const [allClients, setAllClients] = useState<Client[]>([]); // NEW: State for all clients for filtering
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalInr: 0, totalCount: 0,
    draftInr: 0, draftCount: 0,
    pendingInr: 0, pendingCount: 0,
    approvedInr: 0, approvedCount: 0,
    returnedInr: 0, returnedCount: 0,
    rejectedInr: 0, rejectedCount: 0,
  });
  
  // NEW: State for all expenses from Firestore
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  // NEW: Revamped filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<IActiveFilters>({
    statuses: [],
    categories: [],
    projectIds: [],
    clientIds: [],
    startDate: '',
    endDate: ''
  });


  // Effect to fetch metadata and then listen for expenses
  useEffect(() => {
    const fetchMetadataAndExpenses = async () => {
      try {
        const clientsSnapshot = await db.collection('Clients').get();
        const clientsMap = new Map<string, string>();
        const clientsData: Client[] = [];
        clientsSnapshot.forEach(doc => {
            const client = doc.data() as Client;
            clientsMap.set(client.clientId, client.clientName);
            clientsData.push({ docId: doc.id, ...client });
        });
        setAllClients(clientsData);

        const projectsSnapshot = await db.collection('Projects').get();
        const pMap = new Map<string, EnrichedProject>();
        projectsSnapshot.forEach(doc => {
            const projectData = doc.data() as Project;
            const clientName = clientsMap.get(projectData.clientCode) || projectData.clientCode;
            pMap.set(projectData.projectId, {
              clientCode: projectData.clientCode,
              clientName,
              description: projectData.description,
              projectId: projectData.projectId,
              projectCode: projectData.projectCode,
              travelCode: projectData.travelCode,
            });
        });
        setProjectsMap(pMap);
        
        const q = db.collection('Expenses')
          .where('employeeId', '==', user.uid)
          .orderBy('createdAt', 'desc');

        const unsubscribe = q.onSnapshot((querySnapshot) => {
          const fetchedExpenses: Expense[] = [];
          querySnapshot.forEach((doc) => {
            fetchedExpenses.push({ expenseId: doc.id, ...doc.data() } as Expense);
          });
          setAllExpenses(fetchedExpenses); // NEW: Store all raw expenses

          // Summary calculation remains based on ALL expenses
          let totalInr = 0, totalCount = 0, draftInr = 0, draftCount = 0, pendingInr = 0, pendingCount = 0, approvedInr = 0, approvedCount = 0, returnedInr = 0, returnedCount = 0, rejectedInr = 0, rejectedCount = 0;
          for (const expense of fetchedExpenses) {
            const amountInInr = expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount;
            totalInr += amountInInr; totalCount++;
            switch (expense.status) {
                case ExpenseStatus.DRAFT: draftInr += amountInInr; draftCount++; break;
                case ExpenseStatus.PENDING: pendingInr += amountInInr; pendingCount++; break;
                // FIX: Corrected a typo in the variable name 'amountInr' to 'amountInInr' during the summary calculation to resolve a reference error.
                case ExpenseStatus.APPROVED: approvedInr += amountInInr; approvedCount++; break;
                case ExpenseStatus.RETURNED: returnedInr += amountInInr; returnedCount++; break;
                case ExpenseStatus.REJECTED: rejectedInr += amountInInr; rejectedCount++; break;
            }
          }
          setSummary({ totalInr, totalCount, draftInr, draftCount, pendingInr, pendingCount, approvedInr, approvedCount, returnedInr, returnedCount, rejectedInr, rejectedCount });
          
          setIsLoading(false);
        });
        
        return unsubscribe;

      } catch (error) {
          console.error("Error fetching data for dashboard:", error);
          setIsLoading(false);
      }
    };
    
    const unsubscribePromise = fetchMetadataAndExpenses();
    
    return () => {
        unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, [user.uid]);

  // UPDATED: Effect to filter and group expenses whenever any filter or data changes
  useEffect(() => {
    const filtered = allExpenses.filter(exp => {
        const { statuses, categories, projectIds, clientIds, startDate, endDate } = activeFilters;
        
        const statusMatch = statuses.length === 0 || statuses.includes(exp.status);
        const categoryMatch = categories.length === 0 || categories.includes(exp.category);
        const projectMatch = projectIds.length === 0 || projectIds.includes(exp.projectId);
        const projectInfo = projectsMap.get(exp.projectId);
        const clientMatch = !clientIds || clientIds.length === 0 || (projectInfo && clientIds.includes(projectInfo.clientCode));

        const expDate = exp.date.toDate();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if(start) start.setHours(0,0,0,0);
        if(end) end.setHours(23,59,59,999);
        const startDateMatch = !start || expDate >= start;
        const endDateMatch = !end || expDate <= end;
        
        return statusMatch && categoryMatch && projectMatch && clientMatch && startDateMatch && endDateMatch;
    });

    // Grouping logic, now applied to the filtered list
    const groups: GroupedExpenses = {};
    for (const expense of filtered) {
      const projectInfo = projectsMap.get(expense.projectId);
      
      if (!groups[expense.projectId]) {
        let projectName = `Unknown Project (${expense.projectId})`;
        if (projectInfo) {
          projectName = `${projectInfo.clientName} | ${projectInfo.description} (${projectInfo.projectCode}) (${projectInfo.travelCode})`;
        }
        groups[expense.projectId] = {
          projectName: projectName,
          expenses: [],
          totalInr: 0,
        };
      }
      groups[expense.projectId].expenses.push(expense);
      const amountInInr = expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount;
      groups[expense.projectId].totalInr += amountInInr;
    }
    setGroupedExpenses(groups);
  }, [allExpenses, activeFilters, projectsMap]);

  const handleLogout = () => {
    // FIX: Clear the URL hash on logout to ensure the user is always returned
    // to the main login screen, not a sub-page like the privacy policy.
    window.location.hash = '';
    auth.signOut();
  };
  
  const toggleGroup = (projectId: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) newSet.delete(projectId);
      else newSet.add(projectId);
      return newSet;
    });
  };

  const handleSubmitForApproval = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation(); // Prevent row click when clicking button
    try {
        await db.collection('Expenses').doc(expenseId).update({ status: ExpenseStatus.PENDING });
    } catch (error) {
        console.error("Error submitting expense for approval:", error);
    }
  };
  
  const handleDeleteExpense = async (e: React.MouseEvent, expense: Expense) => {
      e.stopPropagation(); // Prevent row click when clicking button
      if (window.confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
          try {
              if (expense.receiptUrl) {
                  await storage.refFromURL(expense.receiptUrl).delete();
              }
              await db.collection('Expenses').doc(expense.expenseId).delete();
          } catch (error) {
              console.error("Error deleting expense:", error);
          }
      }
  };

  // NEW: Handlers to remove a specific filter pill
  const removeFilter = (type: keyof IActiveFilters, value: string) => {
    setActiveFilters(prev => {
        const currentValues = prev[type];
        if (Array.isArray(currentValues)) {
            return {
                ...prev,
                [type]: currentValues.filter(item => item !== value)
            };
        }
        return prev;
    });
  };

  const removeDateFilter = () => {
      setActiveFilters(prev => ({...prev, startDate: '', endDate: ''}));
  }

  const clearAllFilters = () => {
      setActiveFilters({ statuses: [], categories: [], projectIds: [], clientIds: [], startDate: '', endDate: '' });
  };
  
  const getActiveFilterCount = () => {
      const { statuses, categories, projectIds, clientIds, startDate, endDate } = activeFilters;
      let count = statuses.length + categories.length + projectIds.length + (clientIds?.length || 0);
      if (startDate || endDate) count++;
      return count;
  };
  const activeFilterCount = getActiveFilterCount();

  const userProjects = [...new Set(allExpenses.map(exp => exp.projectId))]
    .map(id => projectsMap.get(id))
    .filter((p): p is EnrichedProject => Boolean(p));

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
                            <h1 className="text-white text-lg sm:text-xl font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>TEMS - Employee</h1>
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
                      <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Your Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEmployeeReportsModalOpen(true)} className="bg-teal-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-teal-700 text-sm">View Reports</button>
                        <button onClick={() => setIsExportModalOpen(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 text-sm">Export Report</button>
                        <div className="relative group">
                            <button disabled className="bg-gray-400 text-white font-semibold py-2 px-4 rounded-md cursor-not-allowed text-sm">Email Report</button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Upcoming!</div>
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 text-sm">+ Add New Expense</button>
                    </div>
                  </div>
              </div>
          </header>

          <main className="flex-grow overflow-y-auto">
            {/* Section 2: Summary Cards */}
            <div className="bg-white py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <div className="relative bg-gradient-to-br from-gray-200 to-gray-50 overflow-hidden shadow rounded-lg p-5 border border-gray-200 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-gray-400 opacity-50"><StatusIcon status="total" className="h-8 w-8" /></div><dt className="text-sm font-medium text-gray-500 truncate">Total</dt><dd className="mt-1 text-3xl font-semibold text-gray-900">{formatLargeIndianCurrency(summary.totalInr)}</dd><dd className="text-sm font-medium text-gray-500">{summary.totalCount} {summary.totalCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    <div className="relative bg-gradient-to-br from-gray-300 to-gray-100 overflow-hidden shadow rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-gray-500 opacity-50"><StatusIcon status="draft" className="h-8 w-8" /></div><dt className="text-sm font-medium text-gray-600 truncate">Draft</dt><dd className="mt-1 text-3xl font-semibold text-gray-800">{formatLargeIndianCurrency(summary.draftInr)}</dd><dd className="text-sm font-medium text-gray-500">{summary.draftCount} {summary.draftCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    <div className="relative bg-gradient-to-br from-yellow-300 to-yellow-100 overflow-hidden shadow rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-yellow-500 opacity-50"><StatusIcon status="pending" className="h-8 w-8" /></div><dt className="text-sm font-medium text-yellow-800 truncate">Pending</dt><dd className="mt-1 text-3xl font-semibold text-yellow-900">{formatLargeIndianCurrency(summary.pendingInr)}</dd><dd className="text-sm font-medium text-yellow-700">{summary.pendingCount} {summary.pendingCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    <div className="relative bg-gradient-to-br from-green-300 to-green-100 overflow-hidden shadow rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-green-500 opacity-50"><StatusIcon status="approved" className="h-8 w-8" /></div><dt className="text-sm font-medium text-green-800 truncate">Approved</dt><dd className="mt-1 text-3xl font-semibold text-green-900">{formatLargeIndianCurrency(summary.approvedInr)}</dd><dd className="text-sm font-medium text-green-700">{summary.approvedCount} {summary.approvedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    <div className="relative bg-gradient-to-br from-blue-300 to-blue-100 overflow-hidden shadow rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-blue-500 opacity-50"><StatusIcon status="returned" className="h-8 w-8" /></div><dt className="text-sm font-medium text-blue-800 truncate">Returned</dt><dd className="mt-1 text-3xl font-semibold text-blue-900">{formatLargeIndianCurrency(summary.returnedInr)}</dd><dd className="text-sm font-medium text-blue-700">{summary.returnedCount} {summary.returnedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                    <div className="relative bg-gradient-to-br from-red-300 to-red-100 overflow-hidden shadow rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"><div className="absolute top-4 right-4 text-red-500 opacity-50"><StatusIcon status="rejected" className="h-8 w-8" /></div><dt className="text-sm font-medium text-red-800 truncate">Rejected</dt><dd className="mt-1 text-3xl font-semibold text-red-900">{formatLargeIndianCurrency(summary.rejectedInr)}</dd><dd className="text-sm font-medium text-red-700">{summary.rejectedCount} {summary.rejectedCount === 1 ? 'expense' : 'expenses'}</dd></div>
                  </div>
                </div>
            </div>
            
            {/* Section 3: Main Content Area */}
            <div className="py-8">
                {/* NEW Filter Bar */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-4 bg-white shadow-lg rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-700">Filter Expenses</h3>
                            <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16a1 1 0 01-.293.707l-2 2A1 1 0 0112 18v-4.586l-3.707-3.707A1 1 0 018 9V4a1 1 0 01-1-1H4a1 1 0 01-1-1V4z" /></svg>
                                Filters
                                {activeFilterCount > 0 && <span className="ml-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                        </div>
                        {activeFilterCount > 0 && (
                            <div className="pt-2 border-t flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Active:</span>
                                {activeFilters.statuses.map(s => <span key={s} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">{s} <button onClick={() => removeFilter('statuses', s)} className="text-blue-600 hover:text-blue-900">&times;</button></span>)}
                                {activeFilters.categories.map(c => <span key={c} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">{c} <button onClick={() => removeFilter('categories', c)} className="text-indigo-600 hover:text-indigo-900">&times;</button></span>)}
                                {activeFilters.projectIds.map(pId => <span key={pId} className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">{projectsMap.get(pId)?.projectCode || pId} <button onClick={() => removeFilter('projectIds', pId)} className="text-green-600 hover:text-green-900">&times;</button></span>)}
                                {activeFilters.clientIds?.map(cId => {
                                    const clientName = allClients.find(c => c.clientId === cId)?.clientName || cId;
                                    return <span key={cId} className="flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded-full">{clientName} <button onClick={() => removeFilter('clientIds', cId)} className="text-purple-600 hover:text-purple-900">&times;</button></span>
                                })}
                                {(activeFilters.startDate || activeFilters.endDate) && <span className="flex items-center gap-1 bg-gray-200 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">{activeFilters.startDate} - {activeFilters.endDate} <button onClick={removeDateFilter} className="text-gray-600 hover:text-gray-900">&times;</button></span>}
                                <button onClick={clearAllFilters} className="text-xs text-red-500 hover:underline ml-auto">Clear All</button>
                            </div>
                        )}
                    </div>
                </div>


                {/* Expense History List */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 mb-4">Expense History</h2>
                    {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : 
                    Object.keys(groupedExpenses).length === 0 ? <p className="text-gray-500">No expenses found for the selected filter.</p> :
                    (
                        <div className="space-y-4">
                        {Object.keys(groupedExpenses).map((projectId) => {
                            const group = groupedExpenses[projectId];
                            return (
                            <div key={projectId} className="bg-white shadow overflow-hidden sm:rounded-lg">
                                <div className="bg-blue-100 px-4 py-4 sm:px-6 cursor-pointer hover:bg-blue-200" onClick={() => toggleGroup(projectId)}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-grow min-w-0">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 truncate" title={group.projectName}>
                                            {group.projectName}
                                            </h3>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center space-x-4">
                                        <span className="font-semibold text-gray-700 text-sm">
                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(group.totalInr)}
                                        </span>
                                        <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${openGroups.has(projectId) ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                </div>
                                {openGroups.has(projectId) && (
                                    <div className="border-t border-gray-200 overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (Original)</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (INR)</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.expenses.map((expense, index) => (
                                                    <tr key={expense.expenseId} onClick={() => setViewingExpense(expense)} className={`${index % 2 !== 0 ? 'bg-blue-50' : ''} hover:bg-gray-100 cursor-pointer`}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date.toDate().toLocaleDateString('en-GB')}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                                                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                                                expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{getStatusBadge(expense.status)}</td>
                                                        <td className="px-2 py-4 whitespace-nowrap text-sm text-center">
                                                            <div className="flex items-center justify-center space-x-2">
                                                                {expense.remarks && (
                                                                    <div className="group relative flex justify-center">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                                        </svg>
                                                                        <div className="group-hover:block absolute z-10 hidden w-64 p-2 -mt-16 text-xs leading-tight text-white transform -translate-x-1/2 bg-black rounded-lg shadow-lg">
                                                                            <span className="font-bold">Your Remarks:</span> {expense.remarks}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {expense.approverComment && [ExpenseStatus.APPROVED, ExpenseStatus.RETURNED, ExpenseStatus.REJECTED].includes(expense.status) && (
                                                                    <div className="flex items-center justify-center">
                                                                        { (expense.status === ExpenseStatus.RETURNED || expense.status === ExpenseStatus.REJECTED) && (
                                                                            <svg xmlns="http://www.w3.org/2000/svg" 
                                                                                className={`h-5 w-5 ${expense.status === ExpenseStatus.REJECTED ? 'text-red-500' : 'text-blue-500'}`} 
                                                                                viewBox="0 0 20 20" fill="currentColor">
                                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        { expense.status === ExpenseStatus.APPROVED && (
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                            <div className="flex items-center justify-center space-x-4">
                                                                <div className="relative group flex justify-center">{expense.receiptUrl ? (<a href={expense.receiptUrl} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg></a>) : (<span className="text-gray-300 cursor-default"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg></span>)}<span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{expense.receiptUrl ? 'View Receipt' : 'No Receipt'}</span></div>
                                                                {[ExpenseStatus.DRAFT, ExpenseStatus.PENDING, ExpenseStatus.RETURNED].includes(expense.status) && (<div className="relative group flex justify-center"><button onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); }} className="text-indigo-600 hover:text-indigo-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none">Edit</span></div>)}
                                                                {[ExpenseStatus.DRAFT, ExpenseStatus.RETURNED].includes(expense.status) && (<div className="relative group flex justify-center"><button onClick={(e) => handleSubmitForApproval(e, expense.expenseId)} className="text-green-600 hover:text-green-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none">Submit</span></div>)}
                                                                {[ExpenseStatus.DRAFT, ExpenseStatus.PENDING, ExpenseStatus.RETURNED].includes(expense.status) && (<div className="relative group flex justify-center"><button onClick={(e) => handleDeleteExpense(e, expense)} className="text-red-600 hover:text-red-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none">Delete</span></div>)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>

          </main>
        <footer className="py-2 text-center text-gray-500 text-xs flex-shrink-0">
          &copy; {new Date().getFullYear()} CA. Deepak Bholusaria. All Rights Reserved.
        </footer>
      </div>
      
      <HelpSupportButton />
      
      {isAddModalOpen && (<AddExpenseModal user={user} onClose={() => setIsAddModalOpen(false)} onExpenseAdded={() => setIsAddModalOpen(false)} />)}
      {editingExpense && (<EditExpenseModal user={user} expense={editingExpense} onClose={() => setEditingExpense(null)} onExpenseUpdated={() => setEditingExpense(null)} />)}
      {viewingExpense && (<ViewExpenseModal expense={viewingExpense} projectsMap={projectsMap} onClose={() => setViewingExpense(null)} />)}
      {isExportModalOpen && (<ExportReportModal user={user} expenses={allExpenses} projectsMap={projectsMap} onClose={() => setIsExportModalOpen(false)} />)}
      {isEmployeeReportsModalOpen && (<EmployeeReportsModal user={user} expenses={allExpenses} projectsMap={projectsMap} onClose={() => setIsEmployeeReportsModalOpen(false)} />)}
      {isFilterModalOpen && (
          <FilterModal
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
              onApply={setActiveFilters}
              initialFilters={activeFilters}
              availableProjects={userProjects}
              availableCategories={expenseCategories}
              availableStatuses={statusFilterOptions}
              availableClients={allClients}
              // Employee filter is not needed for the employee dashboard
          />
      )}
    </>
  );
};

export default EmployeeDashboard;