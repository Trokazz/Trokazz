"use client";

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SessionContextProvider } from '@/contexts/SessionContext';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Index from '@/pages/Index';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import AuthPage from '@/pages/AuthPage'; // Importar a nova AuthPage
import ProfilePage from '@/pages/ProfilePage';
import CreateAdPage from '@/pages/CreateAdPage';
import AdDetailsPage from '@/pages/AdDetailsPage';
import InboxPage from '@/pages/InboxPage';
import ChatPage from '@/pages/ChatPage';
import NotificationsPage from '@/pages/NotificationsPage';
import VerificationPage from '@/pages/VerificationPage';
import SupportPage from '@/pages/SupportPage';
import UserTicketDetails from '@/pages/UserTicketDetails';
import CreditTransactionsPage from '@/pages/CreditTransactionsPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ManageAds from '@/pages/admin/ManageAds';
import ManageUsers from '@/pages/admin/ManageUsers';
import ModerationPage from '@/pages/admin/ModerationPage';
import ManageSupportTickets from '@/pages/admin/ManageSupportTickets';
import AdminTicketDetails from '@/pages/admin/TicketDetails';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';

const queryClient = new QueryClient();

function App() {
  const [showNearbyAds, setShowNearbyAds] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <Router>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Header showNearbyAds={showNearbyAds} setShowNearbyAds={setShowNearbyAds} />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Index showNearbyAds={showNearbyAds} setShowNearbyAds={setShowNearbyAds} />} />
                <Route path="/sobre" element={<AboutPage />} />
                <Route path="/contato" element={<ContactPage />} />
                <Route path="/termos" element={<TermsPage />} />
                <Route path="/privacidade" element={<PrivacyPage />} />
                <Route path="/auth" element={<AuthPage />} /> {/* Nova rota de autenticação */}
                {/* Redirecionar rotas antigas para a nova AuthPage */}
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
                <Route path="/criar-anuncio" element={<CreateAdPage />} />
                <Route path="/anuncio/:id" element={<AdDetailsPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/chat/:conversationId" element={<ChatPage />} />
                <Route path="/notificacoes" element={<NotificationsPage />} />
                <Route path="/verificacao" element={<VerificationPage />} />
                <Route path="/suporte" element={<SupportPage />} />
                <Route path="/meus-tickets/:ticketId" element={<UserTicketDetails />} />
                <Route path="/transacoes-credito" element={<CreditTransactionsPage />} />

                {/* Rotas de Admin */}
                <Route path="/admin" element={<Outlet />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="anuncios" element={<ManageAds />} />
                  <Route path="usuarios" element={<ManageUsers />} />
                  <Route path="moderacao" element={<ModerationPage />} />
                  <Route path="support-tickets" element={<ManageSupportTickets />} />
                  <Route path="support-tickets/:ticketId" element={<AdminTicketDetails />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Route>
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </SessionContextProvider>
    </QueryClientProvider>
  );
}

export default App;