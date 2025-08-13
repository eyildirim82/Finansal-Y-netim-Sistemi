import React from 'react';

const TabNavigation = ({ 
  tab, 
  pdfTransactions, 
  onTabChange, 
  onFetchData, 
  onFetchUnmatched 
}) => {
  return (
    <div className="mb-4 flex gap-2">
      <button 
        onClick={() => { 
          onTabChange('all'); 
          onFetchData(); 
        }} 
        className={tab === 'all' ? 'font-bold underline' : ''}
      >
        Tüm İşlemler
      </button>
      <button 
        onClick={() => { 
          onTabChange('unmatched'); 
          onFetchUnmatched(); 
        }} 
        className={tab === 'unmatched' ? 'font-bold underline' : ''}
      >
        Eşleşmeyen Ödemeler
      </button>
      <button 
        onClick={() => { 
          onTabChange('pdf'); 
        }} 
        className={tab === 'pdf' ? 'font-bold underline' : ''}
      >
        PDF İşlemleri ({pdfTransactions.length})
      </button>
    </div>
  );
};

export default TabNavigation;
