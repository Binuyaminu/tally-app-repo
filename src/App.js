import React, { useState, useEffect, useCallback } from 'react';
// Corrected Firebase imports for local environment
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Tailwind CSS is assumed to be available

// --- Firebase Configuration and Initialization ---
// Directly embedding the user's provided Firebase config for local development.
// This resolves 'no-undef' errors related to Canvas-specific global variables.
const firebaseConfig = {
  apiKey: "AIzaSyBDYZ5FbDpsHR3fsuTl6Wm7roWrQukEb3I",
  authDomain: "tally-c780a.firebaseapp.com",
  projectId: "tally-c780a",
  storageBucket: "tally-c780a.firebasestorage.app",
  messagingSenderId: "48410041408",
  appId: "1:48410041408:web:72c7b8bdb44a4b7b1393a5",
  measurementId: "G-3B53HVPFDH"
};

const appId = firebaseConfig.appId; // Use the appId directly from the config
const initialAuthToken = null; // This is only used in the Canvas environment, set to null for local/production

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Utility Functions ---

// Function to convert base64 to ArrayBuffer (for audio, if needed later)
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Function to convert PCM to WAV (for audio, if needed later)
function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1; // Mono audio
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + pcmData.byteLength, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format

  // FMT sub-chunk
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // Data sub-chunk
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, pcmData.byteLength, true); // Subchunk2Size

  const combined = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  combined.set(new Uint8Array(wavHeader), 0);
  combined.set(new Uint8Array(pcmData.buffer), wavHeader.byteLength);

  return new Blob([combined], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- Icons (using inline SVG for simplicity and consistency) ---
const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125h9.75a1.125 1.125 0 001.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

const PlusCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ChartBarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125l7.214-7.214a4.5 4.5 0 016.364 0L20.25 13.125m-16.5 0h16.5" />
    </svg>
);

const WalletIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3.75h15.375a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H2.25z" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const BriefcaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.25v4.5m0 0a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75v-4.5m0 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25zM12.75 3h3.75a2.25 2.25 0 012.25 2.25v2.25M12.75 3h-3.75a2.25 2.25 0 00-2.25 2.25v2.25m0 0H12L9 17.25 12.75 21H21.75c.621 0 1.125-.504 1.125-1.125v-1.5m-1.125 1.125H12.75" />
    </svg>
);

const XMarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ArrowsRightLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
);

const Cog6ToothIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.061.365.331.658.68.806 1.39.542 2.733.96 4.092 1.133.208.026.407.13.504.315l1.125 1.727a1.125 1.125 0 01-.44 1.88l-1.45.837c-.424.245-.668.734-.61 1.225l.153 1.53c.05.509-.347.994-.853 1.106-1.4.368-2.81.62-4.24.757-.358.034-.67.298-.8.643l-.718 1.907a1.125 1.125 0 01-1.945.485L9.49 19.22c-.23-.386-.53-.707-.874-.972 1.903-.642 3.78-1.55 5.575-2.73a1.125 1.125 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125h9.75a1.125 1.125 0 001.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.04 5.455 1.31m5.714 0a24.248 24.248 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15.5a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);


// --- App Component ---
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'addTransaction', 'budgets', 'reports', 'recurring', 'settings'
  const [activeProfile, setActiveProfile] = useState('personal'); // 'personal' or 'business'
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]); // New state for recurring templates
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false); // For mobile header profile switcher
  const [message, setMessage] = useState(''); // For user messages

  // State for pre-filling Add Transaction form from a recurring template
  const [prefillTransaction, setPrefillTransaction] = useState(null);
  const [budgetTips, setBudgetTips] = useState(''); // New state for LLM generated tips
  const [gettingTips, setGettingTips] = useState(false); // Loading state for LLM tips
  const [showReceiptScanModal, setShowReceiptScanModal] = useState(false); // New state for receipt modal
  const [showUserMenu, setShowUserMenu] = useState(false); // New state for user menu dropdown

  // Map currentView to a display title
  const pageTitles = {
    dashboard: 'Dashboard',
    addTransaction: 'Add Transaction',
    budgets: 'Budgets',
    reports: 'Reports',
    recurring: 'Recurring Transactions',
    settings: 'Settings',
  };

  // --- Authentication Effect ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          // initialAuthToken is null for local/production, so it will fall back to signInAnonymously
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          // Provide a more user-friendly message for auth configuration issues
          if (error.code === 'auth/configuration-not-found') {
            setMessage("Authentication setup incomplete. Please enable Anonymous sign-in in your Firebase project.");
          } else {
            setMessage("Authentication failed. Please try again.");
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore Data Fetching Effects ---
  useEffect(() => {
    if (!user) return;

    const userId = user.uid;

    // Fetch Transactions
    const transactionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/${activeProfile}_transactions`);
    const qTransactions = query(transactionsCollectionRef);
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      const fetchedTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date) // Convert Firestore Timestamp to Date object
      }));
      setTransactions(fetchedTransactions.sort((a, b) => b.date - a.date)); // Sort by date descending
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setMessage("Failed to load transactions.");
    });

    // Fetch Budgets
    const budgetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/${activeProfile}_budgets`);
    const qBudgets = query(budgetsCollectionRef);
    const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
      const fetchedBudgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBudgets(fetchedBudgets);
    }, (error) => {
      console.error("Error fetching budgets:", error);
      setMessage("Failed to load budgets.");
    });

    // Fetch Recurring Templates
    const recurringTemplatesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/${activeProfile}_recurring_templates`);
    const qRecurringTemplates = query(recurringTemplatesCollectionRef);
    const unsubscribeRecurringTemplates = onSnapshot(qRecurringTemplates, (snapshot) => {
      const fetchedTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecurringTemplates(fetchedTemplates);
    }, (error) => {
      console.error("Error fetching recurring templates:", error);
      setMessage("Failed to load recurring templates.");
    });


    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribeRecurringTemplates();
    };
  }, [user, activeProfile]); // Re-run when user or activeProfile changes

  // --- Message Display Effect ---
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000); // Message disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);


  // --- Data Manipulation Functions ---

  const addTransaction = async (type, category, amount, description, date) => {
    if (!user) {
      setMessage("Please authenticate to add transactions.");
      return;
    }
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_transactions`), {
        type, // 'income' or 'expense'
        category,
        amount: parseFloat(amount),
        description,
        date: date || serverTimestamp(), // Use provided date or server timestamp
        createdAt: serverTimestamp()
      });
      setMessage("Transaction added successfully!");
    }
    catch (e) {
      console.error("Error adding document: ", e);
      setMessage("Failed to add transaction.");
    }
  };

  const addRecurringTemplate = async (type, category, amount, description, recurrenceFrequency) => {
    if (!user) {
      setMessage("Please authenticate to add recurring transactions.");
      return;
    }
    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_recurring_templates`), {
        type,
        category,
        amount: parseFloat(amount),
        description,
        recurrenceFrequency,
        createdAt: serverTimestamp()
      });
      setMessage("Recurring template added successfully!");
    }
    catch (e) {
      console.error("Error adding recurring template: ", e);
      setMessage("Failed to add recurring template.");
    }
  };

  const updateBudget = async (budgetId, category, amount) => {
    if (!user) {
      setMessage("Please authenticate to update budgets.");
      return;
    }
    try {
      const budgetRef = doc(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_budgets`, budgetId);
      await updateDoc(budgetRef, {
        category,
        amount: parseFloat(amount)
      });
      setMessage("Budget updated successfully!");
    }
    catch (e) {
      console.error("Error updating budget: ", e);
      setMessage("Failed to update budget.");
    }
  };

  const addOrUpdateBudget = async (category, amount) => {
    if (!user) {
      setMessage("Please authenticate to manage budgets.");
      return;
    }
    const existingBudget = budgets.find(b => b.category === category);
    try {
      if (existingBudget) {
        await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_budgets`, existingBudget.id), {
          amount: parseFloat(amount)
        });
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_budgets`), {
          category,
          amount: parseFloat(amount),
          createdAt: serverTimestamp()
        });
      }
      setMessage("Budget updated successfully!");
    }
    catch (e) {
      console.error("Error adding/updating budget: ", e);
      setMessage("Failed to update budget.");
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) {
      setMessage("Please authenticate to delete transactions.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_transactions`, id));
      setMessage("Transaction deleted.");
    }
    catch (e) {
      console.error("Error deleting transaction: ", e);
      setMessage("Failed to delete transaction.");
    }
  };

  const deleteRecurringTemplate = async (id) => {
    if (!user) {
      setMessage("Please authenticate to delete recurring templates.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/${activeProfile}_recurring_templates`, id));
      setMessage("Recurring template deleted.");
    }
    catch (e) {
      console.error("Error deleting recurring template: ", e);
      setMessage("Failed to delete recurring template.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMessage("Logged out successfully!");
      // Optionally redirect to a login/landing page or reset state
      setCurrentView('dashboard'); // Go to dashboard, which will trigger anonymous login
    }
    catch (error) {
      console.error("Error logging out:", error);
      setMessage("Failed to log out.");
    }
  };

  // --- Calculations for Dashboard ---
  const calculateBalances = useCallback(() => {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const availableBalance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, availableBalance };
  }, [transactions]);

  const { totalIncome, totalExpenses, availableBalance } = calculateBalances();

  const getSpendingByCategory = useCallback(() => {
    const spending = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
    return Object.entries(spending).sort(([, a], [, b]) => b - a); // Sort by amount descending
  }, [transactions]);

  const spendingByCategory = getSpendingByCategory();

  // --- LLM Integration Function ---
  const getBudgetTips = async () => {
    setGettingTips(true);
    setBudgetTips(''); // Clear previous tips
    const currentSpending = spendingByCategory.map(([category, amount]) => ({ category, amount }));
    const currentBudgets = budgets.map(b => ({ category: b.category, amount: b.amount }));

    const prompt = `You are a helpful financial advisor for a Nigerian ${activeProfile === 'personal' ? 'individual' : 'small business'}. Based on the following spending and budget data, provide 3-5 actionable and simple tips on how to manage finances better, save money, or optimize spending. Focus on practical advice for a Nigerian context. If a category is over budget, highlight it. If there are no budgets or spending data, provide general tips.

Current spending by category (this month): ${JSON.stringify(currentSpending)}
Set budgets (this month): ${JSON.stringify(currentBudgets)}

Please format your response as a numbered list of tips.`;

    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = { contents: chatHistory };
    const apiKey = ""; // Canvas will provide this
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // Implement exponential backoff for API calls
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          if (response.status === 429) { // Too Many Requests
            const delay = Math.pow(2, retryCount) * baseDelay;
            console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          } else {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const text = result.candidates[0].content.parts[0].text;
          setBudgetTips(text);
        } else {
          setBudgetTips("Could not generate tips. Please try again or add more data.");
          console.error("Unexpected API response structure:", result);
        }
        break; // Exit loop on success
      } catch (error) {
        console.error("Error calling Gemini API:", error);
        setBudgetTips("Failed to get tips. Please check your internet connection or try again later.");
        break; // Exit loop on unrecoverable error
      } finally {
        setGettingTips(false);
      }
    }
    if (retryCount === maxRetries) {
      setBudgetTips("Failed to get tips after multiple retries. Please try again later.");
    }
  };

  // --- Receipt Processing with Gemini ---
  const processReceiptWithGemini = async (base64Image, mimeType) => { // Added mimeType parameter
    setMessage('Processing receipt...');
    try {
      const prompt = `Extract the following information from this receipt image as a JSON object:
            {
                "amount": "total amount (number)",
                "date": "date in YYYY-MM-DD format",
                "description": "main vendor or item description",
                "category": "suggest a category from: Food, Transport, Rent, Utilities, Airtime/Data, School Fees, Shopping, Entertainment, Health, Miscellaneous, Staff Salaries, Marketing, Raw Materials, Office Supplies"
            }
            If any information is not found, use null for that field.`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType, // Use dynamic mimeType
                  data: base64Image.split(',')[1] // Remove "data:image/png;base64," prefix
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "amount": { "type": "number" },
              "date": { "type": "string" },
              "description": { "type": "string" },
              "category": { "type": "string" }
            },
            "propertyOrdering": ["amount", "date", "description", "category"]
          }
        }
      };

      const apiKey = ""; // Canvas will provide this
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      let retryCount = 0;
      const maxRetries = 5;
      const baseDelay = 1000;

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            if (response.status === 429) {
              const delay = Math.pow(2, retryCount) * baseDelay;
              console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            } else {
              throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
          }

          const result = await response.json();
          if (result.candidates && result.candidates.length > 0 &&
              result.candidates[0].content && result.candidates[0].content.parts &&
              result.candidates[0].content.parts.length > 0) {
            const jsonText = result.candidates[0].content.parts[0].text;
            const parsedData = JSON.parse(jsonText);
            setMessage("Receipt processed!");
            return parsedData;
          } else {
            setMessage("Could not extract data from receipt. Try a clearer image.");
            console.error("Unexpected API response structure:", result);
            return null;
          }
        } catch (error) {
          console.error("Error processing receipt with Gemini API:", error);
          setMessage("Failed to process receipt. Please try again.");
          return null;
        }
      }
      setMessage("Failed to process receipt after multiple retries. Please try again later.");
      return null;
    } finally {
      // No specific loading state for receipt processing, message handles it
    }
  };


  // --- UI Components ---

  const Header = () => (
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white p-4 flex items-center justify-between shadow-lg z-10 rounded-b-xl md:pl-72">
        <h1 className="text-2xl font-bold font-inter">{pageTitles[currentView]}</h1> {/* Dynamic Page Title */}
        <div className="flex items-center space-x-4">
          {/* Notification Icon */}
          <button className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200">
            <BellIcon />
          </button>
          {/* User Avatar / Menu */}
          <div className="relative">
            <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white bg-opacity-30 text-white text-sm font-semibold hover:bg-opacity-40 transition-all duration-200"
            >
              <UserIcon className="w-6 h-6" /> {/* Generic User Icon */}
            </button>
            {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl overflow-hidden z-20">
                  <div className="px-4 py-3 text-sm text-gray-900 border-b border-gray-100 font-semibold font-inter">
                    {user?.uid ? `User: ${user.uid.substring(0, 8)}...` : 'Guest User'} {/* Display truncated UID */}
                  </div>
                  <button
                      onClick={() => { setCurrentView('settings'); setShowUserMenu(false); }}
                      className="flex items-center w-full px-4 py-2 text-gray-800 hover:bg-gray-100 text-left font-inter"
                  >
                    <Cog6ToothIcon className="w-5 h-5 mr-2 text-[#1C55E0]" /> Profile Settings
                  </button>
                  <button
                      onClick={() => { handleLogout(); setShowUserMenu(false); }}
                      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 text-left font-inter"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Logout
                  </button>
                  {/* Profile Switcher inside user menu for mobile */}
                  <div className="md:hidden border-t border-gray-100 mt-2 pt-2">
                    <p className="px-4 pb-2 text-xs text-gray-500 font-inter">Switch Profile:</p>
                    <button
                        onClick={() => { setActiveProfile('personal'); setShowUserMenu(false); }}
                        className="flex items-center w-full px-4 py-2 text-gray-800 hover:bg-gray-100 text-left font-inter"
                    >
                      <UserIcon className="w-5 h-5 mr-2 text-[#1C55E0]" /> Personal
                    </button>
                    <button
                        onClick={() => { setActiveProfile('business'); setShowUserMenu(false); }}
                        className="flex items-center w-full px-4 py-2 text-gray-800 hover:bg-gray-100 text-left font-inter"
                    >
                      <BriefcaseIcon className="w-5 h-5 mr-2 text-[#1A5BD0]" /> Business
                    </button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </header>
  );

  const Navigation = () => (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 shadow-lg z-10 rounded-t-xl">
        <NavItem icon={<HomeIcon />} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
        <NavItem icon={<ArrowsRightLeftIcon />} label="Recurring" isActive={currentView === 'recurring'} onClick={() => setCurrentView('recurring')} />
        <div className="relative -top-4">
          <button
              onClick={() => { setCurrentView('addTransaction'); setPrefillTransaction(null); }} // Clear prefill when navigating to add
              className="bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-[#4D8CFF]"
          >
            <PlusCircleIcon />
          </button>
        </div>
        <NavItem icon={<WalletIcon />} label="Budgets" isActive={currentView === 'budgets'} onClick={() => setCurrentView('budgets')} />
        <NavItem icon={<ChartBarIcon />} label="Reports" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
      </nav>
  );

  const NavItem = ({ icon, label, isActive, onClick }) => (
      <button
          onClick={onClick}
          className={`flex flex-col items-center p-2 rounded-md transition-colors duration-200 ${isActive ? 'text-[#1C55E0] font-bold' : 'text-gray-500 hover:text-gray-700'}`}
      >
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </button>
  );

  const Sidebar = ({ currentView, setCurrentView, activeProfile }) => (
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl p-4 pt-4 flex flex-col z-20"> {/* Adjusted pt-4 for logo */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#246BFD] font-inter">Tally</h1> {/* Logo in sidebar */}
        </div>
        <nav className="space-y-2 flex-grow"> {/* flex-grow to push profile/user to bottom */}
          <SidebarNavItem icon={<HomeIcon />} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          <SidebarNavItem icon={<ArrowsRightLeftIcon />} label="Recurring" isActive={currentView === 'recurring'} onClick={() => setCurrentView('recurring')} />
          <SidebarNavItem icon={<WalletIcon />} label="Budgets" isActive={currentView === 'budgets'} onClick={() => setCurrentView('budgets')} />
          <SidebarNavItem icon={<ChartBarIcon />} label="Reports" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
          <SidebarNavItem icon={<Cog6ToothIcon />} label="Settings" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </nav>
        {/* Profile Switcher for desktop sidebar (User ID is in Header menu) */}
        {user && (
            <div className="mt-auto pt-4 border-t border-gray-200 text-sm text-gray-500 font-inter">
              <p className="mb-2">Current Profile: <span className="capitalize font-semibold text-[#1C55E0]">{activeProfile}</span></p>
              <button
                  onClick={() => setActiveProfile(activeProfile === 'personal' ? 'business' : 'personal')}
                  className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-all duration-200 w-full justify-center"
              >
                {activeProfile === 'personal' ? <BriefcaseIcon className="w-5 h-5 text-[#1A5BD0]" /> : <UserIcon className="w-5 h-5 text-[#1C55E0]" />}
                <span>Switch to {activeProfile === 'personal' ? 'Business' : 'Personal'}</span>
              </button>
            </div>
        )}
      </aside>
  );

  const SidebarNavItem = ({ icon, label, isActive, onClick }) => (
      <button
          onClick={onClick}
          className={`flex items-center w-full p-3 rounded-xl text-left font-semibold transition-colors duration-200 ${isActive ? 'bg-[#E0E8FF] text-[#1C55E0]' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        {icon}
        <span className="ml-3 text-base">{label}</span>
      </button>
  );

  const DashboardView = () => (
      <div className="p-4 pt-20 pb-20 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Available Balance Card */}
          <div className="bg-gradient-to-br from-[#246BFD] to-[#1A5BD0] text-white p-6 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-[1.01] md:col-span-1 lg:col-span-1">
            <p className="text-sm opacity-80 font-inter">Available Balance</p>
            <h2 className="text-4xl font-extrabold mt-1 font-inter">₦{availableBalance.toLocaleString()}</h2>
            <div className="flex justify-between text-sm mt-4 opacity-90 font-inter">
              <span>Income: ₦{totalIncome.toLocaleString()}</span>
              <span>Expenses: ₦{totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-2xl shadow-md md:col-span-1 lg:col-span-1 flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                  onClick={() => { setCurrentView('addTransaction'); setPrefillTransaction(null); }}
                  className="w-full bg-[#E0E8FF] text-[#1C55E0] py-2 rounded-lg font-semibold text-sm hover:bg-[#F0F4FF] transition-colors duration-200 font-inter"
              >
                Add Transaction
              </button>
              <button
                  onClick={() => setCurrentView('budgets')}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors duration-200 font-inter"
              >
                View Budgets
              </button>
              <button
                  onClick={() => setCurrentView('recurring')}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors duration-200 font-inter"
              >
                View Recurring
              </button>
            </div>
          </div>

          {/* Recurring Transactions Alert (conditionally rendered) */}
          {recurringTemplates.length > 0 && (
              <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded-xl shadow-sm text-center font-inter md:col-span-2 lg:col-span-1 flex items-center justify-center">
                <p className="font-semibold">Heads up! You have recurring transactions. </p>
                <p className="text-sm mt-1 md:mt-0 md:ml-2">Visit the "Recurring" tab to log them as they occur.</p>
              </div>
          )}
        </div>

        {/* Recent Transactions Section */}
        <section className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Recent Transactions</h3>
          {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4 font-inter">No transactions yet. Add some!</p>
          ) : (
              <ul className="space-y-3">
                {transactions.slice(0, 5).map(t => (
                    <li key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {t.type === 'income' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
                              </svg>
                          ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
                              </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 font-inter">{t.description || t.category}</p>
                          <p className="text-xs text-gray-500 font-inter">{t.category} &bull; {t.date.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`font-semibold font-inter ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? '+' : '-'}₦{t.amount.toLocaleString()}
                                </span>
                    </li>
                ))}
              </ul>
          )}
        </section>

        {/* Spending by Category Section */}
        <section className="bg-white p-4 rounded-2xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Spending by Category</h3>
          {spendingByCategory.length === 0 ? (
              <p className="text-gray-500 text-center py-4 font-inter">No spending data yet.</p>
          ) : (
              <ul className="space-y-2">
                {spendingByCategory.map(([category, amount]) => (
                    <li key={category} className="flex justify-between items-center text-sm text-gray-700 font-inter">
                      <span>{category}</span>
                      <span className="font-medium">₦{amount.toLocaleString()}</span>
                    </li>
                ))}
              </ul>
          )}
        </section>
      </div>
  );

  const AddTransactionView = () => {
    const [type, setType] = useState(prefillTransaction?.type || 'expense');
    const [category, setCategory] = useState(prefillTransaction?.category || '');
    const [amount, setAmount] = useState(prefillTransaction?.amount || '');
    const [description, setDescription] = useState(prefillTransaction?.description || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('monthly');

    const commonCategories = type === 'expense' ?
        ['Food', 'Transport', 'Rent', 'Utilities', 'Airtime/Data', 'School Fees', 'Shopping', 'Entertainment', 'Health', 'Miscellaneous', 'Staff Salaries', 'Marketing', 'Raw Materials', 'Office Supplies'] :
        ['Salary', 'Sales Revenue', 'Client Payment', 'Freelance', 'Investment Income', 'Gift', 'Loan', 'Other Income'];

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!amount || !category) {
        setMessage("Amount and Category are required.");
        return;
      }

      if (isRecurring) {
        await addRecurringTemplate(type, category, amount, description, recurrenceFrequency);
      } else {
        await addTransaction(type, category, amount, description, new Date(date));
      }

      // Reset form and prefill state
      setCategory('');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsRecurring(false);
      setRecurrenceFrequency('monthly');
      setPrefillTransaction(null);
      setCurrentView('dashboard'); // Go back to dashboard after adding
    };

    useEffect(() => {
      if (prefillTransaction) {
        setType(prefillTransaction.type);
        setCategory(prefillTransaction.category);
        setAmount(prefillTransaction.amount);
        setDescription(prefillTransaction.description);
        // Date is always current date for a new transaction from template
        setDate(new Date().toISOString().split('T')[0]);
        setIsRecurring(false); // A prefilled transaction from template is not recurring itself
      }
    }, [prefillTransaction]);

    const handleScanReceipt = async () => {
      setShowReceiptScanModal(true);
    };

    const handleReceiptData = (data) => {
      if (data) {
        setAmount(data.amount || '');
        setDate(data.date || new Date().toISOString().split('T')[0]);
        setDescription(data.description || '');
        setCategory(data.category || '');
        // Assuming receipts are expenses, but could add logic to infer type
        setType('expense');
      }
      setShowReceiptScanModal(false);
    };


    return (
        <div className="p-4 pt-20 pb-20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-inter">Add New Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-2xl shadow-md">
            <div className="flex justify-center space-x-4 mb-4">
              <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Expense
              </button>
              <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${type === 'income' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Income
              </button>
            </div>

            <button
                type="button"
                onClick={handleScanReceipt}
                className="w-full bg-[#E0E8FF] text-[#1C55E0] py-2 rounded-lg font-semibold text-sm hover:bg-[#F0F4FF] transition-colors duration-200 font-inter flex items-center justify-center space-x-2"
            >
              <CameraIcon /> <span>Scan Receipt</span>
            </button>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 font-inter mb-1">Amount (₦)</label>
              <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 5000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter"
                  required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 font-inter mb-1">Category</label>
              <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter bg-white"
                  required
              >
                <option value="">Select a category</option>
                {commonCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 font-inter mb-1">Description (Optional)</label>
              <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Dinner at Mama Put"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter"
              />
            </div>

            {!prefillTransaction && ( // Only show date picker if not prefilling from a recurring template
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 font-inter mb-1">Date</label>
                  <input
                      type="date"
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter"
                      required
                  />
                </div>
            )}


            <div className="flex items-center mt-4">
              <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 text-[#246BFD] focus:ring-[#4D8CFF] border-gray-300 rounded"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900 font-inter">
                Make this a recurring transaction
              </label>
            </div>

            {isRecurring && (
                <div>
                  <label htmlFor="recurrenceFrequency" className="block text-sm font-medium text-gray-700 font-inter mb-1">Recurrence Frequency</label>
                  <select
                      id="recurrenceFrequency"
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter bg-white"
                      required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
            )}

            <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:from-[#1A5BD0] hover:to-[#0F3C80] transition-all duration-200 font-inter"
            >
              {isRecurring ? 'Save Recurring Template' : 'Add Transaction'}
            </button>
          </form>

          {showReceiptScanModal && (
              <ReceiptScanModal onClose={() => setShowReceiptScanModal(false)} onDataExtracted={handleReceiptData} processReceiptWithGemini={processReceiptWithGemini} />
          )}
        </div>
    );
  };

  const ReceiptScanModal = ({ onClose, onDataExtracted, processReceiptWithGemini }) => {
    const [imagePreview, setImagePreview] = useState(null);
    const [base64Image, setBase64Image] = useState(null);
    const [imageMimeType, setImageMimeType] = useState(null); // New state for MIME type
    const [extractedData, setExtractedData] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setError('');
        setExtractedData(null);
        setImageMimeType(file.type); // Capture the file's MIME type
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
          setBase64Image(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
        setBase64Image(null);
        setImageMimeType(null);
      }
    };

    const handleProcess = async () => {
      if (!base64Image || !imageMimeType) { // Ensure mimeType is also present
        setError("Please upload a receipt image first.");
        return;
      }
      setProcessing(true);
      setError('');
      // Pass mimeType to the processing function
      const data = await processReceiptWithGemini(base64Image, imageMimeType);
      if (data) {
        setExtractedData(data);
      } else {
        setError("Failed to extract data. Please try another image or enter manually.");
      }
      setProcessing(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 font-inter">Scan Receipt</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 font-inter mb-1">Upload Image</label>
              <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter"
              />
            </div>

            {imagePreview && (
                <div className="mb-4 text-center">
                  <img src={imagePreview} alt="Receipt Preview" className="max-w-full h-auto rounded-lg shadow-md mx-auto" />
                </div>
            )}

            {error && (
                <p className="text-red-500 text-sm mb-4 font-inter">{error}</p>
            )}

            <button
                onClick={handleProcess}
                className="w-full bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:from-[#1A5BD0] hover:to-[#0F3C80] transition-all duration-200 font-inter"
                disabled={processing || !base64Image}
            >
              {processing ? 'Processing...' : 'Process Receipt'}
            </button>

            {extractedData && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2 font-inter">Extracted Data:</h4>
                  <p className="text-sm text-gray-700 font-inter"><strong>Amount:</strong> ₦{extractedData.amount?.toLocaleString() || 'N/A'}</p>
                  <p className="text-sm text-gray-700 font-inter"><strong>Date:</strong> {extractedData.date || 'N/A'}</p>
                  <p className="text-sm text-gray-700 font-inter"><strong>Description:</strong> {extractedData.description || 'N/A'}</p>
                  <p className="text-sm text-gray-700 font-inter"><strong>Category:</strong> {extractedData.category || 'N/A'}</p>
                  <button
                      onClick={() => onDataExtracted(extractedData)}
                      className="mt-4 w-full bg-green-500 text-white py-2 rounded-xl font-semibold text-md shadow-md hover:bg-green-600 transition-colors duration-200 font-inter"
                  >
                    Use This Data
                  </button>
                </div>
            )}
          </div>
        </div>
    );
  };


  const BudgetsView = () => {
    const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [budgetAmount, setBudgetAmount] = useState('');

    const expenseCategories = ['Food', 'Transport', 'Rent', 'Utilities', 'Airtime/Data', 'School Fees', 'Shopping', 'Entertainment', 'Health', 'Miscellaneous', 'Staff Salaries', 'Marketing', 'Raw Materials', 'Office Supplies'];

    const handleAddBudgetClick = (category = '', amount = '') => {
      setSelectedCategory(category);
      setBudgetAmount(amount);
      setShowAddBudgetModal(true);
    };

    const handleSaveBudget = async (e) => {
      e.preventDefault();
      if (!selectedCategory || !budgetAmount) {
        setMessage("Category and Amount are required for budget.");
        return;
      }
      await addOrUpdateBudget(selectedCategory, budgetAmount);
      setShowAddBudgetModal(false);
      setSelectedCategory('');
      setBudgetAmount('');
    };

    const getSpentForCategory = (category) => {
      return transactions
          .filter(t => t.type === 'expense' && t.category === category)
          .reduce((sum, t) => sum + t.amount, 0);
    };

    return (
        <div className="p-4 pt-20 pb-20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-inter">Your Budgets</h2>

          <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
            {budgets.length === 0 ? (
                <p className="text-gray-500 text-center py-4 font-inter">No budgets set yet. Tap '+' to add one!</p>
            ) : (
                budgets.map(budget => {
                  const spent = getSpentForCategory(budget.category);
                  const percentage = (spent / budget.amount) * 100;
                  const remaining = budget.amount - spent;
                  const progressBarColor = percentage > 100 ? 'bg-red-500' : percentage > 75 ? 'bg-orange-500' : 'bg-green-500';
                  const alertMessage = remaining < 0 ? `You are ₦${Math.abs(remaining).toLocaleString()} over budget!` : percentage > 90 ? `You are nearing your budget for ${budget.category}!` : '';

                  return (
                      <div key={budget.id} className="border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 font-inter">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{budget.category}</h3>
                          <button
                              onClick={() => handleAddBudgetClick(budget.category, budget.amount)}
                              className="text-[#1C55E0] hover:text-[#0F3C80] text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="text-sm text-gray-600">Budget: ₦{budget.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Spent: ₦{spent.toLocaleString()}</p>
                        <p className={`text-sm font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Remaining: ₦{remaining.toLocaleString()}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                              className={`${progressBarColor} h-2.5 rounded-full`}
                              style={{ width: `${Math.min(100, percentage)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{percentage.toFixed(1)}% spent</p>
                        {alertMessage && (
                            <p className={`text-sm mt-2 font-medium ${remaining < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                              {alertMessage}
                            </p>
                        )}
                      </div>
                  );
                })
            )}
          </div>

          <button
              onClick={getBudgetTips}
              className="w-full bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:from-[#1A5BD0] hover:to-[#0F3C80] transition-all duration-200 font-inter mt-6"
              disabled={gettingTips}
          >
            {gettingTips ? 'Getting Tips...' : '✨ Get Budget Tips'}
          </button>

          {budgetTips && (
              <section className="bg-white p-4 rounded-2xl shadow-md mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Your Personalized Budget Insights</h3>
                <div className="prose prose-sm max-w-none text-gray-700 font-inter" dangerouslySetInnerHTML={{ __html: budgetTips.replace(/\n/g, '<br/>') }}></div>
              </section>
          )}


          <button
              onClick={() => handleAddBudgetClick()}
              className="fixed bottom-20 right-4 bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white p-4 rounded-full shadow-lg transform hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-[#4D8CFF] md:hidden"
          >
            <PlusCircleIcon />
          </button>

          {showAddBudgetModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 font-inter">{selectedCategory ? 'Edit Budget' : 'Set New Budget'}</h3>
                    <button onClick={() => setShowAddBudgetModal(false)} className="text-gray-500 hover:text-gray-700">
                      <XMarkIcon />
                    </button>
                  </div>
                  <form onSubmit={handleSaveBudget} className="space-y-4">
                    <div>
                      <label htmlFor="budgetCategory" className="block text-sm font-medium text-gray-700 font-inter mb-1">Category</label>
                      <select
                          id="budgetCategory"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter bg-white"
                          required
                          disabled={!!budgets.find(b => b.category === selectedCategory)} // Disable if editing existing
                      >
                        <option value="">Select a category</option>
                        {expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 font-inter mb-1">Budget Amount (₦)</label>
                      <input
                          type="number"
                          id="budgetAmount"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value)}
                          placeholder="e.g., 20000"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4D8CFF] focus:border-transparent font-inter"
                          required
                      />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#246BFD] to-[#1A5BD0] text-white py-3 rounded-xl font-semibold text-lg shadow-md hover:from-[#1A5BD0] hover:to-[#0F3C80] transition-all duration-200 font-inter"
                    >
                      Save Budget
                    </button>
                  </form>
                </div>
              </div>
          )}
        </div>
    );
  };

  const RecurringTransactionsView = () => {
    const handleAddFromTemplate = (template) => {
      setPrefillTransaction(template);
      setCurrentView('addTransaction');
    };

    return (
        <div className="p-4 pt-20 pb-20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-inter">Recurring Transactions</h2>

          <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
            {recurringTemplates.length === 0 ? (
                <p className="text-gray-500 text-center py-4 font-inter">No recurring transactions set up yet. Add one from the 'Add Transaction' screen!</p>
            ) : (
                recurringTemplates.map(template => (
                    <div key={template.id} className="border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 font-inter">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {template.description || template.category}
                        </h3>
                        <button
                            onClick={() => deleteRecurringTemplate(template.id)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {template.type === 'income' ? 'Income' : 'Expense'} &bull; {template.category} &bull; ₦{template.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Repeats: <span className="capitalize">{template.recurrenceFrequency}</span>
                      </p>
                      <button
                          onClick={() => handleAddFromTemplate(template)}
                          className="mt-3 w-full bg-[#E0E8FF] text-[#1C55E0] py-2 rounded-lg text-sm font-semibold hover:bg-[#F0F4FF] transition-colors duration-200"
                      >
                        Add as Transaction Today
                      </button>
                    </div>
                ))
            )}
          </div>
        </div>
    );
  };

  const SettingsView = () => { // Changed to explicit return
    return ( // Added return
        <div className="p-4 pt-20 pb-20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-inter">Account & Settings</h2>

          <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="font-inter">
              <p className="text-lg font-semibold text-gray-800 mb-2">User Information</p>
              <p className="text-sm text-gray-600 break-all">
                Your User ID: <span className="font-mono text-[#1C55E0]">{user?.uid || 'N/A'}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This unique ID helps Tally securely manage your data.
              </p>
            </div>

            <hr className="border-gray-200" />

            <div className="font-inter">
              <p className="text-lg font-semibold text-gray-800 mb-2">App Settings</p>
              <p className="text-gray-500">Future settings options will appear here, such as:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                <li>Customizing categories</li>
                <li>Notification preferences</li>
                <li>Data export options</li>
                <li>Language settings</li>
              </ul>
            </div>
          </div>
        </div>
    ); // Closing return and function
  }; // Final closing brace for the function itself.


  const ReportsView = () => {
    const [selectedReportType, setSelectedReportType] = useState('spending'); // 'spending', 'income-vs-expense'
    const [timeframe, setTimeframe] = useState('month'); // 'month', '3months', '6months', 'year'

    const filterTransactionsByTimeframe = useCallback((txns) => {
      const now = new Date();
      let startDate;

      switch (timeframe) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0); // All time
      }
      return txns.filter(t => t.date >= startDate);
    }, [timeframe]);

    const filteredTransactions = filterTransactionsByTimeframe(transactions);

    const getSpendingDataForChart = () => {
      const data = {};
      filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
      return Object.entries(data).sort(([, a], [, b]) => b - a);
    };

    const getIncomeVsExpenseDataForChart = () => {
      const monthlyData = {};
      filteredTransactions.forEach(t => {
        const monthYear = `${t.date.getFullYear()}-${t.date.getMonth() + 1}`;
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
          monthlyData[monthYear].income += t.amount;
        } else {
          monthlyData[monthYear].expense += t.amount;
        }
      });

      // Sort by month-year
      const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const [y1, m1] = a.split('-').map(Number);
        const [y2, m2] = b.split('-').map(Number);
        if (y1 !== y2) return y1 - y2;
        return m1 - m2;
      });

      return sortedMonths.map(monthYear => ({
        month: monthYear,
        income: monthlyData[monthYear].income,
        expense: monthlyData[monthYear].expense
      }));
    };

    const spendingChartData = getSpendingDataForChart();
    const incomeVsExpenseChartData = getIncomeVsExpenseDataForChart();

    const PieChart = ({ data }) => {
      if (data.length === 0) return <p className="text-gray-500 text-center py-4 font-inter">No data to display for this period.</p>;

      const total = data.reduce((sum, [, amount]) => sum + amount, 0);
      let cumulativePercentage = 0;

      const colors = [
        '#246BFD', '#1A5BD0', '#4D8CFF', '#0F3C80', '#10B981',
        '#EF4444', '#3B82F6', '#A855F7', '#F97316', '#06B6D4'
      ]; // Tailwind-inspired colors, now starting with the new primary blue

      return (
          <div className="relative w-full h-64 flex items-center justify-center font-inter">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {data.map(([, amount], index) => {
                const percentage = (amount / total) * 100;
                const startAngle = cumulativePercentage * 3.6;
                cumulativePercentage += percentage;
                const endAngle = cumulativePercentage * 3.6;

                const start = polarToCartesian(50, 50, 40, endAngle);
                const end = polarToCartesian(50, 50, 40, startAngle);
                const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

                const d = [
                  `M ${start.x} ${start.y}`,
                  `A 40 40 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
                  `L 50 50`,
                  `Z`
                ].join(" ");

                return (
                    <path
                        key={index}
                        d={d}
                        fill={colors[index % colors.length]}
                        stroke="white"
                        strokeWidth="0.5"
                    />
                );
              })}
            </svg>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 bg-white bg-opacity-90 rounded-lg shadow-sm max-h-full overflow-y-auto">
              <ul className="text-sm">
                {data.map(([category, amount], index) => (
                    <li key={category} className="flex items-center mb-1">
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }}></span>
                      {category}: ₦{amount.toLocaleString()} ({(amount / total * 100).toFixed(1)}%)
                    </li>
                ))}
              </ul>
            </div>
          </div>
      );
    };

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };

    const BarChart = ({ data }) => {
      if (data.length === 0) return <p className="text-gray-500 text-center py-4 font-inter">No data to display for this period.</p>;

      const maxAmount = Math.max(...data.flatMap(d => [d.income, d.expense]));
      const barWidth = 20;
      const spacing = 10;
      const chartHeight = 200;
      const scaleY = chartHeight / maxAmount;

      return (
          <div className="overflow-x-auto p-2 font-inter">
            <svg width={data.length * (barWidth * 2 + spacing)} height={chartHeight + 50}>
              {/* X-axis labels */}
              {data.map((d, i) => (
                  <text
                      key={`month-${i}`}
                      x={i * (barWidth * 2 + spacing) + barWidth}
                      y={chartHeight + 20}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6B7280"
                  >
                    {d.month}
                  </text>
              ))}

              {/* Bars */}
              {data.map((d, i) => (
                  <React.Fragment key={`bars-${i}`}>
                    {/* Income Bar */}
                    <rect
                        x={i * (barWidth * 2 + spacing)}
                        y={chartHeight - d.income * scaleY}
                        width={barWidth}
                        height={d.income * scaleY}
                        fill="#10B981" // Green
                        rx="3" ry="3" // Rounded corners
                    />
                    <text
                        x={i * (barWidth * 2 + spacing) + barWidth / 2}
                        y={chartHeight - d.income * scaleY - 5}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#10B981"
                    >
                      ₦{d.income.toLocaleString()}
                    </text>

                    {/* Expense Bar */}
                    <rect
                        x={i * (barWidth * 2 + spacing) + barWidth + spacing / 2}
                        y={chartHeight - d.expense * scaleY}
                        width={barWidth}
                        height={d.expense * scaleY}
                        fill="#EF4444" // Red
                        rx="3" ry="3" // Rounded corners
                    />
                    <text
                        x={i * (barWidth * 2 + spacing) + barWidth + spacing / 2 + barWidth / 2}
                        y={chartHeight - d.expense * scaleY - 5}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#EF4444"
                    >
                      ₦{d.expense.toLocaleString()}
                    </text>
                  </React.Fragment>
              ))}

              {/* Y-axis (simple line) */}
              <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#D1D5DB" strokeWidth="1" />
              {/* X-axis (simple line) */}
              <line x1="0" y1={chartHeight} x2={data.length * (barWidth * 2 + spacing)} y2={chartHeight} stroke="#D1D5DB" strokeWidth="1" />

              {/* Legend */}
              <g transform={`translate(0, ${chartHeight + 35})`}>
                <rect x="0" y="0" width="10" height="10" fill="#10B981" />
                <text x="15" y="9" fontSize="10" fill="#6B7280">Income</text>
                <rect x="60" y="0" width="10" height="10" fill="#EF4444" />
                <text x="75" y="9" fontSize="10" fill="#6B7280">Expense</text>
              </g>
            </svg>
          </div>
      );
    };

    return (
        <div className="p-4 pt-20 pb-20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-inter">Financial Reports</h2>

          <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
            <div className="flex justify-around mb-4">
              <button
                  onClick={() => setSelectedReportType('spending')}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors duration-200 ${selectedReportType === 'spending' ? 'bg-[#246BFD] text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Spending Breakdown
              </button>
              <button
                  onClick={() => setSelectedReportType('income-vs-expense')}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors duration-200 ${selectedReportType === 'income-vs-expense' ? 'bg-[#246BFD] text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Income vs. Expense
              </button>
            </div>

            <div className="flex justify-around mb-6 text-sm text-gray-600">
              {['month', '3months', '6months', 'year'].map(tf => (
                  <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-full ${timeframe === tf ? 'bg-[#E0E8FF] text-[#1C55E0] font-medium' : 'hover:bg-gray-100'}`}
                  >
                    {tf === 'month' ? 'This Month' : tf === '3months' ? 'Last 3 Months' : tf === '6months' ? 'Last 6 Months' : 'This Year'}
                  </button>
              ))}
            </div>

            {selectedReportType === 'spending' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Spending by Category ({timeframe === 'month' ? 'This Month' : timeframe === '3months' ? 'Last 3 Months' : timeframe === '6months' ? 'Last 6 Months' : 'This Year'})</h3>
                  <PieChart data={spendingChartData} />
                </div>
            )}

            {selectedReportType === 'income-vs-expense' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 font-inter">Income vs. Expense Over Time ({timeframe === 'month' ? 'This Month' : timeframe === '3months' ? 'Last 3 Months' : timeframe === '6months' ? 'Last 6 Months' : 'This Year'})</h3>
                  <BarChart data={incomeVsExpenseChartData} />
                </div>
            )}
          </div>
        </div>
    );
  };


  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#246BFD] mx-auto"></div>
            <p className="mt-4 text-gray-600 font-inter">Loading Tally...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
        <Header />

        {/* Sidebar for larger screens */}
        <div className="hidden md:block">
          <Sidebar currentView={currentView} setCurrentView={setCurrentView} activeProfile={activeProfile} />
        </div>

        <main className="flex-grow overflow-y-auto pt-20 pb-20 md:ml-64 md:pt-4 md:pb-4">
          {message && (
              <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
                {message}
              </div>
          )}
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'addTransaction' && <AddTransactionView />}
          {currentView === 'budgets' && <BudgetsView />}
          {currentView === 'reports' && <ReportsView />}
          {currentView === 'recurring' && <RecurringTransactionsView />}
          {currentView === 'settings' && <SettingsView />}
        </main>

        {/* Bottom Navigation for mobile screens */}
        <div className="md:hidden">
          <Navigation />
        </div>
      </div>
  );
};

export default App;
