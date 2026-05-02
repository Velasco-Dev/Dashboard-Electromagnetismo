import React from 'react';
import { useOutletContext } from 'react-router-dom';
import LightingSection from '../components/sections/LightingSection';

function LightingPage() {
  const { data, isConnected, dataSource, dbStatus } = useOutletContext();

  return (
    <LightingSection
      data={data}
      isConnected={isConnected}
      dataSource={dataSource}
      dbStatus={dbStatus}
    />
  );
}

export default LightingPage;