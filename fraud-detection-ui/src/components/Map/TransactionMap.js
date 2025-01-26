import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

const TransactionMap = ({ location }) => {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    let map = null;
    let marker = null;

    const initMap = () => {
      if (!window.google || !location || !mapRef.current) return;

      try {
        const { lat, lng } = location;
        const mapOptions = {
          center: { 
            lat: parseFloat(lat), 
            lng: parseFloat(lng) 
          },
          zoom: 15,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        };

        // Create new map instance
        map = new window.google.maps.Map(mapRef.current, mapOptions);

        // Create new marker
        marker = new window.google.maps.Marker({
          position: { 
            lat: parseFloat(lat), 
            lng: parseFloat(lng) 
          },
          map: map,
          animation: window.google.maps.Animation.DROP
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
      }
    };

    // Create a small delay to ensure the div is mounted and stable
    const timer = setTimeout(() => {
      if (window.google) {
        initMap();
      } else {
        const checkGoogleMaps = setInterval(() => {
          if (window.google) {
            clearInterval(checkGoogleMaps);
            initMap();
          }
        }, 100);

        // Cleanup interval after 10 seconds if Google Maps fails to load
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          if (!window.google) {
            console.error('Google Maps failed to load');
            setIsLoading(false);
          }
        }, 10000);
      }
    }, 500);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (marker) {
        marker.setMap(null);
      }
      map = null;
      marker = null;
    };
  }, [location]);

  return (
    <Box 
      ref={mapContainerRef}
      sx={{ 
        position: 'relative',
        height: '400px',
        width: '100%',
        mt: 3,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {isLoading && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1
        }}>
          <CircularProgress />
        </Box>
      )}
      <Box
        ref={mapRef}
        sx={{
          height: '100%',
          width: '100%',
          visibility: isLoading ? 'hidden' : 'visible'
        }}
      />
    </Box>
  );
};

export default TransactionMap; 