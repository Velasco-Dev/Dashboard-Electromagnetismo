import React from 'react';
import { useOutletContext } from 'react-router-dom';
import LightingSection from '../components/sections/LightingSection';

function LightingPage() {
  const { data, history, liveData, isConnected, dataSource, dbStatus } = useOutletContext();

  return (
    <LightingSection
      data={data}
      history={history}
      liveData={liveData}
      isConnected={isConnected}
      dataSource={dataSource}
      dbStatus={dbStatus}
    />
  );
}

export default LightingPage;