import React, { useMemo, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface DSRPortalMapProps {
  orders: any[];
  summaries?: any[];
  staff?: any[];
}

export default function DSRPortalMap({ orders, summaries = [], staff = [] }: DSRPortalMapProps) {
  const [filter, setFilter] = useState<"all" | "orders" | "settlements">("all");

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

  const settlementLocations = useMemo(() => {
    const list: { id: string; lat: number; lng: number; dsrName: string; date: string }[] = [];
    
    summaries.forEach((sum: any) => {
      if (sum.settlementLocation && typeof sum.settlementLocation.lat === 'number') {
        const dsrName = sum.dsrName || staff.find((s: any) => s.id === sum.dsrId)?.name || "DSR";
        list.push({
          id: sum.id,
          lat: sum.settlementLocation.lat,
          lng: sum.settlementLocation.lng,
          dsrName,
          date: sum.settlementDate || sum.date || "N/A"
        });
      }
    });

    return list;
  }, [summaries, staff]);

  if (!hasValidKey) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-gray-100 rounded-3xl mb-6 border border-gray-200 p-4">
        <p className="text-gray-500 font-bold text-center mb-1">ম্যাপ দেখতে API Key সেটআপ করুন</p>
        <p className="text-gray-400 text-xs text-center">Google Maps API Key প্রয়োজন</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Interactive Map Filter & Legend Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              filter === "all"
                ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            সবগুলো কভারেজ
          </button>
          <button
            onClick={() => setFilter("orders")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              filter === "orders"
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            অর্ডার লোকেশন
          </button>
          <button
            onClick={() => setFilter("settlements")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              filter === "settlements"
                ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            সেটেলমেন্ট কভারেজ
          </button>
        </div>

        {/* Visual Map Legend */}
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-semibold self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm"></span>
            <span>অর্ডার লোকেশন</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm"></span>
            <span>সেটেলমেন্ট লোকেশন</span>
          </div>
        </div>
      </div>

      {/* Map View Frame */}
      <div className="h-80 rounded-3xl overflow-hidden shadow-sm border border-gray-200 relative">
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={{lat: 23.8103, lng: 90.4125}}
            defaultZoom={8}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{width: '100%', height: '100%'}}
          >
            {(filter === "all" || filter === "orders") && 
              Object.entries<{lat: number; lng: number, name: string}>(agentLocations).map(([agentId, location]) => (
                <AdvancedMarker 
                  key={`order-${agentId}`} 
                  position={{lat: location.lat, lng: location.lng}} 
                  title={`${location.name} (অর্ডার লোকেশন)`}
                >
                  <Pin background="#4285F4" glyphColor="#fff" />
                </AdvancedMarker>
              ))
            }

            {(filter === "all" || filter === "settlements") && 
              settlementLocations.map((loc) => (
                <AdvancedMarker 
                  key={`settlement-${loc.id}`} 
                  position={{lat: loc.lat, lng: loc.lng}} 
                  title={`${loc.dsrName} (সেটেলমেন্ট কভারেজ - ${loc.date})`}
                >
                  <Pin background="#EA4335" glyphColor="#fff" />
                </AdvancedMarker>
              ))
            }
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
