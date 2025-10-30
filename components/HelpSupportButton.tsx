
import React, { useState, useEffect, useRef } from 'react';

const HelpSupportButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleToggleModal = () => {
    setIsModalOpen(prev => !prev);
  };

  // Close modal if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="fixed bottom-8 right-8 z-50 group" ref={modalRef}>
      {/* Contact Us Modal */}
      {isModalOpen && (
        <div className="absolute bottom-[calc(100%+1rem)] right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 transition-all duration-300 ease-in-out transform-gpu origin-bottom-right animate-pop-in">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Contact Us</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              aria-label="Close contact us modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Options */}
          <div className="py-2">
            <a href="#" onClick={() => alert('Create ticket clicked!')} className="flex items-center px-4 py-3 hover:bg-gray-100 transition-colors">
              <div className="mr-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div className="flex-grow">
                <p className="font-medium text-gray-800">Create ticket</p>
                <p className="text-sm text-gray-500">Resolution in 1-2 days</p>
              </div>
              <div className="text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </div>
            </a>
            <a href="#" onClick={() => alert('Chat clicked!')} className="flex items-center px-4 py-3 hover:bg-gray-100 transition-colors">
              <div className="mr-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <div className="flex-grow">
                <p className="font-medium text-gray-800">Chat</p>
                <p className="text-sm text-gray-500">Chat timings: 10 AM - 7 PM</p>
              </div>
              <div className="text-gray-400">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </div>
            </a>
            <a href="#" onClick={() => alert('Request for callback clicked!')} className="flex items-center px-4 py-3 hover:bg-gray-100 transition-colors">
              <div className="mr-4 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <div className="flex-grow">
                <p className="font-medium text-gray-800">Request for callback</p>
                <p className="text-sm text-gray-500">Call timings: 10 AM - 7 PM</p>
              </div>
              <div className="text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </div>
            </a>
          </div>
        </div>
      )}
      <style>{`
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-pop-in {
          animation: pop-in 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
      `}</style>
      
      {/* Button */}
      <button
        onClick={handleToggleModal}
        className="flex items-center justify-center h-14 w-14 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-transform hover:scale-105"
        aria-label="Help and Support"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="h-7 w-7" viewBox="0 0 16 16">
          <path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5z"/>
        </svg>
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Help & Support
      </div>
    </div>
  );
};

export default HelpSupportButton;
