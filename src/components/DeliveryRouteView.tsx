import React, { useState, useMemo, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Package, Truck, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../lib/utils";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface DeliveryRouteViewProps {
  orders: any[];
  customers: any[];
}

function RouteDisplay({waypoints}: {waypoints: google.maps.LatLngLiteral[]}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylines = React.useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || waypoints.length < 2) return;

    polylines.current.forEach(p => p.setMap(null));
    
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediates = waypoints.slice(1, -1).map(wp => ({location: wp}));

    routesLib.Route.computeRoutes({
      origin,
      destination,
      intermediates,
      travelMode: 'DRIVING',
      fields: ['path'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => p.setMap(map));
        polylines.current = newPolylines;
      }
    });

  }, [routesLib, map, waypoints]);

  return null;
}

export default function DeliveryRouteView({ orders, customers }: DeliveryRouteViewProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const orderDetails = useMemo(() => {
    return orders.filter(o => o.location && o.location.lat).map(o => {
        const cust = customers.find(c => c.id === o.customerId);
        return {
            id: o.id,
            name: cust?.name || "Unknown",
            lat: o.location.lat,
            lng: o.location.lng,
            total: o.total || 0
        };
    });
  }, [orders, customers]);

  const waypoints = useMemo(() => {
    return orderDetails.filter(o => selectedOrders.includes(o.id)).map(o => ({lat: o.lat, lng: o.lng}));
  }, [orderDetails, selectedOrders]);

  if (!hasValidKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-8 rounded-3xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">ম্যাপ ফিচার ব্যবহারের জন্য API Key প্রয়োজন</h2>
        <p>অনুগ্রহ করে সেটিংস থেকে GOOGLE_MAPS_PLATFORM_KEY সেটআপ করুন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-3">
            <Truck className="w-6 h-6 text-teal-600" />
            ডেলিভারি রুট অপ্টিমাইজেশান
          </h2>
          <p className="text-gray-500 text-sm mt-2">অর্ডারগুলো নির্বাচন করুন এবং দ্রুততম রুট দেখুন।</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 px-6 py-3 rounded-2xl">
          <p className="text-[10px] text-teal-700 font-bold uppercase">নির্বাচিত অর্ডার</p>
          <p className="text-xl font-black text-teal-950">{selectedOrders.length} টি</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border shadow-sm h-[500px] overflow-y-auto">
            <h3 className="font-black text-sm mb-4 text-gray-950 uppercase tracking-tight">অর্ডার তালিকা ({orderDetails.length})</h3>
            <div className="space-y-2">
                {orderDetails.map(o => (
                  <label key={o.id} className={`flex items-center gap-3 p-4 border-2 rounded-2xl transition-all cursor-pointer ${selectedOrders.includes(o.id) ? 'border-teal-500 bg-teal-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-teal-600"
                      checked={selectedOrders.includes(o.id)}
                      onChange={(e) => {
                          if (e.target.checked) setSelectedOrders([...selectedOrders, o.id]);
                          else setSelectedOrders(selectedOrders.filter(id => id !== o.id));
                      }}
                    />
                    <div>
                        <p className={`font-black text-sm ${selectedOrders.includes(o.id) ? 'text-teal-900' : 'text-gray-900'}`}>{o.name}</p>
                        <p className="text-xs text-gray-500 font-bold">{formatCurrency(o.total)}</p>
                    </div>
                  </label>
                ))}
            </div>
        </div>

        <div className="lg:col-span-2 h-[500px] rounded-3xl overflow-hidden border shadow-sm">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{lat: 23.8103, lng: 90.4125}}
              defaultZoom={8}
              mapId="DELIVERY_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{width: '100%', height: '100%'}}
            >
              {orderDetails.filter(o => selectedOrders.includes(o.id)).map(o => (
                <AdvancedMarker key={o.id} position={{lat: o.lat, lng: o.lng}} title={o.name}>
                  <Pin background="#4285F4" />
                </AdvancedMarker>
              ))}
              <RouteDisplay waypoints={waypoints} />
            </Map>
          </APIProvider>
        </div>
      </div>
    </div>
  );
}
