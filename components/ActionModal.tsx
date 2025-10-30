import React, { useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../services/firebase';
import { Expense, UserMaster, ExpenseStatus, Approval } from '../types';

interface ActionModalProps {
    expense: Expense & { employeeName?: string };
    action: 'approve' | 'return' | 'reject';
    approver: UserMaster;
    onClose: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ expense, action, approver, onClose }) => {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const titleMap = {
        approve: 'Approve Expense',
        return: 'Return Expense',
        reject: 'Reject Expense'
    };
    
    const buttonTextMap = {
        approve: 'Confirm Approval',
        return: 'Return with Comment',
        reject: 'Reject with Comment'
    };

    const isCommentRequired = action === 'return' || action === 'reject';

    const handleConfirm = async () => {
        if (isCommentRequired && !comment.trim()) {
            setError('A comment is required to return or reject an expense.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const newStatus = action === 'approve' ? ExpenseStatus.APPROVED : (action === 'return' ? ExpenseStatus.RETURNED : ExpenseStatus.REJECTED);

        try {
            await db.collection('Expenses').doc(expense.expenseId).update({
                status: newStatus,
                approverComment: comment.trim() || firebase.firestore.FieldValue.delete(),
            });

            await db.collection('Approvals').add({
                expenseId: expense.expenseId,
                approverId: approver.uid,
                status: newStatus,
                comment: comment.trim(),
                timestamp: firebase.firestore.Timestamp.now(),
            } as Omit<Approval, 'approvalId'>);

            onClose();

        } catch (err) {
            console.error(`Error processing expense ${expense.expenseId}:`, err);
            setError('Failed to process the expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
                    <h3 className="text-xl font-semibold text-slate-800">{titleMap[action]}</h3>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
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
                        <p className="text-sm text-gray-500">Employee: <span className="font-medium text-gray-800">{expense.employeeName}</span></p>
                        <p className="text-sm text-gray-500">Date: <span className="font-medium text-gray-800">{expense.date.toDate().toLocaleDateString('en-GB')}</span></p>
                        <p className="text-sm text-gray-500">Amount: <span className="font-medium text-gray-800">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.conversionDetails?.convertedAmount ?? expense.amount)}</span></p>
                    </div>
                    <div>
                        <label htmlFor="approverComment" className="block text-sm font-medium text-gray-700">
                            Comment {isCommentRequired ? <span className="text-red-500">*</span> : '(Optional)'}
                        </label>
                        <textarea
                            id="approverComment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={isCommentRequired ? 'Please provide a reason...' : 'Add an optional comment...'}
                        />
                        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                        {isSubmitting ? 'Processing...' : buttonTextMap[action]}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionModal;