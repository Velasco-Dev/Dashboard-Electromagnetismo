import React from 'react';
import { useOutletContext } from 'react-router-dom';
import BatterySection from '../components/sections/BatterySection';

function BatteryPage() {
  const { data, isCharging, getBatteryColor } = useOutletContext();

  return (
    <BatterySection
      data={data}
      isCharging={isCharging}
      getBatteryColor={getBatteryColor}
    />
  );
}

export default BatteryPage;