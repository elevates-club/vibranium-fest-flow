import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border/40 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© Vibranium 5.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-semibold text-primary">Elevates</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
