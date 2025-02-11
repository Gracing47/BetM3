import React from 'react';

const ProfileView: React.FC = () => {
  return (
    <div className="profile-view">
      <h2 className="text-xl font-semibold mb-4">Profile</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Active Bets</h3>
          <p className="text-gray-600">No active bets</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Past Bets</h3>
          <p className="text-gray-600">No past bets</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
