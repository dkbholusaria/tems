import React from 'react';
import { Expense, EnrichedProject } from '../types';

interface ViewExpenseModalProps {
    expense: Expense;
    projectsMap: Map<string, EnrichedProject>;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => {
    if (!value && !children) return null;
    return (
        <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-words">
                {children || value}
            </dd>
        </div>
    );
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ expense, projectsMap, onClose }) => {

    const getFullProjectName = (projectId: string) => {
        const projectInfo = projectsMap.get(projectId);
        if (!projectInfo) return `Unknown Project (${projectId})`;
        return `${projectInfo.clientName} | ${projectInfo.description} (${projectInfo.projectCode})`;
    };
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
                    <h3 className="text-xl font-semibold text-slate-800">View Expense Details</h3>
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

                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    <dl className="divide-y divide-gray-200">
                        <DetailRow label="Project" value={getFullProjectName(expense.projectId)} />
                        <DetailRow label="Date" value={expense.date.toDate().toLocaleDateString('en-GB')} />
                        <DetailRow label="Invoice #" value={expense.invoiceNumber} />
                        <DetailRow label="Category" value={expense.category} />
                        <DetailRow label="Amount">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                                        expense.conversionDetails ? expense.conversionDetails.convertedAmount : expense.amount
                                    )}
                                </span>
                                {expense.currency !== 'INR' && (
                                    <span className="text-xs text-gray-500">
                                        ({new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)} @ {expense.conversionDetails?.exchangeRate})
                                    </span>
                                )}
                            </div>
                        </DetailRow>
                        <DetailRow label="Status" value={expense.status} />

                        {/* Category-Specific Details */}
                        {expense.category === 'Hotel' && expense.details && (
                            <>
                                <DetailRow label="Hotel Name" value={expense.details.hotelName} />
                                <DetailRow label="Hotel Address" value={expense.details.hotelAddress} />
                                <DetailRow label="Check-in" value={expense.details.checkInDate ? `${expense.details.checkInDate.toDate().toLocaleDateString('en-GB')} ${expense.details.checkInTime || ''}`.trim() : ''} />
                                <DetailRow label="Check-out" value={expense.details.checkOutDate ? `${expense.details.checkOutDate.toDate().toLocaleDateString('en-GB')} ${expense.details.checkOutTime || ''}`.trim() : ''} />
                            </>
                        )}
                        {expense.category === 'Air/Bus/Train' && expense.details && (
                             <>
                                <DetailRow label="Traveler" value={expense.details.travelerName} />
                                <DetailRow label="Mode" value={expense.details.travelMode} />
                                <DetailRow label="From" value={expense.details.travelFrom} />
                                <DetailRow label="To" value={expense.details.travelTo} />
                                <DetailRow label="Departure" value={expense.details.departureDateTime ? expense.details.departureDateTime.toDate().toLocaleString('en-GB') : ''} />
                                <DetailRow label="Arrival" value={expense.details.arrivalDateTime ? expense.details.arrivalDateTime.toDate().toLocaleString('en-GB') : ''} />
                                <DetailRow label="PNR" value={expense.details.pnrNumber} />
                                <DetailRow label="Class" value={expense.details.travelClass} />
                            </>
                        )}
                         {expense.category === 'Local Commute' && expense.details && (
                             <>
                                <DetailRow label="From" value={expense.details.commuteFrom} />
                                <DetailRow label="To" value={expense.details.commuteTo} />
                                <DetailRow label="Mode" value={expense.details.commuteMode} />
                                <DetailRow label="KMs" value={expense.details.commuteKms} />
                                <DetailRow label="Vendor" value={expense.details.vendorName} />
                                <DetailRow label="Purpose" value={expense.details.commutePurpose} />
                            </>
                        )}
                         {expense.category !== 'Hotel' && expense.category !== 'Air/Bus/Train' && expense.category !== 'Local Commute' && expense.details?.vendorName && (
                            <DetailRow label="Vendor Name" value={expense.details.vendorName} />
                         )}
                        
                        <DetailRow label="Your Remarks">
                           <p className="whitespace-pre-wrap">{expense.remarks || 'N/A'}</p>
                        </DetailRow>
                        <DetailRow label="Approver's Comment">
                           <p className="whitespace-pre-wrap">{expense.approverComment || 'N/A'}</p>
                        </DetailRow>
                        <DetailRow label="Receipt">
                            {expense.receiptUrl ? <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">View Receipt</a> : 'N/A'}
                        </DetailRow>
                    </dl>
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewExpenseModal;