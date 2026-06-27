
export default function ThermalPrintTemplate({ order }: { order: any }) {
  return (
    <div className="thermal-print" style={{ color: 'black' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 58mm auto !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>Samira Traders</h1>
        <p style={{ margin: '0' }}>অর্ডার রিসিট</p>
      </div>
      
      <div style={{ marginBottom: '10px', borderBottom: '1px dashed black', paddingBottom: '5px', fontSize: '10px' }}>
        <p style={{ margin: '0' }}>তারিখ: {order.date}</p>
        <p style={{ margin: '0' }}>অর্ডার আইডি: {order.id || 'N/A'}</p>
        <p style={{ margin: '0' }}>কাস্টমার: {order.customerName}</p>
      </div>
      
      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid black' }}>
            <th style={{ textAlign: 'left', padding: '2px 0' }}>পণ্য</th>
            <th style={{ textAlign: 'right', padding: '2px 0' }}>পরিমাণ</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => (
            <tr key={item.productId} style={{ borderBottom: '1px dashed #ccc' }}>
              <td style={{ padding: '2px 0' }}>{item.name}</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ marginTop: '10px', borderTop: '1px dashed black', paddingTop: '5px', textAlign: 'center', fontSize: '10px' }}>
        <p style={{ margin: '0' }}>ধন্যবাদ!</p>
      </div>
    </div>
  );
}

