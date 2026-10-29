import { useApiResource } from '../api/resource.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const state = useApiResource<LeaderboardResponse>('/api/leaderboard', 'leaderboard');

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Leaderboard</h2>
    <p>Compare team point totals.</p>
    {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
    {state.status === 'error' && <p role="alert">{state.message}</p>}
    {state.status === 'success' && state.data.leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
    {state.status === 'success' && state.data.leaderboard.length > 0 && <div className="table-responsive"><table className="table">
      <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
      <tbody>{state.data.leaderboard.map((entry) => <tr key={entry.rank}>
        <td>{entry.rank}</td><td>{entry.teamName}</td><td>{entry.totalPoints}</td>
      </tr>)}</tbody>
    </table></div>}
  </div></section>;
}
