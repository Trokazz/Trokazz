import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-2xl font-bold text-muted-foreground">{title}</h1>
    </div>
  );
};

export default PlaceholderPage;