import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { Expense, UserMaster, Project, ExpenseStatus, Client, EnrichedProject } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ExpenseDetailModal from './ExpenseDetailModal'; // NEW: Import the detail modal
import ActionModal from './ActionModal'; // NEW: Import the quick action modal
import FilterModal, { ActiveFilters as IActiveFilters } from './FilterModal'; // NEW: Import the new unified filter modal

interface EnrichedExpense extends Expense {
    employeeName?: string;
    projectName?: string;
}

// NEW: Interface for grouped expenses with employee sub-grouping
interface GroupedExpenses {
  [projectId: string]: {
    projectName: string;
    expensesByEmployee: {
        [employeeId: string]: {
            employeeName: string;
            expenses: EnrichedExpense[];
            totalInr: number;
        }
    }
  };
}

// NEW: Define categories for filtering
export const expenseCategories = ['Hotel', 'Air/Bus/Train', 'Local Commute', 'Food', 'Gifts', 'Software', 'Other'];

// NEW: Define status filter options
export const statusFilterOptions: { value: ExpenseStatus, label: string }[] = [
    { value: ExpenseStatus.PENDING, label: "Pending" },
    { value: ExpenseStatus.APPROVED, label: "Approved" },
    { value: ExpenseStatus.RETURNED, label: "Returned" },
    { value: ExpenseStatus.REJECTED, label: "Rejected" },
];

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


interface ApprovalConsoleProps {
    approver: UserMaster;
}

const ApprovalConsole: React.FC<ApprovalConsoleProps> = ({ approver }) => {
    const [allExpenses, setAllExpenses] = useState<EnrichedExpense[]>([]);
    const [groupedExpenses, setGroupedExpenses] = useState<GroupedExpenses>({});
    const [selectedExpense, setSelectedExpense] = useState<EnrichedExpense | null>(null);
    const [actionState, setActionState] = useState<{ expense: EnrichedExpense, action: 'approve' | 'return' | 'reject' } | null>(null);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [openSubGroups, setOpenSubGroups] = useState<Set<string>>(new Set()); // NEW: State for employee sub-groups

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);

    // Metadata states
    const [users, setUsers] = useState<UserMaster[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]); // NEW: State for all clients
    const [projectsMap, setProjectsMap] = useState<Map<string, { projectName: string; projectCode: string; travelCode: string; clientCode: string; }>>(new Map());

    // NEW: Revamped filter state
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<IActiveFilters>({
        statuses: [],
        categories: [],
        projectIds: [],
        employeeIds: [],
        clientIds: [],
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        const fetchMetadataAndExpenses = async () => {
            try {
                // Pre-fetch metadata for enrichment
                const usersSnapshot = await db.collection('UserMaster').get();
                const uMap = new Map<string, string>();
                const usersData: UserMaster[] = [];
                usersSnapshot.forEach(doc => {
                    const userData = { uid: doc.id, ...doc.data() } as UserMaster;
                    uMap.set(userData.uid, userData.name);
                    usersData.push(userData);
                });
                setUsers(usersData);

                const clientsSnapshot = await db.collection('Clients').get();
                const cMap = new Map<string, string>();
                const clientsData: Client[] = [];
                clientsSnapshot.forEach(doc => {
                    const clientData = doc.data() as Client;
                    cMap.set(clientData.clientId, clientData.clientName);
                    clientsData.push({ docId: doc.id, ...clientData });
                });
                setAllClients(clientsData);

                const projectsSnapshot = await db.collection('Projects').get();
                const pMap = new Map<string, { projectName: string; projectCode: string; travelCode: string; clientCode: string; }>();
                projectsSnapshot.forEach(doc => {
                    const projectData = doc.data() as Project;
                    const clientName = cMap.get(projectData.clientCode) || projectData.clientCode;
                    const fullProjectName = `${clientName} | ${projectData.description} (${projectData.projectCode}) (${projectData.travelCode})`;
                    pMap.set(projectData.projectId, { projectName: fullProjectName, projectCode: projectData.projectCode, travelCode: projectData.travelCode, clientCode: projectData.clientCode });
                });
                setProjectsMap(pMap);

                // Query for all expenses that are not drafts
                const expensesQuery = db.collection('Expenses')
                    .where('status', 'in', [ExpenseStatus.PENDING, ExpenseStatus.APPROVED, ExpenseStatus.RETURNED, ExpenseStatus.REJECTED]);

                const unsubscribe = expensesQuery.onSnapshot((snapshot) => {
                    const enrichedExpenses: EnrichedExpense[] = [];
                    snapshot.forEach(doc => {
                        const expense = { expenseId: doc.id, ...doc.data() } as Expense;
                        enrichedExpenses.push({
                            ...expense,
                            employeeName: uMap.get(expense.employeeId) || 'Unknown User',
                            projectName: pMap.get(expense.projectId)?.projectName || `Unknown Project (${expense.projectId})`,
                        });
                    });
                    
                    enrichedExpenses.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                    setAllExpenses(enrichedExpenses);
                    setIsLoading(false);
                }, (err: any) => {
                    console.error("Error fetching expenses for console:", err);
                    setError("Failed to fetch expenses.");
                    setIsLoading(false);
                });
                return unsubscribe;
            } catch (err) {
                console.error("Error fetching metadata:", err);
                setError("Could not load required user and project data.");
                setIsLoading(false);
            }
        };

        const unsubscribePromise = fetchMetadataAndExpenses();
        return () => {
            unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
        };
    }, []);
    
    // UPDATED: Effect to filter and group expenses by project, then by employee
    useEffect(() => {
        const filtered = allExpenses.filter(exp => {
            const { statuses, categories, projectIds, employeeIds, clientIds, startDate, endDate } = activeFilters;
            const statusMatch = statuses.length === 0 || statuses.includes(exp.status);
            const categoryMatch = categories.length === 0 || categories.includes(exp.category);
            const projectMatch = projectIds.length === 0 || projectIds.includes(exp.projectId);
            const employeeMatch = employeeIds.length === 0 || employeeIds.includes(exp.employeeId);

            const projectInfo = projectsMap.get(exp.projectId);
            const clientMatch = !clientIds || clientIds.length === 0 || (projectInfo && clientIds.includes(projectInfo.clientCode));

            const expDate = exp.date.toDate();
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if(start) start.setHours(0,0,0,0);
            if(end) end.setHours(23,59,59,999);
            const startDateMatch = !start || expDate >= start;
            const endDateMatch = !end || expDate <= end;

            return statusMatch && categoryMatch && projectMatch && employeeMatch && clientMatch && startDateMatch && endDateMatch;
        });
            
        const groups: GroupedExpenses = {};
        for (const expense of filtered) {
            if (!groups[expense.projectId]) {
                groups[expense.projectId] = {
                    projectName: expense.projectName || `Unknown Project (${expense.projectId})`,
                    expensesByEmployee: {},
                };
            }
            if (!groups[expense.projectId].expensesByEmployee[expense.employeeId]) {
                groups[expense.projectId].expensesByEmployee[expense.employeeId] = {
                    employeeName: expense.employeeName || 'Unknown Employee',
                    expenses: [],
                    totalInr: 0,
                };
            }
            const amountInInr = expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount;
            groups[expense.projectId].expensesByEmployee[expense.employeeId].expenses.push(expense);
            groups[expense.projectId].expensesByEmployee[expense.employeeId].totalInr += amountInInr;
        }
        setGroupedExpenses(groups);

    }, [allExpenses, activeFilters, projectsMap]);
    
    const toggleGroup = (projectId: string) => {
        setOpenGroups(prev => {
          const newSet = new Set(prev);
          if (newSet.has(projectId)) newSet.delete(projectId);
          else newSet.add(projectId);
          return newSet;
        });
    };
    
    // NEW: Function to toggle employee sub-groups
    const toggleSubGroup = (projectId: string, employeeId: string) => {
        const key = `${projectId}-${employeeId}`;
        setOpenSubGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
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
        setActiveFilters({ statuses: [], categories: [], projectIds: [], employeeIds: [], clientIds: [], startDate: '', endDate: '' });
    };

    const getActiveFilterCount = () => {
        const { statuses, categories, projectIds, employeeIds, clientIds, startDate, endDate } = activeFilters;
        let count = (statuses?.length || 0) + (categories?.length || 0) + (projectIds?.length || 0) + (employeeIds?.length || 0) + (clientIds?.length || 0);
        if (startDate || endDate) count++;
        return count;
    };
    const activeFilterCount = getActiveFilterCount();
    
    if (isLoading) {
        return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }
    
    const usersMap = new Map(users.map(u => [u.uid, u.name]));
    
    return (
        <>
            <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Expense Management Console</h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Review and process all submitted expenses.</p>
                </div>
                {/* NEW: Filter Bar */}
                <div className="px-4 sm:px-6 pb-4 border-b border-gray-200">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-semibold text-gray-700">Filters</h3>
                            <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-semibold rounded-md hover:bg-gray-200 border border-gray-300 shadow-sm">
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
                                {activeFilters.employeeIds?.map(eId => <span key={eId} className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">{usersMap.get(eId) || eId} <button onClick={() => removeFilter('employeeIds', eId)} className="text-yellow-600 hover:text-yellow-900">&times;</button></span>)}
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

                <div>
                    {Object.keys(groupedExpenses).length === 0 ? (
                        <div className="text-center p-8">
                            <p className="text-gray-500">No expenses found for the selected filter.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 p-4 bg-gray-50">
                            {Object.keys(groupedExpenses).map(projectId => {
                                const group = groupedExpenses[projectId];
                                const isOpen = openGroups.has(projectId);
                                return (
                                <div key={projectId} className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <div className="bg-blue-100 px-4 py-4 sm:px-6 cursor-pointer hover:bg-blue-200" onClick={() => toggleGroup(projectId)}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-grow min-w-0">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate" title={group.projectName}>{group.projectName}</h3>
                                            </div>
                                            <div className="flex-shrink-0 flex items-center">
                                                <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    {isOpen && (
                                    <div className="bg-gray-50 px-2 py-2 md:px-4 md:py-2 space-y-2">
                                      {Object.entries(group.expensesByEmployee).sort(([_, a], [__, b]) => a.employeeName.localeCompare(b.employeeName)).map(([employeeId, employeeGroup]) => {
                                        const subGroupKey = `${projectId}-${employeeId}`;
                                        const isSubGroupOpen = openSubGroups.has(subGroupKey);
                                        return (
                                            <div key={employeeId} className="bg-white rounded-md border">
                                                <div className="p-3 cursor-pointer hover:bg-gray-100 flex justify-between items-center" onClick={() => toggleSubGroup(projectId, employeeId)}>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{employeeGroup.employeeName}</p>
                                                        <p className="text-xs text-gray-500">{employeeGroup.expenses.length} {employeeGroup.expenses.length === 1 ? 'expense' : 'expenses'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-semibold text-gray-700 text-sm">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(employeeGroup.totalInr)}</span>
                                                        <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${isSubGroupOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>

                                                {isSubGroupOpen && (
                                                <>
                                                    {/* Desktop Table */}
                                                    <div className="hidden md:block border-t border-gray-200 overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {employeeGroup.expenses.map((expense, index) => (
                                                                    <tr key={expense.expenseId} className={`${index % 2 !== 0 ? 'bg-blue-50/50' : ''}`}>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date.toDate().toLocaleDateString('en-GB')}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                            {expense.currency !== 'INR' && (<div className="text-sm text-gray-500">{new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}</div>)}
                                                                            <div className="text-sm font-semibold text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount)}</div>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{getStatusBadge(expense.status)}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                                            <div className="flex justify-center items-center gap-4">
                                                                                {expense.remarks && (<div className="group relative flex justify-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{expense.remarks}</span></div>)}
                                                                                <div className="group relative flex justify-center">
                                                                                    {expense.receiptUrl ? <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg></a> : <span className="text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg></span>}
                                                                                    <span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{expense.receiptUrl ? 'View Receipt' : 'No Receipt'}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                                            <div className="flex items-center justify-center space-x-3">
                                                                                {expense.status === ExpenseStatus.PENDING && (<>
                                                                                    <div className="relative group"><button onClick={() => setActionState({ expense, action: 'approve' })} className="text-green-600 hover:text-green-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100">Approve</span></div>
                                                                                    <div className="relative group"><button onClick={() => setActionState({ expense, action: 'return' })} className="text-blue-600 hover:text-blue-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h12a2 2 0 002-2V6" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100">Return</span></div>
                                                                                    <div className="relative group"><button onClick={() => setActionState({ expense, action: 'reject' })} className="text-red-600 hover:text-red-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100">Reject</span></div>
                                                                                </>)}
                                                                                <div className="relative group"><button onClick={() => setSelectedExpense(expense)} className="text-gray-500 hover:text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button><span className="absolute z-10 bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100">View Full Details</span></div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {/* Mobile Card View */}
                                                    <div className="block md:hidden border-t border-gray-200">
                                                        <ul className="divide-y divide-gray-200">
                                                            {employeeGroup.expenses.map(expense => (
                                                                <li key={expense.expenseId} className="p-4">
                                                                    <div className="flex justify-between items-start gap-4">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-900">{expense.category}</p>
                                                                            <p className="text-xs text-gray-500 mb-1">{expense.date.toDate().toLocaleDateString('en-GB')}</p>
                                                                            {getStatusBadge(expense.status)}
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0"><p className="text-base font-semibold text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount)}</p>{expense.currency !== 'INR' && <p className="text-xs text-gray-500">{new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}</p>}</div>
                                                                    </div>
                                                                    <div className="mt-2 text-sm text-gray-700"><p><span className="font-medium text-gray-500">Remarks:</span> {expense.remarks || 'N/A'}</p></div>
                                                                    <div className="mt-2 flex items-center gap-4 text-sm">
                                                                        {expense.receiptUrl ? <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>View Receipt</a> : <span className="text-gray-400 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 10-6 0v4a3 3 0 106 0V7a1 1 0 00-2 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>No Receipt</span>}
                                                                    </div>
                                                                    <div className="mt-4 flex justify-end items-center gap-2">
                                                                        {expense.status === ExpenseStatus.PENDING && (<>
                                                                            <button onClick={() => setActionState({ expense, action: 'approve' })} className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600">Approve</button>
                                                                            <button onClick={() => setActionState({ expense, action: 'return' })} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-md hover:bg-blue-600">Return</button>
                                                                            <button onClick={() => setActionState({ expense, action: 'reject' })} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600">Reject</button>
                                                                        </>)}
                                                                        <button onClick={() => setSelectedExpense(expense)} className="px-3 py-1.5 bg-gray-500 text-white text-xs font-semibold rounded-md hover:bg-gray-600">Details</button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </>
                                                )}
                                            </div>
                                        )
                                      })}
                                    </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {actionState && (
                <ActionModal
                    expense={actionState.expense}
                    action={actionState.action}
                    approver={approver}
                    onClose={() => setActionState(null)}
                />
            )}
            {selectedExpense && (
                <ExpenseDetailModal 
                    expense={selectedExpense}
                    approver={approver}
                    onClose={() => setSelectedExpense(null)}
                />
            )}
            {isFilterModalOpen && (
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={setActiveFilters}
                    initialFilters={activeFilters}
                    availableProjects={[...projectsMap.entries()].map(([id, data]) => ({ projectId: id, projectCode: data.projectCode, clientCode: data.clientCode, clientName: '', description: data.projectName, travelCode: data.travelCode }))}
                    availableCategories={expenseCategories}
                    availableStatuses={statusFilterOptions}
                    availableEmployees={users}
                    availableClients={allClients}
                />
            )}
        </>
    );
};

export default ApprovalConsole;