import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../services/apiKeys';

// FIX: Add type declaration for window.google to prevent TypeScript errors
// when accessing the Google Maps API loaded from an external script.
declare global {
  interface Window {
    google: any;
  }
}

// =================================================================================
//
//   >>> NOTE: YOUR GOOGLE MAPS API KEY IS NOW IN `services/apiKeys.ts` <<<
//
//   This file now imports its configuration from the new centralized key file.
//   Update your key there.
//
// =================================================================================


interface GoogleMapSearchModalProps {
  onClose: () => void;
  onLocationSelect: (location: { name: string; address: string; placeId: string; }) => void;
}

const GoogleMapSearchModal: React.FC<GoogleMapSearchModalProps> = ({ onClose, onLocationSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address: string; placeId: string; } | null>(null);
  
  // Keep map and marker instances in refs to avoid re-renders
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);


  useEffect(() => {
    // FIX: The original comparison caused a TypeScript error because it compared two different
    // string literals. This is resolved by widening the API key's type to a generic `string`
    // before the comparison, which preserves the developer's intent to check for a placeholder key.
    const apiKey: string = GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
        setError("Google Maps API Key is not configured in services/apiKeys.ts");
        return;
    }

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) {
        initializeMap();
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => initializeMap();
    script.onerror = () => setError("Failed to load Google Maps script. Please check the API key and network connection.");
    
    document.head.appendChild(script);

  }, []);

  const reverseGeocode = (latLng: any) => {
      if (!window.google) return;
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const place = results[0];
          // Use the address from the geocoder, which is often more accurate for a dropped pin.
          // Create a "name" from the first part of the address.
          const newPlace = {
            name: place.formatted_address.split(',')[0],
            address: place.formatted_address,
            placeId: place.place_id,
          };
          setSelectedPlace(newPlace);
          if (inputRef.current) {
            inputRef.current.value = newPlace.address;
          }
        } else {
          console.warn('Geocoder failed due to: ' + status);
        }
      });
  };

  const initializeMap = () => {
    if (!window.google || !mapRef.current || !inputRef.current) {
        setError("Google Maps library is not available.");
        return;
    }
    
    const defaultCenter = { lat: 51.5072, lng: -0.1276 }; // Default to London

    const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
    });
    mapInstanceRef.current = map;

    const marker = new window.google.maps.Marker({
        position: defaultCenter,
        map,
        draggable: true,
    });
    markerInstanceRef.current = marker;

    // Try to use user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            map.setCenter(userLocation);
            marker.setPosition(userLocation);
        }, () => {
             console.log("Geolocation permission denied or failed.");
        });
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'], // Focus on businesses like hotels
      fields: ['place_id', 'name', 'formatted_address', 'geometry']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry && place.place_id && place.name && place.formatted_address) {
        setSelectedPlace({
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
        });
        map.setCenter(place.geometry.location);
        map.setZoom(17);
        marker.setPosition(place.geometry.location);
      }
    });
    
    map.addListener('click', (e: any) => {
        marker.setPosition(e.latLng);
        reverseGeocode(e.latLng);
    });

    marker.addListener('dragend', (e: any) => {
        reverseGeocode(e.latLng);
    });
  };
  
  const handleConfirm = () => {
      if (selectedPlace) {
          onLocationSelect(selectedPlace);
      }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="relative text-center -mx-5 -mt-5 mb-5 p-4 border-b border-gray-200 rounded-t-md bg-slate-100">
          <h3 className="text-xl font-semibold text-slate-800">Search for Hotel</h3>
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
        <div className="space-y-4">
            <input
                ref={inputRef}
                type="text"
                placeholder="Start typing a hotel name or address..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div ref={mapRef} className="w-full h-80 bg-gray-200 rounded-md">
                {!error && <p className="text-gray-500 text-center pt-32">Loading map...</p>}
            </div>
        </div>
         <div className="mt-4 flex justify-end gap-2">
             <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                Cancel
              </button>
             <button 
                onClick={handleConfirm} 
                disabled={!selectedPlace}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
                Confirm Selection
            </button>
         </div>
      </div>
    </div>
  );
};

export default GoogleMapSearchModal;