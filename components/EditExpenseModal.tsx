import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { db, storage } from '../services/firebase';
import { UserMaster, Expense, ExpenseStatus, Project, Client } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { RECEIPT_EXTRACTION_PROMPT } from '../prompts';
import GoogleMapSearchModal from './GoogleMapSearchModal'; // NEW

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

interface EnrichedProject {
    projectId: string;
    display_name: string;
}

interface OcrResult {
    vendor?: string; date?: string; amount?: number; currency?: string; invoiceNumber?: string; category?: string; remarks?: string;
    travelMode?: 'Flight' | 'Train' | 'Bus' | 'Cab'; travelerName?: string; pnrNumber?: string;
    travelFrom?: string; travelTo?: string; departureDateTime?: string; arrivalDateTime?: string; travelClass?: string;
    commuteFrom?: string; commuteTo?: string; commuteMode?: 'Cab' | 'Auto' | 'Metro' | 'Bus' | 'Personal Vehicle';
    commuteKms?: number; commutePurpose?: string;
    hotelName?: string; hotelAddress?: string; checkInDate?: string; checkOutDate?: string; checkInTime?: string; checkOutTime?: string;
}

interface EditExpenseModalProps {
  user: UserMaster;
  expense: Expense;
  onClose: () => void;
  onExpenseUpdated: () => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ user, expense, onClose, onExpenseUpdated }) => {
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(expense.projectId);
  const [category, setCategory] = useState(expense.category);
  const [date, setDate] = useState(expense.date.toDate().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(expense.invoiceNumber || '');
  const [amount, setAmount] = useState(expense.amount.toString());
  const [currency, setCurrency] = useState(expense.currency);
  const [newReceipt, setNewReceipt] = useState<File | null>(null);
  const [remarks, setRemarks] = useState(expense.remarks || '');
  
  const [vendorName, setVendorName] = useState(expense.details?.vendorName || '');
  const [hotelName, setHotelName] = useState(expense.details?.hotelName || '');
  const [checkInDate, setCheckInDate] = useState(expense.details?.checkInDate?.toDate().toISOString().split('T')[0] || '');
  const [checkOutDate, setCheckOutDate] = useState(expense.details?.checkOutDate?.toDate().toISOString().split('T')[0] || '');
  const [checkInTime, setCheckInTime] = useState(expense.details?.checkInTime || ''); // NEW
  const [checkOutTime, setCheckOutTime] = useState(expense.details?.checkOutTime || ''); // NEW
  const [hotelAddress, setHotelAddress] = useState(expense.details?.hotelAddress || ''); // NEW
  const [googleMapLocation, setGoogleMapLocation] = useState<any>(expense.details?.googleMapLocation || null); // NEW
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // NEW

  const [travelerName, setTravelerName] = useState(expense.details?.travelerName || user.name);
  const [travelMode, setTravelMode] = useState(expense.details?.travelMode || 'Flight');
  const [travelFrom, setTravelFrom] = useState(expense.details?.travelFrom || '');
  const [travelTo, setTravelTo] = useState(expense.details?.travelTo || '');
  const [departureDate, setDepartureDate] = useState(expense.details?.departureDateTime?.toDate().toISOString().split('T')[0] || '');
  const [departureTime, setDepartureTime] = useState(expense.details?.departureDateTime?.toDate().toTimeString().split(' ')[0].substring(0, 5) || '');
  const [arrivalDate, setArrivalDate] = useState(expense.details?.arrivalDateTime?.toDate().toISOString().split('T')[0] || '');
  const [arrivalTime, setArrivalTime] = useState(expense.details?.arrivalDateTime?.toDate().toTimeString().split(' ')[0].substring(0, 5) || '');
  const [kilometers, setKilometers] = useState(expense.details?.kilometers?.toString() || '');
  const [travelClass, setTravelClass] = useState(expense.details?.travelClass || '');
  const [pnrNumber, setPnrNumber] = useState(expense.details?.pnrNumber || '');
  
  const [commuteFrom, setCommuteFrom] = useState(expense.details?.commuteFrom || '');
  const [commuteTo, setCommuteTo] = useState(expense.details?.commuteTo || '');
  const [commuteMode, setCommuteMode] = useState(expense.details?.commuteMode || 'Cab');
  const [commuteKms, setCommuteKms] = useState(expense.details?.commuteKms?.toString() || '');
  const [commutePurpose, setCommutePurpose] = useState(expense.details?.commutePurpose || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isOcrReviewModalOpen, setIsOcrReviewModalOpen] = useState(false);
  
  const {
    exchangeRate,
    setExchangeRate,
    conversionResult,
    conversionData,
  } = useCurrencyConverter({ date, currency, amount, initialExchangeRate: expense.conversionDetails?.exchangeRate.toString() });

  useEffect(() => {
    const fetchProjectsAndClients = async () => {
      try {
        const clientsSnapshot = await db.collection('Clients').get();
        const clientsMap = new Map<string, string>();
        clientsSnapshot.forEach(doc => { const client = doc.data() as Client; clientsMap.set(client.clientId.toUpperCase(), client.clientName); });
        
        const projectsSnapshot = await db.collection('Projects').get();
        const fetchedProjects: EnrichedProject[] = [];
        projectsSnapshot.forEach((doc) => {
            const project = doc.data() as Project;
            const clientName = clientsMap.get(project.clientCode.toUpperCase()) || `[Client not found: ${project.clientCode}]`;
            fetchedProjects.push({ projectId: project.projectId, display_name: `${clientName} | ${project.description} (${project.projectId}) (${project.travelCode})` });
        });
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Error fetching projects for edit modal:", err);
        setError("Could not load project list.");
      }
    };
    fetchProjectsAndClients();
  }, []);
  
  // NEW: Handler for location selection from map modal
  const handleLocationSelect = (location: any) => {
    if (location) {
        setHotelName(location.name);
        setHotelAddress(location.address);
        setGoogleMapLocation(location);
    }
    setIsMapModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) { setNewReceipt(e.target.files[0]); setOcrError(null); }
  };

  const handleScanReceipt = async () => {
    if (!newReceipt) return;
    setIsScanning(true); setOcrError(null);
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
        if (!apiKey) throw new Error("Gemini API Key is not available.");
        const base64Data = await fileToBase64(newReceipt);
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [ { inlineData: { mimeType: newReceipt.type, data: base64Data } }, { text: RECEIPT_EXTRACTION_PROMPT.promptText } ] }, config: { responseMimeType: 'application/json', responseSchema: RECEIPT_EXTRACTION_PROMPT.responseSchema } });
        const result = JSON.parse(response.text);
        setOcrResult(result);
        setIsOcrReviewModalOpen(true);
    } catch (err: any) {
        console.error("Gemini OCR Error:", err);
        setOcrError(err.message || "AI scan failed. Please enter details manually.");
    } finally {
        setIsScanning(false);
    }
  };

  const handleConfirmOcr = () => {
    if (!ocrResult) return;
    if (ocrResult.date) setDate(ocrResult.date);
    if (ocrResult.amount) setAmount(ocrResult.amount.toString());
    if (ocrResult.currency) setCurrency(ocrResult.currency.toUpperCase());
    if (ocrResult.invoiceNumber) setInvoiceNumber(ocrResult.invoiceNumber);
    if (ocrResult.remarks) setRemarks(ocrResult.remarks);
    if (ocrResult.category) setCategory(ocrResult.category);

    if (ocrResult.category === 'Hotel') {
        if (ocrResult.hotelName) setHotelName(ocrResult.hotelName);
        if (ocrResult.vendor && !ocrResult.hotelName) setHotelName(ocrResult.vendor);
        if (ocrResult.checkInDate) setCheckInDate(ocrResult.checkInDate);
        if (ocrResult.checkOutDate) setCheckOutDate(ocrResult.checkOutDate);
        if (ocrResult.checkInTime) setCheckInTime(ocrResult.checkInTime);
        if (ocrResult.checkOutTime) setCheckOutTime(ocrResult.checkOutTime);
        if (ocrResult.hotelAddress) setHotelAddress(ocrResult.hotelAddress);
    } else if (ocrResult.category === 'Air/Bus/Train') {
        if (ocrResult.travelMode) setTravelMode(ocrResult.travelMode);
        if (ocrResult.travelerName) setTravelerName(ocrResult.travelerName);
        if (ocrResult.pnrNumber) setPnrNumber(ocrResult.pnrNumber);
        if (ocrResult.travelFrom) setTravelFrom(ocrResult.travelFrom);
        if (ocrResult.travelTo) setTravelTo(ocrResult.travelTo);
        if (ocrResult.travelClass) setTravelClass(ocrResult.travelClass);
        if (ocrResult.departureDateTime) { const [d, t] = ocrResult.departureDateTime.split('T'); setDepartureDate(d); setDepartureTime(t); }
        if (ocrResult.arrivalDateTime) { const [d, t] = ocrResult.arrivalDateTime.split('T'); setArrivalDate(d); setArrivalTime(t); }
    } else if (ocrResult.category === 'Local Commute') {
        if (ocrResult.commuteFrom) setCommuteFrom(ocrResult.commuteFrom);
        if (ocrResult.commuteTo) setCommuteTo(ocrResult.commuteTo);
        if (ocrResult.commuteMode) setCommuteMode(ocrResult.commuteMode);
        if (ocrResult.commuteKms) setCommuteKms(ocrResult.commuteKms.toString());
        if (ocrResult.commutePurpose) setCommutePurpose(ocrResult.commutePurpose);
        if (ocrResult.vendor) setVendorName(ocrResult.vendor);
    } else {
        if (ocrResult.vendor) setVendorName(ocrResult.vendor);
    }
    setIsOcrReviewModalOpen(false); setOcrResult(null);
  };

  const handleSave = async (newStatus?: ExpenseStatus) => {
    if (!selectedProjectId || !category || !date || !amount) { setError("Please fill in all required fields."); return; }
    setIsLoading(true); setError(null);
    try {
      const details: any = {};
      if (category === 'Hotel') {
        details.hotelName = hotelName;
        if (checkInDate) { const d = new Date(checkInDate); if (!isNaN(d.getTime())) details.checkInDate = firebase.firestore.Timestamp.fromDate(d); }
        if (checkOutDate) { const d = new Date(checkOutDate); if (!isNaN(d.getTime())) details.checkOutDate = firebase.firestore.Timestamp.fromDate(d); }
        details.checkInTime = checkInTime;
        details.checkOutTime = checkOutTime;
        details.hotelAddress = hotelAddress;
        details.googleMapLocation = googleMapLocation || firebase.firestore.FieldValue.delete();
      } else if (category === 'Air/Bus/Train') {
        details.travelerName = travelerName; details.travelMode = travelMode; details.travelFrom = travelFrom; details.travelTo = travelTo;
        if (departureDate && departureTime) details.departureDateTime = firebase.firestore.Timestamp.fromDate(new Date(`${departureDate}T${departureTime}`));
        if (arrivalDate && arrivalTime) details.arrivalDateTime = firebase.firestore.Timestamp.fromDate(new Date(`${arrivalDate}T${arrivalTime}`));
        if (kilometers) details.kilometers = parseFloat(kilometers);
        details.travelClass = travelClass; details.pnrNumber = pnrNumber;
      } else if (category === 'Local Commute') {
        details.commuteFrom = commuteFrom; details.commuteTo = commuteTo; details.commuteMode = commuteMode;
        if (commuteKms) details.commuteKms = parseFloat(commuteKms);
        details.commutePurpose = commutePurpose; details.vendorName = vendorName;
      } else {
        details.vendorName = vendorName;
      }
      
      const expenseUpdate: any = {
        projectId: selectedProjectId, category, date: firebase.firestore.Timestamp.fromDate(new Date(date)),
        amount: parseFloat(amount), currency,
        invoiceNumber: invoiceNumber || firebase.firestore.FieldValue.delete(),
        remarks: remarks || firebase.firestore.FieldValue.delete(),
        details: Object.keys(details).length > 0 ? details : firebase.firestore.FieldValue.delete(),
        conversionDetails: conversionData ? conversionData : firebase.firestore.FieldValue.delete(),
      };
      
      if (newReceipt) {
        if (expense.receiptUrl) {
            try { await storage.refFromURL(expense.receiptUrl).delete(); }
            catch (storageError) { console.warn("Could not delete old receipt:", storageError); }
        }
        const storageRef = storage.ref(`receipts/${user.uid}/${Date.now()}_${newReceipt.name}`);
        const uploadResult = await storageRef.put(newReceipt);
        expenseUpdate.receiptUrl = await uploadResult.ref.getDownloadURL();
      }

      if (newStatus) expenseUpdate.status = newStatus;

      await db.collection('Expenses').doc(expense.expenseId).update(expenseUpdate);
      onExpenseUpdated();

    } catch (err) {
      console.error("Error updating expense:", err);
      setError("Failed to update expense. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderDynamicFields = () => {
    switch (category) {
        case 'Hotel': 
            return (
                <div className="space-y-4 p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700">Hotel Name</label>
                            <input type="text" value={hotelName} onChange={e => setHotelName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                        </div>
                        <div className="flex-shrink-0 self-end">
                            <button type="button" onClick={() => setIsMapModalOpen(true)} className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-600">Search on Map</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hotel Address</label>
                        <textarea value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Check-in</label>
                            <div className="flex gap-2">
                                <input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                                <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Check-out</label>
                            <div className="flex gap-2">
                                <input type="date" value={checkOutDate} onChange={e => setCheckOutDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                                <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'Air/Bus/Train':
             return (
                 <div className="space-y-4 p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">Traveler Name</label><input type="text" value={travelerName} onChange={e => setTravelerName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Mode of Travel</label><select value={travelMode} onChange={e => setTravelMode(e.target.value as any)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"><option>Flight</option><option>Train</option><option>Bus</option><option>Cab</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700">Ticket / PNR Number</label><input type="text" value={pnrNumber} onChange={e => setPnrNumber(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">Class of Travel</label><input type="text" value={travelClass} onChange={e => setTravelClass(e.target.value)} placeholder="e.g., Economy" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><label className="block text-sm font-semibold text-indigo-800">Departure</label><input type="text" value={travelFrom} onChange={e => setTravelFrom(e.target.value)} placeholder="Station / Airport" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/><div className="flex gap-2"><input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/><input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div></div>
                        <div className="space-y-2"><label className="block text-sm font-semibold text-indigo-800">Arrival</label><input type="text" value={travelTo} onChange={e => setTravelTo(e.target.value)} placeholder="Station / Airport" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/><div className="flex gap-2"><input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/><input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700">KMs</label><input type="number" value={kilometers} onChange={e => setKilometers(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                </div>
            );
        case 'Local Commute':
            return (
                <div className="space-y-4 p-4 border rounded-lg bg-indigo-50 border-indigo-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">From Location</label><input type="text" value={commuteFrom} onChange={e => setCommuteFrom(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                        <div><label className="block text-sm font-medium text-gray-700">To Location</label><input type="text" value={commuteTo} onChange={e => setCommuteTo(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">Mode of Commute</label><select value={commuteMode} onChange={e => setCommuteMode(e.target.value as any)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"><option>Cab</option><option>Auto</option><option>Metro</option><option>Bus</option><option>Personal Vehicle</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700">Distance (KMs)</label><input type="number" value={commuteKms} onChange={e => setCommuteKms(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700">Vendor Name</label><input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g., Uber, Ola" className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Purpose of Travel</label><input type="text" value={commutePurpose} onChange={e => setCommutePurpose(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>
                </div>
            );
        case '': return null;
        default: 
            return (<div><label className="block text-sm font-medium text-gray-700">Vendor Name</label><input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white">
          <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Edit Expense</h3>
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
          <div className="max-h-[calc(80vh-8rem)] overflow-y-auto px-2">
            <form onSubmit={(e) => e.preventDefault()} className="text-left space-y-4">
               {expense.status === ExpenseStatus.RETURNED && expense.approverComment && (
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                      <h4 className="font-bold text-red-800">Reason for Return</h4>
                      <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{expense.approverComment}</p>
                  </div>
               )}
               <div>
                <label className="block text-sm font-medium text-gray-700">Project <span className="text-red-500">*</span></label>
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                  {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="" disabled>Select a category</option>
                    <option value="Air/Bus/Train">Air/Bus/Train</option> <option value="Local Commute">Local Commute</option> <option value="Food">Food</option> <option value="Hotel">Hotel</option> <option value="Gifts">Gifts</option> <option value="Software">Software</option> <option value="Other">Other</option>
                </select>
              </div>
              {renderDynamicFields()}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Invoice # (Optional)</label>
                      <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex-grow"><label className="block text-sm font-medium text-gray-700">Amount <span className="text-red-500">*</span></label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.00"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Currency <span className="text-red-500">*</span></label><select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
              </div>
              {currency !== 'INR' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div><label className="block text-sm font-medium text-gray-700">Exchange Rate (1 {currency} to INR)</label><input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="API suggested rate"/></div>
                    <div className="text-sm font-semibold text-gray-600 pb-2">{conversionResult}</div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Change Receipt (Optional)</label>
                <div className="flex items-center gap-4 mt-1">
                    <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    <button type="button" onClick={handleScanReceipt} disabled={!newReceipt || isScanning} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
                        {isScanning ? 'Scanning...' : 'Scan with AI'}
                    </button>
                 </div>
                 {ocrError && <p className="text-sm text-red-600 mt-1">{ocrError}</p>}
                 {expense.receiptUrl && !newReceipt && <p className="text-xs text-gray-500 mt-1">Current receipt: <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">View</a></p>}
              </div>
              <div><label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label><textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"></textarea></div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="items-center px-4 py-3 flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={onClose} disabled={isLoading || isScanning} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md w-full hover:bg-gray-300">Cancel</button>
                <button type="button" onClick={() => handleSave()} disabled={isLoading || isScanning} className="px-4 py-2 bg-gray-600 text-white rounded-md w-full hover:bg-gray-700 disabled:bg-gray-400">{ (isLoading || isScanning) ? 'Saving...' : 'Save Changes' }</button>
                {[ExpenseStatus.DRAFT, ExpenseStatus.RETURNED].includes(expense.status) && (<button type="button" onClick={() => handleSave(ExpenseStatus.PENDING)} disabled={isLoading || isScanning} className="px-4 py-2 bg-indigo-600 text-white rounded-md w-full hover:bg-indigo-700 disabled:bg-indigo-400">{ (isLoading || isScanning) ? 'Submitting...' : 'Submit for Approval' }</button>)}
              </div>
            </form>
          </div>
        </div>
      </div>

      {isOcrReviewModalOpen && ocrResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review AI Scan Results</h3>
            <div className="space-y-2 text-left max-h-96 overflow-y-auto">
              {Object.entries(ocrResult).map(([key, value]) => value ? (<div key={key} className="grid grid-cols-2 gap-4 items-start"><strong className="capitalize text-gray-600">{key.replace(/([A-Z])/g, ' $1')}:</strong><span className="text-gray-800 break-words">{value?.toString()}</span></div>) : null)}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsOcrReviewModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
              <button onClick={handleConfirmOcr} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Confirm & Use Data</button>
            </div>
          </div>
        </div>
      )}

       {isMapModalOpen && (
          <GoogleMapSearchModal 
              onClose={() => setIsMapModalOpen(false)}
              onLocationSelect={handleLocationSelect}
          />
      )}
    </>
  );
};

export default EditExpenseModal;