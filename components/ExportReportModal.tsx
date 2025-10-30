

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserMaster, Expense, ExpenseStatus, EnrichedProject } from '../types';

// FIX: The `jsPDFWithAutoTable` interface was not correctly inheriting properties from the `jsPDF` class, causing TypeScript errors. This is resolved by changing the interface to a type intersection (`type jsPDFWithAutoTable = jsPDF & { ... }`), which correctly combines the types and makes all `jsPDF` methods available.
// Define a type that extends jsPDF to include properties added by jspdf-autotable
type jsPDFWithAutoTable = jsPDF & {
  lastAutoTable: { finalY: number };
};


interface ExportReportModalProps {
  onClose: () => void;
  expenses: Expense[];
  projectsMap: Map<string, EnrichedProject>;
  user: UserMaster;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({ onClose, expenses, projectsMap, user }) => {
  const [reportType, setReportType] = useState<'excel' | 'pdf'>('excel');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const getFilteredExpenses = () => {
    return expenses.filter(exp => {
      const expDate = exp.date.toDate();
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if(start) start.setHours(0, 0, 0, 0);
      if(end) end.setHours(23, 59, 59, 999);

      const projectMatch = filterProject === 'all' || exp.projectId === filterProject;
      const statusMatch = filterStatus === 'all' || exp.status === filterStatus;
      const startDateMatch = !start || expDate >= start;
      const endDateMatch = !end || expDate <= end;
      
      return projectMatch && statusMatch && startDateMatch && endDateMatch;
    });
  };
  
  const getFullProjectName = (projectId: string) => {
    const projectInfo = projectsMap.get(projectId);
    if (!projectInfo) return `Unknown Project (${projectId})`;
    return `${projectInfo.clientName} | ${projectInfo.description} (${projectInfo.projectCode})`;
  };
  
  const formatInrForPdf = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

  const generatePdf = () => {
    setIsGenerating(true);
    setTimeout(() => {
        try {
            const doc = new jsPDF() as jsPDFWithAutoTable; // Cast to our extended interface
            const filteredExpenses = getFilteredExpenses();

            if (filterProject === 'all') {
                alert("Please select a single project to generate a PDF Claim Form.");
                setIsGenerating(false);
                return;
            }
            
            if (filteredExpenses.length === 0) {
                alert("No expenses match the selected filters for the PDF report.");
                setIsGenerating(false);
                return;
            }

            const project = projectsMap.get(filterProject);
            if (!project) { // This case should be rare but good to have
                 alert("Could not find the selected project's details.");
                 setIsGenerating(false);
                 return;
            }

            let minDate = filteredExpenses[0].date.toDate(), maxDate = filteredExpenses[0].date.toDate();
            for (const exp of filteredExpenses) { const d = exp.date.toDate(); if (d < minDate) minDate = d; if (d > maxDate) maxDate = d; }
            const travelPeriod = filteredExpenses.length > 1 
                ? `${minDate.toLocaleDateString('en-GB')} to ${maxDate.toLocaleDateString('en-GB')}`
                : minDate.toLocaleDateString('en-GB');

            // --- HEADER ---
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Expense Claim Form', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Employee Name: ${user.name}`, 14, 30);
            doc.text(`Client Name: ${project.clientName}`, 14, 35);
            doc.text(`Project: ${project.projectCode} - ${project.description}`, 14, 40);
            doc.text(`Travel Period: ${travelPeriod}`, 14, 45);

            // --- SUMMARY TABLE ---
            const categoryTotals: { [key: string]: number } = {};
            filteredExpenses.forEach(exp => {
                const amountInInr = exp.conversionDetails?.convertedAmount ?? exp.amount;
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amountInInr;
            });
            // FIX: Corrected the type of `fontStyle` from `string` to the specific values
            // expected by jspdf-autotable to resolve the type incompatibility.
            const summaryBody: (string | { content: string; styles: { fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic'; }; })[][] = Object.entries(categoryTotals).map(([category, total]) => [category, formatInrForPdf(total)]);
            const grandTotal = Object.values(categoryTotals).reduce((acc, total) => acc + total, 0);
            summaryBody.push([{ content: 'Grand Total', styles: { fontStyle: 'bold' } }, { content: formatInrForPdf(grandTotal), styles: { fontStyle: 'bold' } }]);
            
            autoTable(doc, {
                startY: 50,
                head: [['Category Summary', 'Total Amount (INR)']],
                body: summaryBody,
                headStyles: { fillColor: [0, 112, 192], textColor: 255 },
                theme: 'grid',
                styles: { halign: 'right' },
                columnStyles: { 0: { halign: 'left' } },
            });
            let finalY = doc.lastAutoTable.finalY;

            // --- ANNEXURES ---
            const expensesByCategory: { [key: string]: Expense[] } = {};
            filteredExpenses.forEach(exp => { (expensesByCategory[exp.category] = expensesByCategory[exp.category] || []).push(exp); });
            
            Object.entries(expensesByCategory).forEach(([category, items], index) => {
                
                const body = items.map((exp) => {
                    let detailsString = '';
                    const details = exp.details;
                    
                    if (exp.invoiceNumber) detailsString += `Invoice #: ${exp.invoiceNumber}\n`;
                    if (category === 'Hotel' && details) {
                        if (details.hotelName) detailsString += `Hotel: ${details.hotelName}\n`;
                        if (details.hotelAddress) detailsString += `Address: ${details.hotelAddress}\n`;
                        if (details.checkInDate) detailsString += `Check-in: ${details.checkInDate.toDate().toLocaleDateString('en-GB')} ${details.checkInTime || ''}\n`;
                        if (details.checkOutDate) detailsString += `Check-out: ${details.checkOutDate.toDate().toLocaleDateString('en-GB')} ${details.checkOutTime || ''}\n`;
                    } else if (category === 'Air/Bus/Train' && details) {
                        if (details.travelerName) detailsString += `Traveler: ${details.travelerName}\n`;
                        if (details.travelMode) detailsString += `Mode: ${details.travelMode}\n`;
                        if (details.travelFrom) detailsString += `From: ${details.travelFrom} -> To: ${details.travelTo}\n`;
                        if (details.departureDateTime) detailsString += `Departure: ${details.departureDateTime.toDate().toLocaleString('en-GB')}\n`;
                        if (details.arrivalDateTime) detailsString += `Arrival: ${details.arrivalDateTime.toDate().toLocaleString('en-GB')}\n`;
                        if (details.pnrNumber) detailsString += `PNR/Ticket: ${details.pnrNumber}\n`;
                        if (details.travelClass) detailsString += `Class: ${details.travelClass}\n`;
                    } else if (category === 'Local Commute' && details) {
                        if (details.commuteFrom) detailsString += `From: ${details.commuteFrom} -> To: ${details.commuteTo}\n`;
                        if (details.commuteMode) detailsString += `Mode: ${details.commuteMode}\n`;
                        if (details.vendorName) detailsString += `Vendor: ${details.vendorName}\n`;
                        if (details.commuteKms) detailsString += `KMs: ${details.commuteKms}\n`;
                        if (details.commutePurpose) detailsString += `Purpose: ${details.commutePurpose}\n`;
                    } else if (details?.vendorName) {
                         detailsString += `Vendor: ${details.vendorName}\n`;
                    }

                    if (exp.remarks) detailsString += `Remarks: ${exp.remarks}\n`;
                    if (exp.approverComment) detailsString += `Approver: ${exp.approverComment}\n`;
                    if (!exp.receiptUrl) detailsString += `(No Receipt)\n`;

                    const amountInInr = exp.conversionDetails?.convertedAmount ?? exp.amount;
                    let amountStr = `₹ ${formatInrForPdf(amountInInr)}`;
                    if (exp.currency !== 'INR') {
                        amountStr += `\n(${exp.currency} ${new Intl.NumberFormat('en-US').format(exp.amount)})`;
                    }
                    
                    return [
                        exp.date.toDate().toLocaleDateString('en-GB'),
                        detailsString.trim(),
                        amountStr,
                        exp.status
                    ];
                });

                autoTable(doc, {
                    startY: finalY + 10,
                    head: [[{ content: `Annexure ${String.fromCharCode(65 + index)} - ${category}`, colSpan: 4, styles: { halign: 'left', fontStyle: 'bold', fontSize: 12 } }]],
                    theme: 'plain'
                });

                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY,
                    head: [['Date', 'Details', 'Amount', 'Status']],
                    body: body,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 220, 220], textColor: 20 },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 30, halign: 'right' },
                        3: { cellWidth: 22, halign: 'center' },
                    },
                    didParseCell: (data) => {
                        // Uppercase status
                        if (data.column.index === 3 && data.cell.section === 'body') {
                           if (data.cell.text && data.cell.text.length > 0) {
                                data.cell.text = [(data.cell.text[0] as string).charAt(0).toUpperCase() + (data.cell.text[0] as string).slice(1)];
                           }
                        }
                    }
                });
                finalY = doc.lastAutoTable.finalY;
            });
            
            // --- FOOTER AND SIGNATURES ---
            const pageHeight = doc.internal.pageSize.height;
            if (finalY > pageHeight - 60) doc.addPage();
            
            const signatureY = finalY + 30;
            doc.line(14, signatureY, 80, signatureY);
            doc.text('Employee Signature', 14, signatureY + 5);
            doc.line(130, signatureY, 196, signatureY);
            doc.text('Approved By', 130, signatureY + 5);
            
            const totalPages = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Generated via TEMS on ${new Date().toLocaleString('en-GB')}`, 14, pageHeight - 10);
                doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width - 30, pageHeight - 10);
            }

            const filename = `Claim_Form_${user.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
        } catch (e) {
            console.error("Error generating PDF report:", e);
            alert("An error occurred while generating the PDF. Please check the console for details.");
        } finally {
            setIsGenerating(false);
            onClose();
        }
    }, 100);
  };


  const generateExcel = () => {
    setIsGenerating(true);
    setTimeout(() => {
        try {
            const filteredExpenses = getFilteredExpenses();
            if (filteredExpenses.length === 0) {
                alert("No expenses match the selected filters to generate a report.");
                setIsGenerating(false);
                return;
            }
            const wb = XLSX.utils.book_new();

            const getStatusFillColor = (status: ExpenseStatus): string | null => {
                switch (status) {
                    case ExpenseStatus.DRAFT: return 'E5E7EB';
                    case ExpenseStatus.PENDING: return 'FEF3C7';
                    case ExpenseStatus.APPROVED: return 'D1FAE5';
                    case ExpenseStatus.REJECTED: return 'FEE2E2';
                    case ExpenseStatus.RETURNED: return 'DBEAFE';
                    default: return null;
                }
            };

            const createAndStyleSheet = (data: any[], sheetName: string) => {
                if (data.length === 0) {
                    const ws = XLSX.utils.json_to_sheet([{ Message: "No data found" }]);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    return;
                }
                const ws = XLSX.utils.json_to_sheet(data, { cellDates: true });
                const columnWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(...data.map(row => (row[key as keyof typeof row] ?? '').toString().length), key.length) + 2 }));
                ws['!cols'] = columnWidths;
                const range = XLSX.utils.decode_range(ws['!ref']!);
                const headers = Object.keys(data[0]);
                data.forEach((row, index) => {
                    const rowIndexInSheet = index + 1;
                    const fillColor = getStatusFillColor(row.Status);
                    if (fillColor) {
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cellAddress = XLSX.utils.encode_cell({ r: rowIndexInSheet, c: C });
                            if (!ws[cellAddress]) continue;
                            ws[cellAddress].s = { ...(ws[cellAddress].s || {}), fill: { fgColor: { rgb: fillColor }, patternType: 'solid' } };
                        }
                    }
                    headers.forEach((header, colIndex) => {
                        const cellAddress = XLSX.utils.encode_cell({ r: rowIndexInSheet, c: colIndex });
                        const cell = ws[cellAddress];
                        if (cell && cell.t === 'd') {
                            if (header.includes('Date')) cell.z = 'dd/mm/yyyy';
                            else if (header.includes('Departure') || header.includes('Arrival')) cell.z = 'dd/mm/yyyy hh:mm';
                        }
                    });
                });
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            };

            const summaryData = filteredExpenses.map(exp => ({
                "Date": exp.date.toDate(), "Project": getFullProjectName(exp.projectId), "Category": exp.category, "Invoice #": exp.invoiceNumber || '',
                "Amount (Original)": exp.amount, "Currency": exp.currency,
                "Amount (INR)": exp.conversionDetails?.convertedAmount ?? (exp.currency === 'INR' ? exp.amount : null),
                "Status": exp.status, "Employee Remarks": exp.remarks || '', "Approver Comment": exp.approverComment || '',
            }));
            createAndStyleSheet(summaryData, 'Summary');

            const categories = ['Hotel', 'Air/Bus/Train', 'Local Commute', 'Food', 'Gifts', 'Software', 'Other'];
            categories.forEach(category => {
                const categoryExpenses = filteredExpenses.filter(exp => exp.category === category);
                const baseData = (exp: Expense) => ({ "Date": exp.date.toDate(), "Project": getFullProjectName(exp.projectId), "Invoice #": exp.invoiceNumber || '', "Amount (Original)": exp.amount, "Currency": exp.currency, "Amount (INR)": exp.conversionDetails?.convertedAmount ?? (exp.currency === 'INR' ? exp.amount : null), "Status": exp.status, });
                let sheetData: any[] = [];
                if (category === 'Hotel') sheetData = categoryExpenses.map(exp => ({ ...baseData(exp), "Hotel Name": exp.details?.hotelName || '', "Hotel Address": exp.details?.hotelAddress || '', "Check-in Date": exp.details?.checkInDate?.toDate(), "Check-in Time": exp.details?.checkInTime || '', "Check-out Date": exp.details?.checkOutDate?.toDate(), "Check-out Time": exp.details?.checkOutTime || '', "Employee Remarks": exp.remarks || '', "Approver Comment": exp.approverComment || '', }));
                else if (category === 'Air/Bus/Train') sheetData = categoryExpenses.map(exp => ({ ...baseData(exp), "Traveler": exp.details?.travelerName || '', "Mode": exp.details?.travelMode || '', "From": exp.details?.travelFrom || '', "To": exp.details?.travelTo || '', "Departure": exp.details?.departureDateTime?.toDate(), "Arrival": exp.details?.arrivalDateTime?.toDate(), "PNR/Ticket #": exp.details?.pnrNumber || '', "Class": exp.details?.travelClass || '', "Employee Remarks": exp.remarks || '', "Approver Comment": exp.approverComment || '', }));
                else if (category === 'Local Commute') sheetData = categoryExpenses.map(exp => ({ ...baseData(exp), "From": exp.details?.commuteFrom || '', "To": exp.details?.commuteTo || '', "Mode": exp.details?.commuteMode || '', "KMs": exp.details?.commuteKms || '', "Vendor": exp.details?.vendorName || '', "Purpose": exp.details?.commutePurpose || '', "Employee Remarks": exp.remarks || '', "Approver Comment": exp.approverComment || '', }));
                else sheetData = categoryExpenses.map(exp => ({ ...baseData(exp), "Vendor": exp.details?.vendorName || '', "Employee Remarks": exp.remarks || '', "Approver Comment": exp.approverComment || '', }));

                // FIX: Sanitize sheet names to remove invalid characters like '/'.
                const safeSheetName = category.replace(/[\\/?*[\]]/g, '_');
                createAndStyleSheet(sheetData, safeSheetName);
            });

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const filename = `Expense_Report_${user.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(new Blob([wbout], { type: 'application/octet-stream' }), filename);
        } catch (e) {
            console.error("Error generating Excel report:", e);
            alert("An error occurred while generating the Excel file. Please check the console for details.");
        } finally {
            setIsGenerating(false);
            onClose();
        }
    }, 100);
  };

  const handleExport = () => {
    if (reportType === 'excel') generateExcel();
    else generatePdf();
  };

  const availableProjects = [...new Set(expenses.map(exp => exp.projectId))]
    .map(id => projectsMap.get(id))
    .filter((p): p is EnrichedProject => Boolean(p));

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Export Expense Report</h3>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Report Type</label>
            <div className="mt-1 flex rounded-md shadow-sm">
                <button onClick={() => setReportType('excel')} className={`relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-l-md ${reportType === 'excel' ? 'bg-blue-600 text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Excel (.xlsx)</button>
                <button onClick={() => setReportType('pdf')} className={`-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md ${reportType === 'pdf' ? 'bg-blue-600 text-white z-10' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>PDF Claim Form</button>
            </div>
            {reportType === 'pdf' && <p className="mt-2 text-xs text-gray-500">Note: PDF Claim Forms can only be generated for a single project at a time.</p>}
          </div>

          <div>
            <label htmlFor="filterProject" className="block text-sm font-medium text-gray-700">Filter by Project</label>
            <select
              id="filterProject"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={reportType === 'pdf' && filterProject === 'all'}
            >
              <option value="all">All Projects</option>
              {availableProjects.map(proj => (
                <option key={proj.projectId} value={proj.projectId}>
                  {getFullProjectName(proj.projectId)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Filter by Status</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value={ExpenseStatus.DRAFT}>Draft</option>
              <option value={ExpenseStatus.PENDING}>Pending</option>
              <option value={ExpenseStatus.APPROVED}>Approved</option>
              <option value={ExpenseStatus.RETURNED}>Returned</option>
              <option value={ExpenseStatus.REJECTED}>Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter by Date Range (Optional)</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
              <span>to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} disabled={isGenerating} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={handleExport} disabled={isGenerating} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300">
            {isGenerating ? 'Generating...' : 'Export Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
