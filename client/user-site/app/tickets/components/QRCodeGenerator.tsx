"use client";

import QRCode from 'react-qr-code';

interface QRProps {
  text: number;
}

export default function QRCodeGenerator({text}: QRProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
      <div style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
          <QRCode
            value={String(text)}
            size={256}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
      </div>
    </div>
  );
}
