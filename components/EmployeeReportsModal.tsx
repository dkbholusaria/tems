import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, UserMaster, EnrichedProject, ExpenseStatus } from '../types';

interface EmployeeReportsModalProps {
  onClose: () => void;
  user: UserMaster;
  expenses: Expense[];
  projectsMap: Map<string, EnrichedProject>;
}

type ReportType = 'personal-summary' | 'project-breakdown' | 'category-analysis';

const EmployeeReportsModal: React.FC<EmployeeReportsModalProps> = ({ onClose, user, expenses, projectsMap }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('personal-summary');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Get a unique list of projects the user has submitted expenses for
  const userProjectIds = [...new Set(expenses.map(exp => exp.projectId))];
  const userProjects = userProjectIds.map(id => projectsMap.get(id)).filter(Boolean) as EnrichedProject[];

  const [selectedProject, setSelectedProject] = useState(userProjects[0]?.projectId || '');
  
  useEffect(() => {
    // Set a default project if the list is available and none is selected
    if(userProjects.length > 0 && !selectedProject) {
      setSelectedProject(userProjects[0].projectId);
    }
  }, [userProjects, selectedProject]);


  const getAmountInInr = (expense: Expense) => expense.conversionDetails?.convertedAmount ?? expense.amount;

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
        try {
            switch (activeReport) {
                case 'personal-summary': generatePersonalSummary(); break;
                case 'project-breakdown': generateProjectBreakdown(); break;
                case 'category-analysis': generateCategoryAnalysis(); break;
            }
        } catch(e) {
            console.error("Error generating report:", e);
            alert("An unexpected error occurred while generating the report.");
        } finally {
            setIsGenerating(false);
        }
    }, 100);
  };
  
  const addHeaderAndFooter = (doc: jsPDF, title: string) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Employee: ${user.name}`, 14, 25);
      
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, pageHeight - 10);
          doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 35, pageHeight - 10);
      }
  };
  
  const getFilteredExpenses = () => {
    return expenses.filter(exp => {
        const expDate = exp.date.toDate();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if(start) start.setHours(0,0,0,0);
        if(end) end.setHours(23,59,59,999);
        
        const projectMatch = activeReport !== 'project-breakdown' || exp.projectId === selectedProject;
        const statusMatch = filterStatus === 'all' || exp.status === filterStatus;
        
        return projectMatch && statusMatch && (!start || expDate >= start) && (!end || expDate <= end);
    });
  };
  
  const generatePersonalSummary = () => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const filteredExpenses = getFilteredExpenses();

      if (filteredExpenses.length === 0) { alert("No expenses found for the selected filters."); return; }

      const body = filteredExpenses.map(exp => {
          const projectInfo = projectsMap.get(exp.projectId);
          const projectName = projectInfo ? `${projectInfo.clientName} - ${projectInfo.projectCode}` : exp.projectId;
          return [
              exp.date.toDate().toLocaleDateString('en-GB'),
              projectName,
              exp.category,
              exp.remarks || '-',
              exp.status,
              getAmountInInr(exp).toFixed(2)
          ];
      });
      
      autoTable(doc, {
          startY: 32,
          head: [['Date', 'Project', 'Category', 'Description/Remarks', 'Status', 'Amount (INR)']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          columnStyles: { 5: { halign: 'right' } }
      });
      
      addHeaderAndFooter(doc, 'Personal Expense Summary');
      doc.save('Personal_Summary_Report.pdf');
  };
  
  const generateProjectBreakdown = () => {
      if (!selectedProject) { alert("Please select a project to generate this report."); return; }
      const doc = new jsPDF({ orientation: 'landscape' });
      const projectDetails = projectsMap.get(selectedProject);
      const filteredExpenses = getFilteredExpenses();
      
      if (filteredExpenses.length === 0) { alert("No expenses found for the selected project and filters."); return; }
      
      const body = filteredExpenses.map(exp => [
          exp.date.toDate().toLocaleDateString('en-GB'),
          exp.category,
          exp.remarks || '-',
          exp.status,
          getAmountInInr(exp).toFixed(2)
      ]);
      
      doc.setFontSize(11);
      doc.text(`Project: ${projectDetails?.projectCode} - ${projectDetails?.clientName}`, 14, 30);
      
      autoTable(doc, {
          startY: 36,
          head: [['Date', 'Category', 'Description/Remarks', 'Status', 'Amount (INR)']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [39, 174, 96] },
          columnStyles: { 4: { halign: 'right' } }
      });
      
      addHeaderAndFooter(doc, 'Project-Specific Breakdown');
      doc.save(`My_Project_${projectDetails?.projectCode}_Report.pdf`);
  };
  
  const generateCategoryAnalysis = () => {
      const doc = new jsPDF();
      const filteredExpenses = getFilteredExpenses();
      if (filteredExpenses.length === 0) { alert("No expenses found for the selected filters."); return; }

      const categoryData: { [cat: string]: { total: number, count: number } } = {};
      let grandTotal = 0;
      filteredExpenses.forEach(exp => {
          const amount = getAmountInInr(exp);
          if (!categoryData[exp.category]) categoryData[exp.category] = { total: 0, count: 0 };
          categoryData[exp.category].total += amount;
          categoryData[exp.category].count += 1;
          grandTotal += amount;
      });
      
      const body = Object.entries(categoryData).map(([category, data]) => [
          category,
          data.total.toFixed(2),
          data.count,
          `${grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(2) : 0}%`
      ]);
      
      autoTable(doc, {
          startY: 32,
          head: [['Category', 'Total Spent (INR)', '# of Transactions', '% of Total']],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [211, 84, 0] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } }
      });

      addHeaderAndFooter(doc, 'Personal Category Spending Analysis');
      doc.save('My_Category_Analysis_Report.pdf');
  };

  const ReportCard: React.FC<{ type: ReportType, title: string, description: string, icon: React.ReactNode }> = ({ type, title, description, icon }) => (
      <button onClick={() => setActiveReport(type)} className={`w-full p-4 text-left border-l-4 rounded-r-lg transition-all ${activeReport === type ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300'}`}>
          <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${activeReport === type ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {icon}
              </div>
              <div>
                  <h4 className="font-bold text-gray-800">{title}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
              </div>
          </div>
      </button>
  );

  const renderFilters = () => {
      return (
          <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Filters</h3>
              {activeReport === 'project-breakdown' && (
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Project</label>
                      <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                          {userProjects.map(p => <option key={p.projectId} value={p.projectId}>{`${p.clientName} - ${p.description}`}</option>)}
                      </select>
                  </div>
              )}
              {activeReport !== 'project-breakdown' && (
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                          <option value="all">All Statuses</option>
                          {Object.values(ExpenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                  </div>
              )}
              <div>
                  <label className="block text-sm font-medium text-gray-700">Date Range (Optional)</label>
                  <div className="flex items-center gap-2 mt-1">
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                      <span>to</span>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                  </div>
              </div>
          </div>
      );
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white h-[90vh] flex flex-col">
        <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100 flex-shrink-0">
            <h3 className="text-xl font-semibold text-slate-800">Your Reports</h3>
            <button onClick={onClose} className="absolute top-1/2 right-4 -translate-y-1/2 bg-red-100 text-red-600 rounded-full h-8 w-8 flex items-center justify-center shadow-sm hover:bg-red-200 hover:text-red-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        
        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto">
          <div className="md:col-span-1 space-y-4 pr-4 border-r">
              <h3 className="text-lg font-semibold text-gray-700">Select a Report</h3>
              <ReportCard type="personal-summary" title="Personal Expense Summary" description="An overview of all your expenses, filterable by status and date." icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <ReportCard type="project-breakdown" title="Project-Specific Breakdown" description="Itemized list of your expenses for a single project." icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
              <ReportCard type="category-analysis" title="Personal Category Analysis" description="A summary of your spending habits by expense category." icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} />
          </div>
          <div className="md:col-span-2 space-y-6">
            {renderFilters()}
            <div className="pt-6 border-t">
                <button 
                    onClick={handleGenerateReport} 
                    disabled={isGenerating} 
                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center gap-2">
                     {isGenerating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating PDF...</> : 'Generate Report'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeReportsModal;
