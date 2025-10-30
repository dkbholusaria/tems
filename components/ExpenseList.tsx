import React, { useState, useEffect } from 'react';
// FIX: Removed v9 modular imports for Firestore query functions.
import { db } from '../services/firebase';
import { Expense, ExpenseStatus } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface ExpenseListProps {
  userId: string;
}

const getStatusBadge = (status: ExpenseStatus) => {
  switch (status) {
    case ExpenseStatus.PENDING:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{status}</span>;
    case ExpenseStatus.APPROVED:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{status}</span>;
    case ExpenseStatus.REJECTED:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{status}</span>;
    case ExpenseStatus.RETURNED:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{status}</span>;
    default:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

const ExpenseList: React.FC<ExpenseListProps> = ({ userId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FIX: Refactored Firestore query to use the v8 chainable API.
    const expensesCol = db.collection('Expenses');
    const q = expensesCol
      .where('employeeId', '==', userId)
      .orderBy('createdAt', 'desc');

    const unsubscribe = q.onSnapshot((querySnapshot) => {
      const userExpenses: Expense[] = [];
      querySnapshot.forEach((doc) => {
        userExpenses.push({ expenseId: doc.id, ...doc.data() } as Expense);
      });
      setExpenses(userExpenses);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching expenses:", err);
      setError("Failed to fetch expenses. Please try again later.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>;
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center bg-white p-8 rounded-lg shadow">
        <p className="text-gray-500">You have not submitted any expenses yet.</p>
        <p className="text-gray-400 text-sm mt-2">Click "+ Add New Expense" to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.expenseId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date.toDate().toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.projectId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{getStatusBadge(expense.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  {expense.receiptUrl ? (
                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">View</a>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseList;
