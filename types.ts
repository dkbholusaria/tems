// FIX: To align with the Firebase v8 API, changed the Timestamp import.
// It is now accessed via the main firebase object.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// 2. Firestore Schema Definitions
// Using enums for standardized roles and statuses enhances data integrity.

export enum Role {
  EMPLOYEE = 'employee',
  EMPLOYER = 'employer',
}

export enum ExpenseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned',
}

export interface UserMaster {
  uid: string;
  name: string;
  email: string;
  role: Role;
  mobile?: string; // NEW: Added mobile number field
}

export interface Client {
  docId?: string; // Firestore document ID
  clientId: string; // e.g., "CL001"
  clientName: string; // e.g., "Acme Corporation"
}

export interface Project {
  docId?: string; // Firestore document ID
  projectId: string;
  clientCode: string; // This is a foreign key to the Clients collection (clientId)
  projectCode: string;
  travelCode: string;
  description: string;
}

// FIX: Added clientCode to link projects back to clients for filtering.
export interface EnrichedProject {
  clientCode: string;
  clientName: string;
  description: string;
  projectId: string;
  projectCode: string;
  travelCode: string;
}

export interface Expense {
  expenseId: string;
  employeeId: string; // Corresponds to UserMaster uid
  projectId: string;
  category: string;
  date: firebase.firestore.Timestamp;
  amount: number;
  currency: string;
  invoiceNumber?: string; // NEW: Added invoice number field
  status: ExpenseStatus;
  receiptUrl?: string;
  createdAt: firebase.firestore.Timestamp;
  remarks?: string; // New universal remarks field
  approverComment?: string; // NEW: To store employer feedback on returned/rejected items.
  details?: {
    // Hotel specific
    checkInDate?: firebase.firestore.Timestamp;
    checkOutDate?: firebase.firestore.Timestamp;
    checkInTime?: string; // NEW
    checkOutTime?: string; // NEW
    hotelName?: string;
    hotelAddress?: string; // NEW
    googleMapLocation?: { // NEW
      name: string;
      address: string;
      placeId: string;
    };
    // Travel specific
    travelerName?: string;
    travelMode?: 'Flight' | 'Train' | 'Bus' | 'Cab';
    travelFrom?: string; // Departure station
    travelTo?: string; // Arrival station
    departureDateTime?: firebase.firestore.Timestamp;
    arrivalDateTime?: firebase.firestore.Timestamp;
    kilometers?: number;
    travelClass?: string; // e.g., Economy, Business
    pnrNumber?: string;
    // Local Commute specific
    commuteFrom?: string;
    commuteTo?: string;
    commuteMode?: 'Cab' | 'Auto' | 'Metro' | 'Bus' | 'Personal Vehicle';
    commuteKms?: number;
    commutePurpose?: string;
    vendorName?: string; // NEW for Local Commute
  };
  conversionDetails?: {
    baseCurrency: 'INR';
    exchangeRate: number;
    convertedAmount: number;
  };
}

export interface Approval {
  approvalId: string;
  expenseId: string;
  approverId: string; // Corresponds to UserMaster uid
  status: ExpenseStatus; // Approved, Rejected, or Returned
  comment?: string;
  timestamp: firebase.firestore.Timestamp;
}