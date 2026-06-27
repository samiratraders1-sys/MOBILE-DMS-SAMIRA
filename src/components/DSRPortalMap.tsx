import React, { useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface DSRPortalMapProps {
  orders: any[];
}

export default function DSRPortalMap({ orders }: DSRPortalMapProps) {
  const agentLocations = useMemo(() => {
    const latestByAgent: { [key: string]: { lat: number; lng: number, name: string } } = {};
    
    orders.forEach(order => {
      if (order.dsrId && order.location && typeof order.location.lat === 'number') {
        latestByAgent[order.dsrId] = {
          lat: order.location.lat,
          lng: order.location.lng,
          name: order.dsrName || "Agent"
        };
      }
    });

    return latestByAgent;
  }, [orders]);

  if (!hasValidKey) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-3xl mb-6 border border-gray-200">
        <p className="text-gray-500 font-bold text-center px-4">ম্যাপ দেখতে API Key সেটআপ করুন</p>
      </div>
    );
  }

  return (
    <div className="h-64 rounded-3xl overflow-hidden mb-6 shadow-sm border border-gray-200">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{lat: 23.8103, lng: 90.4125}}
          defaultZoom={8}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{width: '100%', height: '100%'}}
        >
          {Object.entries<{lat: number; lng: number, name: string}>(agentLocations).map(([agentId, location]) => (
            <AdvancedMarker key={agentId} position={{lat: location.lat, lng: location.lng}} title={location.name}>
              <Pin background="#4285F4" glyphColor="#fff" />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
