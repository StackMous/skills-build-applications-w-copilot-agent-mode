import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.js';

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
}

const capabilities = [
  { route: '/activities', empty: { activities: [] }, emptyText: /no activities/i },
  { route: '/teams', empty: { teams: [] }, emptyText: /no teams/i },
  { route: '/leaderboard', empty: { leaderboard: [] }, emptyText: /no (leaderboard|rankings|scores)/i },
  { route: '/workouts', empty: { suggestions: [] }, emptyText: /no (workout|suggestions)/i },
];

describe('OctoFit presentation contract', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/activities')) return new Response(JSON.stringify({ activities: [{ type: 'run', minutes: 30, points: 30 }] }), { status: 200 });
      if (url.includes('/api/teams')) return new Response(JSON.stringify({ teams: [{ name: 'Octocats', members: ['Mona'] }] }), { status: 200 });
      if (url.includes('/api/leaderboard')) return new Response(JSON.stringify({ leaderboard: [{ teamName: 'Octocats', totalPoints: 90, rank: 1 }] }), { status: 200 });
      if (/\/api\/workouts\/suggestions\/mona(%40|@)example\.com$/.test(url)) return new Response(JSON.stringify({ suggestions: [{ title: 'Intervals', reason: 'Build endurance' }] }), { status: 200 });
      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    }));
  });

  it('renders activity data from the API', async () => {
    renderRoute('/activities');
    expect(screen.getByRole('heading', { name: /activities/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/run/i)).toBeInTheDocument());
  });

  it('renders teams, leaderboard, and workout suggestions with accessible content', async () => {
    const teams = renderRoute('/teams');
    await waitFor(() => expect(screen.getByText(/Octocats/)).toBeInTheDocument());
    teams.unmount();
    const leaderboard = renderRoute('/leaderboard');
    await waitFor(() => expect(screen.getByText(/90/)).toBeInTheDocument());
    leaderboard.unmount();
    renderRoute('/workouts');
    await waitFor(() => expect(screen.getByText(/Intervals/)).toBeInTheDocument());
  });

  it('requests workout suggestions for a specific user', async () => {
    renderRoute('/workouts');
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/workouts\/suggestions\/mona(%40|@)example\.com$/)));
  });

  it('submits a valid activity and refreshes the list', async () => {
    renderRoute('/activities');
    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: '507f1f77bcf86cd799439011' } });
    fireEvent.change(screen.getByLabelText('Team ID'), { target: { value: '507f1f77bcf86cd799439012' } });
    fireEvent.change(screen.getByLabelText('Activity'), { target: { value: 'run' } });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record activity' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/activities', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: '507f1f77bcf86cd799439011', teamId: '507f1f77bcf86cd799439012', type: 'run', minutes: 30 }),
    })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Activity recorded.'));
  });

  it('submits a team and refreshes the list', async () => {
    renderRoute('/teams');
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Octocats' } });
    fireEvent.change(screen.getByLabelText('Mascot'), { target: { value: 'Mona' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/teams', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Octocats', mascot: 'Mona', members: [] }),
    })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Team created.'));
  });

  it('submits comma-separated team member IDs', async () => {
    renderRoute('/teams');
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Octocats' } });
    fireEvent.change(screen.getByLabelText('Mascot'), { target: { value: 'Mona' } });
    fireEvent.change(screen.getByLabelText('Member IDs'), { target: { value: '507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create team' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/teams', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Octocats', mascot: 'Mona', members: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] }),
    })));
  });

  for (const capability of capabilities) {
    describe(capability.route, () => {
      it('announces a loading state while the API request is pending', () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
        renderRoute(capability.route);
        expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
      });

      it('shows a meaningful empty state', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(capability.empty), { status: 200 })));
        renderRoute(capability.route);
        await waitFor(() => expect(screen.getByText(capability.emptyText)).toBeInTheDocument());
      });

      it('announces API failures as an accessible alert', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 })));
        renderRoute(capability.route);
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/unable|unavailable|error/i));
      });
    });
  }
});
