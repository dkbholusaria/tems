import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { db, storage } from '../services/firebase';
import { Project, UserMaster, ExpenseStatus, Expense, Client } from '../types';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { RECEIPT_EXTRACTION_PROMPT, CONVERSATIONAL_EXPENSE_PROMPT } from '../prompts';
import GoogleMapSearchModal from './GoogleMapSearchModal';

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
    travelMode?: 'Flight' | 'Train' | 'Bus' | 'Cab'; travelerName?: string; pnrNumber?: string; travelFrom?: string; travelTo?: string; departureDateTime?: string; arrivalDateTime?: string; travelClass?: string;
    commuteFrom?: string; commuteTo?: string; commuteMode?: 'Cab' | 'Auto' | 'Metro' | 'Bus' | 'Personal Vehicle'; commuteKms?: number; commutePurpose?: string; vendorName?: string;
    hotelName?: string; hotelAddress?: string; checkInDate?: string; checkOutDate?: string; checkInTime?: string; checkOutTime?: string;
}

interface ConversationalResult {
  amount?: number; currency?: string; category?: string; remarks?: string; vendorName?: string; date?: string;
}

interface AddExpenseModalProps {
  user: UserMaster;
  onClose: () => void;
  onExpenseAdded: () => void;
}

// Category Icons Component
// FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const categoryIcons: { [key: string]: React.ReactElement } = {
    'Air/Bus/Train': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    'Local Commute': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m-6 3l6-3" /></svg>,
    'Food': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c1.354 0 2.62-1.233 2.62-2.625M12 18.375c-1.353 0-2.62-1.233-2.62-2.625M12 15.75c1.354 0 2.62-1.233 2.62-2.625M12 13.125c-1.353 0-2.62-1.233-2.62-2.625M3.284 8.747A9.004 9.004 0 0112 3c1.354 0 2.62 1.233 2.62 2.625m-5.24 0c-1.353 0-2.62 1.233-2.62 2.625m5.24 0c1.354 0 2.62 1.233 2.62 2.625M18.1 8.747A9.004 9.004 0 0012 3" /></svg>,
    'Hotel': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    'Gifts': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>,
    'Software': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    'Other': <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};


const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ user, onExpenseAdded, onClose }) => {
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [remarks, setRemarks] = useState('');
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  
  // AI State
  const [conversationalQuery, setConversationalQuery] = useState('');
  const [isParsingQuery, setIsParsingQuery] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isOcrReviewModalOpen, setIsOcrReviewModalOpen] = useState(false);

  // Dynamic fields State
  const [vendorName, setVendorName] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [googleMapLocation, setGoogleMapLocation] = useState<any>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [travelerName, setTravelerName] = useState(user.name);
  const [travelMode, setTravelMode] = useState<'Flight' | 'Train' | 'Bus' | 'Cab'>('Flight');
  const [travelFrom, setTravelFrom] = useState('');
  const [travelTo, setTravelTo] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [travelClass, setTravelClass] = useState('');
  const [pnrNumber, setPnrNumber] = useState('');
  const [commuteFrom, setCommuteFrom] = useState('');
  const [commuteTo, setCommuteTo] = useState('');
  const [commuteMode, setCommuteMode] = useState<'Cab' | 'Auto' | 'Metro' | 'Bus' | 'Personal Vehicle'>('Cab');
  const [commuteKms, setCommuteKms] = useState('');
  const [commutePurpose, setCommutePurpose] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    exchangeRate, setExchangeRate, conversionResult, conversionData,
  } = useCurrencyConverter({ date, currency, amount });

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
        if (fetchedProjects.length > 0) setSelectedProjectId(fetchedProjects[0].projectId);
      } catch (err) { console.error("Error fetching projects and clients:", err); setError("Could not load projects. Please try again."); }
    };
    fetchProjectsAndClients();
    
    // Cleanup object URL
    return () => {
        if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, []);

  const handleLocationSelect = (location: any) => {
    if (location) { setHotelName(location.name); setHotelAddress(location.address); setGoogleMapLocation(location); }
    setIsMapModalOpen(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceipt(file);
      setOcrError(null);
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleParseConversationalQuery = async () => {
    if (!conversationalQuery.trim()) return;
    setIsParsingQuery(true);
    setError(null);
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
        if (!apiKey) throw new Error("Gemini API Key is not available.");

        const ai = new GoogleGenAI({ apiKey });
        const fullPrompt = `${CONVERSATIONAL_EXPENSE_PROMPT.promptText}\nThe current date is ${new Date().toISOString().split('T')[0]}.\n\nUser query: "${conversationalQuery}"`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: fullPrompt }] },
            config: { responseMimeType: 'application/json', responseSchema: CONVERSATIONAL_EXPENSE_PROMPT.responseSchema }
        });

        const result: ConversationalResult = JSON.parse(response.text);
        if (result.category && Object.keys(categoryIcons).includes(result.category)) setCategory(result.category);
        if (result.amount) setAmount(result.amount.toString());
        if (result.currency) setCurrency(result.currency.toUpperCase());
        if (result.date) setDate(result.date);
        if (result.remarks) setRemarks(result.remarks);
        if (result.vendorName) setVendorName(result.vendorName);
        
        setCurrentStep(2); // Move to the details form
        
    } catch (err: any) {
        console.error("Conversational AI Error:", err);
        setError("AI could not understand the request. Please try again or fill the form manually.");
    } finally {
        setIsParsingQuery(false);
    }
  };

  const handleScanReceipt = async () => {
    if (!receipt) return;
    setIsScanning(true); setOcrError(null);
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
        if (!apiKey) throw new Error("Gemini API Key is not available.");
        const base64Data = await fileToBase64(receipt);
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [ { inlineData: { mimeType: receipt.type, data: base64Data } }, { text: RECEIPT_EXTRACTION_PROMPT.promptText } ] }, config: { responseMimeType: 'application/json', responseSchema: RECEIPT_EXTRACTION_PROMPT.responseSchema } });
        const result = JSON.parse(response.text);
        setOcrResult(result);
        setIsOcrReviewModalOpen(true);
    } catch (err: any) { console.error("Gemini OCR Error:", err); setOcrError(err.message || "AI scan failed. Please enter details manually."); } finally { setIsScanning(false); }
  };
  
  const handleConfirmOcr = () => {
    if (!ocrResult) return;
    if (ocrResult.date) setDate(ocrResult.date);
    if (ocrResult.amount) setAmount(ocrResult.amount.toString());
    if (ocrResult.currency) setCurrency(ocrResult.currency.toUpperCase());
    if (ocrResult.invoiceNumber) setInvoiceNumber(ocrResult.invoiceNumber);
    if (ocrResult.remarks) setRemarks(ocrResult.remarks);
    if (ocrResult.category && Object.keys(categoryIcons).includes(ocrResult.category)) setCategory(ocrResult.category);
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
        if (ocrResult.vendorName) setVendorName(ocrResult.vendorName);
    } else { if (ocrResult.vendor) setVendorName(ocrResult.vendor); }
    setIsOcrReviewModalOpen(false); setOcrResult(null);
  };
  
  const handleDirectUploadAndScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceipt(file);
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setReceiptPreviewUrl(URL.createObjectURL(file));
    setIsScanning(true);
    setError(null);
    setOcrError(null);

    try {
        const { GoogleGenAI } = await import('@google/genai');
        const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
        if (!apiKey) throw new Error("Gemini API Key is not available.");
        const base64Data = await fileToBase64(file);
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [ { inlineData: { mimeType: file.type, data: base64Data } }, { text: RECEIPT_EXTRACTION_PROMPT.promptText } ] }, config: { responseMimeType: 'application/json', responseSchema: RECEIPT_EXTRACTION_PROMPT.responseSchema } });
        
        const result: OcrResult = JSON.parse(response.text);

        if (result.category && Object.keys(categoryIcons).includes(result.category)) {
            setCategory(result.category);
        } else {
            setCategory('Other'); 
        }
        if (result.date) setDate(result.date);
        if (result.amount) setAmount(result.amount.toString());
        if (result.currency) setCurrency(result.currency.toUpperCase());
        if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
        if (result.remarks) setRemarks(result.remarks);
        if (result.category === 'Hotel') {
            if (result.hotelName) setHotelName(result.hotelName);
            if (result.vendor && !result.hotelName) setHotelName(result.vendor);
            if (result.checkInDate) setCheckInDate(result.checkInDate);
            if (result.checkOutDate) setCheckOutDate(result.checkOutDate);
            if (result.checkInTime) setCheckInTime(result.checkInTime);
            if (result.checkOutTime) setCheckOutTime(result.checkOutTime);
            if (result.hotelAddress) setHotelAddress(result.hotelAddress);
        } else if (result.category === 'Air/Bus/Train') {
            if (result.travelMode) setTravelMode(result.travelMode);
            if (result.travelerName) setTravelerName(result.travelerName);
            if (result.pnrNumber) setPnrNumber(result.pnrNumber);
            if (result.travelFrom) setTravelFrom(result.travelFrom);
            if (result.travelTo) setTravelTo(result.travelTo);
            if (result.travelClass) setTravelClass(result.travelClass);
            if (result.departureDateTime) { const [d, t] = result.departureDateTime.split('T'); setDepartureDate(d); setDepartureTime(t || ''); }
            if (result.arrivalDateTime) { const [d, t] = result.arrivalDateTime.split('T'); setArrivalDate(d); setArrivalTime(t || ''); }
        } else if (result.category === 'Local Commute') {
            if (result.commuteFrom) setCommuteFrom(result.commuteFrom);
            if (result.commuteTo) setCommuteTo(result.commuteTo);
            if (result.commuteMode) setCommuteMode(result.commuteMode);
            if (result.commuteKms) setCommuteKms(result.commuteKms.toString());
            if (result.commutePurpose) setCommutePurpose(result.commutePurpose);
            if (result.vendorName) setVendorName(result.vendorName);
            else if (result.vendor) setVendorName(result.vendor);
        } else { if (result.vendor) setVendorName(result.vendor); }
        setCurrentStep(2);
    } catch (err: any) {
        console.error("Direct Upload AI Scan Error:", err);
        setError("AI could not read the receipt. Please try another file or enter details manually.");
    } finally {
        setIsScanning(false);
    }
  };


  const handleSave = async (status: ExpenseStatus) => {
    if (!selectedProjectId || !category || !date || !amount) { setError("Please fill in all required fields."); return; }
    setIsLoading(true); setError(null);
    try {
      let receiptUrl: string | undefined = undefined;
      if (receipt) {
        const storageRef = storage.ref(`receipts/${user.uid}/${Date.now()}_${receipt.name}`);
        const uploadResult = await storageRef.put(receipt);
        receiptUrl = await uploadResult.ref.getDownloadURL();
      }
      const details: any = {};
      if (category === 'Hotel') {
        details.hotelName = hotelName;
        if (checkInDate) { const d = new Date(checkInDate); if (!isNaN(d.getTime())) details.checkInDate = firebase.firestore.Timestamp.fromDate(d); }
        if (checkOutDate) { const d = new Date(checkOutDate); if (!isNaN(d.getTime())) details.checkOutDate = firebase.firestore.Timestamp.fromDate(d); }
        details.checkInTime = checkInTime; details.checkOutTime = checkOutTime; details.hotelAddress = hotelAddress;
        if (googleMapLocation) details.googleMapLocation = googleMapLocation;
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
      } else { details.vendorName = vendorName; }
      const newExpenseData: Omit<Expense, 'expenseId'> = {
        employeeId: user.uid, projectId: selectedProjectId, category, date: firebase.firestore.Timestamp.fromDate(new Date(date)),
        amount: parseFloat(amount), currency, ...(invoiceNumber && { invoiceNumber }), status, createdAt: firebase.firestore.Timestamp.now(),
        ...(remarks && { remarks }), ...(receiptUrl && { receiptUrl }), ...(Object.keys(details).length > 0 && { details }),
        ...(conversionData && { conversionDetails: conversionData }),
      };
      await db.collection('Expenses').add(newExpenseData);
      onExpenseAdded();
    } catch (err) { console.error("Error adding expense:", err); setError("Failed to add expense. Please try again."); } finally { setIsLoading(false); }
  };
  
  // FIX: Implemented renderDynamicFields to return JSX based on category, fixing the "void is not assignable to ReactNode" error.
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
        case '':
            return null;
        default: 
            return (<div><label className="block text-sm font-medium text-gray-700">Vendor Name</label><input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"/></div>);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
        return (
          <div className="animate-fade-in space-y-6">
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Option 1: Quick Add with AI</label>
                <div className="flex gap-2">
                    <input type="text" value={conversationalQuery} onChange={e => setConversationalQuery(e.target.value)} placeholder="e.g., Lunch with client for 500 rupees yesterday" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                    <button type="button" onClick={handleParseConversationalQuery} disabled={isParsingQuery} className="px-4 py-2 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-900 disabled:bg-gray-400">
                        {isParsingQuery ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : 'Parse'}
                    </button>
                </div>
            </div>
            <div className="flex items-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span><div className="flex-grow border-t border-gray-300"></div></div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Option 2: Upload receipt to auto-fill</label>
                {isScanning ? (
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm text-gray-600">Analyzing your receipt...</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="direct-receipt-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500">PDF, PNG, JPG</p>
                            </div>
                            <input id="direct-receipt-upload" type="file" className="hidden" onChange={handleDirectUploadAndScan} accept="image/*,application/pdf" />
                        </label>
                    </div> 
                )}
            </div>

            <div className="flex items-center"><div className="flex-grow border-t border-gray-300"></div><span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span><div className="flex-grow border-t border-gray-300"></div></div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Option 3: Enter manually</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {Object.entries(categoryIcons).map(([cat, icon]) => (
                        <button key={cat} onClick={() => { setCategory(cat); setCurrentStep(2); }} className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-indigo-50 hover:shadow-md hover:border-indigo-300 transition-all duration-200 aspect-square">
                            <div className="text-indigo-600">{icon}</div>
                            <span className="mt-2 text-sm font-semibold text-gray-700">{cat}</span>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        );
    }
    if (currentStep === 2) {
        return (
            <div className="animate-fade-in text-left space-y-4">
                <h4 className="text-md font-medium text-gray-800 text-center mb-4">Step 2: Enter Expense Details for <span className="text-indigo-600 font-bold">{category}</span></h4>
                <div><label className="block text-sm font-medium text-gray-700">Project <span className="text-red-500">*</span></label><select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">{projects.map(p => <option key={p.projectId} value={p.projectId}>{p.display_name}</option>)}</select></div>
                {renderDynamicFields()}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Invoice # (Optional)</label><input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/></div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Amount <span className="text-red-500">*</span></label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.00"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Currency <span className="text-red-500">*</span></label><select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
                </div>
                {currency !== 'INR' && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end"><div><label className="block text-sm font-medium text-gray-700">Exchange Rate (1 {currency} to INR)</label><input type="number" step="any" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="API suggested rate"/></div><div className="text-sm font-semibold text-gray-600 pb-2">{conversionResult}</div></div>)}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center"><div><label className="block text-sm font-medium text-gray-700">Receipt (Optional)</label><input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/></div><div className="self-end"><button type="button" onClick={handleScanReceipt} disabled={!receipt || isScanning} className={`w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed ${isScanning ? 'scanning-btn' : ''}`}>{isScanning ? 'Scanning...' : 'Scan Receipt with AI'}</button></div></div>
                {ocrError && <p className="text-sm text-red-600 mt-1">{ocrError}</p>}
                <div><label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label><textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea></div>
            </div>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
          <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
            <h3 className="text-xl font-semibold text-slate-800">Add New Expense</h3>
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
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {renderStepContent()}
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <div className="items-center px-4 py-3 flex flex-col sm:flex-row gap-2">
                  {currentStep > 1 && (<button type="button" onClick={() => setCurrentStep(1)} disabled={isLoading || isScanning} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md w-full shadow-sm hover:bg-gray-300">Back</button>)}
                  {currentStep === 2 && (<>
                      <button type="button" onClick={() => handleSave(ExpenseStatus.DRAFT)} disabled={isLoading || isScanning} className="px-4 py-2 bg-gray-600 text-white rounded-md w-full shadow-sm hover:bg-gray-700 disabled:bg-gray-400">Save as Draft</button>
                      <button type="button" onClick={() => handleSave(ExpenseStatus.PENDING)} disabled={isLoading || isScanning} className="px-4 py-2 bg-indigo-600 text-white rounded-md w-full shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400">Submit for Approval</button>
                  </>)}
                  <button type="button" onClick={onClose} disabled={isLoading || isScanning} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md w-full shadow-sm hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {isOcrReviewModalOpen && ocrResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-5 border w-full max-w-4xl h-[90vh] shadow-lg rounded-md bg-white flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex-shrink-0">Review AI Scan Results</h3>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                <div className="h-full bg-gray-100 rounded-md overflow-auto p-2 border">
                    {receipt && receiptPreviewUrl && (<embed src={receiptPreviewUrl} type={receipt.type} className="w-full h-full" />)}
                </div>
                <div className="space-y-2 text-left overflow-y-auto pr-2">
                  {Object.entries(ocrResult).map(([key, value]) => value ? (<div key={key} className="grid grid-cols-2 gap-2 items-start py-1 border-b"><strong className="capitalize text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1')}:</strong><span className="text-sm text-gray-800 break-words">{value?.toString()}</span></div>) : null)}
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2 flex-shrink-0">
              <button onClick={() => setIsOcrReviewModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
              <button onClick={handleConfirmOcr} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Confirm & Use Data</button>
            </div>
          </div>
        </div>
      )}

      {isMapModalOpen && (<GoogleMapSearchModal onClose={() => setIsMapModalOpen(false)} onLocationSelect={handleLocationSelect} />)}
    </>
  );
};

export default AddExpenseModal;