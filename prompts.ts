// This file centralizes all prompts and schemas for the Gemini API,
// making the AI's behavior easy to view, manage, and update from a single location.

import { Type } from '@google/genai';

// The prompt and schema for extracting structured data from a receipt image or PDF.
export const RECEIPT_EXTRACTION_PROMPT = {
  // The text instruction given to the AI model.
  promptText: `Analyze this receipt or invoice and extract as much detailed information as possible.
- Identify the vendor, total amount, currency, the main transaction date, and the invoice number.
- Suggest a category from: Air/Bus/Train, Local Commute, Food, Hotel, Gifts, Software, Other.
- Provide a brief summary or main line item as remarks.
- If it is a TRAVEL receipt (Flight, Train, Bus, Cab): extract traveler name, PNR/ticket number, departure and arrival stations/airports, departure and arrival date/time, and class of travel.
- If it is a LOCAL COMMUTE receipt (Cab, Auto etc.): extract the from and to locations, mode of commute, distance in KMs, purpose of travel, and the vendor name (e.g., Uber, Ola).
- If it is a HOTEL receipt: extract the hotel name, full hotel address, check-in date and time, and check-out date and time.
Respond only with the JSON object.`,

  // The JSON schema that forces the AI to return a structured, predictable response.
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      vendor: { type: Type.STRING },
      date: { type: Type.STRING, description: 'The main date of the transaction in YYYY-MM-DD format.' },
      amount: { type: Type.NUMBER },
      currency: { type: Type.STRING, description: '3-letter currency code (e.g., INR, USD).'},
      invoiceNumber: { type: Type.STRING, description: 'The invoice or bill number from the receipt.' },
      category: { type: Type.STRING, description: "Suggest a category: Air/Bus/Train, Local Commute, Food, Hotel, Gifts, Software, Other." },
      remarks: { type: Type.STRING, description: 'A brief description or summary of the expense.'},
      
      // Travel specific
      travelMode: { 
        type: Type.STRING, 
        description: "If category is Air/Bus/Train, specify the mode: 'Flight', 'Train', 'Bus', or 'Cab'."
      },
      travelerName: { type: Type.STRING },
      pnrNumber: { type: Type.STRING, description: 'Ticket or PNR number.'},
      travelFrom: { type: Type.STRING, description: 'Departure station or airport.'},
      travelTo: { type: Type.STRING, description: 'Arrival station or airport.'},
      departureDateTime: { type: Type.STRING, description: 'Departure date and time in YYYY-MM-DDTHH:mm format.' },
      arrivalDateTime: { type: Type.STRING, description: 'Arrival date and time in YYYY-MM-DDTHH:mm format.' },
      travelClass: { type: Type.STRING, description: 'e.g., Economy, Business, 1st AC'},

      // Local Commute specific
      commuteFrom: { type: Type.STRING, description: 'Starting location for a local commute.'},
      commuteTo: { type: Type.STRING, description: 'Destination for a local commute.'},
      commuteMode: { type: Type.STRING, description: "Mode of transport: 'Cab', 'Auto', 'Metro', 'Bus', 'Personal Vehicle'."},
      commuteKms: { type: Type.NUMBER, description: 'Distance in kilometers.'},
      commutePurpose: { type: Type.STRING, description: 'Purpose of the local travel.'},
      // vendorName for local commute is now extracted
      vendorName: { type: Type.STRING, description: "Vendor for local commute (e.g., Uber, Ola)." },


      // Hotel specific
      hotelName: { type: Type.STRING },
      hotelAddress: { type: Type.STRING }, // NEW
      checkInDate: { type: Type.STRING, description: 'Check-in date in YYYY-MM-DD format.' },
      checkOutDate: { type: Type.STRING, description: 'Check-out date in YYYY-MM-DD format.' },
      checkInTime: { type: Type.STRING, description: 'Check-in time in HH:mm format.' }, // NEW
      checkOutTime: { type: Type.STRING, description: 'Check-out time in HH:mm format.' }, // NEW
    }
  }
};


// NEW: The prompt and schema for parsing natural language expense entries.
export const CONVERSATIONAL_EXPENSE_PROMPT = {
  // Base prompt text. A dynamic date will be added to this in the component.
  promptText: `Parse the following user query to extract expense details.
- Identify the total amount and its currency (if not specified, assume INR).
- Suggest a relevant expense category from this list: Air/Bus/Train, Local Commute, Food, Hotel, Gifts, Software, Other.
- Extract any mentioned vendor name.
- Use the rest of the context to form a brief remark.
- If a date is mentioned (e.g., 'yesterday', 'last Tuesday', 'Jan 5th'), convert it to YYYY-MM-DD format. If no date is mentioned, use today's date.
Respond only with the JSON object.`,

  // The JSON schema that forces the AI to return a structured, predictable response.
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER },
      currency: { type: Type.STRING, description: '3-letter currency code (e.g., INR, USD).' },
      category: { type: Type.STRING, description: "Suggest a category from the provided list." },
      remarks: { type: Type.STRING, description: 'A brief description or summary of the expense.' },
      vendorName: { type: Type.STRING, description: 'The name of the vendor, shop, or service provider.' },
      date: { type: Type.STRING, description: 'The transaction date in YYYY-MM-DD format.' },
    },
    required: ['amount', 'currency', 'category', 'date']
  }
};