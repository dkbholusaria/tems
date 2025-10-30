import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import { Expense, UserMaster, ExpenseStatus, Approval } from '../types';

interface EnrichedExpense extends Expense {
    employeeName?: string;
    projectName?: string;
}

interface ExpenseDetailModalProps {
    expense: EnrichedExpense;
    approver: UserMaster;
    onClose: () => void;
}

const DetailRow: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => {
    if (!value && !children) return null;
    return (
        <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {children || value}
            </dd>
        </div>
    );
};

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({ expense, approver, onClose }) => {
    const [originalComment, setOriginalComment] = useState(expense.approverComment || '');
    const [comment, setComment] = useState(expense.approverComment || '');
    const [isSubmitting, setIsSubmitting] = useState(false); // For status changes
    const [isSavingComment, setIsSavingComment] = useState(false); // For saving comment only
    const [error, setError] = useState<string | null>(null);
    
    // Reset comment state if the selected expense changes
    useEffect(() => {
        setOriginalComment(expense.approverComment || '');
        setComment(expense.approverComment || '');
    }, [expense]);


    const handleAction = async (newStatus: ExpenseStatus.APPROVED | ExpenseStatus.REJECTED | ExpenseStatus.RETURNED) => {
        if ((newStatus === ExpenseStatus.REJECTED || newStatus === ExpenseStatus.RETURNED) && !comment) {
            setError('A comment is required to return or reject an expense.');
            return;
        }
        
        setIsSubmitting(true);
        setError(null);
        
        try {
            await db.collection('Expenses').doc(expense.expenseId).update({ 
                status: newStatus,
                approverComment: comment || firebase.firestore.FieldValue.delete(),
            });
            
            await db.collection('Approvals').add({
                expenseId: expense.expenseId,
                approverId: approver.uid,
                status: newStatus,
                comment: comment,
                timestamp: firebase.firestore.Timestamp.now(),
            } as Omit<Approval, 'approvalId'>);

            onClose();
        } catch (err) {
            console.error(`Error updating expense ${expense.expenseId}:`, err);
            setError('Failed to process the expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSaveComment = async () => {
        setIsSavingComment(true);
        setError(null);
        try {
            await db.collection('Expenses').doc(expense.expenseId).update({
                approverComment: comment,
            });
            setOriginalComment(comment); // Update baseline to new saved comment
        } catch(err) {
            console.error("Error saving comment:", err);
            setError("Failed to save the comment. Please try again.");
        } finally {
            setIsSavingComment(false);
        }
    };
    
    const handleCancelCommentEdit = () => {
        setComment(originalComment);
        setError(null);
    };

    const hasCommentChanged = comment !== originalComment;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
                <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
                    <h3 className="text-xl font-semibold text-slate-800">Expense Details</h3>
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
                        <DetailRow label="Employee" value={expense.employeeName} />
                        <DetailRow label="Project" value={expense.projectName} />
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
                        
                        <DetailRow label="Employee Remarks" value={expense.remarks} />
                        <DetailRow label="Approver's Comment" value={expense.approverComment} />
                        <DetailRow label="Receipt">
                            {expense.receiptUrl ? <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">View Receipt</a> : 'N/A'}
                        </DetailRow>
                    </dl>
                </div>
                
                {/* Action/Comment Section */}
                 {[ExpenseStatus.PENDING, ExpenseStatus.REJECTED, ExpenseStatus.APPROVED, ExpenseStatus.RETURNED].includes(expense.status) && (
                    <div className="mt-4 pt-4 border-t">
                        <label htmlFor="approverComment" className="block text-sm font-medium text-gray-700">Approver Comment</label>
                        <textarea
                            id="approverComment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={expense.status === ExpenseStatus.PENDING ? 'Comment is required for Return/Reject' : 'Optional comment'}
                        />
                        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                        
                        <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                            {/* Comment save buttons */}
                            {hasCommentChanged && (
                                <>
                                    <button onClick={handleSaveComment} disabled={isSavingComment} className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full sm:w-auto shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                                        {isSavingComment ? 'Saving...' : 'Save Comment'}
                                    </button>
                                    <button onClick={handleCancelCommentEdit} disabled={isSavingComment} className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full sm:w-auto shadow-sm hover:bg-gray-300">
                                        Cancel
                                    </button>
                                </>
                            )}
                            
                            {/* Main action buttons */}
                            {[ExpenseStatus.PENDING, ExpenseStatus.REJECTED].includes(expense.status) && (
                                <>
                                    <button onClick={() => handleAction(ExpenseStatus.APPROVED)} disabled={isSubmitting || hasCommentChanged} className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full sm:w-auto shadow-sm hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed">
                                        Approve
                                    </button>
                                    <button onClick={() => handleAction(ExpenseStatus.RETURNED)} disabled={isSubmitting || hasCommentChanged} className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full sm:w-auto shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
                                        Return
                                    </button>
                                    {expense.status === ExpenseStatus.PENDING && (
                                        <button onClick={() => handleAction(ExpenseStatus.REJECTED)} disabled={isSubmitting || hasCommentChanged} className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full sm:w-auto shadow-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed">
                                            Reject
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                         {hasCommentChanged && [ExpenseStatus.PENDING, ExpenseStatus.REJECTED].includes(expense.status) && (
                            <p className="text-xs text-gray-500 text-right mt-2">Save or cancel your comment changes to proceed.</p>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseDetailModal;