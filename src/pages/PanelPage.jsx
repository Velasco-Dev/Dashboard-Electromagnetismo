import React from 'react';
import { useOutletContext } from 'react-router-dom';
import PanelSection from '../components/sections/PanelSection';

function PanelPage() {
  const { data, liveData, history, getPowerColor } = useOutletContext();

  return (
    <PanelSection
      data={data}
      liveData={liveData}
      history={history}
      getPowerColor={getPowerColor}
    />
  );
}

export default PanelPage;