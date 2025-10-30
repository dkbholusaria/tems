# Comprehensive Project Documentation
## Travel & Expense Management System (TEMS) v1.2
## Copyright (c) 2025, Deepak Bhholusaria. All rights reserved.

<br/>

## 1. Project Overview & Purpose

### 1.1. Introduction
The Travel & Expense Management System (TEMS) is a sophisticated, AI-enhanced web application designed to modernize and streamline the entire expense reporting and approval process for businesses, with a specific focus on the needs of Chartered Accountancy firms and Small to Medium-sized Enterprises (SMEs).

Built with a modern technology stack including React, Firebase, and the Google Gemini API, TEMS transforms a traditionally manual, time-consuming, and error-prone task into an intelligent, efficient, and user-friendly experience.

### 1.2. Problem Statement
Traditional expense management relies on manual data entry, physical receipt collection, and spreadsheet tracking. This process is fraught with inefficiencies:
- **Time-Consuming:** Employees spend significant time manually keying in expense data. Approvers spend hours verifying and consolidating reports.
- **Error-Prone:** Manual entry leads to typos, incorrect calculations, and policy violations.
- **Lack of Visibility:** Real-time insight into company spending is nearly impossible, making budgeting and financial planning difficult.
- **Delayed Reimbursements:** Cumbersome approval cycles lead to delays, causing employee dissatisfaction.
- **Data Fragmentation:** Information is scattered across emails, spreadsheets, and physical documents, making auditing a nightmare.

### 1.3. Core Objectives & Purpose
TEMS was built to solve these problems by serving as a single source of truth for all travel and expense-related activities. Its primary purpose is to automate, centralize, and intelligently manage the expense lifecycle.
- **Automate Data Capture:** Leverage AI to eliminate over 90% of manual data entry from receipts and conversational text.
- **Improve Accuracy & Compliance:** Minimize human error through automated calculations, real-time currency conversions, and structured data entry.
- **Accelerate Approval Cycles:** Provide a centralized platform for employers to review, comment on, and act on submissions instantly, reducing turnaround time from weeks to days.
- **Enhance Financial Visibility:** Offer robust filtering, search, and reporting capabilities to give both employees and employers clear, real-time insights into spending patterns.
- **Ensure Data Integrity & Security:** Utilize a secure, cloud-based backend for reliable data storage, role-based access control, and a clear audit trail.

---

## 2. System Architecture & Technology Stack

### 2.1. High-Level Architecture
TEMS follows a modern, serverless architecture. The frontend is a single-page application (SPA) built with React that communicates directly with Google's Firebase platform for backend services and other specialized third-party APIs for specific functionalities.

```
+------------------+      +-------------------------+      +----------------------+
|   User Browser   |      |   Firebase Services     |      |   Third-Party APIs   |
| (React SPA)      |<---->| (Backend-as-a-Service)  |<---->| (Specialized Tasks)  |
+------------------+      +-------------------------+      +----------------------+
       |                         |        |        |               |        |        |
       |                         |        |        |               |        |        |
       |--- Auth Requests ----> Auth      |        |               |        |        |
       |--- DB Operations ----> Firestore |        |               |        |        |
       |--- File Uploads -----> Storage   |        |               |        |        |
       |                                  |        |               |        |        |
       |<---- AI Prompts ---------------------------------------> Gemini API |        |
       |<---- Forex Rates ------------------------------------------------> CurrencyAPI |
       |<---- Map/Place Data --------------------------------------------------------> Google Maps
```

### 2.2. Technology Stack

- **Frontend:**
    - **React 19:** A declarative JavaScript library for building the user interface. The entire application is structured as a hierarchy of reusable components.
    - **TypeScript:** Adds static typing to JavaScript, significantly improving code quality, maintainability, and developer experience by catching errors during development.
    - **Tailwind CSS:** A utility-first CSS framework used for rapidly building a custom, responsive, and consistent user interface without writing custom CSS.

- **Backend-as-a-Service (BaaS):**
    - **Firebase Authentication:** Manages user identity, including email/password sign-up, login, password resets, and secure session management (both session-based and persistent "remember me" functionality).
    - **Cloud Firestore:** A flexible, scalable NoSQL document database used as the primary data store for all application entities.
    - **Cloud Storage for Firebase:** Provides secure, scalable object storage for all user-uploaded files, primarily receipts in image (JPG, PNG) and PDF formats.

- **Artificial Intelligence & APIs:**
    - **Google Gemini API (`@google/genai`):** The core AI engine.
        - **`gemini-2.5-flash` model:** Used for its speed and accuracy in multimodal (text + image) and JSON-controlled outputs. It powers both the OCR receipt scanning and the NLP conversational entry features.
    - **CurrencyAPI.com:** Provides a REST API for fetching real-time and historical foreign exchange rates, crucial for accurate multi-currency expense reporting.
    - **Google Maps Platform APIs:**
        - **Places API:** Enables the hotel search autocomplete feature, providing place predictions as the user types.
        - **Maps JavaScript API:** Renders the interactive map interface in the location selection modal.
        - **Geocoding API:** Used for reverse geocoding to convert map coordinates (from a dropped pin) into a structured, human-readable address.

- **Reporting & Utilities:**
    - **`xlsx`:** A powerful library for creating and styling Microsoft Excel (`.xlsx`) files directly in the browser.
    - **`jspdf` & `jspdf-autotable`:** Libraries used to generate professional, multi-page PDF documents from JSON data.
    - **`file-saver`:** A client-side utility to save generated files (Excel, PDF) to the user's local machine.

---

## 3. Database Schema (Cloud Firestore)

The entire application state is stored in Cloud Firestore. The schema is designed to be scalable and efficient, with clear relationships between collections.

### 3.1. `UserMaster` Collection
- **Purpose:** Stores profile information for every user (both employees and employers). The document ID for each user is their Firebase Authentication UID.
- **Fields:**
    - `uid` (string): The unique user ID from Firebase Auth. This is the primary key.
    - `name` (string): The user's full name.
    - `email` (string): The user's login email address. This field is indexed for querying.
    - `role` (enum: `employee` | `employer`): Defines the user's access level and dashboard view.
    - `mobile` (string, optional): The user's contact mobile number.
- **Indexes:** A composite index on `(email, ==)` is automatically created by Firebase. No other custom indexes are required for current queries.

### 3.2. `Clients` Collection
- **Purpose:** Stores a list of the company's clients. This data is used to associate projects with specific clients.
- **Fields:**
    - `docId` (string, client-side): The auto-generated Firestore document ID.
    - `clientId` (string): A unique, user-defined identifier for the client (e.g., "ACME01"). Indexed for sorting.
    - `clientName` (string): The full legal name of the client (e.g., "Acme Corporation").
- **Indexes:** A single-field index on `(clientId, asc)` is required for the `orderBy` clause in the management modal.

### 3.3. `Projects` Collection
- **Purpose:** Stores details about each project the company undertakes. Expenses are logged against these projects.
- **Fields:**
    - `docId` (string, client-side): The auto-generated Firestore document ID.
    - `projectId` (string): A unique, user-defined identifier for the project (e.g., "PROJ2024-01"). Indexed for sorting.
    - `clientCode` (string): A foreign key that maps to `clientId` in the `Clients` collection.
    - `projectCode` (string): A secondary code or identifier for the project.
    - `travelCode` (string): A specific code used for travel billing or reference.
    - `description` (string): A brief description of the project's scope or name.
- **Indexes:** A single-field index on `(projectId, asc)` is required for sorting.

### 3.4. `Expenses` Collection
- **Purpose:** This is the core collection, storing every single expense record logged in the system.
- **Fields:**
    - `expenseId` (string, client-side): The auto-generated Firestore document ID.
    - `employeeId` (string): Foreign key mapping to `UserMaster.uid`.
    - `projectId` (string): Foreign key mapping to `Projects.projectId`.
    - `category` (string): The expense category (e.g., "Hotel", "Food").
    - `date` (Timestamp): The date of the expense transaction.
    - `amount` (number): The expense amount in its original currency.
    - `currency` (string): The 3-letter ISO code of the original currency (e.g., "INR", "USD").
    - `invoiceNumber` (string, optional): The invoice or bill number.
    - `status` (enum: `draft` | `pending` | `approved` | `rejected` | `returned`): The current state of the expense in the workflow.
    - `receiptUrl` (string, optional): A publicly accessible URL to the receipt file stored in Firebase Storage.
    - `createdAt` (Timestamp): Server timestamp of when the expense was first created. Used for sorting.
    - `remarks` (string, optional): General notes or comments from the employee.
    - `approverComment` (string, optional): Feedback from the employer, especially for returned or rejected items.
    - `details` (object, optional): A map containing category-specific fields.
        - **Hotel:** `hotelName`, `hotelAddress`, `checkInDate` (Timestamp), `checkOutDate` (Timestamp), `checkInTime` (string), `checkOutTime` (string), `googleMapLocation` (object: {name, address, placeId}).
        - **Travel:** `travelerName`, `travelMode`, `travelFrom`, `travelTo`, `departureDateTime` (Timestamp), `arrivalDateTime` (Timestamp), `kilometers`, `travelClass`, `pnrNumber`.
        - **Local Commute:** `commuteFrom`, `commuteTo`, `commuteMode`, `commuteKms`, `commutePurpose`, `vendorName`.
        - **Other:** `vendorName`.
    - `conversionDetails` (object, optional): Stores currency conversion data if the original currency was not INR.
        - `baseCurrency` (string): Always "INR".
        - `exchangeRate` (number): The rate used for conversion.
        - `convertedAmount` (number): The final amount in INR.
- **Indexes:**
    - `(employeeId, ==), (createdAt, desc)`: Composite index required for fetching an employee's expenses, sorted by date.
    - `(status, in)`: Single-field index required for the employer's console query to fetch all actionable expenses.

### 3.5. `Approvals` Collection
- **Purpose:** Stores a historical log of every approval action, creating an immutable audit trail.
- **Fields:**
    - `approvalId` (string, client-side): The auto-generated Firestore document ID.
    - `expenseId` (string): Foreign key mapping to `Expenses.expenseId`.
    - `approverId` (string): Foreign key mapping to `UserMaster.uid` of the employer who took the action.
    - `status` (enum: `approved` | `rejected` | `returned`): The action taken.
    - `comment` (string, optional): The comment provided at the time of action.
    - `timestamp` (Timestamp): Server timestamp of when the action was taken.
- **Indexes:** No custom indexes are currently required as this collection is not directly queried in the UI, but it's designed for future auditing features.

---

## 4. Core Functionalities (In-Depth)

This section details every feature available in the application, broken down by module.

### 4.1. Authentication & Routing
- **Login:** Users authenticate with email and password. Input validation is present. Firebase Auth handles security.
- **Session Persistence:** A "Remember me" checkbox sets Firebase persistence to `LOCAL` (persists across browser sessions) instead of `SESSION` (clears when the browser is closed). The user's email is stored in `localStorage` to pre-fill the login form.
- **Forgot Password:** Users can request a password reset link via email. This is handled securely by Firebase Authentication.
- **Role-Based Routing:** The main `App.tsx` component acts as a router. After a successful login, it fetches the user's profile from the `UserMaster` collection to determine their `role`. Based on the role, it renders either the `EmployeeDashboard` or the `EmployerDashboard`.
- **Legal Page Routing:** The application uses URL hash fragments (`#privacy`, `#terms`) to display the Privacy Policy and Terms of Use pages for unauthenticated users, without interfering with the main application logic.

### 4.2. Employee-Facing Features

#### 4.2.1. Add Expense Modal & AI Integration
- **Multi-Path Entry:** The user is presented with a "wizard-style" modal offering three ways to start:
    1.  **Conversational Entry:** An input field where the user can type a natural language query. On submission, the `CONVERSATIONAL_EXPENSE_PROMPT` is sent to the Gemini API. The returned JSON is used to pre-fill the main expense form, and the user is advanced to the detail-filling step.
    2.  **AI Receipt Scan:** An upload area allows the user to select a receipt (image or PDF). The file is converted to a Base64 string and sent to the Gemini API along with the `RECEIPT_EXTRACTION_PROMPT`. The API's JSON response is used to pre-fill the entire form, including category-specific details, and the user is immediately taken to the detail form.
    3.  **Manual Category Selection:** The user can click on an icon representing a category (e.g., "Hotel", "Food"). This sets the category and advances them to the detail form.

- **Dynamic Form Fields:** The detail form (`renderDynamicFields`) conditionally renders different sets of input fields based on the selected `category`, ensuring only relevant information is requested.
- **Currency Conversion:** The `useCurrencyConverter` hook is active on this form. If the user selects a currency other than INR, the hook automatically triggers an API call to CurrencyAPI.com to fetch the historical exchange rate for the selected expense `date`. It displays the approximate converted amount in real-time. The final rate and converted amount are stored in the `conversionDetails` object on save.
- **Google Maps Integration:** For the "Hotel" category, a "Search on Map" button opens the `GoogleMapSearchModal`.
    - The modal loads the Google Maps JavaScript API.
    - It features an autocomplete search bar (powered by the Places API) and an interactive map with a draggable pin.
    - The user can either search for a hotel or drop a pin. The modal returns the selected location's name, formatted address, and Google Place ID, which are then populated into the hotel details fields.
- **Save & Submit Options:** The user has two final actions:
    - **Save as Draft:** Saves the expense with `status: 'draft'`.
    - **Submit for Approval:** Saves the expense with `status: 'pending'`, making it visible to the employer.

#### 4.2.2. Employee Dashboard
- **UI:** A two-part layout with a branded header and a main content area.
    - **Header:** Displays a welcome message, a logout button, and primary action buttons (+ Add New Expense, Export Report, etc.).
    - **Summary Cards:** Six visually distinct cards show the total INR amount and count of expenses for each status. The amounts are formatted into Lakhs/Crores for better readability using a custom helper function.
    - **Filter Bar:** A dedicated section that displays active filters as dismissible "pills". A "Filters" button opens the `FilterModal`.
    - **Expense List:** Expenses are grouped by project. Each project is a collapsible accordion panel, showing the project name and total expense amount for that project. Inside, a detailed table lists individual expenses.

- **Filtering:** The `FilterModal` is a powerful, multi-tabbed interface allowing users to filter their expenses by:
    - Status (multi-select checkboxes)
    - Category (multi-select checkboxes)
    - Project (multi-select checkboxes)
    - Client (multi-select checkboxes)
    - Date Range (start and end date pickers)
    - The number of active filters is shown in a badge on the "Filters" button.

- **Row Actions:** Each expense row in the table has context-aware action icons (with tooltips):
    - **View Receipt:** A link to the receipt in Firebase Storage (if available).
    - **Edit:** Opens the `EditExpenseModal`. Available for `draft`, `pending`, and `returned` items.
    - **Delete:** Permanently deletes the expense and its associated receipt from storage. Available for `draft`, `pending`, and `returned` items.
    - **Submit:** Changes the status from `draft` or `returned` to `pending`.

#### 4.2.3. Edit/View Modals
- **Edit Expense Modal:** Pre-populates all fields from an existing expense. The user can modify any detail, upload a new receipt (which replaces the old one), and re-save or re-submit. If the expense was returned, the approver's comment is displayed prominently at the top.
- **View Expense Modal:** A read-only modal that presents all expense details in a clean, formatted list.

### 4.3. Employer-Facing Features

#### 4.3.1. Employer Dashboard
- **UI:** Similar structure to the employee dashboard but with different actions and data.
    - **Header:** Contains "Manage Company" and "View Reports" buttons.
    - **Summary Cards:** Shows the aggregated financial status of all *non-draft* expenses across the entire company.
    - **Approval Console:** This is the main component, dedicated to the approval workflow.

#### 4.3.2. Approval Console
- **Grouping:** Expenses are grouped in a two-level accordion:
    1.  **Outer Group:** By Project.
    2.  **Inner Group:** By Employee within that project. This allows approvers to see all of a single employee's expenses for a project together.
- **Data Display:** For each expense, it shows the date, category, amount (original and INR), status, and a quick view of remarks/receipts.
- **Filtering:** Uses the same powerful `FilterModal` as the employee dashboard, but with an additional tab to filter by specific **Employees**.
- **Actions:**
    - **Quick Actions:** For pending items, `Approve`, `Return`, and `Reject` buttons are available directly in the list. Clicking these opens a small, focused `ActionModal`.
    - **Detailed View:** A "View Details" icon opens the `ExpenseDetailModal`, which shows all information about the expense and provides the same action buttons along with a comment box.
- **Action Logic:**
    - **Approve:** Changes status to `approved`.
    - **Return:** Changes status to `returned`. Requires a comment explaining what needs to be fixed.
    - **Reject:** Changes status to `rejected`. Requires a comment explaining the reason.
    - All actions create a corresponding record in the `Approvals` collection for audit purposes.

#### 4.3.3. Company Management Modal
- A tabbed modal for all administrative tasks:
    - **Clients Tab:** View a list of all clients. Add new clients by providing a unique ID and name. Edit existing client names.
    - **Projects Tab:** View a list of all projects. Add new projects by selecting a client and providing a project ID, travel code, and description.
    - **Employees Tab:** View a list of all users. Add new users with their name, email, mobile, role, and an initial password (for database entry only, actual auth creation is simulated). Edit a user's name, mobile, or role. Provides a "Reset Password" button which uses Firebase Auth to send a reset email.

---

## 5. Reporting Engine

### 5.1. PDF Generation
- **Technology:** `jspdf` for creating the document and `jspdf-autotable` for creating structured tables.
- **Employee Claim Form:**
    - **Triggered from:** Employee Dashboard -> Export Report Modal.
    - **Logic:** Requires a single project to be selected. It filters expenses for that project.
    - **Structure:**
        1.  **Header:** Title, Employee Name, Client/Project Info, Travel Period.
        2.  **Summary Table:** A table summarizing the total INR amount for each expense category, with a bolded Grand Total.
        3.  **Annexures:** For each category with expenses, a new table is created, titled "Annexure A - Hotel", "Annexure B - Food", etc.
        4.  **Annexure Content:** Each row in an annexure table represents one expense, detailing its date, all category-specific data, remarks, and amount.
        5.  **Footer:** Signature lines for the employee and approver.
        6.  **Pagination:** A "Page X of Y" counter is added to every page.

- **Summary Reports (Employer & Employee):**
    - **Employee Summary:** Aggregates expenses by employee and status, showing total INR amounts.
    - **Project Summary:** A detailed, itemized list of all expenses for a single selected project.
    - **Category Analysis:** Groups all expenses by category and calculates the total amount, number of transactions, and percentage of total company spending for each category.

### 5.2. Excel Generation (`.xlsx`)
- **Technology:** `xlsx` library.
- **Triggered from:** Employee Dashboard -> Export Report Modal.
- **Logic:** Works on the currently filtered list of expenses.
- **Structure:**
    - **Multi-Sheet:** The generated workbook contains multiple tabs.
    - **'Summary' Sheet:** The first sheet contains a row for every expense with all common fields (Date, Project, Category, Amount, Status, etc.).
    - **Category-Specific Sheets:** For each category present in the filtered data (e.g., "Hotel", "Air_Bus_Train"), a new sheet is created. This sheet includes all common fields *plus* all the detailed fields specific to that category (e.g., the "Hotel" sheet has columns for Hotel Name, Check-in Date, etc.).
- **Styling & Formatting:**
    - **Column Widths:** Automatically calculated to fit the content.
    - **Date Formatting:** Dates are formatted as `dd/mm/yyyy`.
    - **Row Coloring:** Rows are given a background fill color based on their `status` (e.g., green for approved, yellow for pending), making the report highly scannable.

---

## 6. User Interface (UI) & User Experience (UX)

### 6.1. Design Philosophy
- **Professional & Clean:** The UI uses a modern, corporate color palette (blues, grays, indigo) with clear typography to maintain a professional look suitable for a financial application.
- **Utility-First:** Tailwind CSS allows for rapid development and ensures consistency in spacing, sizing, and color across the entire application.
- **Data-Driven:** The design prioritizes clear presentation of data through well-structured tables, summary cards, and modals.
- **Action-Oriented:** Primary actions are always visible and clearly labeled (e.g., "+ Add New Expense", "Apply Filters").

### 6.2. Component Architecture
The application is broken down into logical, reusable React components, promoting separation of concerns.
- **Top-Level:** `App.tsx` (Routing), `LoginScreen.tsx`, `EmployeeDashboard.tsx`, `EmployerDashboard.tsx`.
- **Modals:** A consistent modal design is used for all pop-up interactions (`AddExpenseModal`, `EditExpenseModal`, `FilterModal`, `ReportsModal`, etc.). They all share a similar structure with an overlay, a container, a header with a close button, and a footer with action buttons.
- **Shared Components:** Common UI elements like `LoadingSpinner.tsx` and `HelpSupportButton.tsx` are reused across different parts of the application.

### 6.3. Key UX Patterns
- **Loading States:** All asynchronous actions (API calls, database writes) provide visual feedback. Buttons are disabled and show a spinner or "Loading..." text to prevent duplicate submissions and inform the user that an action is in progress.
- **Clear Feedback:** Error messages are displayed in a noticeable but non-intrusive way. Success messages (like for password resets) confirm that an action was completed.
- **Contextual Actions:** Action buttons and icons are only shown when they are relevant (e.g., the "Delete" button is not shown for an "Approved" expense), reducing clutter and preventing invalid user actions.
- **Tooltips:** Icons in tables are supplemented with on-hover tooltips to clarify their function.
- **Responsiveness:** The use of Tailwind CSS's responsive design prefixes ensures that the layout adapts gracefully to different screen sizes, from mobile phones to large desktop monitors. Flexbox and Grid are used extensively for fluid layouts.

---

## 7. API Integration & Implementation Guide

This section is designed for students and developers looking to understand how the core APIs are integrated and used within TEMS. It provides a practical guide on implementing similar features in your own projects.

### 7.1. Firebase: The Serverless Backend
Firebase acts as the complete Backend-as-a-Service (BaaS), handling data storage, user authentication, and file storage without the need for a manually managed server.

-   **Setup (`services/firebase.ts`):** The connection to Firebase is established here. The `firebase.initializeApp(firebaseConfig)` function uses credentials from `services/apiKeys.ts` to connect the frontend to your specific Firebase project.
-   **Authentication (`App.tsx`, `LoginScreen.tsx`):**
    -   User session management is handled by `auth.onAuthStateChanged`. This listener reports whether a user is logged in or out, allowing the `App.tsx` component to route them to the correct screen.
    -   Logging in is done via `auth.signInWithEmailAndPassword(email, password)`.
-   **Firestore (Database):**
    -   **CRUD Operations:** The project uses the Firebase v8 SDK syntax.
        -   **Create:** `db.collection('Expenses').add(newExpenseData)`
        -   **Read:** `db.collection('UserMaster').doc(uid).get()`
        -   **Update:** `db.collection('Expenses').doc(expenseId).update({ status: newStatus })`
        -   **Delete:** `db.collection('Expenses').doc(expenseId).delete()`
    -   **Real-time Listeners:** The dashboards use `onSnapshot` (e.g., `db.collection('Expenses').where(...).onSnapshot(...)`) to listen for real-time changes. Whenever data is added or modified in Firestore, the UI updates automatically without needing a page refresh.
-   **Storage (`AddExpenseModal.tsx`):**
    -   Receipt uploads are a three-step process:
        1.  Create a reference: `storage.ref('receipts/' + filePath)`.
        2.  Upload the file: `storageRef.put(file)`.
        3.  Get the public URL: `uploadResult.ref.getDownloadURL()`. This URL is then saved in the expense document in Firestore.

### 7.2. Google Gemini API: The AI Engine
The Gemini API provides the core intelligence for automated data entry. This project uses the `gemini-2.5-flash` model for its powerful multimodal (text and image) understanding and its ability to generate structured JSON output.

-   **Setup:** The API is initialized via `new GoogleGenAI({ apiKey: process.env.API_KEY })`. The key is passed securely from the build environment.
-   **Implementation 1: Receipt Scanning (OCR) in `AddExpenseModal.tsx`**
    1.  **File Conversion:** The uploaded receipt (image or PDF) is converted into a Base64 encoded string using the `fileToBase64` helper function.
    2.  **Multimodal Prompt:** The `generateContent` method is called with a `contents` object containing two parts:
        -   An `inlineData` part for the image (MIME type + Base64 data).
        -   A `text` part containing the instructions from `RECEIPT_EXTRACTION_PROMPT` in `prompts.ts`.
    3.  **Structured Output:** The most critical part is the `config` object passed in the request: `{ responseMimeType: 'application/json', responseSchema: RECEIPT_EXTRACTION_PROMPT.responseSchema }`. This instructs Gemini to *only* return a JSON object that strictly follows the defined schema, ensuring the data is predictable and easy to parse.
    4.  **Form Population:** The resulting JSON string is parsed, and its values are used to populate the state variables of the form, filling it out instantly.
-   **Implementation 2: Conversational Expense Entry (NLP) in `AddExpenseModal.tsx`**
    1.  **Prompt Engineering:** The user's text (e.g., "Lunch with client for 500 rupees yesterday") is combined with the `CONVERSATIONAL_EXPENSE_PROMPT` and the current date. This gives the model context to correctly interpret relative dates like "yesterday".
    2.  **JSON Generation:** The `generateContent` method is called with this text prompt, again using the `responseMimeType: 'application/json'` and its corresponding schema to get a structured JSON response.
    3.  **Pre-filling Form:** The parsed JSON is used to pre-fill the key fields of the expense form, and the user is advanced to the next step to review and complete the details.

### 7.3. CurrencyAPI.com: Real-Time Forex Rates
To handle multi-currency expenses accurately, this API provides historical exchange rates.

-   **Implementation (`hooks/useCurrencyConverter.ts`):**
    -   A custom React Hook (`useCurrencyConverter`) encapsulates all the logic, making it reusable.
    -   The hook's `useEffect` is triggered whenever the `date` or `currency` state changes in the expense form.
    -   It constructs an API request to `https://api.currencyapi.com/v3/historical?date=...`.
    -   **Error Handling:** It includes logic to handle future dates (which are invalid) and dates older than 365 days. Crucially, if the API doesn't have a rate for a specific date (e.g., a weekend or bank holiday), the hook automatically retries by requesting the rate for the previous day, ensuring a valid rate is almost always found.
    -   The fetched rate is then used to calculate and display the converted INR amount in real-time.

### 7.4. Google Maps Platform: Location Services
This feature provides a rich, interactive way for users to select hotel locations, improving data accuracy. It combines three distinct Google Maps APIs.

-   **Implementation (`components/GoogleMapSearchModal.tsx`):**
    1.  **Dynamic Script Loading:** To optimize performance, the Google Maps JavaScript API script is not included in the main `index.html`. Instead, it is dynamically created and appended to the document's `<head>` only when the `GoogleMapSearchModal` is opened for the first time.
    2.  **Maps JavaScript API:** Initializes the interactive map view (`new window.google.maps.Map(...)`) centered on the user's current geolocation (if permission is granted) or a default location.
    3.  **Places API:** An `Autocomplete` service (`new window.google.maps.places.Autocomplete(...)`) is attached to the search input field. As the user types, it provides suggestions for businesses (hotels, in this case). When a place is selected, the map centers on its location.
    4.  **Geocoding API:** This is used for reverse geocoding (`new window.google.maps.Geocoder()`). If the user clicks directly on the map or drags the pin to a new location, this API is called with the latitude/longitude coordinates to get the corresponding formatted street address. This ensures that even locations without a named business can be accurately recorded.

---

## 8. Deployment & Build Process

This section provides a guide for compiling, running, and deploying the TEMS application.

### 8.1. Prerequisites
Before you begin, ensure you have the following installed on your local machine:
-   **Node.js** (LTS version recommended)
-   **npm** (comes bundled with Node.js)

### 8.2. Environment & API Key Configuration
The application requires several API keys to function correctly. These are managed in two separate, untracked files for security.

1.  **Gemini API Key:**
    -   Create a file named `.env` in the root directory of the project.
    -   Add your Google Gemini API key to this file:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```
    -   The `vite.config.ts` file is configured to load this variable and make it accessible as `process.env.API_KEY` in the application code.

2.  **Other API Keys (Firebase, Google Maps, CurrencyAPI):**
    -   All other keys are managed in the `services/apiKeys.ts` file.
    -   This file is listed in `.gitignore` and **must not** be committed to version control.
    -   Populate this file with your configuration objects and keys as described by the comments within it.

### 8.3. Local Development
To run the application on your local machine for development and testing:

1.  **Install Dependencies:** Open a terminal in the project's root directory and run:
    ```bash
    npm install
    ```
2.  **Run the Development Server:** Once the installation is complete, start the Vite development server:
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:3000`. The server supports hot-reloading, so any changes you make to the code will be reflected in the browser instantly.

### 8.4. Production Build
When you are ready to deploy the application, you need to create an optimized, static build.

1.  **Run the Build Command:**
    ```bash
    npm run build
    ```
2.  **Output:** This command triggers Vite to compile, minify, and bundle all the TypeScript, React, and CSS files into a highly optimized set of static assets. The output will be placed in a `dist/` folder in the project root. This `dist` folder contains everything needed to run the application.

### 8.5. Hosting Recommendations
Since this project is a single-page application (SPA) that compiles to static HTML, CSS, and JavaScript files, it can be hosted on any modern static hosting platform.

-   **Recommended Platforms:**
    -   **Firebase Hosting:** The most natural choice, as the project already uses Firebase for its backend. Firebase Hosting is fast, secure (free SSL), and integrates seamlessly with the rest of the Firebase ecosystem.
    -   **Vercel / Netlify:** Excellent platforms offering continuous deployment (CI/CD) pipelines directly from your Git repository, global CDNs, and easy configuration for SPAs.
    -   **Google Cloud Storage:** You can configure a GCS bucket to serve a static website for a low-cost, scalable hosting solution.

-   **SPA Configuration:** When deploying, ensure your hosting provider is configured to handle client-side routing. This typically means redirecting all 404 "Not Found" errors back to the `index.html` file, allowing React Router (or in this case, the hash-based routing in `App.tsx`) to handle the URL.

### 8.6. Firebase Backend Setup for Production
Before deploying, ensure your Firebase project is correctly configured for a live environment.

-   **Authentication:** In the Firebase Console, make sure the "Email/Password" sign-in provider is enabled.
-   **Firestore Security Rules:** For a real-world deployment, you **must** configure Firestore Security Rules to protect your data. The default "allow read, write" is insecure. You should write rules that:
    -   Allow users to only read and write their own `UserMaster` document.
    -   Allow employees to create, read, and update their own expenses (`Expenses` where `employeeId == request.auth.uid`).
    -   Allow employers to read all expenses and update the status of any expense.
-   **Storage Security Rules:** Similarly, configure Cloud Storage rules to ensure that users can only upload receipts to their own designated folder (e.g., `receipts/{userId}/{fileName}`).