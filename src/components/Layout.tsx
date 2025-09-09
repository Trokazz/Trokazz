import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import BottomNav from "./BottomNav";
import { useLocation } from "react-router-dom";
import NotificationsPanel from "./NotificationsPanel"; // Import NotificationsPanel
import Footer from "./Footer"; // Import Footer
import DesktopFab from "./DesktopFab"; // Import DesktopFab

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAdDetailsPage = location.pathname.startsWith('/ad/');
  const isProfilePage = location.pathname === '/profile';
  
  // Removed service-related pages from custom mobile layout check
  const hasCustomMobileLayout = isAdDetailsPage || isProfilePage;

  return (
    <div className="relative w-full h-full flex flex-col"> {/* Added flex-col to make footer stick to bottom */}
      {/* Desktop Layout */}
      <div className="hidden md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] flex-1"> {/* flex-1 to allow main content to grow */}
        <Sidebar />
        <div className="flex flex-col">
          <Header />
          <main className="flex-1 p-4 sm:px-6 sm:py-4 bg-background overflow-y-auto">{children}</main>
          <Footer /> {/* Add Footer here for desktop */}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex flex-col flex-1">
        {/* MobileHeader is now handled directly within AdDetailsPage for its custom layout */}
        {!isAdDetailsPage && <MobileHeader />} 
        <main className={`flex-1 ${isAdDetailsPage ? 'flex flex-col' : 'bg-background p-4 pb-20'}`}>
          {children}
        </main>
        {!isAdDetailsPage && <BottomNav />}
        {/* The fixed footer for AdDetailsPage is now part of AdDetails.tsx itself */}
        {!isAdDetailsPage && <Footer />} {/* Add Footer here for mobile, but not on AdDetailsPage */}
      </div>
      <DesktopFab /> {/* Add DesktopFab here */}
    </div>
  );
};

export default Layout;