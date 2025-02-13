import { useWeb3 } from '../contexts/useWeb3';
import ProfileView from '../components/ProfileView';
import { BetCreation } from '../components/BetCreation';
import { ActiveBets } from '../components/ActiveBets';
import LeaderboardComponent from '../components/LeaderboardComponent';

export default function Home() {
  const { address } = useWeb3();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-8">
        <BetCreation />
        <ActiveBets />
      </div>

      {/* Right Column */}
      <div className="space-y-8">
        <ProfileView />
        <LeaderboardComponent />
      </div>
    </div>
  );
}
