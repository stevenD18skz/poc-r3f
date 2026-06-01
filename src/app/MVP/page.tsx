"use client";

import React, { useState } from 'react';
import RoleSelector from './componentes/RoleSelector';
import AdminDashboard from './componentes/AdminDashboard';
import PorteriaDashboard from './componentes/PorteriaDashboard';
import ResidenteDashboard from './componentes/ResidenteDashboard';
import { Role } from './types';

export default function MVPPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
  };

  const handleBackToSelector = () => {
    setSelectedRole(null);
  };

  // Basic client-side routing based on selected role state
  return (
    <div className="min-h-screen bg-slate-50 transition-all duration-300">
      {!selectedRole && (
        <RoleSelector onSelectRole={handleSelectRole} />
      )}
      
      {selectedRole === 'admin' && (
        <AdminDashboard onBack={handleBackToSelector} />
      )}
      
      {selectedRole === 'porteria' && (
        <PorteriaDashboard onBack={handleBackToSelector} />
      )}
      
      {selectedRole === 'residente' && (
        <ResidenteDashboard onBack={handleBackToSelector} />
      )}
    </div>
  );
}
