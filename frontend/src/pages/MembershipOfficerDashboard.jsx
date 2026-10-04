// DECOMMISSIONED: Membership Officer dashboard has been retired.
// Membership approvals have been replaced with student auto-activation upon payment.
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function MembershipOfficerDashboard() {
  return <Navigate to="/dashboard" replace />;
}
