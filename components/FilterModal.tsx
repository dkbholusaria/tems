import React, { useState } from 'react';
import { ExpenseStatus, UserMaster, EnrichedProject, Client } from '../types';

export interface ActiveFilters {
  statuses: ExpenseStatus[];
  categories: string[];
  projectIds: string[];
  employeeIds?: string[];
  clientIds?: string[];
  startDate: string;
  endDate: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (newFilters: ActiveFilters) => void;
  initialFilters: ActiveFilters;
  availableStatuses: { value: ExpenseStatus, label: string }[];
  availableCategories: string[];
  availableProjects: (EnrichedProject & { projectCode: string })[];
  availableEmployees?: UserMaster[];
  availableClients?: Client[];
}

type ActiveTab = 'status' | 'category' | 'project' | 'client' | 'employee' | 'date';

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, initialFilters, availableStatuses, availableCategories, availableProjects, availableEmployees, availableClients }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('status');
  const [localFilters, setLocalFilters] = useState<ActiveFilters>(initialFilters);

  if (!isOpen) return null;
  
  const handleToggle = (type: 'statuses' | 'categories' | 'projectIds' | 'employeeIds' | 'clientIds', value: string) => {
    setLocalFilters(prev => {
      const currentValues = prev[type] as string[] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [type]: newValues };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };
  
  const handleClearAll = () => {
    const clearedFilters: ActiveFilters = {
        statuses: [],
        categories: [],
        projectIds: [],
        employeeIds: [],
        clientIds: [],
        startDate: '',
        endDate: ''
    };
    setLocalFilters(clearedFilters);
    onApply(clearedFilters);
    onClose();
  };

  const handleClearTab = (tab: ActiveTab) => {
    const resetMap: Partial<ActiveFilters> = {
        status: { statuses: [] },
        category: { categories: [] },
        project: { projectIds: [] },
        employee: { employeeIds: [] },
        client: { clientIds: [] },
        date: { startDate: '', endDate: '' }
    }[tab];

    setLocalFilters(prev => ({
        ...prev,
        ...resetMap
    }));
  };

  const TabButton: React.FC<{ tab: ActiveTab, label: string }> = ({ tab, label }) => (
    <button onClick={() => setActiveTab(tab)} className={`w-full p-3 text-left rounded-md transition-all ${activeTab === tab ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}>
      {label}
    </button>
  );

  const renderHeader = (tab: ActiveTab, title: string) => (
    <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <button onClick={() => handleClearTab(tab)} className="text-xs font-medium text-blue-600 hover:underline">Clear</button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'status':
        return (
          <>
            {renderHeader('status', 'By Status')}
            <div className="space-y-2">
              {availableStatuses.map(({ value, label }) => (
                <label key={value} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <input type="checkbox" checked={localFilters.statuses.includes(value)} onChange={() => handleToggle('statuses', value)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                  <span className="ml-3 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </>
        );
      case 'category':
         return (
          <>
            {renderHeader('category', 'By Category')}
            <div className="space-y-2">
              {availableCategories.map(cat => (
                <label key={cat} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <input type="checkbox" checked={localFilters.categories.includes(cat)} onChange={() => handleToggle('categories', cat)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                  <span className="ml-3 text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </>
        );
      case 'project':
        return (
          <>
            {renderHeader('project', 'By Project')}
            <div className="space-y-2">
              {availableProjects.map(proj => (
                <label key={proj.projectId} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <input type="checkbox" checked={localFilters.projectIds.includes(proj.projectId)} onChange={() => handleToggle('projectIds', proj.projectId)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                  <span className="ml-3 text-sm text-gray-700">{proj.description}</span>
                </label>
              ))}
            </div>
          </>
        );
      case 'client':
        if (!availableClients) return null;
        return (
            <>
                {renderHeader('client', 'By Client')}
                <div className="space-y-2">
                {availableClients.map(client => (
                  <label key={client.clientId} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                    <input type="checkbox" checked={localFilters.clientIds?.includes(client.clientId)} onChange={() => handleToggle('clientIds', client.clientId)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="ml-3 text-sm text-gray-700">{client.clientName}</span>
                  </label>
                ))}
              </div>
            </>
        );
      case 'employee':
        if (!availableEmployees) return null;
        return (
            <>
                {renderHeader('employee', 'By Employee')}
                <div className="space-y-2">
                {availableEmployees.map(emp => (
                  <label key={emp.uid} className="flex items-center p-2 rounded-md hover:bg-gray-50">
                    <input type="checkbox" checked={localFilters.employeeIds?.includes(emp.uid)} onChange={() => handleToggle('employeeIds', emp.uid)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="ml-3 text-sm text-gray-700">{emp.name}</span>
                  </label>
                ))}
              </div>
            </>
        );
      case 'date':
        return (
            <>
                {renderHeader('date', 'By Date Range')}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input type="date" value={localFilters.startDate} onChange={e => setLocalFilters(p => ({...p, startDate: e.target.value}))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" value={localFilters.endDate} onChange={e => setLocalFilters(p => ({...p, endDate: e.target.value}))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                    </div>
                </div>
            </>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto w-full max-w-4xl shadow-lg rounded-lg bg-white h-[70vh] flex flex-col">
        <div className="relative text-center p-4 border-b flex justify-between items-center flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-800">Select Filters</h3>
            <button onClick={onClose} className="bg-red-100 text-red-600 rounded-full h-8 w-8 flex items-center justify-center shadow-sm hover:bg-red-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        <div className="flex-grow flex overflow-hidden">
            <div className="w-1/4 p-4 border-r bg-gray-50 space-y-2 flex-shrink-0">
                <TabButton tab="status" label="Status"/>
                <TabButton tab="category" label="Category"/>
                <TabButton tab="project" label="Project"/>
                {availableClients && <TabButton tab="client" label="Client"/>}
                {availableEmployees && <TabButton tab="employee" label="Employee"/>}
                <TabButton tab="date" label="Date Range"/>
            </div>
            <div className="w-3/4 p-6 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
        <div className="flex-shrink-0 p-4 border-t flex justify-between items-center bg-gray-50">
            <button onClick={handleClearAll} className="text-sm font-semibold text-red-600 hover:text-red-800">Clear All Filters</button>
            <div className="flex gap-2">
                <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300">Cancel</button>
                <button onClick={handleApply} className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">Apply Filters</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;